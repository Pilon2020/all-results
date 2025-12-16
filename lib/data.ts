import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import type { Db, Filter, WithId } from "mongodb"

import { formatDisplayDate, getDateSortValue } from "./date-utils"
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
  draftLegal: boolean
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
    superSprint?: AthletePR
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
  draftLegal: boolean
  participants: number
  finishers: number
  weather: string
  swimDistance: string
  bikeDistance: string
  runDistance: string
  results: RaceResultEntry[]
}

export type RaceProfileDoc = Omit<RaceProfile, "date"> & { date: string | Date }

export interface RecentRaceSummary {
  raceId: string
  name: string
  date: string
  location: string
  distance: string
  draftLegal: boolean
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
    draftLegal?: boolean
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

export interface PotentialMergeResult {
  raceId: string
  name: string
  date: string
  location: string
  distance: string
  finishTime: string
  placement: string
  isPR: boolean
  sourceAthleteId: string
  sourceAthleteName: string
  matchScore: number
  reason: string
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

const getRelevanceScore = (value: string | undefined, query: string): number => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return 0

  const normalizedValue = (value ?? "").toLowerCase()
  if (!normalizedValue) return -Infinity

  const index = normalizedValue.indexOf(normalizedQuery)
  if (index === -1) return -Infinity

  let score = 100 - index
  if (normalizedValue.startsWith(normalizedQuery)) {
    score += 50
  }
  if (normalizedValue === normalizedQuery) {
    score += 25
  }

