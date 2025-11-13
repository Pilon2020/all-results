import { notFound } from "next/navigation"

import { Header } from "@/components/header"
import { AthleteHeader } from "@/components/athlete-header"
import { AthletePRs } from "@/components/athlete-prs"
import { AthleteContent } from "@/components/athlete-content"
import { getAthleteById } from "@/lib/data"

export default async function AthleteProfilePage({ params }: { params: { id: string } }) {
  const athlete = await getAthleteById(params.id)

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
            <AthletePRs prs={athlete.prs} />
          </div>
        </div>
      </main>
    </div>
  )
}
