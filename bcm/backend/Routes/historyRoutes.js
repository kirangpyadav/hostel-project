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

// Leave history route with the new auto-completion SMS
router.get('/leave/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;
        
        const student = await Student.findOne({ sspId: sspId });
        if (!student) {
            return res.status(200).json({ success: true, history: [] });
        }

        const leaveRequests = await LeaveRequest.find({ sspId: student._id }).sort({ updatedAt: -1 });

        // Using Promise.all to handle all potential updates and SMS sending concurrently
        const updatePromises = leaveRequests.map(async (leave) => {
            // If the leave was approved and its return date has now passed...
            if (leave.status === 'Approved' && new Date() > leave.returnDate) {
                leave.isActive = false;
                leave.status = 'Completed';
                await leave.save(); // Save the change first

                // --- NEW: SEND "LEAVE COMPLETED" SMS ---
                if (student.phone) {
                    try {
                        const messageBody = `Hi ${student.name}. Your approved leave has been marked as completed. We hope you had a safe journey! You can now apply for a new leave if needed.`;
                        await twilioClient.messages.create({ 
                            body: messageBody, 
                            from: process.env.TWILIO_PHONE_NUMBER, 
                            to: `+91${student.phone}` 
                        });
                    } catch (smsError) {
                        console.error("Failed to send 'leave completed' SMS:", smsError);
                        // We log the error but don't stop the process
                    }
                }
            }
        });

        await Promise.all(updatePromises);
        
        // Fetch the data one last time to get the most up-to-date statuses.
        const updatedLeaveRequests = await LeaveRequest.find({ sspId: student._id }).sort({ updatedAt: -1 });

        res.status(200).json({ success: true, history: updatedLeaveRequests });

    } catch (error) {
        console.error('Error fetching leave history:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching leave history.' });
    }
});
module.exports = router;