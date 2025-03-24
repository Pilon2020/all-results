require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB (AllResults database)
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB (AllResults)'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// 1. User Schema (for authentication)
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    birthday: {
      month: { type: Number, required: true },
      day:   { type: Number, required: true },
      year:  { type: Number, required: true },
    },
  },
  { collection: 'users' }
);

const User = mongoose.model('User', userSchema);

// 2. Race Table
const raceSchema = new mongoose.Schema(
  {
    Race_ID:           { type: Number, unique: true, required: true },
    Name:              String,
    Date:              Date,
    Start_Time:        String,  // Could store as Date if you prefer
    Location:          String,
    Latitude:          Number,
    Longitude:         Number,
    Distance_Type:     String,  // e.g. 'Olympic', 'Sprint', 'Marathon', etc.
    Total_Distance:    Number,
    Swim_Distance:     Number,
    Bike_Distance:     Number,
    Run_Distance:      Number,
    Total_Participants: Number,
    Official_Website:  String,
    Race_Type:         String,  // e.g. 'Triathlon', 'Marathon', 'Duathlon'
  },
  { collection: 'Race Table' }
);
const Race = mongoose.model('Race', raceSchema);

// 3. Athlete Table
const athleteSchema = new mongoose.Schema(
  {
    Athlete_ID:    { type: String, unique: true, required: true },
    First_Name:    String,
    Last_Name:     String,
    DOB:           Date,
    Gender:        String,
    Country:       String,
    State_Region:  String,
    Club_Team:     String,
    USAT_License:  String,
    Email:         String,
    Strava_URL:    String,
    Profile_image_URL: String,
  },
  { collection: 'athlete_table' }
);
const Athlete = mongoose.model('Athlete', athleteSchema);

// 4. Participants Table
const participantSchema = new mongoose.Schema(
  {
    Participant_ID: { type: Number, unique: true, required: true },
    Athlete_ID:     Number, // could store as ObjectId if referencing Athlete
    Race_ID:        Number, // could store as ObjectId if referencing Race
    Bib_Number:     String,
    Age_Group:      String,
    Gender:         String,
    Division:       String,
    Wave_Start:     String,  // could store as Date if you prefer
    DNS:            Boolean,
    DNF:            Boolean,
    DQ:             Boolean,
    Team:           String,
  },
  { collection: 'Participants Table' }
);
const Participant = mongoose.model('Participant', participantSchema);

// 5. Results Table
const resultSchema = new mongoose.Schema(
  {
    Result_ID:      { type: Number, unique: true, required: true },
    _race_id: Number,
    Participant_ID: Number,  // link to Participants
    'First Name': String,
    'Last Name': String,
    Total_Time:     String,
    Swim_Time:      String,
    T1_Time:        String,
    Bike_Time:      String,
    T2_Time:        String,
    Run_Time:       String,
    Penalty_Time:   String,
    Overall_Rank:   Number,
    Division_Gender_Rank:    Number,
    Age_Group_Rank: Number,
    Finish_Status:  String,  // 'Finished', 'DNF', 'DQ', 'DNS'
  },
  { collection: 'Results Table' }
);
const Result = mongoose.model('Result', resultSchema);

// 6. Timing Splits Table
const timingSplitSchema = new mongoose.Schema(
  {
    Split_ID:       { type: Number, unique: true, required: true },
    Participant_ID: Number,  // link to Participants
    Segment_Name:   String,
    Split_Time:     String,  // time at this split
    Distance:       Number,
    Elapsed_Time:   String,  // time since race start
    Pace:           String,
  },
  { collection: 'Timing Splits Table' }
);
const TimingSplit = mongoose.model('TimingSplit', timingSplitSchema);

// 7. PRs Table
const prSchema = new mongoose.Schema(
  {
    Split_ID:       { type: Number, unique: true, required: true },
    Participant_ID: Number,  // link to Participants
    Segment_Name:   String,
    Split_Time:     String,
    Distance:       Number,
    Elapsed_Time:   String,
    Pace:           String,
  },
  { collection: 'PRs Table' }
);
const PR = mongoose.model('PR', prSchema);

