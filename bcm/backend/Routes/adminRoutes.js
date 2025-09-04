// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');

// Initialize Twilio client from environment variables
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ROUTE 1: Get all PENDING leave requests (This is correct, no changes)
router.get('/leave-requests/pending', async (req, res) => {
    try {
        const requests = await LeaveRequest.find({ status: 'Submitted' })
            .populate('sspId', 'name photo sspId')
            .sort({ createdAt: 1 });
        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error("Error fetching pending requests:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ROUTE 2: Get all OTHER leave requests (This is correct, no changes)
router.get('/leave-requests/history', async (req, res) => {
    try {
        const requests = await LeaveRequest.find({ status: { $ne: 'Submitted' } })
           .populate('sspId', 'name photo sspId')
            .sort({ updatedAt: -1 });
        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error("Error fetching leave history:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// --- UPDATED Approve Route ---
router.post('/leave-requests/:leaveId/approve', async (req, res) => {
    try {
        const { leaveId } = req.params;
        const leave = await LeaveRequest.findByIdAndUpdate(leaveId, { status: 'Approved', isActive: true }, { new: true });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        // --- BUG FIX & NEW SMS ---
        // Use findById because leave.sspId is an ObjectId
        const student = await Student.findById(leave.sspId); 
        if (student && student.phone) {
            const messageBody = `Hi ${student.name}. Good news! Your leave request has been APPROVED by the admin. You can now check the updated status in your student portal history.`;
            await twilioClient.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${student.phone}`
            });
        }

        res.status(200).json({ success: true, message: 'Leave request approved and SMS sent.' });
    } catch (error) {
        console.error("Error approving leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// --- UPDATED Reject Route ---
router.post('/leave-requests/:leaveId/reject', async (req, res) => {
    try {
        const { leaveId } = req.params;
        const leave = await LeaveRequest.findByIdAndUpdate(leaveId, { status: 'Rejected', isActive: false }, { new: true });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }
        
        // --- BUG FIX & NEW SMS ---
        // Use findById because leave.sspId is an ObjectId
        const student = await Student.findById(leave.sspId); 
        if (student && student.phone) {
            const messageBody = `Hi ${student.name}. Your leave request has been REJECTED. Please check your student portal history and contact the hostel warden for more information.`;
            await twilioClient.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${student.phone}`
            });
        }

        res.status(200).json({ success: true, message: 'Leave request rejected and SMS sent.' });
    } catch (error) {
        console.error("Error rejecting leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;