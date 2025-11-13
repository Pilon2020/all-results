import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { buildAthleteRaceHref } from "@/lib/race-links"

interface PRRecord {
  time: string
  race?: string | {
    raceId?: string
    id?: string
    race_id?: string
    raceID?: string
  }
  date?: string
  raceId?: string
}

interface AthletePRsProps {
  athleteId?: string
  prs: {
    sprint?: PRRecord
    olympic?: PRRecord
    half?: PRRecord
    full?: PRRecord
  }
}

const DISTANCE_META = [
  { key: "sprint", label: "Sprint", category: "Non-Draft Legal" },
  { key: "olympic", label: "Olympic", category: "Non-Draft Legal" },
  { key: "half", label: "Half Distance", category: "Draft Legal" },
  { key: "full", label: "Full Distance", category: "Draft Legal" },
] as const

export function AthletePRs({ prs, athleteId }: AthletePRsProps) {
  const records = DISTANCE_META.flatMap((meta) => {
    const data = prs[meta.key]
    if (!data) return []

    return [
      {
        key: `${meta.key}-${data.date ?? data.time}`,
        ...meta,
        time: data.time,
        year: extractYear(data.date),
        href: buildRecordHref(data, athleteId),
      },
    ]
  })

  const recordYears = records.map((record) => record.year).filter((year): year is number => typeof year === "number")
  const currentSeasonYear = recordYears.length ? Math.max(...recordYears) : undefined
  const currentSeason = currentSeasonYear ? records.filter((record) => record.year === currentSeasonYear) : []
  const lifetime = currentSeasonYear ? records.filter((record) => record.year !== currentSeasonYear) : records

  const currentSeasonGroups = groupByCategory(currentSeason)
  const lifetimeGroups = groupByCategory(lifetime)

  const hasCurrentSeason = currentSeason.length > 0
  const hasLifetime = lifetime.length > 0

  return (
    <Card className="sticky top-8">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="h-5 w-5 text-primary" />
          Records
        </CardTitle>
        {currentSeasonYear && <p className="text-sm text-muted-foreground">Current Season - {currentSeasonYear}</p>}
      </CardHeader>
      <CardContent className="space-y-8">
        {hasCurrentSeason && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-muted-foreground">Season Highlights</p>
            {currentSeasonGroups.map((group) => (
              <RecordCategory key={`current-${group.category}`} label={group.category} records={group.records} />
            ))}
          </div>
        )}

        {hasLifetime && (
          <div className="space-y-3">
            <p className="text-base font-semibold text-muted-foreground">Lifetime</p>
            {lifetimeGroups.map((group) => (
              <RecordCategory key={`lifetime-${group.category}`} label={group.category} records={group.records} />
            ))}
          </div>
        )}

        {!records.length && <p className="text-sm text-muted-foreground">No records available yet.</p>}
      </CardContent>
    </Card>
  )
}

function RecordCategory({ label, records }: { label: string; records: Array<RecordEntry> }) {
  if (records.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="space-y-2">
        {records.map((record) => {
          const content = (
            <div className="rounded-2xl border border-border/70 px-4 py-3 transition-colors hover:border-primary">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{record.label}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{record.year ?? "—"}:</span>
                <span className="font-mono text-2xl font-bold">{record.time}</span>
              </div>
            </div>
          )

          if (record.href) {
            return (
              <Link key={record.key} href={record.href} className="block" prefetch={false}>
                {content}
              </Link>
            )
          }

          return (
            <div key={record.key} className="opacity-70">
              {content}
            </div>
          )
        })}
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
}

function extractYear(date?: string) {
  if (!date) return undefined
  const parsed = new Date(date)
  if (!isNaN(parsed.getTime())) {
    return parsed.getFullYear()
  }
  const match = date.match(/(19|20)\d{2}/)
  return match ? Number(match[0]) : undefined
}

function buildRecordHref(record: PRRecord, athleteId?: string) {
  const raceReference =
    record.race && typeof record.race === "object"
      ? { ...record.race, raceId: record.raceId ?? record.race?.raceId }
      : record.raceId
        ? { raceId: record.raceId }
        : undefined

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

  const categoryOrder = ["Non-Draft Legal", "Draft Legal", "Other"]

  return Object.values(map).sort(
    (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.category.localeCompare(b.category),
  )
}
