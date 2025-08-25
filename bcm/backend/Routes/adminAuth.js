// routes/adminAuth.js
const express = require("express");
const router = express.Router();
const Admin = require("../models/admin");
const bcrypt = require("bcrypt");

const otpStore = {}; // In-memory OTP store (for demo only)
const saltRounds = 10;

// ✅ Register Route
// ✅ Register Route
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { phone }] });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already registered" });
    }

    // Don't hash here — model does it automatically!
    const newAdmin = new Admin({ name, email, phone, password });
    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during registration" });
  }
});


// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ✅ Send OTP Route
router.post("/send-otp", async (req, res) => {
  const { email, phone } = req.body;

  const admin = await Admin.findOne({ email, phone });
  if (!admin) {
    return res.status(404).json({ message: "Admin not found" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  console.log(`Generated OTP for ${email}: ${otp}`);
  res.json({ message: "OTP sent", otp }); // In real systems, don't send OTP in response
});

// ✅ Validate OTP Route
router.post("/validate-otp", (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] === otp) {
    return res.json({ message: "OTP validated" });
  } else {
    return res.status(400).json({ message: "Invalid OTP" });
  }
});

// ✅ Reset Password Route
// ✅ Reuse the global bcrypt and saltRounds
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.password = await bcrypt.hash(newPassword, saltRounds);
    await admin.save();
    delete otpStore[email];

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error during password reset" });
  }
});

module.exports = router;
