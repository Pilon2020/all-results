import "server-only"

import { MongoClient, ServerApiVersion } from "mongodb"

const uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error("MONGODB_URI is not defined in the environment")
}

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
