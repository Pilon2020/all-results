"use client"
import { useEffect, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AthleteResults } from "@/components/athlete-results"
import { AthleteAnalysis } from "@/components/athlete-analysis"
import { AthleteStats } from "@/components/athlete-stats"

interface AthleteContentProps {
  athlete: {
    athleteId: string
    recentRaces: Array<{
      raceId: string
      name: string
      date: string
      location: string
      distance: string
      draftLegal: boolean
      finishTime: string
      placement: string
      isPR: boolean
      eloChange: number
    }>
  }
}

export function AthleteContent({ athlete }: AthleteContentProps) {
  const [tab, setTab] = useState("results")
  const tabOrder = ["results", "analysis", "stats"] as const
  const listRef = useRef<HTMLDivElement | null>(null)
  const [thumbMetrics, setThumbMetrics] = useState({ x: 0, width: 0, offset: 0 })

  useEffect(() => {
    function updateThumb() {
      const activeIndex = tabOrder.indexOf(tab as (typeof tabOrder)[number])
      const width = listRef.current?.offsetWidth ?? 0
      const segment = width / tabOrder.length
      const offset = activeIndex === 0 ? 4 : activeIndex === tabOrder.length - 1 ? -4 : 0
      setThumbMetrics({
        x: Math.max(0, segment * activeIndex),
        width: segment,
        offset,
      })
    }
    updateThumb()
    window.addEventListener("resize", updateThumb)
    return () => window.removeEventListener("resize", updateThumb)
  }, [tab])

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
      <div className="sticky top-4 z-20 flex justify-center md:justify-start" style={{ margin: 0 }}>
        <TabsList
          ref={listRef}
          className="relative inline-flex w-full items-center rounded-full border bg-background/80 p-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <div
            className="pointer-events-none absolute inset-y-1 left-0 transition-transform duration-300 ease-out"
            style={{
              width: `${thumbMetrics.width}px`,
              transform: `translateX(${thumbMetrics.x + thumbMetrics.offset}px)`,
            }}
          >
            <div className="h-full rounded-full bg-primary/90 shadow-md" />
          </div>
          <TabsTrigger
            value="results"
            className="relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground duration-300 ease-out"
            data-pos="results"
          >
            Results
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground duration-300 ease-out"
            data-pos="analysis"
          >
            Analysis
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground duration-300 ease-out"
            data-pos="stats"
          >
            Stats
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="results" className="mt-6" style={{marginTop: 0}}>
        <AthleteResults athleteId={athlete.athleteId} races={athlete.recentRaces} />
      </TabsContent>

      <TabsContent value="analysis" className="mt-6">
        <AthleteAnalysis athleteId={athlete.athleteId} />
      </TabsContent>

      <TabsContent value="stats" className="mt-6">
        <AthleteStats />
      </TabsContent>
    </Tabs>
  )
}