  // Slightly reward closer length matches without overpowering prefix matches
  return score - Math.abs(normalizedValue.length - normalizedQuery.length) * 0.1
}

type RawRecentRace = Partial<AthleteRaceSummary> &
  Partial<{
    id: string
    race_id: string
    raceID: string
    date: string | Date
    race: {
      id?: string
      raceId?: string
      race_id?: string
      raceID?: string
      name?: string
      date?: string | Date
      location?: string
      distance?: string
    }
  }>

type RawPrRecord = Partial<AthletePR> &
  Partial<{
    date: string | Date
    raceDetails: {
      id?: string
      raceId?: string
      race_id?: string
      raceID?: string
      name?: string
      date?: string | Date
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

function ensureNoStore() {
  noStore()
}

function withoutId<T>(doc: WithId<T>): T {
  const { _id, ...rest } = doc
  return rest as T
}

function escapeRegexTerm(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function formatRaceProfile(doc: RaceProfileDoc): RaceProfile {
  return {
    ...doc,
    draftLegal: Boolean((doc as RaceProfileDoc & { draftLegal?: boolean }).draftLegal),
    date: formatDisplayDate(doc.date),
  }
}

export async function getAthleteById(athleteId: string): Promise<Athlete | null> {
  ensureNoStore()
  const db = await getDataDb()
  const [athleteDoc, raceAnalysisDocs] = await Promise.all([
    db.collection<Athlete>("athletes").findOne({ athleteId }),
    db
      .collection<AthleteRaceAnalysisDoc>("athleteRaceResults")
      .find(buildAthleteRaceAnalysisAthleteFilter(athleteId))
      .toArray(),
  ])

  const raceLookup = buildRaceAnalysisLookup(
    raceAnalysisDocs.map((doc) => normalizeAthleteRaceAnalysis(withoutId(doc))),
  )

  if (!athleteDoc) {
    const fallbackAthlete = await buildAthleteFromRaceResults(db, athleteId)
    if (!fallbackAthlete) {
      return null
    }
    return normalizeAthlete(fallbackAthlete, raceLookup)
  }

  return normalizeAthlete(withoutId(athleteDoc), raceLookup)
}

export async function getRaceById(raceId: string): Promise<RaceProfile | null> {
  ensureNoStore()
  const db = await getDataDb()
  const doc = await db.collection<RaceProfileDoc>("races").findOne({ raceId })
  return doc ? formatRaceProfile(withoutId(doc)) : null
}

export async function getAthleteRaceAnalysis(
  athleteId: string,
  raceId: string,
): Promise<AthleteRaceAnalysis | null> {
  ensureNoStore()
  const db = await getDataDb()
  const doc = await db
    .collection<AthleteRaceAnalysisDoc>("athleteRaceResults")
    .findOne(buildAthleteRaceAnalysisQuery(athleteId, raceId))
  return doc ? normalizeAthleteRaceAnalysis(withoutId(doc)) : null
}

export async function getPotentialAthleteMergeResults(athleteId: string): Promise<PotentialMergeResult[]> {
  ensureNoStore()
  const db = await getDataDb()
  const athletes = db.collection<Athlete>("athletes")
  const primary = await athletes.findOne({ athleteId })

  if (!primary) {
    return []
  }

  const firstNameRegex = new RegExp(`^${escapeRegexTerm(primary.firstName)}$`, "i")
  const lastNameRegex = new RegExp(`^${escapeRegexTerm(primary.lastName)}$`, "i")

  const candidateFilter: Filter<Athlete> = {
    athleteId: { $ne: athleteId },
    firstName: firstNameRegex,
    lastName: lastNameRegex,
  }

  if (primary.country) {
    candidateFilter.country = new RegExp(`^${escapeRegexTerm(primary.country)}$`, "i")
  }

  const candidates = await athletes.find(candidateFilter).limit(15).toArray()
  if (!candidates.length) {
    return []
  }

  const ownedRaceKeys = buildRaceKeySet(primary.recentRaces ?? [])
  const suggestions = new Map<string, PotentialMergeResult>()

  candidates.forEach((candidate) => {
    const matchScore = computeMergeScore(primary, candidate)
    const reason = buildMergeReason(primary, candidate)
    const sourceName = `${candidate.firstName} ${candidate.lastName}`.trim()

    ;(candidate.recentRaces ?? []).forEach((race) => {
      const normalized = normalizeRecentRaceSummary(race as RawRecentRace)
      const raceKey = buildRaceLookupKey(normalized.name, normalized.date) ?? normalized.raceId ?? ""
      if (!normalized.raceId || !raceKey) {
        return
      }

      if (ownedRaceKeys.has(raceKey) || ownedRaceKeys.has(normalized.raceId)) {
        return
      }

      const existing = suggestions.get(raceKey)
      const next: PotentialMergeResult = {
        raceId: normalized.raceId,
        name: normalized.name || "Unknown race",
        date: normalized.date || "",
        location: normalized.location || "",
        distance: normalized.distance || "",
        finishTime: normalized.finishTime || "",
        placement: normalized.placement || "",
        isPR: normalized.isPR,
        sourceAthleteId: candidate.athleteId,
        sourceAthleteName: sourceName,
        matchScore,
        reason,
      }

      if (!existing || matchScore > existing.matchScore) {
        suggestions.set(raceKey, next)
      }
    })
  })

  return Array.from(suggestions.values()).sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore
    }
    return getDateSortValue(b.date) - getDateSortValue(a.date)
  })
}

export async function searchDirectory(query: string): Promise<SearchDirectoryResults> {
  ensureNoStore()
  const db = await getDataDb()
  const normalizedQuery = query.trim()
  const searchRegex = normalizedQuery ? new RegExp(escapeRegexTerm(normalizedQuery), "i") : null

  // Build athlete filter that searches firstName, lastName, team, and concatenated full name
  // This ensures we match both individual fields AND the full concatenated name
  const athleteFilter = searchRegex
    ? {
        $or: [
          { firstName: searchRegex }, // Search firstName field
          { lastName: searchRegex }, // Search lastName field
          { team: searchRegex }, // Search team field
          // Search concatenated full name using $expr to match "First Last" format
          {
            $expr: {
              $regexMatch: {
                input: { $concat: [{ $ifNull: ["$firstName", ""] }, " ", { $ifNull: ["$lastName", ""] }] },
                regex: searchRegex.source,
                options: "i",
              },
            },
          },
        ],
      }
    : {}
  const raceFilter = searchRegex ? { $or: [{ name: searchRegex }, { location: searchRegex }] } : {}

  const [athleteDocs, raceDocs] = await Promise.all([
    db.collection<Athlete>("athletes").find(athleteFilter).limit(50).toArray(),
    db.collection<RaceProfileDoc>("races").find(raceFilter).limit(50).toArray(),
  ])

  return {
    athletes: athleteDocs
      .map((doc) => {
        const name = `${doc.firstName} ${doc.lastName}`.trim()
        const relevance = Math.max(
          getRelevanceScore(name, normalizedQuery),
          getRelevanceScore(doc.team, normalizedQuery),
          0,
        )

        return {
          athleteId: doc.athleteId,
          name,
          age: doc.age,
          team: doc.team,
          elo: doc.eloScore,
          relevance,
        }
      })
      .sort((a, b) => {
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance
        }
        return a.name.localeCompare(b.name)
      })
      .map(({ relevance: _relevance, ...athlete }) => athlete),
    races: raceDocs
      .map((doc) => {
        const displayDate = formatDisplayDate(doc.date)
        const relevance = Math.max(
          getRelevanceScore(doc.name, normalizedQuery),
          getRelevanceScore(doc.location, normalizedQuery),
          0,
        )

        return {
          raceId: doc.raceId,
          name: doc.name,
          date: displayDate,
          location: doc.location,
          relevance,
        }
      })
      .sort((a, b) => {
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance
        }
        return a.name.localeCompare(b.name)
      })
      .map(({ relevance: _relevance, ...race }) => race),
  }
}

