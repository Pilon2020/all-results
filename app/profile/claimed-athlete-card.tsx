"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type RecentRace = {
  raceId: string
  name: string
  date: string
  location: string
  finishTime: string
  placement: string
}

type ClaimedAthleteResponse = {
  athlete: {
    athleteId: string
    firstName: string
    lastName: string
    country: string
    team?: string
    age?: number
    avatarUrl?: string
    recentRaces: RecentRace[]
  }
}

export function ClaimedAthleteCard({ athleteId }: { athleteId: string }) {
  const [state, setState] = useState<
    | { status: "idle" | "loading" }
    | { status: "error"; message: string }
    | { status: "success"; data: ClaimedAthleteResponse["athlete"] }
  >({ status: "loading" })

  useEffect(() => {
    let isMounted = true

    const loadAthlete = async () => {
      try {
        setState({ status: "loading" })
        const response = await fetch(`/api/athletes/${athleteId}`)
        const payload = (await response.json()) as ClaimedAthleteResponse | { error: string }
        if (!response.ok) {
          throw new Error("Failed to load athlete details.")
        }
        if (isMounted) {
          setState({ status: "success", data: payload.athlete })
        }
      } catch (error) {
        if (isMounted) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to load athlete information.",
          })
        }
      }
    }

    loadAthlete()
    return () => {
      isMounted = false
    }
  }, [athleteId])

  if (state.status === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Linked athlete</CardTitle>
          <CardDescription>Loading your athlete profile…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (state.status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Linked athlete</CardTitle>
          <CardDescription>We couldn&apos;t pull your athlete record.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{state.message}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Refresh the page, or visit your athlete profile directly to confirm it&apos;s still published.
          </p>
        </CardContent>
      </Card>
    )
  }

  const athlete = state.data
  const headline = `${athlete.firstName} ${athlete.lastName}`

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {athlete.avatarUrl ? (
            <img
              src={athlete.avatarUrl}
              alt={headline}
              className="h-14 w-14 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {athlete.firstName[0]}
              {athlete.lastName[0]}
            </div>
          )}
          <div>
            <CardTitle className="text-2xl">{headline}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span>{athlete.country}</span>
              {athlete.team && (
                <>
                  <span>•</span>
                  <span>{athlete.team}</span>
                </>
              )}
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Synced</Badge>
          {typeof athlete.age === "number" && (
            <span className="text-sm text-muted-foreground">Age {athlete.age}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">View the public profile for detailed stats.</p>
          <Button asChild size="sm">
            <Link href={`/athletes/${athlete.athleteId}`} target="_blank">
              Open profile
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">Recent results</p>
          <div className="space-y-2">
            {athlete.recentRaces.slice(0, 3).map((race) => (
              <div
                key={race.raceId}
                className="rounded-lg border px-3 py-2 text-sm hover:border-primary/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{race.name}</span>
                  <span className="text-xs text-muted-foreground">{race.date}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                  <span>{race.location}</span>
                  <span>
                    {race.finishTime} • {race.placement}
                  </span>
                </div>
              </div>
            ))}

            {athlete.recentRaces.length === 0 && (
              <p className="text-sm text-muted-foreground">No races are attached to this athlete yet.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