app.get('/api/athleteInfo', async (req, res) => {
  const athleteId = req.query.id;
  console.log("Looking up athlete with ID:", athleteId); // ✅ LOG this

  if (!athleteId) {
    return res.status(400).json({ error: 'Athlete ID is required' });
  }

  try {
    const athlete = await Athlete.findOne({ Athlete_ID: athleteId }).lean();
    console.log("Athlete found:", athlete); // ✅ LOG this too

    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    res.status(200).json(athlete);
  } catch (err) {
    console.error('Error fetching athlete info:', err); // ✅ More helpful logging
    res.status(500).json({ error: 'Failed to fetch athlete info', details: err.message });
  }
});




/************************************
 *  AUTH MIDDLEWARE
 ************************************/
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded user info to request
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/************************************
 *  USER AUTH ROUTES
 ************************************/

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

// Sign-up route
app.post('/api/signup', async (req, res) => {
  const { firstName, lastName, email, password, month, day, year } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password || !month || !day || !year) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      birthday: {
        month,
        day,
        year,
      },
    });

    // Save user
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Error during sign-up:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sign-in route
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Email or password is incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Email or password is incorrect' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (err) {
    console.error('Error during sign-in:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Refresh token route
app.post('/api/refresh-token', authenticateToken, (req, res) => {
  const { userId, email } = req.user;
  const newToken = jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.status(200).json({ token: newToken });
});

// Get user info from token
app.get('/api/auth/user', authenticateToken, (req, res) => {
  const user = req.user; // Decoded from token
  res.json({ name: user.name, email: user.email });
});

// Profile route (example)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password'); // exclude password
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

/************************************
 *  API ENDPOINTS FOR TABLES
 ************************************/

// Races
app.get('/api/races', async (req, res) => {
  try {
    const races = await Race.find();
    res.json(races);
  } catch (err) {
    console.error('Error fetching races:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Athletes
app.get('/api/athletes', async (req, res) => {
  try {
    const athletes = await Athlete.find();
    res.json(athletes);
  } catch (err) {
    console.error('Error fetching athletes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Participants
app.get('/api/participants', async (req, res) => {
  try {
    const participants = await Participant.find();
    res.json(participants);
  } catch (err) {
    console.error('Error fetching participants:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Results
app.get('/api/results', async (req, res) => {
  try {
    const results = await Result.find();
    res.json(results);
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q?.toLowerCase().trim();

  if (!query) {
    return res.json([]); // Empty query returns empty results
  }

  try {
    // Search races by name
    const races = await Race.find({ Name: new RegExp('^' + query, 'i') }).lean();
    const formattedRaces = races.map(race => ({
      id: race.Race_ID,
      Name: race.Name,
      Location: race.Location,
      Year: race.Date ? new Date(race.Date).getFullYear() : 'Unknown',
    }));

    // Search athletes by first or last name
    const athletes = await Athlete.find({
      $or: [
        { First_Name: new RegExp('^' + query, 'i') },
        { Last_Name: new RegExp('^' + query, 'i') },
      ]
    }).lean();

    const formattedAthletes = athletes.map(a => ({
      id: a.Athlete_ID,
      Name: `${a.First_Name} ${a.Last_Name}`,
      Team: a.Club_Team || 'N/A',
    }));

    res.json([...formattedRaces, ...formattedAthletes]);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search data' });
  }
});


// Timing Splits
app.get('/api/timing-splits', async (req, res) => {
  try {
    const timingSplits = await TimingSplit.find();
    res.json(timingSplits);
  } catch (err) {
    console.error('Error fetching timing splits:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PRs
app.get('/api/prs', async (req, res) => {
  try {
    const prs = await PR.find();
    res.json(prs);
  } catch (err) {
    console.error('Error fetching PRs:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/************************************
 *  DEFAULT ROUTE
 ************************************/
app.get('/', async (req, res) => {
  try {
    const firstRace = await Race.findOne();
    const firstResult = await Result.findOne();
    res.json({ 
      message: 'API is running successfully!',
      firstRace,
      firstResult
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error fetching first race record', 
      details: error 
    });
  }
});



/************************************
 *  START SERVER
 ************************************/
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
