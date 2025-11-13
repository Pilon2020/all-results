export interface SocialLinks {
  strava?: string
  instagram?: string
}

export interface PublicUser {
  id: string
  email: string
  firstName: string
  lastName: string
  name: string
  claimedAthleteId?: string
  country?: string | null
  team?: string | null
  age?: number | null
  photoUrl?: string | null
  socialLinks?: SocialLinks
}

export interface SignUpInput {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface ProfileUpdateInput {
  firstName?: string | null
  lastName?: string | null
  country?: string | null
  team?: string | null
  age?: number | null
  photoUrl?: string | null
  socialLinks?: SocialLinks | null
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const cleanString = (value?: string) => (value ?? "").trim().replace(/\s+/g, " ")

export const buildDisplayName = (firstName: string, lastName: string, fallback: string) => {
  const combined = [firstName, lastName].filter(Boolean).join(" ").trim()
  return combined || fallback || "Athlete"
}

export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/

export const isPasswordSecure = (password: string) => STRONG_PASSWORD_REGEX.test(password)

export const PASSWORD_REQUIREMENTS =
  "Use at least 10 characters, including upper and lowercase letters, a number, and a special character."