export async function getRecentRaces(limit = 5): Promise<RecentRaceSummary[]> {
  ensureNoStore()
  const db = await getDataDb()
  const raceDocs = await db
    .collection<RaceProfileDoc>("races")
    .find({})
    .toArray()

  // Sort by parsed date values (handles MM-DD-YYYY string format)
  const sortedDocs = raceDocs.sort((a, b) => {
    const dateA = getDateSortValue(a.date)
    const dateB = getDateSortValue(b.date)
    if (dateB !== dateA) {
      return dateB - dateA // Most recent first
    }
    // Fallback to createdAt if dates are equal
    const createdAtA = (a as RaceProfileDoc & { createdAt?: Date }).createdAt?.getTime() ?? 0
    const createdAtB = (b as RaceProfileDoc & { createdAt?: Date }).createdAt?.getTime() ?? 0
    return createdAtB - createdAtA
  })

  return sortedDocs.slice(0, limit).map((doc) => {
    const { createdAt } = doc as RaceProfileDoc & { createdAt?: Date }

    return {
      raceId: doc.raceId,
      name: doc.name,
      date: formatDisplayDate(doc.date),
      location: doc.location,
      distance: doc.distance,
      draftLegal: Boolean(doc.draftLegal),
      participants: doc.participants,
      finishers: doc.finishers,
      createdAt,
      topFinishers: doc.results?.slice(0, 3) ?? [],
    }
  })
}

