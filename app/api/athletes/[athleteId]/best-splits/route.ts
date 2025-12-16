import { NextResponse } from "next/server"

import { getDataDb } from "@/lib/mongodb"
import { getDateSortValue } from "@/lib/date-utils"

type SegmentKey = "swim" | "t1" | "bike" | "t2" | "run" | "finish"

const DISTANCE_LABELS: Record<string, string> = {
  superSprint: "Super Sprint",
  sprint: "Sprint",
  olympic: "Olympic",
  half: "70.3 / Half",
  full: "140.6 / Full",
}

const ATHLETE_ANALYSIS_FIELDS = ["athlete.id", "athlete.athleteId", "athleteId"] as const

function parseTimeToSeconds(time?: string): number {
  if (time === null || time === undefined) return Number.POSITIVE_INFINITY
  if (typeof time === "number" && Number.isFinite(time)) return time
  const trimmed = String(time).trim()
  if (!trimmed || trimmed.toLowerCase() === "n/a") return Number.POSITIVE_INFINITY
  const parts = trimmed.split(":").map((p) => Number(p))
  if (parts.some((p) => Number.isNaN(p))) return Number.POSITIVE_INFINITY
  if (parts.length === 3) {
    const [h, m, s] = parts
    return h * 3600 + m * 60 + s
  }
  if (parts.length === 2) {
    const [m, s] = parts
    return m * 60 + s
  }
  return Number.POSITIVE_INFINITY
}

function getDistanceKey(distance?: string, name?: string, draftLegal?: boolean): string {
  const value = `${distance ?? ""} ${name ?? ""}`.toLowerCase()
  if (value.includes("super sprint") || value.includes("supersprint")) return "superSprint"
  if (value.includes("sprint")) return "sprint"
  if (value.includes("olympic")) return "olympic"
  if (value.includes("70.3") || value.includes("half")) return "half"
  if (value.includes("140.6") || value.includes("full") || value.includes("ironman")) return "full"
  if (draftLegal && !value.includes("sprint")) return "sprint"
  return (distance || name || "other").toLowerCase().trim() || "other"
}

function getDistanceLabel(key: string, distance?: string): string {
  return DISTANCE_LABELS[key] || distance || "Other"
}

