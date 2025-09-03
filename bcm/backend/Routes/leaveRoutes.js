// routes/leaveRoutes.js

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ROUTE 1: APPLY FOR A NEW LEAVE
router.post('/apply', async (req, res) => {
    const { sspId, startDate, returnDate, reason, destination } = req.body;
    if (!sspId || !startDate || !returnDate || !reason || !destination) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        // --- FIX PART 1 ---
        // First, find the student using their STRING sspId.
        const student = await Student.findOne({ sspId: sspId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student record not found.' });
        }
        
        // Now, use the student's DATABASE _id to check for active leaves.
        const existingActiveLeave = await LeaveRequest.findOne({ sspId: student._id, isActive: true });
        if (existingActiveLeave) {
            return res.status(409).json({ success: false, message: 'You already have an active leave request. Please update it instead.' });
        }

        // Use the student's DATABASE _id to create the new leave.
        const newLeave = new LeaveRequest({ sspId: student._id, startDate, returnDate, destination, reason });
        await newLeave.save();

        if (student.phone) {
            const formattedStartDate = new Date(startDate).toLocaleDateString('en-GB');
            const formattedReturnDate = new Date(returnDate).toLocaleDateString('en-GB');
            const messageBody = `Hi ${student.name} (${sspId}). Your leave request from ${formattedStartDate} to ${formattedReturnDate} for travel to ${destination} has been submitted. - BCM Hostel`;
            await twilioClient.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${student.phone}`
            });
        }

        res.status(201).json({ success: true, message: 'Leave request submitted successfully! An SMS has been sent.', leave: newLeave });

    } catch (error) {
        console.error("Error applying for leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ROUTE 2: UPDATE AN EXISTING LEAVE
// This is for updating the return date of an active leave.
router.put('/update/:leaveId', async (req, res) => {
    const { leaveId } = req.params;
    const { returnDate } = req.body; // Only the return date can be updated

    try {
        const leave = await LeaveRequest.findByIdAndUpdate(leaveId, { returnDate }, { new: true });
        if (!leave) return res.status(404).json({ success: false, message: "Leave request not found." });
        
       // REPLACE IT WITH THIS:
const student = await Student.findById(leave.sspId);
        if (student && student.phone) {
            const formattedReturnDate = new Date(leave.returnDate).toLocaleDateString('en-GB');
            const messageBody = `Hi ${student.name}. Your leave has been successfully updated. Your new return date is ${formattedReturnDate}. - BCM Hostel`;

            await twilioClient.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${student.phone}`
            });
        }
        
        res.status(200).json({ success: true, message: "Leave successfully updated! An SMS notification has been sent.", leave });

    } catch (error) {
        console.error("Error updating leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ROUTE 3: FETCH THE CURRENT ACTIVE LEAVE
// This checks for an active leave and auto-completes it if the date has passed.
// ROUTE 3: FETCH THE CURRENT ACTIVE LEAVE
router.get('/current/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;

        // --- FIX PART 2 ---
        // First, find the student using their STRING sspId.
        const student = await Student.findOne({ sspId: sspId });
        if (!student) {
            // If no student is found, there can be no leave request.
            return res.status(200).json({ success: true, message: 'No student found.' });
        }

        // Now, use the student's DATABASE _id to find their active leave.
        const leave = await LeaveRequest.findOne({ sspId: student._id, isActive: true });

        if (!leave) {
            return res.status(200).json({ success: true, message: 'No active leave request found.' });
        }

        if (leave.status === 'Approved' && new Date() > leave.returnDate) {
            leave.isActive = false;
            leave.status = 'Completed';
            await leave.save();
            return res.status(200).json({ success: true, message: 'Previous leave now completed.' });
        }
        
        res.status(200).json({ success: true, leave });
    } catch (error) {
        console.error("Error fetching current leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;