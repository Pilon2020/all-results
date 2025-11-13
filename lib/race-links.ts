export type RaceReference =
  | string
  | (Partial<{
      raceId: string
      id: string
      race_id: string
      raceID: string
      race: RaceReference
    }> &
      Record<string, unknown>)

export function resolveRaceId(reference?: RaceReference | null): string | undefined {
  if (!reference) return undefined
  if (typeof reference === "string") {
    return reference
  }

  const direct = reference.raceId ?? reference.id ?? reference.race_id ?? reference.raceID
  if (typeof direct === "string" && direct.trim()) {
    return direct
  }

  if (reference.race && typeof reference.race === "object") {
    return resolveRaceId(reference.race)
  }

  return undefined
}

export function buildAthleteRaceHref(athleteId?: string, reference?: RaceReference | null) {
  const raceId = resolveRaceId(reference)
  if (!raceId) return null
  return athleteId ? `/athletes/${athleteId}/races/${raceId}` : `/race/${raceId}`
}
