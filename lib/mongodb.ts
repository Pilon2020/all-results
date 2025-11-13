import "server-only"

import { MongoClient, ServerApiVersion } from "mongodb"

const uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error("MONGODB_URI is not defined in the environment")
}

export const DATA_DB_NAME = process.env.MONGODB_DATA_DB || "data"
export const ADMIN_DB_NAME = process.env.MONGODB_ADMIN_DB || "admin"

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

if (!globalForMongo._mongoClientPromise) {
  globalForMongo._mongoClientPromise = new MongoClient(uri, options).connect()
}

const clientPromise = globalForMongo._mongoClientPromise

export default clientPromise

export async function getDataDb() {
  const client = await clientPromise
  return client.db(DATA_DB_NAME)
}

export async function getAdminDb() {
  const client = await clientPromise
  return client.db(ADMIN_DB_NAME)
}
