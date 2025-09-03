// routes/mealRoutes.js

const express = require('express');
const router = express.Router();
const twilio = require('twilio');

const MealConfirmation = require('../models/MealConfirmation');
const Student = require('../models/Student');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

router.post('/confirm', async (req, res) => {
    const { sspId, meals, date, dinnerChoice } = req.body;

    if (!sspId || !meals || !date || meals.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing required information.' });
    }

    try {
        const student = await Student.findOne({ sspId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const filter = { sspId, date };
        
        // --- FIX IS HERE ---
        // We now explicitly update the 'confirmedAt' timestamp every time.
        const update = {
            meals,
            dinnerChoice: meals.includes('Dinner') ? dinnerChoice : null,
            confirmedAt: new Date() // <<< THIS LINE IS THE FIX
        };
        
        const options = { upsert: true, new: true, setDefaultsOnInsert: true };

        await MealConfirmation.findOneAndUpdate(filter, update, options);

        if (student.phone) {
            let mealList = meals.join(', ');
            if (meals.includes('Dinner') && dinnerChoice) {
                mealList = mealList.replace('Dinner', `Dinner (${dinnerChoice})`);
            }
            
            const formattedDate = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const messageBody = `Hi ${student.name}. Your meal confirmation for ${formattedDate} is successful for: ${mealList}. - BCM Hostel`;

            await twilioClient.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${student.phone}`
            });
        }

        res.status(200).json({
            success: true,
            message: 'Your meals have been confirmed successfully! An SMS notification has been sent.'
        });

    } catch (error) {
        console.error("Error in meal confirmation:", error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

module.exports = router;
