"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Search, Trophy, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type DirectorySuggestions = {
  athletes: Array<{
    athleteId: string
    name: string
    age: number
    team?: string
    elo: number
  }>
  races: Array<{
    raceId: string
    name: string
    date: string
    location: string
  }>
}

const createEmptyResults = (): DirectorySuggestions => ({
  athletes: [],
  races: [],
})

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DirectorySuggestions>(createEmptyResults)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  const normalizedQuery = query.trim()
  const shouldShowPanel = panelOpen && (normalizedQuery.length > 0 || isLoading)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current || containerRef.current.contains(event.target as Node)) {
        return
      }
      setPanelOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setResults(createEmptyResults())
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Search request failed")
        }

        const payload = (await response.json()) as DirectorySuggestions
        setResults(payload)
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return
        }
        console.error("Search request failed", err)
        setError("Unable to fetch search results.")
        setResults(createEmptyResults())
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [normalizedQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!normalizedQuery) return
    setPanelOpen(false)
    router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`)
  }

  const handleSelect = (path: string) => {
    setPanelOpen(false)
    setQuery("")
    router.push(path)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search athletes, races, or results..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setPanelOpen(true)}
            className="h-14 pl-12 pr-32 text-lg bg-card border-border"
            autoComplete="off"
          />
          <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10">
            Search
          </Button>
        </div>
      </form>

      {shouldShowPanel && (
        <div className="absolute left-0 right-0 top-full z-20 mt-3 rounded-xl border bg-card/95 shadow-2xl backdrop-blur">
          {normalizedQuery.length < 2 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Type at least two characters to search.</p>
          ) : isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Searching…</p>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-destructive">{error}</p>
          ) : (
            <>
              <section className="p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <User className="h-4 w-4" />
                  Athletes
                </div>
                <div className="space-y-1">
                  {results.athletes.map((athlete) => (
                    <button
                      key={athlete.athleteId}
                      type="button"
                      onClick={() => handleSelect(`/athletes/${athlete.athleteId}`)}
                      className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <p className="font-medium leading-tight">{athlete.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Age {athlete.age}
                        {athlete.team ? ` • ${athlete.team}` : ""} • ELO {athlete.elo}
                      </p>
                    </button>
                  ))}
                  {results.athletes.length === 0 && (
                    <p className="rounded-lg px-3 py-2 text-sm text-muted-foreground">No athletes match this search.</p>
                  )}
                </div>
              </section>
              <div className="border-t" />
              <section className="p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  Race Results
                </div>
                <div className="space-y-1">
                  {results.races.map((race) => (
                    <button
                      key={race.raceId}
                      type="button"
                      onClick={() => handleSelect(`/race/${race.raceId}`)}
                      className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <p className="font-medium leading-tight">{race.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {race.location || "Location TBA"} • {race.date}
                      </p>
                    </button>
                  ))}
                  {results.races.length === 0 && (
                    <p className="rounded-lg px-3 py-2 text-sm text-muted-foreground">No race results match this search.</p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
