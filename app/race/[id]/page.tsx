import { notFound } from "next/navigation"

import { Header } from "@/components/header"
import { RaceHeader } from "@/components/race-header"
import { RaceResults } from "@/components/race-results"
import { RaceMap } from "@/components/race-map"
import { getRaceById } from "@/lib/data"

export default async function RaceProfilePage({ params }: { params: { id: string } }) {
  const race = await getRaceById(params.id)

  if (!race) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <RaceHeader race={race} />

        <div className="mt-8 space-y-8">
          <RaceResults raceId={race.raceId} results={race.results} />
          <RaceMap />
        </div>
      </main>
    </div>
  )
}
