const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file
const cors = require('cors'); // Allow cross-origin requests
const bodyParser = require('body-parser'); // Middleware for parsing request bodies

const app = express();

// Middleware
app.use(cors()); // Enable cross-origin requests
app.use(express.json()); // Parse JSON requests
app.use(bodyParser.urlencoded({ extended: true })); // Handle URL-encoded data

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; // Get MongoDB URI from environment variable

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit the process if the connection fails
  });

// Define Schemas and Models
const raceResultSchema = new mongoose.Schema({
  _id: String,
  race_id: String,
  Name: String,
  athlete_id: String,
  Gender: String,
  Race: String,
  Date: String,
  Distance: String,
  Swim: String,
  T1: String,
  Bike: String,
  T2: String,
  Run: String,
  Total: String,
  'Swim Distance': Number,
  'Bike Distance': Number,
  'Run Distance': Number,
  AgeGroup: String,
});

const raceInfoSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId, // Correcting to ObjectId
  Name: String,
  Distance: String,
  Date: String,
  City: String,
  State: String,
  Country: String,
  'Male Participants': Number,
  'Female Participants': Number,
  'Swim Distance': Number,
  'Bike Distance': Number,
  'Run Distance': Number,
  'USAT Sancitioning': String,
});


const athleteInfoSchema = new mongoose.Schema({
  _id: String,
  Name: String,
  DOB: String,
  Gender: String,
  City: String,
  State: String,
  Country: String,
  USAT: String,
});

const RaceResult = mongoose.model('RaceResult', raceResultSchema, 'raceResults');
const RaceInfo = mongoose.model('RaceInfo', raceInfoSchema, 'raceInfo');
const AthleteInfo = mongoose.model('AthleteInfo', athleteInfoSchema, 'athleteInfo');

// Routes
// Fetch race results
app.get('/api/raceResults', async (req, res) => {
  const { id, name, athlete_id, race_id } = req.query;

  try {
    let query = {};

    if (id) {
      query._id = id; // Match by unique ID
    }
    if (name) {
      query.Name = { $regex: name, $options: 'i' }; // Case-insensitive name search
    }
    if (athlete_id) {
      query.athlete_id = athlete_id;
    }
    if (race_id) {
      query.race_id = race_id;
    }
    // Fetch the results based on query
    const results = await RaceResult.find(query);

    if (id && results.length === 1) {
      // If searching by ID and exactly one result is found, return the single object
      return res.json(results[0]);
    }

    res.json(results); // Return all matching results as an array
  } catch (err) {
    console.error('Error fetching race results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Fetch race information
// Fetch race information
app.get('/api/raceInfo', async (req, res) => {
  const { name, city, state, id } = req.query;
  try {
    const query = {};

    // Ensure that 'id' is a valid ObjectId
    if (id) {
      // Use mongoose.Types.ObjectId to convert the id into an ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ObjectId format' });
      }
      query._id = new mongoose.Types.ObjectId(id);  // Convert id into ObjectId
    }
    if (name) query.Name = { $regex: name, $options: 'i' };
    if (city) query.City = { $regex: city, $options: 'i' };
    if (state) query.State = { $regex: state, $options: 'i' };

    const results = await RaceInfo.find(query);

    // Check if results are found
    if (results.length === 0) {
      return res.status(404).json({ error: 'No races found with the provided query' });
    }

    res.json(results); // Return the found data
  } catch (err) {
    console.error('Error fetching race info:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



// Fetch athlete information
app.get('/api/athleteInfo', async (req, res) => {
  const { name } = req.query;

  try {
    const query = {};
    if (name) {
      query.Name = { $regex: name, $options: 'i' }; // Case-insensitive search
    }

    const results = await AthleteInfo.find(query);
    res.json(results);
  } catch (err) {
    console.error('Error fetching athlete info:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Default route for server status
app.get('/', (req, res) => {
  res.json({ message: 'API is running successfully!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});