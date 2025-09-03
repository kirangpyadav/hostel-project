// routes/historyRoutes.js

const express = require('express');
const router = express.Router();
const MealConfirmation = require('../models/MealConfirmation');

// GET endpoint to fetch meal history for a specific student
router.get('/meals/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;

        const confirmations = await MealConfirmation.find({ sspId })
            .sort({ date: -1 }); // Sort by the meal date, newest first

        res.status(200).json({ success: true, history: confirmations });

    } catch (error) {
        console.error('Error fetching meal history:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching history.' });
    }
});

module.exports = router;