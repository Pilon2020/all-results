"use server"

import "server-only"

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto"
import { promisify } from "util"
import { ObjectId, type Collection, type Filter } from "mongodb"

import { getDataDb } from "@/lib/mongodb"
import {
  buildDisplayName,
  cleanString,
  isPasswordSecure,
  normalizeEmail,
  type ProfileUpdateInput,
  type PublicUser,
  type SignUpInput,
} from "@/lib/auth-helpers"
import { DuplicateUserError, InvalidCredentialsError, UserNotFoundError, WeakPasswordError } from "@/lib/server/user-errors"

const USERS_COLLECTION = "users"
const USER_CLAIMS_COLLECTION = "userClaims"
const ENCRYPTION_ALGO = "aes-256-gcm"
const KEY_LENGTH = 32
const IV_LENGTH = 12
const PASSWORD_KEY_LEN = 64

const scrypt = promisify(scryptCallback)

type PasswordRecord = {
  salt: string
  hash: string
}

type EncryptedPayload = {
  iv: string
  tag: string
  content: string
}

type ProfilePayload = {
  firstName: string
  lastName: string
  email: string
  name: string
  claimedAthleteId?: string
  country?: string | null
  team?: string | null
  age?: number | null
  photoUrl?: string | null
  socialLinks?: {
    strava?: string
    instagram?: string
  }
}

type MongoId = ObjectId | string

type UserDocument = {
  _id: MongoId
  emailHash: string
  password: PasswordRecord
  profile: EncryptedPayload
  createdAt: Date
  updatedAt: Date
}

type ClaimDocument = {
  athleteId: string
  userId: string
  claimedAt: Date
  userObjectId: MongoId
}

type AthleteDocument = {
  athleteId: string
  age?: number | string | null
  country?: string | null
  team?: string | null
}

const getEncryptionKey = () => {
  const secret = process.env.USER_ENCRYPTION_SECRET ?? process.env.NEXT_PUBLIC_DEV_ENCRYPTION_SECRET ?? "__rt-dev-secret__"
  if (!secret) {
    throw new Error("USER_ENCRYPTION_SECRET is not configured in the environment.")
  }
  return createHash("sha256").update(secret).digest().subarray(0, KEY_LENGTH)
}

const getUsersCollection = async (): Promise<Collection<UserDocument>> => {
  const db = await getDataDb()
  return db.collection<UserDocument>(USERS_COLLECTION)
}

const getUserClaimsCollection = async (): Promise<Collection<ClaimDocument>> => {
  const db = await getDataDb()
  return db.collection<ClaimDocument>(USER_CLAIMS_COLLECTION)
}

const hashPassword = async (password: string): Promise<PasswordRecord> => {
  const salt = randomBytes(16)
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LEN)) as Buffer
  return {
    salt: salt.toString("base64"),
    hash: derivedKey.toString("base64"),
  }
}

const verifyPassword = async (password: string, record: PasswordRecord) => {
  const salt = Buffer.from(record.salt, "base64")
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LEN)) as Buffer
  const storedHash = Buffer.from(record.hash, "base64")

  if (derivedKey.length !== storedHash.length) {
    return false
  }

  return timingSafeEqual(derivedKey, storedHash)
}

const encryptProfile = (payload: ProfilePayload): EncryptedPayload => {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ENCRYPTION_ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    iv: iv.toString("base64"),
    tag: authTag.toString("base64"),
    content: encrypted.toString("base64"),
  }
}

const decryptProfile = (payload: EncryptedPayload): ProfilePayload => {
  const key = getEncryptionKey()
  const iv = Buffer.from(payload.iv, "base64")
  const decipher = createDecipheriv(ENCRYPTION_ALGO, key, iv)
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.content, "base64")), decipher.final()])
  return JSON.parse(decrypted.toString("utf8")) as ProfilePayload
}

const buildEmailHash = (email: string) => createHash("sha256").update(email).digest("hex")

const mapDocumentToUser = (doc: UserDocument): PublicUser => {
  const profile = decryptProfile(doc.profile)
  return {
    id: doc._id.toString(),
    ...profile,
  }
}

