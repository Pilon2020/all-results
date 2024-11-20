// /server/server.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();  // Load environment variables from .env file
const cors = require('cors');  // To allow cross-origin requests from React frontend

const app = express();
app.use(cors());  // Allow requests from frontend

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;  // Get MongoDB URI from environment variable

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

mongoose.connection.on('connected', async () => {
  console.log('Connected to MongoDB.');
  const testResults = await mongoose.connection.db.collection('raceResults').find({}).toArray();
});

// Define a schema and model for the race results
const raceResultSchema = new mongoose.Schema({
  Name: { type: String },
  Gender: { type: String },
  Race: { type: String },
  Date: { type: String },
  Distance: { type: String },
  Swim: { type: String },
  T1: { type: String },
  Bike: { type: String },
  T2: { type: String },
  Run: { type: String },
  Total: { type: String },
  'Swim Distance': { type: String },
  'Bike Distance': { type: String },
  'Run Distance': { type: String },
});

const RaceResult = mongoose.model('RaceResult', raceResultSchema, 'raceResults');

// API route to fetch race results
app.get('/api/raceResults', async (req, res) => {
  const { name } = req.query;  // Retrieve the 'name' query parameter from the request

  try {
    let results;
    if (name) {
      // If 'name' is provided, search for race results that match the name
      results = await RaceResult.find({
        Name: { $regex: name, $options: 'i' }  // Case-insensitive regex search
      });
    } else {
      // Otherwise, return all results
      results = await RaceResult.find();
    }

    res.json(results);  // Send the filtered or all results as JSON
  } catch (err) {
    console.error('Error fetching race results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
