import { NextResponse } from "next/server"
import { z } from "zod"

import { verifyUserCredentials } from "@/lib/server/user-service"
import { InvalidCredentialsError } from "@/lib/server/user-errors"

const signInSchema = z.object({
  email: z.string().trim().email("Provide a valid email address."),
  password: z.string().min(1, "Password is required."),
})

export async function POST(request: Request) {
  let payload: z.infer<typeof signInSchema>

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = signInSchema.safeParse(payload)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const firstError = Object.values(errors).flat().filter(Boolean)[0]
    return NextResponse.json({ error: firstError || "Invalid credentials." }, { status: 400 })
  }

  try {
    const user = await verifyUserCredentials(parsed.data.email, parsed.data.password)
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error("[api/auth/sign-in] Unexpected error", error)
    return NextResponse.json({ error: "Unable to sign you in right now." }, { status: 500 })
  }
}
