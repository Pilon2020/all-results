import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Trophy, ExternalLink } from "lucide-react"

interface RaceAnalysisHeaderProps {
  athlete: {
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
  }
}

export function RaceAnalysisHeader({ athlete, race, performance }: RaceAnalysisHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
          {athlete.name} - {race.name}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline">{athlete.country}</Badge>
          <Badge variant="outline">Age {athlete.age}</Badge>
          <Badge variant="outline">Bib #{performance.bib}</Badge>
          <Badge variant="secondary">{race.distance}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Race Date</p>
                  <p className="font-semibold">{race.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{race.location}</p>
                </div>
              </div>

              <Button variant="outline" size="sm" asChild>
                <Link href={`/race/${race.id}`}>
                  View Full Race Results
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="text-center p-6 rounded-lg bg-primary/10">
                <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Overall Place</p>
                <p className="text-4xl font-bold text-primary">{performance.overall}</p>
              </div>

              <div className="text-center p-6 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Finish Time</p>
                <p className="text-4xl font-bold font-mono">{performance.finishTime}</p>
                <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Gender: </span>
                    <span className="font-semibold">{performance.gender}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Division: </span>
                    <span className="font-semibold">{performance.division}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
