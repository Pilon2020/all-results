import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

import { Header } from "@/components/header"
import { RaceAnalysisHeader } from "@/components/race-analysis-header"
import { RaceAnalysisOverview } from "@/components/race-analysis-overview"
import { RaceAnalysisSplits } from "@/components/race-analysis-splits"
import { RaceAnalysisComparison } from "@/components/race-analysis-comparison"
import { Button } from "@/components/ui/button"
import { getAthleteRaceAnalysis } from "@/lib/data"

export default async function AthleteRaceAnalysisPage({
  params,
}: {
  params: { athleteId: string; raceId: string }
}) {
  const data = await getAthleteRaceAnalysis(params.athleteId, params.raceId)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="gap-2">
            <Link href={`/athlete/${params.athleteId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Athlete Profile
            </Link>
          </Button>
        </div>

        <div className="space-y-8">
          <RaceAnalysisHeader athlete={data.athlete} race={data.race} performance={data.performance} />
          <RaceAnalysisOverview performance={data.performance} />
          <RaceAnalysisSplits splits={data.splits} />
          <RaceAnalysisComparison comparison={data.comparison} />
        </div>
      </main>
    </div>
  )
}
