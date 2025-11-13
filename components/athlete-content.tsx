"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AthleteResults } from "@/components/athlete-results"
import { AthleteAnalysis } from "@/components/athlete-analysis"
import { AthleteStats } from "@/components/athlete-stats"

interface AthleteContentProps {
  athlete: {
    recentRaces: Array<{
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
    <Tabs defaultValue="results" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="results">Results</TabsTrigger>
        <TabsTrigger value="analysis">Analysis</TabsTrigger>
        <TabsTrigger value="stats">Stats</TabsTrigger>
      </TabsList>

      <TabsContent value="results" className="mt-6">
        <AthleteResults races={athlete.recentRaces} />
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
