// routes/mealRoutes.js

const express = require('express');
const router = express.Router();
const twilio = require('twilio');

const MealConfirmation = require('../models/MealConfirmation');
const Student = require('../models/Student');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// In routes/mealRoutes.js

router.post('/confirm', async (req, res) => {
    const { sspId, meals, date, dinnerChoice } = req.body;
    if (!sspId || !meals || !date || meals.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing required information.' });
    }

    try {
        // --- THIS IS THE FIX ---
        // 1. First, find the student using their STRING sspId.
        const student = await Student.findOne({ sspId: sspId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        // 2. Now, use the student's unique DATABASE _id to create/update the confirmation.
        const filter = { sspId: student._id, date };
        const update = { meals, dinnerChoice: meals.includes('Dinner') ? dinnerChoice : null, confirmedAt: new Date() };
        const options = { upsert: true, new: true, setDefaultsOnInsert: true };

        await MealConfirmation.findOneAndUpdate(filter, update, options);
        // --- END OF FIX ---

        if (student.phone) {
            // (SMS logic is unchanged and correct)
            let mealList = meals.join(', ');
            if (meals.includes('Dinner') && dinnerChoice) {
                mealList = mealList.replace('Dinner', `Dinner (${dinnerChoice})`);
            }
            const formattedDate = new Date(date).toLocaleDateString('en-GB');
            const messageBody = `Hi ${student.name}. Your meal confirmation for ${formattedDate} is successful for: ${mealList}. - BCM Hostel`;
            await twilioClient.messages.create({ body: messageBody, from: process.env.TWILIO_PHONE_NUMBER, to: `+91${student.phone}` });
        }

        res.status(200).json({ success: true, message: 'Your meals have been confirmed successfully!' });
    } catch (error) {
        console.error("Error in meal confirmation:", error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

module.exports = router;
