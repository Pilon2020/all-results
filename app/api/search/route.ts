import { NextResponse } from "next/server"

import { searchDirectory } from "@/lib/data"

export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") ?? "").trim()

  if (!query) {
    return NextResponse.json({ athletes: [], races: [] })
  }

  try {
    const results = await searchDirectory(query)
    return NextResponse.json(results)
  } catch (error) {
    console.error("[api/search] Failed to fetch directory results", error)
    return NextResponse.json({ error: "Unable to fetch directory results." }, { status: 500 })
  }
}