const buildUserLookupFilter = (userId: string): Filter<UserDocument> => {
  const trimmedId = userId?.trim()
  if (!trimmedId) {
    throw new UserNotFoundError()
  }

  if (!ObjectId.isValid(trimmedId)) {
    return { _id: trimmedId }
  }

  const objectId = new ObjectId(trimmedId)
  return {
    $or: [{ _id: objectId }, { _id: trimmedId }],
  }
}

const sanitizeOptionalString = (value?: string | null) => {
  if (typeof value !== "string") {
    return value === null ? null : undefined
  }
  const trimmed = cleanString(value)
  return trimmed.length ? trimmed : null
}

const sanitizeSocialLinks = (links?: ProfileUpdateInput["socialLinks"]) => {
  if (!links) {
    return undefined
  }

  const normalized = {
    strava: sanitizeOptionalString(links.strava) ?? undefined,
    instagram: sanitizeOptionalString(links.instagram) ?? undefined,
  }

  const hasLinks = Boolean(normalized.strava || normalized.instagram)
  return hasLinks ? normalized : undefined
}

const applyAthleteDetailsToProfile = (profile: ProfilePayload, athlete?: AthleteDocument | null) => {
  if (!athlete) {
    return profile
  }

  const nextProfile: ProfilePayload = { ...profile }

  if (typeof athlete.age === "number" && Number.isFinite(athlete.age)) {
    nextProfile.age = athlete.age
  } else if (typeof athlete.age === "string") {
    const parsed = Number(athlete.age)
    if (Number.isFinite(parsed)) {
      nextProfile.age = parsed
    }
  }

  const country = sanitizeOptionalString(athlete.country)
  if (country !== undefined) {
    nextProfile.country = country
  }

  const team = sanitizeOptionalString(athlete.team)
  if (team !== undefined) {
    nextProfile.team = team
  }

  return nextProfile
}

const mergeProfile = (current: ProfilePayload, updates: ProfileUpdateInput): ProfilePayload => {
  const firstName =
    updates.firstName !== undefined ? cleanString(updates.firstName ?? "") || current.firstName : current.firstName
  const lastName =
    updates.lastName !== undefined ? cleanString(updates.lastName ?? "") || current.lastName : current.lastName

  const nextProfile: ProfilePayload = {
    ...current,
    firstName,
    lastName,
    name: buildDisplayName(firstName, lastName, current.email),
  }

  if (updates.country !== undefined) {
    nextProfile.country = sanitizeOptionalString(updates.country)
  }

  if (updates.team !== undefined) {
    nextProfile.team = sanitizeOptionalString(updates.team)
  }

  if (updates.photoUrl !== undefined) {
    nextProfile.photoUrl = sanitizeOptionalString(updates.photoUrl)
  }

  if (updates.age !== undefined) {
    if (typeof updates.age === "number" && Number.isFinite(updates.age)) {
      nextProfile.age = updates.age
    } else if (updates.age === null) {
      nextProfile.age = null
    }
  }

  if (updates.socialLinks !== undefined) {
    nextProfile.socialLinks = sanitizeSocialLinks(updates.socialLinks)
  }

  return nextProfile
}

const syncClaimedAthleteProfile = async (athleteId: string, profile: ProfilePayload) => {
  const db = await getDataDb()
  const updatePayload: Record<string, unknown> = {
    isClaimed: true,
    firstName: profile.firstName,
    lastName: profile.lastName,
  }

  if (typeof profile.age === "number" && Number.isFinite(profile.age)) {
    updatePayload.age = profile.age
  }

  if (profile.country !== undefined) {
    updatePayload.country = profile.country
  }

  if (profile.team !== undefined) {
    updatePayload.team = profile.team
  }

  if (profile.photoUrl !== undefined) {
    updatePayload.avatarUrl = profile.photoUrl
  }

  if (profile.socialLinks) {
    updatePayload.socialLinks = profile.socialLinks
  }

  await db.collection("athletes").updateOne(
    { athleteId },
    {
      $set: updatePayload,
    },
  )
}

