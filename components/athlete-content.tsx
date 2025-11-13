"use client"
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
      finishTime: string
      placement: string
      isPR: boolean
      eloChange: number
    }>
  }
}

export function AthleteContent({ athlete }: AthleteContentProps) {
  return (
    <Tabs defaultValue="results" className="w-full space-y-6">
      <div className="sticky top-4 z-20 flex justify-center md:justify-start" style={{margin: 0}}>
        <TabsList className="inline-flex items-center gap-1 rounded-full border bg-background/80 p-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60" style={{width: "100%"}}>
          <TabsTrigger
            value="results"
            className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Results
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Analysis
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Stats
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="results" className="mt-6" style={{marginTop: 0}}>
        <AthleteResults athleteId={athlete.athleteId} races={athlete.recentRaces} />
      </TabsContent>

      <TabsContent value="analysis" className="mt-6">
        <AthleteAnalysis />
      </TabsContent>

      <TabsContent value="stats" className="mt-6">
        <AthleteStats />
      </TabsContent>
    </Tabs>
  )
}
