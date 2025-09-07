const express = require('express');
const router = express.Router();
const KitCollection = require('../models/KitCollection');
const Student = require('../models/Student');

// GET endpoint to fetch ALL of a student's kit collection records
router.get('/kit-status/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;

        const student = await Student.findOne({ sspId: sspId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        // Find ALL collection records for this student and populate the cycle details.
        // This gives the frontend all the information it needs to be smart.
        const allCollections = await KitCollection.find({ student: student._id })
            .populate('cycle') // Get full details for each cycle
            .sort({ createdAt: -1 }); // Sort by newest first

        res.status(200).json({ success: true, collections: allCollections });

    } catch (error) {
        console.error("Error fetching kit status:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;

