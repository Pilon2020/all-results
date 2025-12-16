import { NextResponse } from "next/server"
import { z } from "zod"
import type { Collection } from "mongodb"

import type { Athlete, AthleteRaceSummary, RaceProfile, RaceResultEntry } from "@/lib/data"
import { getDataDb } from "@/lib/mongodb"
import { getUserProfileById } from "@/lib/server/user-service"

type RouteContext = {
  params: Promise<{ athleteId: string }>
}

const payloadSchema = z.object({
  userId: z.string().trim().min(1, "User id is required."),
  sourceAthleteId: z.string().trim().min(1, "Source athlete id is required."),
  raceId: z.string().trim().min(1, "Race id is required."),
})

export async function POST(request: Request, context: RouteContext) {
  const { athleteId } = await context.params

  let payload: z.infer<typeof payloadSchema>

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat().filter(Boolean)[0]
    return NextResponse.json({ error: firstError || "Invalid claim payload." }, { status: 400 })
  }

  if (parsed.data.sourceAthleteId === athleteId) {
    return NextResponse.json({ error: "This result is already attached to this athlete." }, { status: 400 })
  }

  try {
    const user = await getUserProfileById(parsed.data.userId)
    if (user.claimedAthleteId !== athleteId) {
      return NextResponse.json({ error: "You must claim this athlete before attaching results." }, { status: 403 })
    }

    const db = await getDataDb()
    const athletes = db.collection<Athlete>("athletes")
    const races = db.collection<RaceProfile>("races")
    const analyses = db.collection("athleteRaceResults")

    const [target, source, race] = await Promise.all([
      athletes.findOne({ athleteId }),
      athletes.findOne({ athleteId: parsed.data.sourceAthleteId }),
      races.findOne({ raceId: parsed.data.raceId }),
    ])

    if (!target) {
      return NextResponse.json({ error: "Target athlete not found." }, { status: 404 })
    }

    if (!source) {
      return NextResponse.json({ error: "The source athlete could not be found." }, { status: 404 })
    }

    const sourceRace = findRaceSummary(source.recentRaces ?? [], parsed.data.raceId)
    const raceResult = race?.results?.find((result) => result.athleteId === parsed.data.sourceAthleteId)
    const summary = normalizeRaceSummary(sourceRace ?? buildRaceSummaryFromResult(race, raceResult, parsed.data.raceId))

    if (!summary) {
      return NextResponse.json(
        { error: "We could not locate that race on the source athlete. Please try another entry." },
        { status: 404 },
      )
    }

    const updatedRecentRaces = mergeRaceSummaries(target.recentRaces ?? [], summary)
    await athletes.updateOne(
      { athleteId },
      {
        $set: {
          recentRaces: updatedRecentRaces,
          isClaimed: true,
        },
      },
    )

    const raceUpdated = race && raceResult ? await updateRaceResultEntry(races, race, raceResult, target) : false
    const analysisUpdated = await upsertAthleteRaceAnalysis(
      analyses,
      parsed.data.raceId,
      parsed.data.sourceAthleteId,
      target,
      race,
      raceResult,
      summary,
    )

    return NextResponse.json({
      race: summary,
      recentRaces: updatedRecentRaces,
      raceUpdated,
      analysisUpdated,
    })
  } catch (error) {
    console.error("[api/athletes/claim-result] Failed to attach result", error)
    return NextResponse.json({ error: "Unable to attach this result right now." }, { status: 500 })
  }
}

function findRaceSummary(races: AthleteRaceSummary[], raceId: string) {
  return races.find((race) => race.raceId === raceId)
}

function mergeRaceSummaries(existing: AthleteRaceSummary[], incoming: AthleteRaceSummary) {
  const keyed = new Map<string, AthleteRaceSummary>()
  existing.forEach((race) => {
    const key = buildRaceLookupKey(race.name, race.date) ?? race.raceId ?? ""
    if (key) {
      keyed.set(key, race)
    }
  })

  const incomingKey = buildRaceLookupKey(incoming.name, incoming.date) ?? incoming.raceId ?? ""
  if (incomingKey) {
    keyed.set(incomingKey, incoming)
  }

  return Array.from(keyed.values())
}

function normalizeRaceSummary(summary?: AthleteRaceSummary | null) {
  if (!summary?.raceId) {
    return null
  }

  return {
    raceId: summary.raceId,
    name: summary.name || "Unknown race",
    date: summary.date || "",
    location: summary.location || "",
    distance: summary.distance || "",
    draftLegal: Boolean(summary.draftLegal),
    finishTime: summary.finishTime || "",
    placement: summary.placement || "",
    isPR: Boolean(summary.isPR),
    eloChange: Number.isFinite(summary.eloChange) ? summary.eloChange : 0,
  }
}

function buildRaceSummaryFromResult(race?: RaceProfile | null, result?: RaceResultEntry, fallbackRaceId?: string): AthleteRaceSummary | null {
  const raceId = race?.raceId ?? fallbackRaceId
  if (!raceId) {
    return null
  }

  const placement = result
    ? `Overall ${result.overall ?? "—"}, Gender ${result.gender ?? "—"}, Div ${result.division ?? "—"}`
    : "Placement unavailable"

  return {
    raceId,
    name: race?.name ?? "",
    date: race?.date ?? "",
    location: race?.location ?? "",
    distance: race?.distance ?? "",
    draftLegal: Boolean(race?.draftLegal),
    finishTime: result?.finish ?? "",
    placement,
    isPR: false,
    eloChange: 0,
  }
}

