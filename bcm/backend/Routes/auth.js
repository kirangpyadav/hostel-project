const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// ------------------ REGISTER ------------------
router.post('/register', async (req, res) => {
  const name = req.body.name?.trim();
const sspId = req.body.sspId?.trim();
const password = req.body.password?.trim();
const phone = req.body.phone?.trim();
const hostel = req.body.hostel?.trim();


  if (!name || !sspId || !password || !phone || !hostel) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const exists = await User.findOne({ sspId });
    if (exists) {
      return res.status(400).json({ message: 'SSP ID already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, sspId, password: hashedPassword, phone, hostel });
    await newUser.save();

    res.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ------------------ LOGIN ------------------
router.post('/login', async (req, res) => {
  const { sspId, hostel, password } = req.body;

  if (!sspId || !hostel || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const user = await User.findOne({
      sspId: sspId.trim(),
      hostel: hostel.trim()
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid SSP ID or hostel' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    res.status(200).json({
      message: 'Login successful',
      user: { sspId: user.sspId, name: user.name, hostel: user.hostel }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});


// ------------------ SEND OTP ------------------
router.post('/send-otp', async (req, res) => {
  const sspId = req.body.sspId?.trim();
  const hostel = req.body.hostel?.trim();
  const phone = req.body.phone?.trim();

  if (!sspId || !hostel || !phone) {
    return res.status(400).json({ message: 'Please provide SSP ID, hostel, and phone' });
  }

  try {
    const user = await User.findOne({ sspId, hostel, phone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    await user.save();

    res.json({ message: 'OTP sent successfully', otp });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});


// ------------------ VALIDATE OTP ------------------
router.post('/validate-otp', async (req, res) => {
  const { sspId, otp } = req.body;

  if (!sspId || !otp) {
    return res.status(400).json({ message: 'Please provide SSP ID and OTP' });
  }

  try {
    const user = await User.findOne({ sspId, otp });
    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    res.json({ message: 'OTP validated' });
  } catch (error) {
    console.error('Validate OTP error:', error);
    res.status(500).json({ message: 'Server error during OTP validation' });
  }
});

// ------------------ RESET PASSWORD ------------------
router.post('/reset-password', async (req, res) => {
  const { sspId, newPassword } = req.body;

  if (!sspId || !newPassword) {
    return res.status(400).json({ message: 'Please provide SSP ID and new password' });
  }

  try {
    const user = await User.findOne({ sspId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = null; // Clear OTP after reset
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

module.exports = router;
