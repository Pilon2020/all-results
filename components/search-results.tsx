import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Trophy, Calendar } from "lucide-react"

import { searchDirectory } from "@/lib/data"

interface SearchResultsProps {
  query: string
}

export async function SearchResults({ query }: SearchResultsProps) {
  const results = await searchDirectory(query)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Search Results</h1>
        <p className="text-muted-foreground">
          Showing results for <span className="text-foreground font-medium">&quot;{query}&quot;</span>
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Athletes
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {results.athletes.map((athlete) => (
              <Link key={athlete.athleteId} href={`/athletes/${athlete.athleteId}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{athlete.name}</span>
                      <Badge variant="secondary">ELO {athlete.elo}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Age: {athlete.age}</p>
                      <p>Team: {athlete.team}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {results.athletes.length === 0 && (
              <Card>
                <CardContent className="p-6 text-muted-foreground text-sm">No athletes match this search.</CardContent>
              </Card>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Races
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {results.races.map((race) => (
              <Link key={race.raceId} href={`/race/${race.raceId}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle>{race.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {race.date}
                      </p>
                      <p>{race.location}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {results.races.length === 0 && (
              <Card>
                <CardContent className="p-6 text-muted-foreground text-sm">No races match this search.</CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
