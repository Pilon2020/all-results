import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Instagram, Activity } from "lucide-react"
import Link from "next/link"

interface AthleteHeaderProps {
  athlete: {
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
  }
}

export function AthleteHeader({ athlete }: AthleteHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
              {athlete.firstName[0]}
              {athlete.lastName[0]}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {athlete.firstName} {athlete.lastName}
                </h1>
                {athlete.isClaimed && (
                  <Badge variant="default" className="bg-chart-1">
                    <Trophy className="h-3 w-3 mr-1" />
                    Claimed
                  </Badge>
                )}
              </div>

              {athlete.team && <p className="text-lg text-muted-foreground">{athlete.team}</p>}

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Age:</span>
                  <span className="font-semibold">{athlete.age}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Country:</span>
                  <Badge variant="outline">{athlete.country}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Elo Score:</span>
                  <span className="text-xl font-bold text-primary">{athlete.eloScore}</span>
                </div>
              </div>

              {athlete.socialLinks && (
                <div className="flex items-center gap-2 pt-2">
                  {athlete.socialLinks.strava && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={athlete.socialLinks.strava} target="_blank">
                        <Activity className="h-4 w-4 mr-1" />
                        Strava
                      </Link>
                    </Button>
                  )}
                  {athlete.socialLinks.instagram && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={athlete.socialLinks.instagram} target="_blank">
                        <Instagram className="h-4 w-4 mr-1" />
                        Instagram
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
