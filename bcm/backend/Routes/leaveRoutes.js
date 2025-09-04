// routes/leaveRoutes.js

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In routes/leaveRoutes.js

// ROUTE 1: APPLY FOR A NEW LEAVE (with resilient SMS sending)
router.post('/apply', async (req, res) => {
    const { sspId, startDate, returnDate, reason, destination } = req.body;
    if (!sspId || !startDate || !returnDate || !reason || !destination) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const student = await Student.findOne({ sspId: sspId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student record not found.' });
        }
        
        const existingActiveLeave = await LeaveRequest.findOne({ sspId: student._id, isActive: true });
        if (existingActiveLeave) {
            return res.status(409).json({ success: false, message: 'You already have an active leave request. Please update it instead.' });
        }

        const newLeave = new LeaveRequest({ sspId: student._id, startDate, returnDate, destination, reason });
        await newLeave.save();

        // --- NEW: SMS Sending Block with Error Handling ---
        try {
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
        } catch (smsError) {
            // If the SMS fails, we just log it to the server console and continue.
            // This stops the entire application from crashing.
            console.error("SMS Sending Failed (but leave was saved):", smsError.message);
        }
        // --- END OF NEW BLOCK ---

        res.status(201).json({ success: true, message: 'Leave request submitted successfully!', leave: newLeave });

    } catch (error) {
        console.error("Error applying for leave:", error);
        // This will now only catch major database errors, not Twilio errors.
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ROUTE 2: UPDATE AN EXISTING LEAVE
router.put('/update/:leaveId', async (req, res) => {
    const { leaveId } = req.params;
    const { returnDate } = req.body;

    try {
        const updateQuery = { returnDate: returnDate, status: 'Submitted', isActive: true };
        const leave = await LeaveRequest.findByIdAndUpdate(leaveId, updateQuery, { new: true });
        if (!leave) return res.status(404).json({ success: false, message: "Leave request not found." });
        
        const student = await Student.findById(leave.sspId);
        if (student && student.phone) {
            const formattedReturnDate = new Date(leave.returnDate).toLocaleDateString('en-GB');
            const messageBody = `Hi ${student.name}. Your leave update request for a new return date of ${formattedReturnDate} has been submitted for re-approval. - BCM Hostel`;
            await twilioClient.messages.create({ body: messageBody, from: process.env.TWILIO_PHONE_NUMBER, to: `+91${student.phone}` });
        }
        
        res.status(200).json({ success: true, message: "Leave update submitted for re-approval! An SMS has been sent.", leave });
    } catch (error) {
        console.error("Error updating leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ROUTE 3: FETCH THE CURRENT ACTIVE LEAVE (THIS IS THE ONE THAT WAS CRASHING)
router.get('/current/:sspId', async (req, res) => {
    try {
        const { sspId } = req.params;

        // Step 1: Find the student by their string SSP ID.
        const student = await Student.findOne({ sspId: sspId });
        if (!student) {
            return res.status(200).json({ success: true, message: 'No student found.' });
        }

        // Step 2: Use the student's unique database _id to find their active leave.
        const leave = await LeaveRequest.findOne({ sspId: student._id, isActive: true });

        if (!leave) {
            return res.status(200).json({ success: true, message: 'No active leave request found.' });
        }

        // Auto-completion logic
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