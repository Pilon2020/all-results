import { NextResponse } from "next/server"
import { z } from "zod"

import { assignClaimedAthlete } from "@/lib/server/user-service"
import { UserNotFoundError } from "@/lib/server/user-errors"

const claimSchema = z.object({
  userId: z.string().trim().min(1, "User id is required."),
  athleteId: z.string().trim().min(1, "Athlete id is required."),
})

export async function POST(request: Request) {
  let payload: z.infer<typeof claimSchema>

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = claimSchema.safeParse(payload)
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat().filter(Boolean)[0]
    return NextResponse.json({ error: firstError || "Invalid claim payload." }, { status: 400 })
  }

  try {
    const user = await assignClaimedAthlete(parsed.data.userId, parsed.data.athleteId)
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error("[api/auth/claim] Failed to apply athlete claim", error)
    return NextResponse.json({ error: "Unable to link this athlete to your account right now." }, { status: 500 })
  }
}
