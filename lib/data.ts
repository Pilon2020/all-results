import "server-only"

import type { Filter, WithId } from "mongodb"

import { getDataDb } from "./mongodb"

export interface AthletePR {
  time: string
  race: string
  date: string
  raceId?: string
}

export interface AthleteRaceSummary {
  raceId: string
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
  avatarUrl?: string
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

export interface RecentRaceSummary {
  raceId: string
  name: string
  date: string
  location: string
  distance: string
  participants: number
  finishers: number
  createdAt?: Date
  topFinishers: RaceResultEntry[]
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

type AthleteRaceAnalysisDoc = AthleteRaceAnalysis & {
  athlete: AthleteRaceAnalysis["athlete"] & { athleteId?: string }
  race: AthleteRaceAnalysis["race"] & { raceId?: string }
  athleteId?: string
  raceId?: string
}

type RaceAnalysisLookup = Map<string, string>

const ATHLETE_ANALYSIS_FIELDS = ["athlete.id", "athlete.athleteId", "athleteId"] as const
const RACE_ANALYSIS_FIELDS = ["race.id", "race.raceId", "raceId"] as const

type RawRecentRace = AthleteRaceSummary &
  Partial<{
    id: string
    race_id: string
    raceID: string
    race: {
      id?: string
      raceId?: string
      race_id?: string
      raceID?: string
      name?: string
      date?: string
      location?: string
      distance?: string
    }
  }>

type RawPrRecord = AthletePR &
  Partial<{
    raceDetails: {
      id?: string
      raceId?: string
      race_id?: string
      raceID?: string
      name?: string
      date?: string
    }
  }>

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

export interface RankedAthlete {
  athleteId: string
  firstName: string
  lastName: string
  country: string
  team?: string
  eloScore: number
}

function withoutId<T>(doc: WithId<T>): T {
  const { _id, ...rest } = doc
  return rest as T
}

function escapeRegexTerm(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function getAthleteById(athleteId: string): Promise<Athlete | null> {
  const db = await getDataDb()
  const [athleteDoc, raceAnalysisDocs] = await Promise.all([
    db.collection<Athlete>("athletes").findOne({ athleteId }),
    db
      .collection<AthleteRaceAnalysisDoc>("athleteRaceResults")
      .find(buildAthleteRaceAnalysisAthleteFilter(athleteId))
      .toArray(),
  ])

  if (!athleteDoc) {
    return null
  }

  const raceLookup = buildRaceAnalysisLookup(
    raceAnalysisDocs.map((doc) => normalizeAthleteRaceAnalysis(withoutId(doc))),
  )

  return normalizeAthlete(withoutId(athleteDoc), raceLookup)
}

export async function getRaceById(raceId: string): Promise<RaceProfile | null> {
  const db = await getDataDb()
  const doc = await db.collection<RaceProfile>("races").findOne({ raceId })
  return doc ? withoutId(doc) : null
}

export async function getAthleteRaceAnalysis(
  athleteId: string,
  raceId: string,
): Promise<AthleteRaceAnalysis | null> {
  const db = await getDataDb()
  const doc = await db
    .collection<AthleteRaceAnalysisDoc>("athleteRaceResults")
    .findOne(buildAthleteRaceAnalysisQuery(athleteId, raceId))
  return doc ? normalizeAthleteRaceAnalysis(withoutId(doc)) : null
}

export async function searchDirectory(query: string): Promise<SearchDirectoryResults> {
  const db = await getDataDb()
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

export async function getRecentRaces(limit = 6): Promise<RecentRaceSummary[]> {
  const db = await getDataDb()
  const raceDocs = await db
    .collection<RaceProfile>("races")
    .find({}, { sort: { createdAt: -1, date: -1 } })
    .limit(limit)
    .toArray()

  return raceDocs.map((doc) => {
    const { createdAt } = doc as RaceProfile & { createdAt?: Date }

    return {
      raceId: doc.raceId,
      name: doc.name,
      date: doc.date,
      location: doc.location,
      distance: doc.distance,
      participants: doc.participants,
      finishers: doc.finishers,
      createdAt,
      topFinishers: doc.results?.slice(0, 3) ?? [],
    }
  })
}

export async function getTopAthletes(limit = 10): Promise<RankedAthlete[]> {
  const db = await getDataDb()
  const docs = await db
    .collection<Athlete>("athletes")
    .find({}, { sort: { eloScore: -1 } })
    .limit(limit)
    .toArray()

  return docs.map((doc) => ({
    athleteId: doc.athleteId,
    firstName: doc.firstName,
    lastName: doc.lastName,
    country: doc.country,
    team: doc.team,
    eloScore: doc.eloScore,
  }))
}

function buildAthleteRaceAnalysisQuery(
  athleteId: string,
  raceId: string,
): Filter<AthleteRaceAnalysisDoc> {
  return {
    $and: [
      { $or: ATHLETE_ANALYSIS_FIELDS.map((field) => ({ [field]: athleteId })) },
      { $or: RACE_ANALYSIS_FIELDS.map((field) => ({ [field]: raceId })) },
    ],
  } as Filter<AthleteRaceAnalysisDoc>
}

function normalizeAthleteRaceAnalysis(doc: AthleteRaceAnalysisDoc): AthleteRaceAnalysis {
  const { athleteId: legacyAthleteId, raceId: legacyRaceId, athlete, race, ...rest } = doc

  const normalized: AthleteRaceAnalysis = {
    ...(rest as Omit<AthleteRaceAnalysis, "athlete" | "race">),
    athlete: {
      ...athlete,
      id: athlete.id ?? athlete.athleteId ?? legacyAthleteId ?? athlete.id,
    },
    race: {
      ...race,
      id: race.id ?? race.raceId ?? legacyRaceId ?? race.id,
    },
  }

  return normalized
}

function normalizeAthlete(athlete: Athlete, raceLookup?: RaceAnalysisLookup): Athlete {
  const recentRaces = Array.isArray(athlete.recentRaces)
    ? athlete.recentRaces.map((race) => normalizeRecentRaceSummary(race as RawRecentRace, raceLookup))
    : []
  const prs = normalizeAthletePrs(athlete.prs, raceLookup)

  return {
    ...athlete,
    recentRaces,
    prs,
  }
}

function normalizeRecentRaceSummary(race: RawRecentRace, raceLookup?: RaceAnalysisLookup): AthleteRaceSummary {
  const nestedRace = typeof race.race === "object" ? race.race : undefined

  const normalizedName = race.name ?? nestedRace?.name
  const normalizedDate = race.date ?? nestedRace?.date

  const normalizedRaceId =
    race.raceId ??
    race.id ??
    race.race_id ??
    race.raceID ??
    nestedRace?.raceId ??
    nestedRace?.id ??
    nestedRace?.race_id ??
    nestedRace?.raceID ??
    (normalizedName ? raceLookup?.get(buildRaceLookupKey(normalizedName, normalizedDate)) : undefined)

  const normalized: AthleteRaceSummary = {
    ...race,
    raceId: normalizedRaceId ?? race.raceId,
    name: normalizedName ?? "",
    date: normalizedDate ?? "",
    location: race.location ?? nestedRace?.location ?? "",
    distance: race.distance ?? nestedRace?.distance ?? "",
  }

  return normalized
}

function normalizeAthletePrs(prs: Athlete["prs"], raceLookup?: RaceAnalysisLookup): Athlete["prs"] {
  if (!prs) return prs
  const entries = Object.entries(prs) as Array<[keyof Athlete["prs"], AthletePR | undefined]>

  const normalizedEntries = entries.reduce<Athlete["prs"]>((acc, [key, record]) => {
    if (record) {
      acc[key] = normalizePrRecord(record as RawPrRecord, raceLookup)
    }
    return acc
  }, {} as Athlete["prs"])

  return { ...prs, ...normalizedEntries }
}

function normalizePrRecord(record: RawPrRecord, raceLookup?: RaceAnalysisLookup): AthletePR {
  const candidateNames = [
    typeof record.race === "string" ? record.race : undefined,
    record.raceDetails?.name,
  ]

  const candidateDates = [record.date, record.raceDetails?.date]

  const normalizedRaceId =
    record.raceId ??
    record.raceDetails?.raceId ??
    record.raceDetails?.id ??
    record.raceDetails?.race_id ??
    record.raceDetails?.raceID ??
    candidateNames.reduce<string | undefined>((found, name) => {
      if (found || !name) return found
      return candidateDates.reduce<string | undefined>((innerFound, date) => {
        if (innerFound) return innerFound
        const key = buildRaceLookupKey(name, date)
        return key ? raceLookup?.get(key) : undefined
      }, undefined)
    }, undefined)

  return {
    ...record,
    raceId: normalizedRaceId ?? record.raceId,
  }
}

function buildAthleteRaceAnalysisAthleteFilter(athleteId: string): Filter<AthleteRaceAnalysisDoc> {
  return {
    $or: ATHLETE_ANALYSIS_FIELDS.map((field) => ({ [field]: athleteId })),
  } as Filter<AthleteRaceAnalysisDoc>
}

function buildRaceAnalysisLookup(docs: AthleteRaceAnalysis[]): RaceAnalysisLookup {
  const lookup: RaceAnalysisLookup = new Map()

  docs.forEach((doc) => {
    const raceId = doc.race.id
    if (!raceId) return

    const keys = [
      buildRaceLookupKey(doc.race.name, doc.race.date),
      buildRaceLookupKey(doc.race.name, undefined),
    ]

    keys.forEach((key) => {
      if (key && !lookup.has(key)) {
        lookup.set(key, raceId)
      }
    })
  })

  return lookup
}

function buildRaceLookupKey(name?: string | null, date?: string | null) {
  if (!name) return null
  const normalizedName = name.trim().toLowerCase()
  const normalizedDate = date?.trim().toLowerCase() ?? ""
  return `${normalizedName}__${normalizedDate}`
}
