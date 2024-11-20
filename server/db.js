const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config(); // Make sure to load the .env file

const uri = process.env.MONGO_URI; // Get the MongoDB URI from .env

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToDatabase() {
    try {
        // Connect to the database
        await client.connect();
        console.log('Connected to MongoDB!');
        return client.db('race-results-db'); // Replace with your database name
    } catch (error) {
        console.error('Connection failed', error);
        return null;
    }
}

module.exports = connectToDatabase;