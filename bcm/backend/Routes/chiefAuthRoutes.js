const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const KitchenChief = require('../models/kitchenChief'); // Admin-created records
const ChiefUser = require('../models/ChiefUser'); // New login records
require('dotenv').config(); 
const twilio = require('twilio');

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = new twilio(accountSid, authToken);

// --- POST /api/chief-auth/register ---
router.post('/register', async (req, res) => {
    try {
        const { name, loginId, mobile, aadhar, password } = req.body;

        // 1. First, check if a login account already exists for this Login ID.
        const existingUser = await ChiefUser.findOne({ loginId });
        if (existingUser) {
            return res.status(409).json({ message: 'An account has already been registered for this Login ID. Please log in.' });
        }

        // 2. Second, verify details against the main chief records.
        const chiefRecord = await KitchenChief.findOne({
            loginId: loginId,
            name: { $regex: new RegExp(`^${name}$`, 'i') }, // Case-insensitive
            mobile: mobile,
            aadhar: aadhar
        });

        if (!chiefRecord) {
            return res.status(404).json({ message: "Chief details not found in hostel records. Please ensure all your details match the records provided by the admin." });
        }

        // 3. If verification passes, create the new user.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newChiefUser = new ChiefUser({
            chiefInfo: chiefRecord._id,
            loginId: chiefRecord.loginId,
            password: hashedPassword
        });

        await newChiefUser.save();
        res.status(201).json({ success: true, message: 'Registration successful! You can now log in.' });

    } catch (error) {
        console.error("Chief Registration Error:", error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});
// --- CORRECTED LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    try {
        const { loginId, password } = req.body;
        const user = await ChiefUser.findOne({ loginId }).populate('chiefInfo');
        if (!user || !user.chiefInfo) {
            return res.status(404).json({ message: 'Login ID not registered or associated chief record is missing.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password.' });
        }
        
        // THE FIX: Send the unique DATABASE ID (_id) of the ChiefUser.
        res.status(200).json({
            success: true,
            message: 'Login successful!',
            chief: { 
                _id: user._id, // This is the unique ID the dashboard needs.
                name: user.chiefInfo.name
            }
        });
    } catch (error) {
        console.error("Chief Login Error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});



// --- POST /api/chief-auth/forgot-password ---
router.post('/forgot-password', async (req, res) => {
    try {
        const { name, loginId, mobile, aadhar } = req.body;
        const chiefRecord = await KitchenChief.findOne({ loginId, name: { $regex: new RegExp(`^${name}$`, 'i') }, mobile, aadhar });
        if (!chiefRecord) {
            return res.status(404).json({ message: "The details you entered do not match any chief in our records." });
        }
        const user = await ChiefUser.findOne({ loginId });
        if (!user) {
            return res.status(404).json({ message: "This chief has not registered an account yet." });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOtp = otp;
        user.resetPasswordExpires = Date.now() + 600000; // 10 minutes
        await user.save();

        await twilioClient.messages.create({
           body: `Your BCM Hostel password reset OTP is: ${otp}`,
           from: process.env.TWILIO_PHONE_NUMBER,
           to: `+91${chiefRecord.mobile}`
        });

        res.status(200).json({ success: true, message: 'Verification successful. An OTP has been sent to the registered mobile number.' });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
});

// --- POST /api/chief-auth/verify-otp ---
router.post('/verify-otp', async (req, res) => {
    try {
        const { loginId, otp } = req.body;
        const user = await ChiefUser.findOne({ loginId, resetPasswordOtp: otp, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
        }
        res.status(200).json({ success: true, message: 'OTP verified successfully.' });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- POST /api/chief-auth/reset-password ---
router.post('/reset-password', async (req, res) => {
    try {
        const { loginId, otp, newPassword } = req.body;
        const user = await ChiefUser.findOne({ loginId, resetPasswordOtp: otp, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP. Please try again.' });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// --- CORRECTED PROFILE ROUTE ---
router.get('/profile/:id', async (req, res) => {
    try {
        const user = await ChiefUser.findById(req.params.id)
            // --- THIS IS THE ONE-WORD FIX ---
            // We must ask for the 'loginId' field, because that is its name in the KitchenChief model.
            .populate('chiefInfo', 'name loginId photo'); 

        if (!user || !user.chiefInfo) {
            return res.status(404).json({ success: false, message: 'Chief not found.' });
        }

        // Now, the chief object will correctly contain the 'loginId' field
        res.status(200).json({ 
            success: true, 
            chief: user.chiefInfo 
        });
    } catch (error) {
        console.error("Error fetching chief profile:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
