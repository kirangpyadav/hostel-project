const express = require('express');
const router = express.Router();
const Chief = require('../models/chief');
const bcrypt = require('bcrypt');

// Chief Registration
router.post('/register', async (req, res) => {
  try {
    const { name, aadharLast4, loginId, password } = req.body;

    if (!name || !aadharLast4 || !loginId || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existingChief = await Chief.findOne({ loginId });
    if (existingChief) {
      return res.status(400).json({ error: 'Login ID already exists.' });
    }

    const newChief = new Chief({ name, aadharLast4, loginId, password });
    await newChief.save();

    res.status(201).json({ message: 'Chief registered successfully' });
  } catch (error) {
    console.error('Error registering chief:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});


// Chief Login
router.post('/login', async (req, res) => {
  const { loginId, password } = req.body;

  try {
    const chief = await Chief.findOne({ loginId });
    if (!chief) return res.status(404).json({ error: 'Chief not found' });

    const isMatch = await bcrypt.compare(password, chief.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    res.json({ message: 'Login successful', chiefId: chief._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Reset Password (simplified for now)
router.post('/reset-password', async (req, res) => {
  const { loginId, aadharLast4, newPassword } = req.body;

  try {
    const chief = await Chief.findOne({ loginId, aadharLast4 });
    if (!chief) return res.status(404).json({ error: 'Chief not found' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    chief.password = hashedPassword;
    await chief.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

module.exports = router;
