import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { buildAthleteRaceHref, resolveRaceId } from "@/lib/race-links"
import { formatDistance } from "@/lib/utils"
import { getYearFromDate } from "@/lib/date-utils"
import { Badge } from "@/components/ui/badge"

interface PRRecord {
  time: string
  race?: string | {
    raceId?: string
    id?: string
    race_id?: string
    raceID?: string
    name?: string
    draftLegal?: boolean
  }
  date?: string
  raceId?: string
  draftLegal?: boolean
}

interface RaceSummary {
  raceId?: string
  name: string
  date: string
  distance: string
  finishTime: string
  draftLegal?: boolean
}

interface AthletePRsProps {
  athleteId?: string
  prs: {
    superSprint?: PRRecord
    sprint?: PRRecord
    olympic?: PRRecord
    half?: PRRecord
    full?: PRRecord
  }
  races?: RaceSummary[]
}

const DISTANCE_META = [
  { key: "superSprint", label: "Super Sprint" },
  { key: "sprint", label: "Sprint" },
  { key: "olympic", label: "Olympic" },
  { key: "half", label: "Half Distance (70.3)" },
  { key: "full", label: "Full Distance" },
] as const
type DistanceKey = (typeof DISTANCE_META)[number]["key"]
const DISTANCE_ORDER = DISTANCE_META.map((meta) => meta.key)
const CATEGORY_ORDER = ["Non-Draft Legal", "Draft Legal", "Other"] as const

function parseTimeToSeconds(time: string): number {
  const parts = time.trim().split(":")
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts.map(Number)
    return hours * 3600 + minutes * 60 + seconds
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts.map(Number)
    return minutes * 60 + seconds
  }
  return Infinity
}

function resolveDistanceCategory(distance?: string, name?: string, draftLegal?: boolean): DistanceKey | null {
  const candidates = [distance, name].map((value) => value?.toLowerCase() ?? "")

  for (const value of candidates) {
    if (!value) continue
    if (value.includes("super sprint") || value.includes("supersprint")) return "superSprint"
    if (value.includes("sprint")) return "sprint"
    if (value.includes("olympic")) return "olympic"
    if (value.includes("half") || value.includes("70.3")) return "half"
    if (value.includes("full") || value.includes("140.6") || value.includes("ironman")) return "full"
  }

  if (draftLegal) {
    // Default draft-legal events to sprint when distance is missing.
    return "sprint"
  }

  return null
}

function isDraftLegalRace(distance?: string, draftFlag?: boolean, name?: string) {
  if (draftFlag === true) return true
  const combined = `${distance ?? ""} ${name ?? ""}`.toLowerCase()
  return combined.includes("draft legal") || combined.includes("draft-legal") || combined.includes("draftlegal")
}

export function AthletePRs({ prs, athleteId, races = [] }: AthletePRsProps) {
  const normalizedRaces = races.map((race) => ({
    ...race,
    draftLegal: isDraftLegalRace(race.distance, race.draftLegal, race.name),
  }))

  // Build PR records
  const prRecords = DISTANCE_META.flatMap((meta) => {
    const data = prs[meta.key]
    if (!data) return []

    const { key: metaKey, ...metaRest } = meta
    const draftLegal = resolveDraftLegalFlag(data, normalizedRaces)
    const category = getCategoryLabel(draftLegal)
    const yearValue = getYearFromDate(data.date)
    return [
      {
        key: `pr-${metaKey}-${data.date ?? data.time}`,
        ...metaRest,
        category,
        draftLegal,
        distanceKey: metaKey,
        time: data.time,
        year: yearValue === "Unknown" ? undefined : Number(yearValue),
        href: buildRecordHref(data, athleteId, races),
        isPR: true,
      },
    ]
  })

  // Lifetime bests: merge stored PRs with best race results across all years
  const lifetimeRaceBest = collectBestRaceRecords(normalizedRaces)
  const lifetimeRaceEntries = lifetimeRaceBest
    .map((record) => {
      const meta = DISTANCE_META.find((m) => m.key === record.distanceKey)
      if (!meta) return null
      return {
        key: `lifetime-race-${meta.key}-${record.date}-${record.draftLegal ? "dl" : "ndl"}`,
        label: meta.label,
        category: getCategoryLabel(record.draftLegal === true),
        draftLegal: record.draftLegal === true,
        distanceKey: meta.key,
        time: record.time,
        year: Number(getYearFromDate(record.date)) || undefined,
        href: record.raceId
          ? buildRecordHref({ raceId: record.raceId, time: record.time, date: record.date }, athleteId, normalizedRaces)
          : null,
        isPR: false,
      }
    })
    .filter(Boolean) as RecordEntry[]

  const lifetime = mergeBestRecords([...prRecords, ...lifetimeRaceEntries]).map((record) => ({
    ...record,
    isPR: record.isPR ?? true,
    isSeasonRecord: false,
  }))

  const lifetimeLookup = buildRecordLookup(lifetime)
  const seasonRecords = buildSeasonRecords(normalizedRaces, athleteId).map((record) => ({
    ...record,
    isPR: isLifetimeBest(record, lifetimeLookup),
  }))

  const currentSeasonGroups = groupByCategory(seasonRecords)
  const lifetimeGroups = groupByCategory(lifetime)

  const hasCurrentSeason = seasonRecords.length > 0
  const hasLifetime = lifetime.length > 0

  return (
    <Card className="sticky top-8">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-primary" />
          Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <SectionBlock
          title="Lifetime"
          groups={lifetimeGroups}
          emptyText="No lifetime personal bests available yet."
        />

        <SectionBlock
          title="Current Season"
          subtitle={new Date().getFullYear().toString()}
          groups={currentSeasonGroups}
          emptyText="No season records available yet."
        />
      </CardContent>
    </Card>
  )
}

