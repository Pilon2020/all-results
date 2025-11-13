import { NextResponse } from "next/server"

import { getAthleteById } from "@/lib/data"

interface RouteContext {
  params: Promise<{ athleteId: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const { athleteId } = await context.params

  if (!athleteId) {
    return NextResponse.json({ error: "Missing athlete id." }, { status: 400 })
  }

  const athlete = await getAthleteById(athleteId)

  if (!athlete) {
    return NextResponse.json({ error: "Athlete not found." }, { status: 404 })
  }

  return NextResponse.json({ athlete })
}
