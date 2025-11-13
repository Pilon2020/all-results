import { NextResponse } from "next/server"
import { z } from "zod"

import { PASSWORD_REQUIREMENTS, type SignUpInput } from "@/lib/auth-helpers"
import { createUser } from "@/lib/server/user-service"
import { DuplicateUserError, WeakPasswordError } from "@/lib/server/user-errors"

const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Provide a valid email address."),
  password: z.string(),
})

const formatValidationErrors = (parsedError: z.typeToFlattenedError<SignUpInput>) =>
  Object.values(parsedError.fieldErrors)
    .flat()
    .filter(Boolean)

export async function POST(request: Request) {
  let payload: SignUpInput

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = signUpSchema.safeParse(payload)
  if (!parsed.success) {
    const errors = formatValidationErrors(parsed.error.flatten())
    return NextResponse.json(
      { error: "Please fix the highlighted issues.", details: errors },
      { status: 400 },
    )
  }

  try {
    const user = await createUser(parsed.data)
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof WeakPasswordError) {
      return NextResponse.json(
        { error: error.message, requirements: PASSWORD_REQUIREMENTS },
        { status: error.status },
      )
    }

    if (error instanceof DuplicateUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error("[api/auth/sign-up] Unexpected error", error)
    return NextResponse.json({ error: "Unable to create your account right now." }, { status: 500 })
  }
}
