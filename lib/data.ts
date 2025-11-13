import "server-only"

import type { WithId } from "mongodb"

import clientPromise from "./mongodb"

const DB_NAME = process.env.MONGODB_DB || "all-results"

export interface AthletePR {
  time: string
  race: string
  date: string
}

export interface AthleteRaceSummary {
  name: string
  date: string
  location: string
  distance: string
  finishTime: string
  placement: string
  isPR: boolean
  eloChange: number
}

export interface Athlete {
  athleteId: string
  firstName: string
  lastName: string
  team?: string
  age: number
  eloScore: number
  country: string
  isClaimed: boolean
  socialLinks?: {
    strava?: string
    instagram?: string
  }
  prs: {
    sprint?: AthletePR
    olympic?: AthletePR
    half?: AthletePR
    full?: AthletePR
  }
  recentRaces: AthleteRaceSummary[]
}

export interface RaceResultEntry {
  athleteId: string
  name: string
  bib: number
  overall: number
  gender: number
  division: number
  ageGroup: string
  country: string
  swim: string
  t1: string
  bike: string
  t2: string
  run: string
  finish: string
}

export interface RaceProfile {
  raceId: string
  name: string
  date: string
  location: string
  distance: string
  participants: number
  finishers: number
  weather: string
  swimDistance: string
  bikeDistance: string
  runDistance: string
  results: RaceResultEntry[]
}

export interface AthleteRaceAnalysis {
  athlete: {
    id: string
    name: string
    age: number
    country: string
  }
  race: {
    id: string
    name: string
    date: string
    location: string
    distance: string
  }
  performance: {
    overall: number
    gender: number
    division: number
    ageGroup: string
    bib: number
    finishTime: string
    swim: {
      time: string
      pace: string
      rank: number
      percentile: number
    }
    t1: {
      time: string
      rank: number
    }
    bike: {
      time: string
      speed: string
      rank: number
      percentile: number
    }
    t2: {
      time: string
      rank: number
    }
    run: {
      time: string
      pace: string
      rank: number
      percentile: number
    }
  }
  splits: {
    swim: Array<{ distance: string; time: string; pace: string }>
    bike: Array<{ distance: string; time: string; speed: string }>
    run: Array<{ distance: string; time: string; pace: string }>
  }
  comparison: {
    ageGroup: {
      swim: { athlete: string; average: string; diff: string }
      bike: { athlete: string; average: string; diff: string }
      run: { athlete: string; average: string; diff: string }
      total: { athlete: string; average: string; diff: string }
    }
  }
}

export interface SearchDirectoryResults {
  athletes: Array<{
    athleteId: string
    name: string
    age: number
    team?: string
    elo: number
  }>
  races: Array<{
    raceId: string
    name: string
    date: string
    location: string
  }>
}

async function getDb() {
  const client = await clientPromise
  return client.db(DB_NAME)
}

function withoutId<T>(doc: WithId<T>): T {
  const { _id, ...rest } = doc
  return rest as T
}

function escapeRegexTerm(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function getAthleteById(athleteId: string): Promise<Athlete | null> {
  const db = await getDb()
  const doc = await db.collection<Athlete>("athletes").findOne({ athleteId })
  return doc ? withoutId(doc) : null
}

export async function getRaceById(raceId: string): Promise<RaceProfile | null> {
  const db = await getDb()
  const doc = await db.collection<RaceProfile>("races").findOne({ raceId })
  return doc ? withoutId(doc) : null
}

export async function getAthleteRaceAnalysis(
  athleteId: string,
  raceId: string,
): Promise<AthleteRaceAnalysis | null> {
  const db = await getDb()
  const doc = await db
    .collection<AthleteRaceAnalysis>("athleteRaceResults")
    .findOne({ "athlete.id": athleteId, "race.id": raceId })
  return doc ? withoutId(doc) : null
}

export async function searchDirectory(query: string): Promise<SearchDirectoryResults> {
  const db = await getDb()
  const searchRegex = query ? new RegExp(escapeRegexTerm(query), "i") : null

  const athleteFilter = searchRegex
    ? {
        $or: [{ firstName: searchRegex }, { lastName: searchRegex }, { team: searchRegex }],
      }
    : {}
  const raceFilter = searchRegex ? { $or: [{ name: searchRegex }, { location: searchRegex }] } : {}

  const [athleteDocs, raceDocs] = await Promise.all([
    db.collection<Athlete>("athletes").find(athleteFilter).limit(8).toArray(),
    db.collection<RaceProfile>("races").find(raceFilter).limit(8).toArray(),
  ])

  return {
    athletes: athleteDocs.map((doc) => ({
      athleteId: doc.athleteId,
      name: `${doc.firstName} ${doc.lastName}`,
      age: doc.age,
      team: doc.team,
      elo: doc.eloScore,
    })),
    races: raceDocs.map((doc) => ({
      raceId: doc.raceId,
      name: doc.name,
      date: doc.date,
      location: doc.location,
    })),
  }
}