export async function getTopAthletes(limit = 10): Promise<RankedAthlete[]> {
  ensureNoStore()
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

async function buildAthleteFromRaceResults(db: Db, athleteId: string): Promise<Athlete | null> {
  const raceDocs = await db
    .collection<RaceProfileDoc>("races")
    .find({ "results.athleteId": athleteId })
    .toArray()

  if (!raceDocs.length) {
    return null
  }

  const appearances: Array<{ race: RaceProfileDoc; result: RaceResultEntry }> = []

  raceDocs.forEach((race) => {
    const result = race.results?.find((entry) => entry.athleteId === athleteId)
    if (result) {
      appearances.push({ race, result })
    }
  })

  if (!appearances.length) {
    return null
  }

  const primary = appearances[0]
  const { firstName, lastName } = splitResultName(primary.result.name)

  const recentRaces: AthleteRaceSummary[] = appearances.map(({ race, result }) => ({
    raceId: race.raceId,
    name: race.name,
    date: race.date,
    location: race.location,
    distance: race.distance,
    draftLegal: Boolean((race as RaceProfileDoc & { draftLegal?: boolean }).draftLegal),
    finishTime: result.finish,
    placement: buildPlacementSummary(result),
    isPR: false,
    eloChange: 0,
  }))

  return {
    athleteId,
    firstName,
    lastName,
    team: undefined,
    age: inferAgeFromAgeGroup(primary.result.ageGroup),
    eloScore: 1500,
    country: primary.result.country ?? "",
    isClaimed: false,
    prs: {},
    recentRaces,
  }
}

function splitResultName(name?: string) {
  const trimmed = (name ?? "").trim()
  if (!trimmed) {
    return { firstName: "Unknown", lastName: "" }
  }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" }
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

function buildPlacementSummary(result: RaceResultEntry) {
  return `Overall ${result.overall}, Gender ${result.gender}, Div ${result.division}`
}

function inferAgeFromAgeGroup(ageGroup?: string) {
  const match = ageGroup?.match(/(\d{2})-(\d{2})/)
  if (!match) return Number.NaN
  const start = Number(match[1])
  const end = Number(match[2])
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.NaN
  return Math.round((start + end) / 2)
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
      date: formatDisplayDate(race.date, ""),
      draftLegal: Boolean(race.draftLegal),
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
  const displayDate = formatDisplayDate(normalizedDate, "")

  const normalizedRaceId =
    race.raceId ??
    race.id ??
    race.race_id ??
    race.raceID ??
    nestedRace?.raceId ??
    nestedRace?.id ??
    nestedRace?.race_id ??
    nestedRace?.raceID ??
    (normalizedName ? raceLookup?.get(buildRaceLookupKey(normalizedName, displayDate)) : undefined)

  const normalized: AthleteRaceSummary = {
    ...race,
    raceId: normalizedRaceId ?? race.raceId,
    name: normalizedName ?? "",
    date: displayDate,
    location: race.location ?? nestedRace?.location ?? "",
    distance: race.distance ?? nestedRace?.distance ?? "",
    draftLegal: Boolean(race.draftLegal ?? nestedRace?.draftLegal),
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
  const formattedCandidateDates = candidateDates
    .map((value) => formatDisplayDate(value, ""))
    .filter(Boolean)

  const normalizedRaceId =
    record.raceId ??
    record.raceDetails?.raceId ??
    record.raceDetails?.id ??
    record.raceDetails?.race_id ??
    record.raceDetails?.raceID ??
    candidateNames.reduce<string | undefined>((found, name) => {
      if (found || !name) return found
      return formattedCandidateDates.reduce<string | undefined>((innerFound, date) => {
        if (innerFound) return innerFound
        const key = buildRaceLookupKey(name, date)
        return key ? raceLookup?.get(key) : undefined
      }, undefined)
    }, undefined)

  const displayDate = formatDisplayDate(record.date ?? record.raceDetails?.date, "")

  return {
    ...record,
    raceId: normalizedRaceId ?? record.raceId,
    date: displayDate,
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

function buildRaceLookupKey(name?: string | null, date?: string | Date | null) {
  if (!name) return null
  const normalizedName = name.trim().toLowerCase()
  const normalizedDate =
    date instanceof Date || typeof date === "string" ? formatDisplayDate(date, "").trim().toLowerCase() : ""
  return `${normalizedName}__${normalizedDate}`
}

function buildRaceKeySet(races: AthleteRaceSummary[]): Set<string> {
  const keys = new Set<string>()
  races.forEach((race) => {
    const primary = buildRaceLookupKey(race.name, race.date)
    if (primary) {
      keys.add(primary)
    }
    if (race.raceId) {
      keys.add(race.raceId)
    }
  })
  return keys
}

function computeMergeScore(primary: Athlete, candidate: Athlete) {
  let score = 1
  if (normalizeText(primary.country) === normalizeText(candidate.country)) {
    score += 3
  }
  if (normalizeText(primary.team) && normalizeText(primary.team) === normalizeText(candidate.team)) {
    score += 1
  }
  if (Number.isFinite(primary.age) && Number.isFinite(candidate.age)) {
    const diff = Math.abs((primary.age as number) - (candidate.age as number))
    if (diff <= 2) {
      score += 2
    } else if (diff <= 5) {
      score += 1
    }
  }
  return score
}

function buildMergeReason(primary: Athlete, candidate: Athlete) {
  const parts: string[] = ["Same name"]
  if (normalizeText(primary.country) === normalizeText(candidate.country)) {
    parts.push(`Country match (${primary.country})`)
  }
  if (Number.isFinite(primary.age) && Number.isFinite(candidate.age)) {
    const diff = Math.abs((primary.age as number) - (candidate.age as number))
    if (diff <= 2) {
      parts.push("Age within 2 years")
    } else if (diff <= 5) {
      parts.push("Age within 5 years")
    }
  }
  if (normalizeText(primary.team) && normalizeText(primary.team) === normalizeText(candidate.team)) {
    parts.push("Same team")
  }
  return parts.join(" • ")
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() || ""
}
