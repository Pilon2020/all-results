import { notFound } from "next/navigation"

import { Header } from "@/components/header"
import { RaceHeader } from "@/components/race-header"
import { RaceResults } from "@/components/race-results"
import { RaceMap } from "@/components/race-map"
import { getRaceById } from "@/lib/data"

type RaceProfilePageProps = {
  params: Promise<{ id: string }>
}

export default async function RaceProfilePage({ params }: RaceProfilePageProps) {
  const { id } = await params
  const race = await getRaceById(id)

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