async function updateRaceResultEntry(
  races: Collection<RaceProfile>,
  race: RaceProfile,
  sourceResult: RaceResultEntry,
  athlete: Athlete,
) {
  const targetName = `${athlete.firstName} ${athlete.lastName}`.trim()
  let changed = false
  const updatedResults = (race.results ?? []).map((entry) => {
    if (entry.athleteId !== sourceResult.athleteId) {
      return entry
    }
    changed = true
    return {
      ...entry,
      athleteId: athlete.athleteId,
      name: targetName || entry.name,
      country: athlete.country || entry.country,
    }
  })

  if (changed) {
    await races.updateOne({ raceId: race.raceId }, { $set: { results: updatedResults } })
  }
  return changed
}

function buildRaceLookupKey(name?: string | null, date?: string | null) {
  if (!name) return null
  const normalizedName = name.trim().toLowerCase()
  const normalizedDate = date?.trim().toLowerCase() ?? ""
  return `${normalizedName}__${normalizedDate}`
}

async function upsertAthleteRaceAnalysis(
  analyses: Collection<Record<string, unknown>>,
  raceId: string,
  sourceAthleteId: string,
  target: Athlete,
  race: RaceProfile | null,
  raceResult: RaceResultEntry | undefined,
  summary: AthleteRaceSummary,
) {
  const filter = {
    $and: [
      {
        $or: [
          { athleteId: sourceAthleteId },
          { athleteId: target.athleteId },
          { "athlete.id": sourceAthleteId },
          { "athlete.id": target.athleteId },
        ],
      },
      { $or: [{ raceId }, { "race.id": raceId }, { "race.raceId": raceId }] },
    ],
  }

  const payload = buildAnalysisPayload(target, raceId, race, raceResult, summary)
  const result = await analyses.updateOne(
    filter,
    {
      $set: payload,
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  )

  return (result.modifiedCount ?? 0) > 0 || (result.upsertedCount ?? 0) > 0
}

function buildAnalysisPayload(
  athlete: Athlete,
  raceId: string,
  race: RaceProfile | null,
  raceResult: RaceResultEntry | undefined,
  summary: AthleteRaceSummary,
) {
  const athleteName = `${athlete.firstName} ${athlete.lastName}`.trim() || "Athlete"
  const baseRace = race ?? null
  const finish = raceResult?.finish ?? summary.finishTime ?? "n/a"

  return {
    athleteId: athlete.athleteId,
    raceId,
    athlete: {
      id: athlete.athleteId,
      athleteId: athlete.athleteId,
      name: athleteName,
      age: Number.isFinite(athlete.age) ? athlete.age : 0,
      country: athlete.country ?? "UNK",
    },
    race: {
      id: baseRace?.raceId ?? raceId,
      raceId: baseRace?.raceId ?? raceId,
      name: baseRace?.name ?? summary.name,
      date: baseRace?.date ?? summary.date,
      location: baseRace?.location ?? summary.location,
      distance: baseRace?.distance ?? summary.distance,
      draftLegal: Boolean(baseRace?.draftLegal ?? summary.draftLegal),
    },
    performance: {
      overall: raceResult?.overall ?? 0,
      gender: raceResult?.gender ?? 0,
      division: raceResult?.division ?? 0,
      ageGroup: raceResult?.ageGroup ?? "n/a",
      bib: raceResult?.bib ?? 0,
      finishTime: finish,
      swim: {
        time: raceResult?.swim ?? "n/a",
        pace: "n/a",
        rank: raceResult?.gender ?? 0,
        percentile: 0,
      },
      t1: {
        time: raceResult?.t1 ?? "n/a",
        rank: 0,
      },
      bike: {
        time: raceResult?.bike ?? "n/a",
        speed: "n/a",
        rank: raceResult?.division ?? 0,
        percentile: 0,
      },
      t2: {
        time: raceResult?.t2 ?? "n/a",
        rank: 0,
      },
      run: {
        time: raceResult?.run ?? "n/a",
        pace: "n/a",
        rank: raceResult?.division ?? 0,
        percentile: 0,
      },
    },
    splits: {
      swim: raceResult?.swim ? [{ distance: race?.swimDistance ?? "Swim", time: raceResult.swim, pace: "n/a" }] : [],
      bike: raceResult?.bike ? [{ distance: race?.bikeDistance ?? "Bike", time: raceResult.bike, speed: "n/a" }] : [],
      run: raceResult?.run ? [{ distance: race?.runDistance ?? "Run", time: raceResult.run, pace: "n/a" }] : [],
    },
    comparison: {
      ageGroup: {
        swim: buildComparisonValue(raceResult?.swim ?? finish),
        bike: buildComparisonValue(raceResult?.bike ?? finish),
        run: buildComparisonValue(raceResult?.run ?? finish),
        total: buildComparisonValue(finish),
      },
    },
    updatedAt: new Date(),
  }
}

function buildComparisonValue(value: string) {
  return {
    athlete: value,
    average: "n/a",
    diff: "n/a",
  }
}
