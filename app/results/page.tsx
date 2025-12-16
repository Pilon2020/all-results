import Link from "next/link"
import { Calendar, ChevronRight, MapPin, Users } from "lucide-react"

import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { getRecentRaces } from "@/lib/data"
import { formatDistance } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ResultsPage() {
  const recentRaces = await getRecentRaces(20)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="max-w-3xl space-y-3">
          <Badge variant="secondary" className="text-xs tracking-wide">
            Live Results Feed
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">Latest Race Results</h1>
          <p className="text-lg text-muted-foreground">
            Stay up to date with the most recent endurance events being tracked across the platform. Dive into full
            splits, rankings, and course details for every race as soon as they drop.
          </p>
        </section>

        <section className="space-y-3">
          {recentRaces.map((race) => {
            const locationParts = race.location.split(",").map((part) => part.trim()).filter(Boolean)
            const locationTag = locationParts[locationParts.length - 1]?.toUpperCase() ?? ""

            return (
              <Card key={race.raceId} className="w-full transition-colors hover:border-primary/40">
                <CardContent className="p-0">
                  <Link
                    href={`/race/${race.raceId}`}
                    className="flex flex-col gap-3 py-0 px-4 md:flex-row md:items-center md:justify-between md:gap-4"
                  >
                    <div className="flex items-start gap-3 md:gap-4 min-w-0">
                      <div className="flex h-10 w-14 items-center justify-center rounded-md bg-muted text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {locationTag || "Race"}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="text-base md:text-lg font-semibold leading-tight text-foreground truncate">
                          {race.name}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {race.date}
                          </span>
                          <span className="hidden text-muted-foreground md:inline">•</span>
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{race.location}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-foreground/80">
                      <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px] md:text-xs">
                        {formatDistance(race.distance)}
                      </Badge>
                      {race.draftLegal === true && (
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px] md:text-xs">
                          Draft legal
                        </Badge>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{race.finishers}</span>
                        <span className="text-[11px]">finishers</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-primary" />
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )
          })}

          {recentRaces.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No races have been added yet. Once new events are ingested they will appear here automatically.
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  )
}
