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
const User = mongoose.model('User', userSchema, 'users');

// Sign-up route
app.post('/api/signup', async (req, res) => {
  const { firstName, lastName, email, password, month, day, year } = req.body;

  try {
    if (!firstName || !lastName || !email || !password || !month || !day || !year) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      birthday: { month, day, year },
    });

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

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'API is running successfully!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
