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
  'Swim Distance': { type: Number }, // Changed to Number instead of Int32
  'Bike Distance': { type: Number },
  'Run Distance': { type: Number },
});

const raceInforSchema = new mongoose.Schema({
  Name: { type: String },
  Distance: { type: String },
  Date: { type: String },
  City: { type: String },
  State: { type: String },
  'Swim Distance': { type: Number },
  'Bike Distance': { type: Number },
  'Run Distance': { type: Number },
  'Total Participants': { type: Number },
  'USAT Sancitioning': { type: String },
});

const RaceResult = mongoose.model('RaceResult', raceResultSchema, 'raceResults');
const RaceInfo = mongoose.model('RaceInfo', raceInforSchema, 'raceInfo');

// API route to fetch race results
app.get('/api/raceResults', async (req, res) => {
  const { name } = req.query;

  try {
    let results;
    const query = {};

    // Filter by name if it's provided
    if (name) {
      query.Name = { $regex: name, $options: 'i' };  // Case-insensitive search
    }

    results = await RaceResult.find(query);  // Find race results with the query conditions

    res.json(results);  // Send the results as JSON
  } catch (err) {
    console.error('Error fetching race results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to fetch race information
app.get('/api/raceInfo', async (req, res) => {
  const { name, city, state } = req.query;

  try {
    let results;
    const query = {};

    // Filter by race name if it's provided
    if (name) {
      query.Name = { $regex: name, $options: 'i' };  // Case-insensitive search
    }

    results = await RaceInfo.find(query);  // Find race info with the query conditions

    // If no results were found, return an empty array
    if (!results || results.length === 0) {
      res.json([]);
    } else {
      res.json(results);  // Send the results as JSON
    }
  } catch (err) {
    console.error('Error fetching race info:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
