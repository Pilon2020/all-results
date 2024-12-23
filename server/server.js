const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Ensure this line is at the top of your file
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// User Schema and Model
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  birthday: {
    month: { type: Number, required: true },
    day: { type: Number, required: true },
    year: { type: Number, required: true },
  },
});

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
const User = mongoose.model('User', userSchema, 'users');

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

// Middleware to authenticate the token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded user info to request
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Sign-up route
app.post('/api/signup', async (req, res) => {
  const { firstName, lastName, email, password, month, day, year } = req.body;

  // Step 1: Validate all required fields
  if (!firstName || !lastName || !email || !password || !month || !day || !year) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Step 2: Check if the email is already taken (email should be lowercase)
  try {
  // Step 3: Hash the password for security
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 4: Create a new user with the provided details
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(), // Ensure email is stored as lowercase
      password: hashedPassword,
      birthday: {
        month,
        day,
        year,
      },
    });

    // Step 5: Save the new user to the database
    await newUser.save();

    // Step 6: Return a success message
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Error during sign-up:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Check if email is already taken
app.get('/api/signup', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(200).json({ isTaken: true });
    }

    res.status(200).json({ isTaken: false });
  } catch (err) {
    console.error('Error checking email:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sign-in route
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Email or password is incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Email or password is incorrect' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login successful', token, user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error('Error during sign-in:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Profile route
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password'); // Exclude the password field
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({
      message: 'Profile retrieved successfully',
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        birthday: user.birthday,
      },
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'API is running successfully!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
