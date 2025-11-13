"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, TrendingUp, TrendingDown } from "lucide-react"

interface Race {
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
  races: Race[]
}

export function AthleteResults({ races }: AthleteResultsProps) {
  const [showAll, setShowAll] = useState(false)
  const displayedRaces = showAll ? races : races.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Race Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayedRaces.map((race, index) => (
          <Link
            key={index}
            href={`/athlete/analysis/${race.name.toLowerCase().replace(/\s+/g, "-")}`}
            className="block"
          >
            <div className="p-4 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{race.name}</h3>
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

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      <span>Finish Time</span>
                    </div>
                    <p className="text-2xl font-bold font-mono">{race.finishTime}</p>
                    <p className="text-sm text-muted-foreground mt-1">{race.placement}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Elo Change</p>
                    <div
                      className={`flex items-center gap-1 text-lg font-bold ${
                        race.eloChange > 0 ? "text-chart-4" : "text-destructive"
                      }`}
                    >
                      {race.eloChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {race.eloChange > 0 ? "+" : ""}
                      {race.eloChange}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
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