function SectionBlock({
  title,
  subtitle,
  groups,
  emptyText,
}: {
  title: string
  subtitle?: string
  groups: Array<{ category: string; records: RecordEntry[] }>
  emptyText: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b pb-1">
        <div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">
        {groups.length ? (
          groups.map((group) => <RecordCategory key={`${title}-${group.category}`} label={group.category} records={group.records} />)
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  )
}

function RecordCategory({ label, records }: { label: string; records: Array<RecordEntry> }) {
  if (records.length === 0) return null

  const distanceGroups = groupRecordsByDistance(records)
  if (!distanceGroups.length) return null

  return (
    <div className="space-y-2">
      <div className="px-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
      </div>
      <div className="space-y-3">
        {distanceGroups.map((group) => (
          <div key={`${label}-${group.label}`} className="space-y-2">
            <p className="text-base font-semibold text-foreground">{formatDistance(group.label)}</p>
            <div className="divide-y rounded-md border border-border/60 bg-muted/30">
              {group.records.map((record) => {
                const content = (
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-sm font-semibold text-foreground">{record.year ?? "—"}</span>
                      {record.draftLegal && (
                        <Badge variant="outline" className="text-[10px]">
                          Draft Legal
                        </Badge>
                      )}
                      {record.isPR && (
                        <Badge variant="default" className="bg-chart-1 text-[10px]">
                          PR
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-lg font-bold text-primary">{record.time}</span>
                  </div>
                )

                if (record.href) {
                  return (
                    <Link
                      key={record.key}
                      href={record.href}
                      className="block rounded-md transition-colors hover:bg-accent/50"
                      prefetch={false}
                    >
                      {content}
                    </Link>
                  )
                }

                return (
                  <div key={record.key} className="rounded-md">
                    {content}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface RecordEntry {
  key: string
  label: string
  category: string
  time: string
  year?: number
  href?: string | null
  isPR?: boolean
  isSeasonRecord?: boolean
  draftLegal?: boolean
  distanceKey?: DistanceKey
}

function buildSeasonRecords(races: RaceSummary[] = [], athleteId?: string): RecordEntry[] {
  const years = Array.from(
    new Set(
      races
        .map((race) => Number(getYearFromDate(race.date)))
        .filter((year) => Number.isFinite(year)),
    ),
  ).sort((a, b) => b - a)

  const entries: RecordEntry[] = []

  years.forEach((year) => {
    const yearRecords = collectBestRaceRecords(races, (race) => getYearFromDate(race.date) === year.toString())

    yearRecords.forEach((record) => {
      const meta = DISTANCE_META.find((m) => m.key === record.distanceKey)
      if (!meta) return

      entries.push({
        key: `season-${year}-${meta.key}-${record.draftLegal ? "draft" : "non"}`,
        label: meta.label,
        category: getCategoryLabel(record.draftLegal === true),
        draftLegal: record.draftLegal === true,
        distanceKey: meta.key,
        time: record.time,
        year,
        href: record.raceId
          ? buildRecordHref({ raceId: record.raceId, time: record.time, date: record.date }, athleteId, races)
          : null,
        isSeasonRecord: true,
      })
    })
  })

  return entries
}

function buildRecordLookup(records: RecordEntry[]) {
  return records.reduce<Map<string, RecordEntry>>((acc, record) => {
    const key = getRecordKey(record)
    if (key) {
      acc.set(key, record)
    }
    return acc
  }, new Map())
}

function getRecordKey(record: RecordEntry) {
  const base = (record.distanceKey ?? record.label)?.toString().toLowerCase()
  if (!base) return null
  return `${base}-${record.draftLegal ? "draft" : "non"}`
}

function isLifetimeBest(record: RecordEntry, lookup: Map<string, RecordEntry>) {
  const key = getRecordKey(record)
  if (!key) return false
  const best = lookup.get(key)
  if (!best) return false
  return parseTimeToSeconds(record.time) <= parseTimeToSeconds(best.time)
}

function groupRecordsByDistance(records: RecordEntry[]) {
  const map = records.reduce<
    Record<
      string,
      {
        label: string
        distanceKey?: DistanceKey
        records: RecordEntry[]
      }
    >
  >((acc, record) => {
    const key = record.distanceKey ?? record.label
    if (!key) return acc
    if (!acc[key]) {
      acc[key] = { label: record.label, distanceKey: record.distanceKey, records: [] }
    }
    acc[key].records.push(record)
    return acc
  }, {})

  return Object.values(map)
    .sort((a, b) => {
      const aIndex = a.distanceKey ? DISTANCE_ORDER.indexOf(a.distanceKey) : -1
      const bIndex = b.distanceKey ? DISTANCE_ORDER.indexOf(b.distanceKey) : -1
      const safeA = aIndex === -1 ? DISTANCE_ORDER.length : aIndex
      const safeB = bIndex === -1 ? DISTANCE_ORDER.length : bIndex
      return safeA - safeB || a.label.localeCompare(b.label)
    })
    .map((group) => ({
      ...group,
      records: [...group.records].sort(
        (a, b) =>
          (b.year ?? 0) - (a.year ?? 0) || parseTimeToSeconds(a.time) - parseTimeToSeconds(b.time),
      ),
    }))
}

function buildRecordHref(record: PRRecord, athleteId?: string, races: RaceSummary[] = []) {
  const raceReference = resolveRecordRaceReference(record) ?? findRaceReference(record, races)

  const athleteHref = buildAthleteRaceHref(athleteId, raceReference)
  if (athleteHref) {
    return athleteHref
  }

  if (typeof record.race === "string" && record.race) {
    const slug = record.race
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    return slug ? `/race/${slug}` : null
  }
  return null
}

function groupByCategory(records: RecordEntry[]) {
  const map = records.reduce<Record<string, { category: string; records: RecordEntry[] }>>((acc, record) => {
    if (!acc[record.category]) {
      acc[record.category] = { category: record.category, records: [] }
    }
    acc[record.category].records.push(record)
    return acc
  }, {})

  return Object.values(map).sort(
    (a, b) =>
      (CATEGORY_ORDER.indexOf(a.category as (typeof CATEGORY_ORDER)[number]) === -1
        ? CATEGORY_ORDER.length
        : CATEGORY_ORDER.indexOf(a.category as (typeof CATEGORY_ORDER)[number])) -
        (CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number]) === -1
          ? CATEGORY_ORDER.length
          : CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number])) ||
      a.category.localeCompare(b.category),
  )
}

function resolveDraftLegalFlag(record: PRRecord | RaceSummary, races: RaceSummary[]): boolean {
  if ("draftLegal" in record && record.draftLegal === true) {
    return true
  }
  if ("distance" in record && isDraftLegalRace(record.distance, record.draftLegal, (record as RaceSummary).name)) {
    return true
  }

  const raceValue = "race" in record ? (record as PRRecord).race : undefined
  if (raceValue && typeof raceValue === "object" && raceValue.draftLegal === true) {
    return true
  }

  const matchedRace = findRaceMatch(record, races)
  if (matchedRace && matchedRace.draftLegal === true) {
    return true
  }
  if (matchedRace && isDraftLegalRace(matchedRace.distance, matchedRace.draftLegal, matchedRace.name)) {
    return true
  }

  return false
}

function resolveRecordRaceReference(record: PRRecord) {
  const raceReference =
    record.race && typeof record.race === "object"
      ? { ...record.race, raceId: record.raceId ?? record.race?.raceId }
      : record.raceId
        ? { raceId: record.raceId }
        : undefined

  const resolvedId = resolveRaceId(raceReference as any)
  if (resolvedId) {
    return raceReference ?? { raceId: resolvedId }
  }

  return undefined
}

function findRaceReference(record: PRRecord, races: RaceSummary[]) {
  const match = findRaceMatch(record, races)
  return match?.raceId ? { raceId: match.raceId } : undefined
}

function findRaceMatch(record: PRRecord | RaceSummary, races: RaceSummary[]) {
  const raceId = resolveRaceId(
    "race" in record ? (typeof record.race === "object" ? record.race : { raceId: record.raceId }) : (record as any),
  )
  if (raceId) {
    const byId = races.find((race) => race.raceId === raceId)
    if (byId) return byId
  }

  const name =
    "race" in record
      ? typeof record.race === "string"
        ? record.race
        : record.race?.name
      : (record as RaceSummary).name
  if (!name) return undefined
  const normalizedName = name.trim().toLowerCase()
  const recordDate = ("date" in record ? record.date : undefined)?.trim().toLowerCase()

  // Prefer exact name/date match
  const exact = races.find((race) => {
    const raceName = race.name?.trim().toLowerCase()
    if (!raceName || raceName !== normalizedName) return false
    if (!recordDate) return true
    const normalizedRaceDate = race.date?.trim().toLowerCase()
    return normalizedRaceDate === recordDate
  })
  if (exact) return exact

  // Next, match by name only
  const nameOnly = races.find((race) => race.name?.trim().toLowerCase() === normalizedName)
  if (nameOnly) return nameOnly

  // Finally, loose contains match to catch slight name variations
  return races.find((race) => {
    const raceName = race.name?.trim().toLowerCase() || ""
    return raceName.includes(normalizedName) || normalizedName.includes(raceName)
  })
}

function getCategoryLabel(draftLegal: boolean) {
  return draftLegal ? "Draft Legal" : "Non-Draft Legal"
}

function collectBestRaceRecords(
  races: RaceSummary[],
  filter?: (race: RaceSummary) => boolean,
): Array<
  Pick<RecordEntry, "time" | "draftLegal" | "distanceKey"> & {
    date: string
    raceId?: string
  }
> {
  const bestByKey = new Map<string, { time: string; draftLegal?: boolean; date: string; raceId?: string; distanceKey: DistanceKey }>()

  races
    .filter((race) => race.finishTime && race.finishTime.trim() && (!filter || filter(race)))
    .forEach((race) => {
      const distanceKey = resolveDistanceCategory(race.distance, race.name, race.draftLegal)
      if (!distanceKey) return
      const draftLegal = isDraftLegalRace(race.distance, race.draftLegal, race.name)
      const mapKey = `${distanceKey}-${draftLegal ? "draft" : "non"}`

      const timeSeconds = parseTimeToSeconds(race.finishTime)
      const existing = bestByKey.get(mapKey)
      if (!existing || timeSeconds < parseTimeToSeconds(existing.time)) {
        bestByKey.set(mapKey, {
          time: race.finishTime,
          draftLegal,
          date: race.date,
          raceId: race.raceId,
          distanceKey,
        })
      }
    })

  return Array.from(bestByKey.values())
}

function mergeBestRecords(records: RecordEntry[]) {
  const best = new Map<string, RecordEntry>()

  records.forEach((record) => {
    const distanceKey = record.distanceKey
    const mapKey = `${distanceKey ?? record.label}-${record.draftLegal ? "draft" : "non"}`
    const timeSeconds = parseTimeToSeconds(record.time)
    const existing = best.get(mapKey)
    if (!existing || timeSeconds < parseTimeToSeconds(existing.time)) {
      best.set(mapKey, record)
    }
  })

  return Array.from(best.values())
}
