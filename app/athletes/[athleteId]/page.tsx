import { notFound } from "next/navigation"

import { Header } from "@/components/header"
import { AthleteHeader } from "@/components/athlete-header"
import { AthletePRs } from "@/components/athlete-prs"
import { AthleteContent } from "@/components/athlete-content"
import { AthleteMergeSuggestions } from "@/components/athlete-merge-suggestions"
import { getAthleteById, getPotentialAthleteMergeResults } from "@/lib/data"

type AthleteProfilePageProps = {
  params: Promise<{ athleteId: string }>
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { athleteId } = await params
  const athlete = await getAthleteById(athleteId)
  const mergeSuggestions = athlete ? await getPotentialAthleteMergeResults(athlete.athleteId) : []

  if (!athlete) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <AthleteHeader athlete={athlete} />
            <AthleteContent athlete={athlete} />
          </div>

          <div className="lg:col-span-1">
            <AthletePRs prs={athlete.prs} athleteId={athlete.athleteId} races={athlete.recentRaces} />
          </div>
        </div>

        <div className="mt-8">
          <AthleteMergeSuggestions
            athleteId={athlete.athleteId}
            isClaimed={athlete.isClaimed}
            suggestions={mergeSuggestions}
          />
        </div>
      </main>
    </div>
  )
}
