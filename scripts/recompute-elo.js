#!/usr/bin/env node
/**
 * Reset all athlete ELO scores to 1500, recompute per-race ELO deltas using the
 * EloTesting.py algorithm, and write the per-race eloChange back onto each athlete.
 *
 * Usage (from repo root):
 *   node scripts/recompute-elo.js
 *
 * Requires env vars:
 *   MONGODB_URI
 *   (optional) MONGODB_DATA_DB - defaults to "data"
 */

const { MongoClient } = require("mongodb")

const START_RATING = 1500
const K_LOCAL = 4.5
const K_GLOBAL = 1
const ALPHA = 0.2
const MAX_CHANGE = 20

function parseDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}

function clip(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function calculatePairwiseLocal(raceRows) {
  return raceRows.map((row, i) => {
    const { finishPlace, rating } = row
    const lower = Math.max(0, i - 3)
    const upper = Math.min(raceRows.length, i + 4)
    let rlocalSum = 0

    for (let j = lower; j < upper; j += 1) {
      if (j === i) continue
      const opp = raceRows[j]
      const delta = opp.rating - rating
      const adjustedK = K_LOCAL / (1 + Math.abs(delta) / 100)
      const expected = 1 / (1 + 10 ** (delta / 400))
      const actual = finishPlace < opp.finishPlace ? 1 : 0
      const surprise = Math.abs(actual - expected)
      const rlocal = adjustedK * surprise * (actual - expected)
      rlocalSum += rlocal
    }

    return { athleteId: row.athleteId, rlocalSum }
  })
}

function calculateBulk(raceRows) {
  const ranked = [...raceRows].sort((a, b) => b.rating - a.rating)
  const rankLookup = new Map()
  ranked.forEach((row, idx) => {
    const previous = ranked[idx - 1]
    const rank = previous && previous.rating === row.rating ? rankLookup.get(previous.athleteId) : idx + 1
    rankLookup.set(row.athleteId, rank)
  })

  return raceRows.map((row) => {
    const rank = rankLookup.get(row.athleteId) ?? raceRows.length
    const pExpected = raceRows.length > 1 ? (rank - 1) / (raceRows.length - 1) : 0
    const deltaBulk = K_GLOBAL * (row.actualP - pExpected)
    return { athleteId: row.athleteId, deltaBulk }
  })
}

function computeRaceElo(race, ratings) {
  const finishers = (race.results || [])
    .filter((res) => res && res.athleteId && res.overall !== 99999)
    .sort((a, b) => (a.overall || 0) - (b.overall || 0))

  if (finishers.length < 2) {
    return { changes: [], updatedRatings: ratings }
  }

  const raceRows = finishers.map((res, idx) => {
    const athleteId = res.athleteId
    const rating = ratings.get(athleteId) ?? START_RATING
    const finishPlace = idx + 1
    const actualP = finishers.length > 1 ? (finishPlace - 1) / (finishers.length - 1) : 0
    return { athleteId, finishPlace, actualP, rating }
  })

  const locals = calculatePairwiseLocal(raceRows)
  const bulk = calculateBulk(raceRows)
  const bulkLookup = new Map(bulk.map((row) => [row.athleteId, row.deltaBulk]))
  const localLookup = new Map(locals.map((row) => [row.athleteId, row.rlocalSum]))

  const changes = raceRows.map((row) => {
    const deltaBulk = bulkLookup.get(row.athleteId) ?? 0
    const rlocal = localLookup.get(row.athleteId) ?? 0
    const totalChange = clip(ALPHA * deltaBulk + (1 - ALPHA) * rlocal, -MAX_CHANGE, MAX_CHANGE)
    const newRating = row.rating + totalChange
    return {
      athleteId: row.athleteId,
      delta: totalChange,
      newRating,
    }
  })

  const updatedRatings = new Map(ratings)
  changes.forEach(({ athleteId, newRating }) => updatedRatings.set(athleteId, newRating))

  return { changes, updatedRatings }
}

async function resetElos(db) {
  console.log("Resetting athlete ELO scores to 1500 and clearing per-race eloChange …")
  const res = await db.collection("athletes").updateMany(
    {},
    {
      $set: {
        eloScore: START_RATING,
        "recentRaces.$[].eloChange": 0,
      },
    },
  )
  console.log(`Reset ${res.modifiedCount} athlete documents`)
}

async function loadRaces(db) {
  const races = await db
    .collection("races")
    .find({}, { projection: { raceId: 1, name: 1, date: 1, results: 1 } })
    .toArray()

  races.sort((a, b) => {
    const aDate = parseDate(a.date)
    const bDate = parseDate(b.date)
    if (aDate.getTime() === bDate.getTime()) {
      return (a.raceId || "").localeCompare(b.raceId || "")
    }
    return aDate - bDate
  })

  return races
}

async function applyUpdates(db, athleteMap, perRaceChanges) {
  const ops = []

  for (const [athleteId, finalRating] of athleteMap.entries()) {
    const roundedElo = Math.round(finalRating)
    ops.push({
      updateOne: {
        filter: { athleteId },
        update: { $set: { eloScore: roundedElo } },
      },
    })
  }

  for (const [athleteId, races] of perRaceChanges.entries()) {
    for (const [raceId, delta] of races.entries()) {
      const roundedDelta = Math.round(delta)
      ops.push({
        updateOne: {
          filter: { athleteId },
          update: { $set: { "recentRaces.$[race].eloChange": roundedDelta } },
          arrayFilters: [{ "race.raceId": raceId }],
        },
      })
    }
  }

  const batchSize = 500
  let applied = 0
  for (let i = 0; i < ops.length; i += batchSize) {
    const chunk = ops.slice(i, i + batchSize)
    if (!chunk.length) continue
    const res = await db.collection("athletes").bulkWrite(chunk, { ordered: false })
    applied += res.modifiedCount
    console.log(`Applied batch ${i / batchSize + 1}: modified ${res.modifiedCount} docs (running total ${applied})`)
  }
}

async function main() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DATA_DB || "data"

  if (!uri) {
    throw new Error("MONGODB_URI is required")
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  await resetElos(db)
  const races = await loadRaces(db)
  console.log(`Loaded ${races.length} races`)

  let ratings = new Map()
  const perRaceChanges = new Map() // athleteId -> Map<raceId, delta>

  races.forEach((race, idx) => {
    const { changes, updatedRatings } = computeRaceElo(race, ratings)
    ratings = updatedRatings
    changes.forEach(({ athleteId, delta }) => {
      if (!perRaceChanges.has(athleteId)) {
        perRaceChanges.set(athleteId, new Map())
      }
      if (race.raceId) {
        perRaceChanges.get(athleteId).set(race.raceId, delta)
      }
    })
    if (idx % 5 === 0) {
      console.log(`Processed race ${idx + 1}/${races.length}: ${race.name || race.raceId || "unknown"}`)
    }
  })

  await applyUpdates(db, ratings, perRaceChanges)

  await client.close()
  console.log("ELO recalculation complete.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
