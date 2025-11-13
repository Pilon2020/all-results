import { NextResponse } from "next/server"
import { z } from "zod"

import { getUserProfileById, updateUserProfile } from "@/lib/server/user-service"

const payloadSchema = z.object({
  userId: z.string().trim().min(1, "A user id is required."),
  firstName: z.union([z.string(), z.null()]).optional(),
  lastName: z.union([z.string(), z.null()]).optional(),
  country: z.union([z.string(), z.null()]).optional(),
  team: z.union([z.string(), z.null()]).optional(),
  photoUrl: z.union([z.string(), z.null()]).optional(),
  age: z.union([z.number(), z.string(), z.null()]).optional(),
  socialLinks: z
    .object({
      strava: z.union([z.string(), z.null()]).optional(),
      instagram: z.union([z.string(), z.null()]).optional(),
    })
    .optional(),
})

const cleanValue = (value?: string | null) => {
  if (value === null) {
    return null
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  return undefined
}

const normalizeAge = (value: unknown) => {
  if (value === null || value === undefined) {
    return value
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const normalizeUrl = (value?: string | null, fieldName?: string) => {
  const cleaned = cleanValue(value)
  if (!cleaned) {
    return cleaned
  }

  try {
    const url = new URL(cleaned)
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol")
    }
    return url.toString()
  } catch {
    throw new Error(`Invalid URL provided for ${fieldName ?? "this field"}.`)
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "A user id is required." }, { status: 400 })
  }

  try {
    const user = await getUserProfileById(userId)
    return NextResponse.json({ user })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load profile."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  let parsedBody: z.infer<typeof payloadSchema>

  try {
    const body = await request.json()
    parsedBody = payloadSchema.parse(body)
  } catch (error) {
    const message = error instanceof z.ZodError ? "Please review the highlighted fields." : "Invalid JSON payload."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const updates = {
      firstName: cleanValue(parsedBody.firstName),
      lastName: cleanValue(parsedBody.lastName),
      country: cleanValue(parsedBody.country),
      team: cleanValue(parsedBody.team),
      photoUrl: normalizeUrl(parsedBody.photoUrl, "photo URL"),
      age: normalizeAge(parsedBody.age),
      socialLinks: parsedBody.socialLinks
        ? {
            strava: normalizeUrl(parsedBody.socialLinks.strava, "Strava link") ?? undefined,
            instagram: normalizeUrl(parsedBody.socialLinks.instagram, "Instagram link") ?? undefined,
          }
        : undefined,
    }

    const user = await updateUserProfile(parsedBody.userId, updates)
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid URL")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Unable to update your profile."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
