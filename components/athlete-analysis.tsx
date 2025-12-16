"use client"

import { useEffect, useMemo, useState } from "react"

import { ArrowLeftRight, Bike, Flag, Footprints, Info, Waves } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

// Mock data for charts
const swimData = [
  { date: "Jan 23", duration: 52, pace: 1.45 },
  { date: "Mar 23", duration: 50, pace: 1.42 },
  { date: "May 23", duration: 49, pace: 1.38 },
  { date: "Jul 23", duration: 48, pace: 1.35 },
  { date: "Oct 23", duration: 48, pace: 1.33 },
]

const bikeData = [
  { date: "Jan 23", duration: 265, speed: 40.5 },
  { date: "Mar 23", duration: 258, speed: 41.8 },
  { date: "May 23", duration: 255, speed: 42.3 },
  { date: "Jul 23", duration: 252, speed: 42.8 },
  { date: "Oct 23", duration: 252, speed: 42.9 },
]

const runData = [
  { date: "Jan 23", duration: 182, pace: 4.32 },
  { date: "Mar 23", duration: 175, pace: 4.15 },
  { date: "May 23", duration: 168, pace: 3.58 },
  { date: "Jul 23", duration: 162, pace: 3.52 },
  { date: "Oct 23", duration: 158, pace: 3.45 },
]

type BestSplits = {
  swim: string | null
  t1: string | null
  bike: string | null
  t2: string | null
  run: string | null
  finish: string | null
}

type BestSplitsResponse = {
  distances: Array<{
    key: string
    label: string
    races: Array<{
      raceId?: string
      name?: string
      date?: string
      splits: Partial<Record<keyof BestSplits, string>>
    }>
  }>
}

const SPLIT_META = [
  { key: "swim", label: "Swim", icon: Waves },
  { key: "t1", label: "Transition 1", icon: ArrowLeftRight },
  { key: "bike", label: "Bike", icon: Bike },
  { key: "t2", label: "Transition 2", icon: ArrowLeftRight },
  { key: "run", label: "Run", icon: Footprints },
  { key: "finish", label: "Finish Time", icon: Flag },
] as const

export function AthleteAnalysis({ athleteId }: { athleteId: string }) {
  const [distances, setDistances] = useState<BestSplitsResponse["distances"]>([])
  const [selectedDistance, setSelectedDistance] = useState<string | null>(null)
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const response = await fetch(`/api/athletes/${athleteId}/best-splits`)
        if (!response.ok) {
          throw new Error(`Failed to load splits (${response.status})`)
        }
        const data: BestSplitsResponse = await response.json()
        if (cancelled) return
        setDistances(data.distances || [])
        const initialDistance = (prev: string | null) => prev ?? data.distances?.[0]?.key ?? null
        const distanceKey = initialDistance(selectedDistance)
        setSelectedDistance(distanceKey)

        const firstRaceId =
          data.distances?.find((d) => d.key === distanceKey)?.races?.[0]?.raceId ??
          data.distances?.find((d) => d.key === distanceKey)?.races?.[0]?.name ??
          null
        setSelectedRaceId(firstRaceId)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Unable to load splits")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [athleteId])

  useEffect(() => {
    if (!selectedDistance) return
    const distance = distances.find((d) => d.key === selectedDistance)
    const firstRace = distance?.races?.[0]
    if (firstRace && !selectedRaceId) {
      setSelectedRaceId(firstRace.raceId ?? firstRace.name ?? null)
    }
  }, [distances, selectedDistance, selectedRaceId])

  const activeDistance = useMemo(() => distances.find((d) => d.key === selectedDistance), [distances, selectedDistance])

  const fastestBySplit = useMemo(() => {
    if (!activeDistance) return {}
    const best: Record<string, { time: string; source: string | null; seconds: number }> = {}

    activeDistance.races.forEach((race) => {
      SPLIT_META.forEach((meta) => {
        const value = race.splits?.[meta.key as keyof BestSplits]
        if (!value) return
        const parts = String(value).split(":").map((p) => Number(p))
        let seconds = Number.POSITIVE_INFINITY
        if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) {
          const [h, m, s] = parts
          seconds = h * 3600 + m * 60 + s
        } else if (parts.length === 2 && parts.every((p) => Number.isFinite(p))) {
          const [m, s] = parts
          seconds = m * 60 + s
        }
        if (!Number.isFinite(seconds)) return
        const source = race.name ? `${race.name}${race.date ? ` • ${race.date}` : ""}` : null
        const current = best[meta.key]
        if (!current || seconds < current.seconds) {
          best[meta.key] = { time: String(value), source, seconds }
        }
      })
    })

    return best
  }, [activeDistance])

  const splitCards = SPLIT_META.map((meta) => ({
    ...meta,
    time: fastestBySplit[meta.key]?.time ?? "—",
    source: fastestBySplit[meta.key]?.source ?? null,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Best Splits</CardTitle>
            <Badge variant="secondary" className="text-xs">
              Claimed results
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground">Distance</span>
              {distances.length === 0 && !loading ? (
                <span className="text-muted-foreground">No distances yet</span>
              ) : (
                distances.map((distance) => (
                  <button
                    key={distance.key}
                    onClick={() => {
                      setSelectedDistance(distance.key)
                      const first = distance.races?.[0]
                      setSelectedRaceId(first?.raceId ?? first?.name ?? null)
                    }}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                      selectedDistance === distance.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {distance.label}
                  </button>
                ))
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && selectedDistance === null && !loading && (
            <p className="text-sm text-muted-foreground">No claimed results with splits yet.</p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {splitCards.map((split) => (
              <div
                key={split.label}
                className="rounded-2xl border border-border/70 bg-card shadow-sm"
              >
                <div className="flex h-full items-stretch gap-3 px-3 py-3">
                  <span className="mt-0.5 mb-0.5 w-1 rounded-full bg-primary/90" aria-hidden="true" />
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                      <span>{split.label}</span>
                      {split.source ? (
                        <div className="relative group">
                          <Info className="h-4 w-4 text-muted-foreground" />
                          <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden min-w-[180px] rounded-md border border-border bg-popover px-3 py-2 text-xs text-foreground shadow-md group-hover:block">
                            {split.source}
                          </div>
                        </div>
                      ) : (
                        <Info className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="font-mono text-2xl md:text-3xl font-extrabold leading-none text-foreground">
                        {loading ? "…" : split.time || "—"}
                      </p>
                      <split.icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance Analysis</CardTitle>
            <Badge variant="outline">Metric</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Swim Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-3" />
              Swim Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={swimData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  name="Duration (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bike Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-2" />
              Bike Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={bikeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Avg Speed (km/h)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Run Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-1" />
              Run Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={runData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Duration (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
