import Link from "next/link"
import { Calendar, MapPin, Users, Trophy } from "lucide-react"

import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getRecentRaces } from "@/lib/data"

export const revalidate = 60

export default async function ResultsPage() {
  const recentRaces = await getRecentRaces()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-10">
        <section className="max-w-3xl space-y-4">
          <Badge variant="secondary" className="text-xs">
            Live Results Feed
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">Latest Race Results</h1>
          <p className="text-lg text-muted-foreground">
            Stay up to date with the most recent endurance events being tracked across the platform. Dive into full
            splits, rankings, and course details for every race as soon as they drop.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {recentRaces.map((race) => (
            <Card key={race.raceId} className="flex flex-col">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{race.date}</span>
                </div>
                <CardTitle className="text-2xl text-balance">{race.name}</CardTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{race.location}</span>
                </div>
                <div className="flex flex-wrap gap-3 pt-2 text-sm">
                  <Badge variant="outline">{race.distance}</Badge>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {race.finishers} / {race.participants} finishers
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Top Finishers</p>
                  <ul className="space-y-2">
                    {race.topFinishers.map((finisher, index) => (
                      <li key={`${finisher.athleteId}-${index}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={index === 0 ? "default" : "secondary"}
                            className="w-6 justify-center font-semibold"
                          >
                            {finisher.overall}
                          </Badge>
                          <div>
                            <p className="font-medium leading-tight">{finisher.name}</p>
                            <p className="text-xs text-muted-foreground">{finisher.country}</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">{finisher.finish}</span>
                      </li>
                    ))}
                    {race.topFinishers.length === 0 && (
                      <li className="text-sm text-muted-foreground">Results coming soon.</li>
                    )}
                  </ul>
                </div>
              </CardContent>

              <div className="p-6 pt-0">
                <Button asChild className="w-full">
                  <Link href={`/race/${race.raceId}`}>
                    <Trophy className="h-4 w-4 mr-2" />
                    View Full Results
                  </Link>
                </Button>
              </div>
            </Card>
          ))}

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
