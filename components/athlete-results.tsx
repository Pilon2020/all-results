"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, TrendingUp, TrendingDown } from "lucide-react"
import { buildAthleteRaceHref } from "@/lib/race-links"
import { getDateSortValue, getYearFromDate } from "@/lib/date-utils"
import { formatDistance } from "@/lib/utils"

const DISTANCE_LABELS: Record<string, string> = {
  superSprint: "Super Sprint",
  sprint: "Sprint",
  olympic: "Olympic",
  half: "70.3",
  full: "Full Distance",
}

interface Race {
  raceId?: string
  id?: string
  race?: {
    raceId?: string
    id?: string
    race_id?: string
  }
  race_id?: string
  raceID?: string
  name: string
  date: string
  location: string
  distance: string
  finishTime: string
  placement: string
  isPR: boolean
  eloChange: number
  draftLegal?: boolean
}

interface AthleteResultsProps {
  athleteId: string
  races: Race[]
}

function parseTimeToSeconds(time: string): number {
  // Parse time in format "H:MM:SS" or "MM:SS"
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

function getDistanceCategory(distance: string = "", name?: string, draftLegal?: boolean): string {
  const sources = [distance, name].map((value) => value?.toLowerCase() ?? "")
  for (const value of sources) {
    if (!value) continue
    if (value.includes("super sprint") || value.includes("supersprint")) return "superSprint"
    if (value.includes("sprint")) return "sprint"
    if (value.includes("olympic")) return "olympic"
    if (value.includes("half") || value.includes("70.3")) return "half"
    if (value.includes("full") || value.includes("140.6") || value.includes("ironman")) return "full"
  }
  if (draftLegal) return "sprint"
  return distance || name || ""
}

function getDistanceLabel(distance: string, name?: string, draftLegal?: boolean): string {
  const category = getDistanceCategory(distance, name, draftLegal)
  const label = DISTANCE_LABELS[category]
  if (label) return label
  const formatted = formatDistance(distance || name || "")
  return formatted || distance || name || "—"
}

function isDraftLegalRace(distance?: string, draftFlag?: boolean, name?: string) {
  if (draftFlag === true) return true
  const combined = `${distance ?? ""} ${name ?? ""}`.toLowerCase()
  return combined.includes("draft legal") || combined.includes("draft-legal") || combined.includes("draftlegal")
}

export function AthleteResults({ athleteId, races }: AthleteResultsProps) {
  const [showAll, setShowAll] = useState(false)
  const currentYear = new Date().getFullYear().toString()

  // Calculate season records (best time in current year per distance)
  const seasonRecords = useMemo(() => {
    const records = new Set<string>()
    const currentYearRaces = races.filter((race) => getYearFromDate(race.date) === currentYear && race.finishTime)

    // Group by distance category
    const byDistance = new Map<string, Race[]>()
    currentYearRaces.forEach((race) => {
      const category = getDistanceCategory(race.distance, race.name, race.draftLegal)
      if (!byDistance.has(category)) {
        byDistance.set(category, [])
      }
      byDistance.get(category)!.push(race)
    })

    // Find best time for each distance category
    byDistance.forEach((categoryRaces, category) => {
      let bestRace: Race | null = null
      let bestTime = Infinity

      categoryRaces.forEach((race) => {
        const timeSeconds = parseTimeToSeconds(race.finishTime)
        if (timeSeconds < bestTime) {
          bestTime = timeSeconds
          bestRace = race
        }
      })

      if (bestRace) {
        // Use a unique key for this race (raceId or combination of name and date)
        const key = bestRace.raceId || `${bestRace.name}-${bestRace.date}`
        records.add(key)
      }
    })

    return records
  }, [races, currentYear])

  const sortedRaces = [...races].sort((a, b) => getDateSortValue(b.date) - getDateSortValue(a.date))
  const displayedRaces = showAll ? sortedRaces : sortedRaces.slice(0, 5)
  const groupedByYear = groupRacesByYear(displayedRaces)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Race Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {groupedByYear.map(([year, yearRaces]) => (
          <div key={year} className="space-y-4">
            <div className="rounded-2xl bg-muted px-4 py-3 text-2xl font-black tracking-tight text-muted-foreground">
              {year}
            </div>
            {yearRaces.map((race, index) => {
              const href = buildAthleteRaceHref(athleteId, race)
              const raceKey = race.raceId || `${race.name}-${race.date}`
              const isSeasonRecord = seasonRecords.has(raceKey) && getYearFromDate(race.date) === currentYear
              const draftLegal = isDraftLegalRace(race.distance, race.draftLegal, race.name)
              const distanceLabel = getDistanceLabel(race.distance, race.name, draftLegal)
              const eloChangeValue = Number.isFinite(race.eloChange) ? race.eloChange : 0
              const EloIcon = eloChangeValue >= 0 ? TrendingUp : TrendingDown
              const eloColor =
                eloChangeValue > 0
                  ? "text-[#16a34a]"
                  : eloChangeValue < 0
                    ? "text-[#dc2626]"
                    : "text-foreground/60"
              const content = (
                <div className="group relative overflow-hidden rounded-[23px] border-[1px] border-foreground/70 bg-background/90 px-3.5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg md:px-5 md:py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-3.5">
                      <div className="space-y-2">
                        <p className="text-[23px] md:text-[29px] font-black leading-tight text-foreground">{race.name}</p>
                        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[15px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {race.date || "Date TBA"}
                          </span>
                          <span className="flex min-w-0 items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{race.location || "Location TBA"}</span>
                          </span>
                          {draftLegal && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Draft legal
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 font-mono text-[15px] text-muted-foreground">
                        <span className="text-foreground/75">{race.placement || "Placement pending"}</span>
                        <span className="flex items-center gap-1.5">
                          <EloIcon className={`h-3.5 w-3.5 ${eloColor}`} />
                          <span className={`font-semibold ${eloColor}`}>
                            {eloChangeValue > 0 ? `+${eloChangeValue}` : eloChangeValue}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">Elo</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-7">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {distanceLabel && (
                          <span className="rounded-2xl border-2 border-foreground/70 bg-background px-2 py-0.5 font-mono text-[11px] font-semibold leading-none shadow-[0_2px_0_rgba(0,0,0,0.12)]">
                            {distanceLabel}
                          </span>
                        )}
                        {race.isPR && (
                          <span className="rounded-2xl bg-chart-1 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
                            PR
                          </span>
                        )}
                        {isSeasonRecord && (
                          <span className="rounded-2xl bg-[#8f67d6] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
                            SR
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="mb-1 flex items-center justify-end gap-1.5 text-xs font-mono text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Finish Time</span>
                        </div>
                        <p className="font-mono text-[29px] md:text-[34px] font-extrabold leading-none text-foreground">
                          {race.finishTime || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )

              if (!href) {
                return (
                  <div key={`${year}-${index}`} className="block opacity-80">
                    {content}
                  </div>
                )
              }

              return (
                <Link key={`${year}-${index}`} href={href} className="block">
                  {content}
                </Link>
              )
            })}
          </div>
        ))}

        {races.length > 5 && (
          <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show Less" : `Show More (${races.length - 5} more races)`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
function groupRacesByYear(races: Race[]) {
  const buckets = races.reduce<Record<string, Race[]>>((acc, race) => {
    const year = getYearFromDate(race.date)
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(race)
    return acc
  }, {})

  return Object.entries(buckets).sort(([yearA], [yearB]) => {
    const numA = Number(yearA)
    const numB = Number(yearB)
    if (isNaN(numA) && isNaN(numB)) return 0
    if (isNaN(numA)) return 1
    if (isNaN(numB)) return -1
    return numB - numA
  })
}
