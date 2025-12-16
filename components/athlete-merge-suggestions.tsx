"use client"

import { useMemo, useState } from "react"
import { ArrowRight, Check, Link2, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { formatDistance } from "@/lib/utils"

type PotentialMergeResult = {
  raceId: string
  name: string
  date: string
  location: string
  distance: string
  finishTime: string
  placement: string
  isPR: boolean
  sourceAthleteId: string
  sourceAthleteName: string
  matchScore: number
  reason: string
}

interface AthleteMergeSuggestionsProps {
  athleteId: string
  isClaimed: boolean
  suggestions: PotentialMergeResult[]
}

export function AthleteMergeSuggestions({ athleteId, isClaimed, suggestions }: AthleteMergeSuggestionsProps) {
  const { user } = useAuth()
  const [items, setItems] = useState<PotentialMergeResult[]>(suggestions)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [status, setStatus] = useState<{ type: "idle" | "error" | "success"; message?: string }>({ type: "idle" })

  const claimedByUser = useMemo(() => user?.claimedAthleteId === athleteId, [athleteId, user?.claimedAthleteId])
  const canAttach = Boolean(user && claimedByUser)

  const handleAttach = async (entry: PotentialMergeResult) => {
    if (!user) {
      setStatus({ type: "error", message: "Sign in and claim this athlete to attach results." })
      return
    }
    if (!claimedByUser) {
      setStatus({ type: "error", message: "You need to claim this athlete before adding results." })
      return
    }

    const key = `${entry.sourceAthleteId}-${entry.raceId}`
    setPendingKey(key)
    setStatus({ type: "idle" })

    try {
      const response = await fetch(`/api/athletes/${athleteId}/claim-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          sourceAthleteId: entry.sourceAthleteId,
          raceId: entry.raceId,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || "Unable to attach this result.")
      }

      setItems((prev) => prev.filter((item) => `${item.sourceAthleteId}-${item.raceId}` !== key))
      setStatus({ type: "success", message: "Result added. Refresh to see it in your recent races." })
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to attach this result.",
      })
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Potential results to merge</CardTitle>
        <CardDescription>
          We scan athletes with the same name and country to spot duplicates. If one of these results is yours, attach
          it to this athlete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.type !== "idle" && status.message && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              status.type === "error" ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-600"
            }`}
          >
            {status.type === "error" ? <ShieldAlert className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            <span>{status.message}</span>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unlinked results found for this athlete.</p>
        ) : (
          <div className="space-y-3">
            {items.map((entry) => {
              const key = `${entry.sourceAthleteId}-${entry.raceId}`
              const disableAction = !canAttach || pendingKey === key
              return (
                <div
                  key={key}
                  className="flex flex-col gap-4 rounded-xl border bg-muted/50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{entry.name}</span>
                      <Badge variant="secondary">{entry.distance ? formatDistance(entry.distance) : "Distance n/a"}</Badge>
                      <Badge variant="outline">Match score {entry.matchScore}</Badge>
                      {entry.isPR && <Badge variant="default">PR on source profile</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.date} • {entry.location || "Location n/a"}
                    </p>
                    <p className="text-sm">
                      From <span className="font-semibold">{entry.sourceAthleteName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Why: {entry.reason}</p>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="font-mono text-base text-foreground">{entry.finishTime || "Finish time n/a"}</div>
                      <div>{entry.placement || "Placement n/a"}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAttach(entry)}
                      disabled={disableAction}
                      className="self-stretch md:self-end"
                    >
                      {pendingKey === key ? "Adding…" : "Add to my athlete"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    {!canAttach && (
                      <p className="text-xs text-muted-foreground">
                        <Link2 className="mr-1 inline h-3 w-3" />
                        Claim this athlete to attach results.
                      </p>
                    )}
                    {canAttach && !isClaimed && (
                      <p className="text-xs text-muted-foreground">This action will also mark the athlete as claimed.</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