export async function GET(_: Request, { params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params
  if (!athleteId) {
    return NextResponse.json({ error: "Missing athleteId" }, { status: 400 })
  }

  const db = await getDataDb()
  const filter = { $or: ATHLETE_ANALYSIS_FIELDS.map((field) => ({ [field]: athleteId })) }
  const [analysisDocs, raceDocs, athleteDoc] = await Promise.all([
    db.collection("athleteRaceResults").find(filter).toArray(),
    db
      .collection("races")
      .find(
        {
          $or: [
            { "results.athleteId": athleteId },
            { "results.athleteID": athleteId },
            { "results.athlete_id": athleteId },
            { "results.athlete.id": athleteId },
          ],
        },
        { projection: { raceId: 1, name: 1, distance: 1, date: 1, draftLegal: 1, results: 1 } },
      )
      .toArray(),
    db.collection("athletes").findOne({ athleteId }),
  ])

  const athleteFullName = athleteDoc ? `${athleteDoc.firstName ?? ""} ${athleteDoc.lastName ?? ""}`.trim() : ""
  const recentRaceIds =
    (Array.isArray(athleteDoc?.recentRaces) ? athleteDoc.recentRaces : [])
      .map((r: any) => r?.raceId)
      .filter(Boolean) ?? []

  if (recentRaceIds.length > 0) {
    const additionalRaces = await db
      .collection("races")
      .find({ raceId: { $in: recentRaceIds } }, { projection: { raceId: 1, name: 1, distance: 1, date: 1, draftLegal: 1, results: 1 } })
      .toArray()
    additionalRaces.forEach((race) => {
      if (!raceDocs.some((r: any) => r?.raceId === race?.raceId)) {
        raceDocs.push(race)
      }
    })
  }

  const byDistance = new Map<
    string,
    {
      label: string
      races: Array<{
        raceId?: string
        name?: string
        date?: string
        splits: Partial<Record<SegmentKey, string>>
      }>
    }
  >()

  function ensureDistanceEntry(key: string, label: string) {
    if (!byDistance.has(key)) {
      byDistance.set(key, { label, races: [] })
    }
    return byDistance.get(key)
  }

  function recordRaceSplits(
    key: string,
    label: string,
    race: { raceId?: string; name?: string; date?: string },
    segmentCandidates: Record<SegmentKey, Array<string | undefined>>,
  ) {
    const entry = ensureDistanceEntry(key, label)
    if (!entry) return

    const splits: Partial<Record<SegmentKey, string>> = {}

    ;(Object.entries(segmentCandidates) as Array<[SegmentKey, Array<string | undefined>]>).forEach(
      ([segment, candidates]) => {
        const firstPresent = candidates.find((value) => {
          const seconds = parseTimeToSeconds(value)
          return Number.isFinite(seconds)
        })
        if (firstPresent) {
          splits[segment] = String(firstPresent)
        }
      },
    )

    entry.races.push({ ...race, splits })
  }

  function resultMatchesAthlete(result: any): boolean {
    const candidateId =
      result?.athleteId ?? result?.athleteID ?? result?.athlete_id ?? result?.athlete?.id ?? result?.athlete?.athleteId ?? ""
    if (candidateId === athleteId) return true

    const resultName = `${result?.name ?? result?.athleteName ?? result?.athlete?.name ?? ""}`.trim().toLowerCase()
    if (athleteFullName && resultName && resultName === athleteFullName.toLowerCase()) return true

    return false
  }

  analysisDocs.forEach((doc: any) => {
    const distance = doc?.race?.distance ?? doc?.distance
    const name = doc?.race?.name ?? doc?.name
    const draftLegal = doc?.race?.draftLegal ?? false
    const key = getDistanceKey(distance, name, draftLegal)
    const label = getDistanceLabel(key, distance)

    const performance = doc?.performance ?? {}
    const result = doc?.result ?? doc?.raceResult ?? {}
    const date = doc?.race?.date ?? doc?.date

    const segmentCandidates: Record<SegmentKey, Array<string | undefined>> = {
      swim: [performance?.swim?.time, result?.swim, doc?.swim],
      t1: [performance?.t1?.time, result?.t1, doc?.t1],
      bike: [performance?.bike?.time, result?.bike, doc?.bike],
      t2: [performance?.t2?.time, result?.t2, doc?.t2],
      run: [performance?.run?.time, result?.run, doc?.run],
      finish: [
        performance?.finishTime,
        performance?.final,
        result?.finish,
        result?.final,
        doc?.finish,
        doc?.final,
      ],
    }

    recordRaceSplits(
      key,
      label,
      {
        raceId: doc?.race?.raceId ?? doc?.raceId,
        name: doc?.race?.name ?? doc?.name,
        date,
      },
      segmentCandidates,
    )
  })

  raceDocs.forEach((race: any) => {
    const key = getDistanceKey(race?.distance, race?.name, race?.draftLegal)
    const label = getDistanceLabel(key, race?.distance)
    const results = Array.isArray(race?.results) ? race.results : []
    results
      .filter((r: any) => resultMatchesAthlete(r))
      .forEach((result: any) => {
        const segmentCandidates: Record<SegmentKey, Array<string | undefined>> = {
          swim: [result?.swim],
          t1: [result?.t1],
          bike: [result?.bike],
          t2: [result?.t2],
          run: [result?.run],
          finish: [result?.finish, result?.final],
        }
        recordRaceSplits(
          key,
          label,
          { raceId: race?.raceId, name: race?.name, date: race?.date },
          segmentCandidates,
        )
      })
  })

  const distances = Array.from(byDistance.entries()).map(([key, value]) => {
    const races = value.races
      .map((race) => ({
        ...race,
        date: race.date,
        sortValue: getDateSortValue(race.date ?? ""),
      }))
      .sort((a, b) => b.sortValue - a.sortValue)
      .map(({ sortValue: _sortValue, ...rest }) => rest)

    return { key, label: value.label, races }
  })

  return NextResponse.json({ distances })
}