const getUserDocumentById = async (userId: string) => {
  const users = await getUsersCollection()
  const doc = await users.findOne(buildUserLookupFilter(userId))

  if (!doc) {
    throw new UserNotFoundError()
  }

  return { users, userObjectId: doc._id, doc }
}

export async function createUser(data: SignUpInput): Promise<PublicUser> {
  const normalizedEmail = normalizeEmail(data.email)

  if (!isPasswordSecure(data.password)) {
    throw new WeakPasswordError()
  }

  const users = await getUsersCollection()
  const emailHash = buildEmailHash(normalizedEmail)

  const existingUser = await users.findOne({ emailHash })
  if (existingUser) {
    throw new DuplicateUserError()
  }

  const cleanFirst = cleanString(data.firstName) || normalizedEmail.split("@")[0]
  const cleanLast = cleanString(data.lastName)

  const profilePayload: ProfilePayload = {
    firstName: cleanFirst,
    lastName: cleanLast,
    email: normalizedEmail,
    name: buildDisplayName(cleanFirst, cleanLast, normalizedEmail),
  }

  const passwordRecord = await hashPassword(data.password)
  const encryptedProfile = encryptProfile(profilePayload)
  const now = new Date()

  const result = await users.insertOne({
    emailHash,
    password: passwordRecord,
    profile: encryptedProfile,
    createdAt: now,
    updatedAt: now,
  })

  if (!result.insertedId) {
    throw new Error("Failed to create user record.")
  }

  return {
    id: result.insertedId.toString(),
    ...profilePayload,
  }
}

export async function verifyUserCredentials(email: string, password: string): Promise<PublicUser> {
  const normalizedEmail = normalizeEmail(email)
  const users = await getUsersCollection()
  const emailHash = buildEmailHash(normalizedEmail)
  const doc = await users.findOne({ emailHash })

  if (!doc) {
    throw new InvalidCredentialsError()
  }

  const passwordValid = await verifyPassword(password, doc.password)
  if (!passwordValid) {
    throw new InvalidCredentialsError()
  }

  return mapDocumentToUser(doc)
}

export async function assignClaimedAthlete(userId: string, athleteId: string): Promise<PublicUser> {
  if (!athleteId) {
    throw new Error("An athleteId is required to complete this action.")
  }

  const { users, userObjectId, doc } = await getUserDocumentById(userId)
  const db = await getDataDb()
  const athlete = await db.collection<AthleteDocument>("athletes").findOne({ athleteId })

  const profile = applyAthleteDetailsToProfile(
    { ...decryptProfile(doc.profile), claimedAthleteId: athleteId },
    athlete,
  )

  const encryptedProfile = encryptProfile(profile)
  await users.updateOne(
    { _id: userObjectId },
    {
      $set: {
        profile: encryptedProfile,
        updatedAt: new Date(),
      },
    },
  )

  const claims = await getUserClaimsCollection()
  await claims.updateOne(
    { athleteId },
    {
      $set: {
        athleteId,
        userId,
        userObjectId,
        claimedAt: new Date(),
      },
    },
    { upsert: true },
  )

  await syncClaimedAthleteProfile(athleteId, profile)

  return {
    id: userId,
    ...profile,
  }
}

export async function getUserProfileById(userId: string): Promise<PublicUser> {
  const { doc } = await getUserDocumentById(userId)
  return mapDocumentToUser(doc)
}

export async function updateUserProfile(userId: string, updates: ProfileUpdateInput): Promise<PublicUser> {
  const { users, userObjectId, doc } = await getUserDocumentById(userId)
  const mergedProfile = mergeProfile(decryptProfile(doc.profile), updates)
  const encryptedProfile = encryptProfile(mergedProfile)

  await users.updateOne(
    { _id: userObjectId },
    {
      $set: {
        profile: encryptedProfile,
        updatedAt: new Date(),
      },
    },
  )

  if (mergedProfile.claimedAthleteId) {
    await syncClaimedAthleteProfile(mergedProfile.claimedAthleteId, mergedProfile)
  }

  return {
    id: userId,
    ...mergedProfile,
  }
}
