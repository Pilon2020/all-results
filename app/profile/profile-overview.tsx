"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { ClaimedAthleteCard } from "./claimed-athlete-card"

const vitalsConfig = [
  { label: "Country", field: "country" },
  { label: "Team", field: "team" },
  { label: "Age", field: "age" },
]

const KEY_STATS_STORAGE = "rt-key-stats"

type AthletePayload = {
  athleteId: string
  country?: string
  team?: string
  prs?: {
    sprint?: { time?: string; race?: string }
    olympic?: { time?: string; race?: string }
    half?: { time?: string; race?: string }
    full?: { time?: string; race?: string }
  }
}

export function ProfileOverview() {
  const router = useRouter()
  const { user } = useAuth()
  const [claimedAthlete, setClaimedAthlete] = useState<AthletePayload | null>(null)
  const [selectedStatIds, setSelectedStatIds] = useState<string[]>(["training_focus", "primary_location"])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!user?.claimedAthleteId) {
      setClaimedAthlete(null)
      return
    }

    let isMounted = true
    fetch(`/api/athletes/${user.claimedAthleteId}`)
      .then((res) => res.json())
      .then((payload: { athlete: AthletePayload } & Record<string, unknown>) => {
        if (isMounted && payload?.athlete) {
          setClaimedAthlete(payload.athlete)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [user?.claimedAthleteId])

  useEffect(() => {
    const saved = localStorage.getItem(KEY_STATS_STORAGE)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedStatIds(parsed.slice(0, 2))
        }
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(KEY_STATS_STORAGE, JSON.stringify(selectedStatIds))
  }, [selectedStatIds])

  const availableStats = useMemo(() => buildAvailableStats(user, claimedAthlete), [user, claimedAthlete])
  const heroStats = useMemo(() => {
    const picked = selectedStatIds
      .map((id) => availableStats.find((stat) => stat.id === id))
      .filter(Boolean) as Array<{ id: string; label: string; value: string; hint?: string }>

    if (picked.length < 2) {
      const extras = availableStats.filter((stat) => !picked.some((p) => p?.id === stat.id))
      return [...picked, ...extras].slice(0, 2)
    }
    return picked.slice(0, 2)
  }, [selectedStatIds, availableStats])

  const toggleStat = (id: string, nextChecked: boolean) => {
    setSelectedStatIds((prev) => {
      if (!nextChecked) {
        return prev.filter((statId) => statId !== id)
      }
      if (prev.includes(id)) {
        return prev
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), id]
      }
      return [...prev, id]
    })
  }

  if (!user) {
    return (
      <Card className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
        <CardHeader>
          <CardTitle>Sign in to view your profile</CardTitle>
          <CardDescription className="text-slate-200">Access your account overview and see linked athlete results.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => router.push("/sign-in?next=/profile")}>Sign in</Button>
          <Button variant="outline" onClick={() => router.push("/sign-up?next=/profile")}>
            Sign up
          </Button>
        </CardContent>
      </Card>
    )
  }

  const fullName = `${user.firstName} ${user.lastName}`
  const initials = `${user.firstName[0]}${user.lastName[0]}`

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-[#5d2f4b] via-[#6b3453] to-[#7b405c] p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={fullName}
                className="h-20 w-20 rounded-2xl border-2 border-white/30 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-2xl font-semibold text-white">
                {initials}
              </div>
            )}
            <div>
              <p className="text-sm uppercase tracking-wide text-white/70">Dial in your performance.</p>
              <h2 className="text-4xl font-bold">{fullName}</h2>
              <p className="text-white/80">
                {typeof user.age === "number" ? `${user.age} yrs` : "Age —"} · {user.country || "Location —"}
              </p>
            </div>
          </div>

          <Button asChild variant="secondary" className="bg-slate-900/30 text-white hover:bg-white/10">
            <Link href="/profile/settings">Edit profile</Link>
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {heroStats.map((stat) => (
              <HeroStat key={stat.id} label={stat.label} value={stat.value} hint={stat.hint} />
            ))}
          </div>

          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="text-white/80 hover:text-white">
                  Customize stats
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Choose key stats</DialogTitle>
                  <DialogDescription>Select up to two stats to feature in your hero card.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {availableStats.map((stat) => {
                    const checked = selectedStatIds.includes(stat.id)
                    const disabled = !checked && selectedStatIds.length >= 2
                    return (
                      <label
                        key={stat.id}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border p-3",
                          checked ? "border-primary bg-primary/5" : "border-muted",
                          disabled && "opacity-50",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(value) => toggleStat(stat.id, Boolean(value))}
                        />
                        <div>
                          <p className="font-medium">{stat.label}</p>
                          <p className="text-sm text-muted-foreground">{stat.value}</p>
                          {stat.hint && <p className="text-xs text-muted-foreground">{stat.hint}</p>}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-[#050B1A] p-6 text-white shadow-2xl ring-1 ring-white/5">
        <h3 className="text-lg font-semibold tracking-tight">Vitals</h3>
        <p className="text-sm text-white/60">Quick facts that sync to your athlete profile.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {vitalsConfig.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-widest text-white/60">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">
                {item.field === "age"
                  ? typeof user.age === "number"
                    ? user.age
                    : "—"
                  : (user as Record<string, string | null | undefined>)[item.field] || "—"}
              </p>
            </div>
          ))}

          <DetailLink label="Strava" value={user.socialLinks?.strava} />
          <DetailLink label="Instagram" value={user.socialLinks?.instagram} />
        </div>
      </section>

      {user.claimedAthleteId ? (
        <ClaimedAthleteCard athleteId={user.claimedAthleteId} />
      ) : (
        <Card className="rounded-3xl border-dashed border-slate-800 bg-slate-950 text-white">
          <CardHeader>
            <CardTitle>Claim your athlete</CardTitle>
            <CardDescription className="text-white/70">
              Claim an athlete to display recent results and manage their public profile from here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/search">Find an athlete</Link>
            </Button>
            <p className="text-sm text-white/60">Open any athlete page and use the Claim button near the header.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.25em] text-white/70">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      {hint && <p className="text-sm text-white/80">{hint}</p>}
    </div>
  )
}

type KeyStatOption = { id: string; label: string; value: string; hint?: string }

function buildAvailableStats(user: ReturnType<typeof useAuth>["user"], athlete?: AthletePayload | null): KeyStatOption[] {
  if (!user) {
    return []
  }

  const stats: KeyStatOption[] = [
    {
      id: "training_focus",
      label: "Training focus",
      value: user.team || "Unassigned",
    },
    {
      id: "primary_location",
      label: "Primary location",
      value: user.country || "Add your country to tailor regional stats.",
    },
  ]

  if (athlete?.prs) {
    const prStats = [
      { key: "sprint", title: "Sprint PR" },
      { key: "olympic", title: "Olympic PR" },
      { key: "half", title: "Half Ironman PR" },
      { key: "full", title: "Full Ironman PR" },
    ] as const

    prStats.forEach(({ key, title }) => {
      const record = athlete.prs?.[key]
      if (record?.time) {
        stats.push({
          id: `pr_${key}`,
          label: title,
          value: record.time,
          hint: record.race ? `Set at ${record.race}` : undefined,
        })
      }
    })
  }

  const stravaHost = getHostname(user.socialLinks?.strava)
  if (user.socialLinks?.strava) {
    stats.push({
      id: "strava_link",
      label: "Strava link",
      value: "View activity feed",
      hint: stravaHost,
    })
  }

  const instagramHost = getHostname(user.socialLinks?.instagram)
  if (user.socialLinks?.instagram) {
    stats.push({
      id: "instagram_link",
      label: "Instagram",
      value: "Share your story",
      hint: instagramHost,
    })
  }

  if (stats.length === 0) {
    return [
      {
        id: "placeholder",
        label: "Add some info",
        value: "Update your profile to highlight stats here.",
      },
    ]
  }

  return stats
}

function getHostname(url?: string | null) {
  if (!url) return undefined
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return host
  } catch {
    return undefined
  }
}

function DetailLink({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center text-lg font-semibold text-white hover:text-white/80"
        >
          View
        </a>
      ) : (
        <p className="mt-2 text-2xl font-semibold text-white/60">—</p>
      )}
    </div>
  )
}
