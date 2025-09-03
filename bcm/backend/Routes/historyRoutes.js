// routes/historyRoutes.js

const express = require('express');
const router = express.Router();
const MealConfirmation = require('../models/MealConfirmation');
const LeaveRequest = require('../models/LeaveRequest');
// Add this line at the top of routes/historyRoutes.js
const Student = require('../models/Student');

// Meal history route (unchanged)
router.get('/meals/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;
        const confirmations = await MealConfirmation.find({ sspId }).sort({ date: -1 });
        res.status(200).json({ success: true, history: confirmations });
    } catch (error) {
        console.error('Error fetching meal history:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching meal history.' });
    }
});

// --- UPDATED LOGIC FOR LEAVE HISTORY ---
router.get('/leave/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;
        
        // --- FIX ---
        // 1. First, find the student using their STRING sspId.
        const student = await Student.findOne({ sspId: sspId });
        if (!student) {
            // If there's no student, there's no history.
            return res.status(200).json({ success: true, history: [] });
        }

        // 2. Now, use the student's unique DATABASE _id to find their leave requests.
        const leaveRequests = await LeaveRequest.find({ sspId: student._id }).sort({ startDate: -1 });

        // 3. Auto-completion logic (this part is still correct)
        const updatePromises = leaveRequests.map(leave => {
            if (leave.status === 'Approved' && new Date() > leave.returnDate) {
                leave.isActive = false;
                leave.status = 'Completed';
                return leave.save();
            }
            return Promise.resolve();
        });
        await Promise.all(updatePromises);
        
        // 4. Fetch the data one last time to get the most up-to-date statuses.
        const updatedLeaveRequests = await LeaveRequest.find({ sspId: student._id }).sort({ startDate: -1 });

        res.status(200).json({ success: true, history: updatedLeaveRequests });

    } catch (error) {
        console.error('Error fetching leave history:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching leave history.' });
    }
});

module.exports = router;