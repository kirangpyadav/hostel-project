const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Student = require('../models/Student');
const StudentUser = require('../models/StudentUser');

// --- NEW: Twilio Configuration ---
// It's better to require dotenv here if server.js doesn't load it first
require('dotenv').config(); 
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = new twilio(accountSid, authToken);

// --- POST /api/student-auth/register ---
// This is the corrected registration route
router.post('/register', async (req, res) => {
    try {
        const { name, sspId, aadharNumber, dob, phone, password } = req.body;

        // --- THIS IS THE FIX ---
        // 1. FIRST, check if a login account already exists for this SSP ID.
        const existingUser = await StudentUser.findOne({ sspId: sspId });
        if (existingUser) {
            return res.status(409).json({ message: 'An account has already been registered for this SSP ID. Please log in.' });
        }

        // 2. SECOND, if no account exists, THEN verify details against the main student records.
        const studentRecord = await Student.findOne({
            sspId: sspId,
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            aadharNumber: aadharNumber,
            phone: phone, // Added phone to the verification
            dob: {
                $gte: new Date(new Date(dob).setHours(0, 0, 0, 0)),
                $lt: new Date(new Date(dob).setHours(23, 59, 59, 999))
            }
        });

        if (!studentRecord) {
            return res.status(404).json({ message: "Student details not found in hostel records. Please ensure all your details match the records provided to the admin." });
        }

        // 3. If verification passes, create the new user.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newStudentUser = new StudentUser({
            studentInfo: studentRecord._id,
            sspId: studentRecord.sspId,
            password: hashedPassword
        });

        await newStudentUser.save();
        res.status(201).json({ success: true, message: 'Registration successful! You can now log in.' });

    } catch (error) {
        console.error("Student Registration Error:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});


// --- MODIFIED: /api/student-auth/forgot-password ---
// Now sends a real SMS
router.post('/forgot-password', async (req, res) => {
    try {
        const { name, sspId, aadharNumber, dob, phone } = req.body;

        const studentRecord = await Student.findOne({ sspId, name: { $regex: new RegExp(`^${name}$`, 'i') }, aadharNumber, phone, dob: { $gte: new Date(new Date(dob).setHours(0, 0, 0, 0)), $lt: new Date(new Date(dob).setHours(23, 59, 59, 999)) } });
        if (!studentRecord) { return res.status(404).json({ message: "The details you entered do not match any student in our records." }); }

        const user = await StudentUser.findOne({ sspId });
        if (!user) { return res.status(404).json({ message: "This student has not registered an account yet." }); }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOtp = otp;
        user.resetPasswordExpires = Date.now() + 600000; // 10 minutes
        await user.save();

        // --- Send the OTP via SMS using Twilio ---
        await twilioClient.messages.create({
           body: `Your BCM Hostel password reset OTP is: ${otp}`,
           from: process.env.TWILIO_PHONE_NUMBER,
           to: `+91${studentRecord.phone}` // Assumes Indian phone numbers
        });

        // The OTP is no longer sent back in the response
        res.status(200).json({ success: true, message: 'Verification successful. An OTP has been sent to your registered mobile number.' });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
});



// --- Paste unchanged routes back in ---
// --- POST /api/student-auth/verify-otp ---
// Verifies if the provided OTP is valid without consuming it
router.post('/verify-otp', async (req, res) => {
    try {
        const { sspId, otp } = req.body;

        const user = await StudentUser.findOne({
            sspId: sspId,
            resetPasswordOtp: otp,
            resetPasswordExpires: { $gt: Date.now() } // Check if OTP is not expired
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
        }

        // If we found a user, the OTP is valid
        res.status(200).json({ success: true, message: 'OTP verified successfully.' });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});
router.post('/reset-password', async (req, res) => { try { const { sspId, otp, newPassword } = req.body; const user = await StudentUser.findOne({ sspId: sspId, resetPasswordOtp: otp, resetPasswordExpires: { $gt: Date.now() } }); if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP. Please try again.' }); } const salt = await bcrypt.genSalt(10); user.password = await bcrypt.hash(newPassword, salt); user.resetPasswordOtp = undefined; user.resetPasswordExpires = undefined; await user.save(); res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now log in.' }); } catch (error) { console.error("Reset Password Error:", error); res.status(500).json({ message: 'Server error.' }); } });
router.post('/login', async (req, res) => { try { const { sspId, password } = req.body; const user = await StudentUser.findOne({ sspId: sspId }).populate('studentInfo'); if (!user) { return res.status(404).json({ message: 'This SSP ID is not registered. Please register first.' }); } const isMatch = await bcrypt.compare(password, user.password); if (!isMatch) { return res.status(400).json({ message: 'Invalid password.' }); } res.status(200).json({ success: true, message: 'Login successful!', student: { name: user.studentInfo.name, sspId: user.sspId } }); } catch (error) { console.error("Student Login Error:", error); res.status(500).json({ message: 'Server error during login.' }); } });




// --- GET /api/student-auth/profile/:sspId ---
// Fetches a student's public profile data for the dashboard
router.get('/profile/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;
        
        // Find the main student record using the SSP ID
        const studentRecord = await Student.findOne({ sspId: sspId }).select('name sspId photo');

        if (!studentRecord) {
            return res.status(404).json({ message: "Student record not found." });
        }

        res.status(200).json({ success: true, student: studentRecord });

    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: 'Server error while fetching profile.' });
    }
});
module.exports = router;
