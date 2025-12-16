export type DateInput = string | number | Date | null | undefined

export function parseDateInput(value: DateInput): Date | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    const mdYMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/)
    if (mdYMatch) {
      const [, mm, dd, yyyy] = mdYMatch
      const parsed = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)))
      return isNaN(parsed.getTime()) ? null : parsed
    }
    const parsed = new Date(trimmed)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === "number") {
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

export function formatDisplayDate(value: DateInput, fallback = "Unknown date"): string {
  const parsed = parseDateInput(value)
  if (!parsed) return fallback

  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0")
  const day = String(parsed.getUTCDate()).padStart(2, "0")
  const year = parsed.getUTCFullYear()
  return `${month}-${day}-${year}`
}

export function getYearFromDate(value: DateInput): string {
  const parsed = parseDateInput(value)
  if (parsed) {
    return parsed.getUTCFullYear().toString()
  }
  if (typeof value === "string") {
    const match = value.match(/(19|20)\d{2}/)
    if (match) {
      return match[0]
    }
  }
  return "Unknown"
}

export function getDateSortValue(value: DateInput): number {
  const parsed = parseDateInput(value)
  if (parsed) {
    return parsed.getTime()
  }
  const year = getYearFromDate(value)
  return year === "Unknown" ? 0 : Number(year) * 10000
}
