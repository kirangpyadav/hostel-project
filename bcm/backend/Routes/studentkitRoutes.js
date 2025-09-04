const express = require('express');
const router = express.Router();
const KitCollection = require('../models/KitCollection');
const Student = require('../models/Student');

// GET endpoint to fetch ALL of a student's active kit collection records
router.get('/kit-status/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;

        const student = await Student.findOne({ sspId: sspId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        // --- NEW LOGIC ---
        // Find ALL collection records for this student that are part of an ACTIVE cycle.
        const collectionRecords = await KitCollection.find({ student: student._id })
            .populate({
                path: 'cycle',
                match: { isActive: true } // Only populate if the cycle is active
            })
            .sort({ 'cycle.startDate': 1 }); // Sort by the start date, oldest first

        // Filter out any records where the cycle was not populated (because it's not active)
        const activeCollections = collectionRecords.filter(record => record.cycle);

        res.status(200).json({ success: true, collections: activeCollections });

    } catch (error) {
        console.error("Error fetching kit status:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;

