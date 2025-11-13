"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trophy, Instagram, Activity, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

interface AthleteHeaderProps {
  athlete: {
    athleteId: string
    firstName: string
    lastName: string
    team?: string
    age?: number | null
    eloScore: number
    country: string
    isClaimed: boolean
    socialLinks?: {
      strava?: string
      instagram?: string
    }
    avatarUrl?: string
  }
}

export function AthleteHeader({ athlete }: AthleteHeaderProps) {
  const router = useRouter()
  const { user, claimAthlete } = useAuth()
  const [isClaimed, setIsClaimed] = useState(athlete.isClaimed)
  const [isClaiming, setIsClaiming] = useState(false)
  const [helperMessage, setHelperMessage] = useState<string | null>(null)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const userClaimedThisAthlete = !!user && user.claimedAthleteId === athlete.athleteId
  const userClaimedSomeoneElse = !!user && user.claimedAthleteId && user.claimedAthleteId !== athlete.athleteId

  useEffect(() => {
    if (athlete.isClaimed || userClaimedThisAthlete) {
      setIsClaimed(true)
    }
  }, [athlete.isClaimed, userClaimedThisAthlete])

  const handleClaim = async () => {
    setHelperMessage(null)

    if (!user) {
      setShowAuthPrompt(true)
      setHelperMessage("Create an account or sign in to claim this athlete.")
      return
    }

    if (userClaimedSomeoneElse) {
      setHelperMessage("You have already claimed a different athlete on this account.")
      return
    }

    try {
      setIsClaiming(true)
      await claimAthlete(athlete.athleteId)
      setIsClaimed(true)
      setHelperMessage("Nice! This athlete is now linked to your account.")
    } catch (error) {
      setHelperMessage(error instanceof Error ? error.message : "Unable to claim this athlete right now.")
    } finally {
      setIsClaiming(false)
    }
  }

  const initials = `${athlete.firstName?.[0] ?? ""}${athlete.lastName?.[0] ?? ""}`

  return (
    <Card style={{ marginBottom: 10 }}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {athlete.avatarUrl ? (
              <div className="h-20 w-20 overflow-hidden rounded-full border">
                <img
                  src={athlete.avatarUrl}
                  alt={`${athlete.firstName} ${athlete.lastName}`}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
                {initials}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {athlete.firstName} {athlete.lastName}
                </h1>
                {(isClaimed || athlete.isClaimed) && (
                  <Badge variant="default" className="bg-chart-1">
                    <Trophy className="mr-1 h-3 w-3" />
                    Claimed
                  </Badge>
                )}
                {userClaimedThisAthlete && <Badge variant="outline">Yours</Badge>}
              </div>

              {athlete.team && <p className="text-lg text-muted-foreground">{athlete.team}</p>}

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Age:</span>
                  <span className="font-semibold">{Number.isFinite(athlete.age) ? athlete.age : "—"}</span>
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
                        <Activity className="mr-1 h-4 w-4" />
                        Strava
                      </Link>
                    </Button>
                  )}
                  {athlete.socialLinks.instagram && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={athlete.socialLinks.instagram} target="_blank">
                        <Instagram className="mr-1 h-4 w-4" />
                        Instagram
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {!isClaimed && (
            <div className="flex w-full items-start justify-end md:w-[10%]">
              <Button
                className="w-full md:w-auto"
                onClick={handleClaim}
                disabled={isClaiming || userClaimedSomeoneElse}
                size="sm"
              >
                {isClaiming ? "Claiming…" : "Claim Athlete"}
              </Button>
            </div>
          )}
        </div>

        {showAuthPrompt && !user && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground">Sign in to claim this profile:</span>
            <Button size="sm" variant="outline" onClick={() => router.push(`/sign-in?next=/athletes/${athlete.athleteId}`)}>
              Sign in
            </Button>
            <Button size="sm" variant="ghost" onClick={() => router.push(`/sign-up?next=/athletes/${athlete.athleteId}`)}>
              Sign up
            </Button>
          </div>
        )}

        {userClaimedSomeoneElse && (
          <p className="mt-3 text-xs text-muted-foreground">You have already claimed another athlete with this account.</p>
        )}

        {helperMessage && !userClaimedThisAthlete && !showAuthPrompt && (
          <p className="mt-3 text-xs text-muted-foreground">{helperMessage}</p>
        )}

        {userClaimedThisAthlete && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" />
            <span>This athlete is linked to your account.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
