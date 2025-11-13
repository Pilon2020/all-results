"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, TrendingUp, TrendingDown } from "lucide-react"

interface Race {
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

interface AthleteResultsProps {
  athleteId: string
  races: Race[]
}

export function AthleteResults({ athleteId, races }: AthleteResultsProps) {
  const [showAll, setShowAll] = useState(false)
  const sortedRaces = [...races].sort((a, b) => getSortValue(b.date) - getSortValue(a.date))
  const displayedRaces = showAll ? sortedRaces : sortedRaces.slice(0, 5)
  const groupedByYear = groupRacesByYear(displayedRaces)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Race Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {groupedByYear.map(([year, yearRaces]) => (
          <div key={year} className="space-y-4">
            <div className="rounded-2xl bg-muted px-4 py-3 text-3xl font-black tracking-tight text-muted-foreground">
              {year}
            </div>
            {yearRaces.map((race, index) => (
              <Link
                key={`${year}-${index}`}
                href={`/athlete/${athleteId}/race/${race.raceId}`}
                className="block"
              >
                <div className="rounded-2xl border border-border/80 p-4 transition-all hover:border-primary hover:bg-accent/50">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold">{race.name}</span>
                        {race.isPR && (
                          <Badge variant="default" className="bg-chart-1">
                            PR
                          </Badge>
                        )}
                        <Badge variant="outline">{race.distance}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {race.date}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {race.location}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Finish Time</span>
                        </div>
                        <p className="font-mono text-2xl font-bold">{race.finishTime}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{race.placement}</p>
                      </div>

                      <div className="text-right">
                        <p className="mb-1 text-xs text-muted-foreground">Elo Change</p>
                        <div
                          className={`flex items-center gap-1 text-lg font-bold ${
                            race.eloChange > 0 ? "text-chart-4" : "text-destructive"
                          }`}
                        >
                          {race.eloChange > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {race.eloChange > 0 ? "+" : ""}
                          {race.eloChange}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
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

function getSortValue(dateString: string) {
  const parsed = new Date(dateString)
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime()
  }
  const fallbackYear = getYearFromDate(dateString)
  return fallbackYear !== "Unknown" ? Number(fallbackYear) * 10000 : 0
}

function getYearFromDate(dateString: string): string {
  const parsed = new Date(dateString)
  if (!isNaN(parsed.getTime())) {
    return parsed.getFullYear().toString()
  }
  const match = dateString.match(/(19|20)\d{2}/)
  return match ? match[0] : "Unknown"
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
