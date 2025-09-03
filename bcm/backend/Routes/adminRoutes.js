// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');

// Initialize Twilio client from environment variables
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ROUTE 1: Get all PENDING leave requests
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

// ROUTE 2: Get all OTHER leave requests
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

// ROUTE 3: Approve a leave request
router.post('/leave-requests/:leaveId/approve', async (req, res) => {
    try {
        const { leaveId } = req.params;
        const leave = await LeaveRequest.findByIdAndUpdate(leaveId, { status: 'Approved' }, { new: true });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        // Send SMS to student
        const student = await Student.findOne({ sspId: leave.sspId });
        if (student && student.phone) {
            const messageBody = `Hi ${student.name}. Your leave request from ${new Date(leave.startDate).toLocaleDateString('en-GB')} to ${new Date(leave.returnDate).toLocaleDateString('en-GB')} has been APPROVED.`;
            await twilioClient.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${student.phone}`
            });
        }

        res.status(200).json({ success: true, message: 'Leave request approved.' });
    } catch (error) {
        console.error("Error approving leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ROUTE 4: Reject a leave request
router.post('/leave-requests/:leaveId/reject', async (req, res) => {
    try {
        const { leaveId } = req.params;
        // When rejecting, we also mark it as no longer active.
        const leave = await LeaveRequest.findByIdAndUpdate(leaveId, { status: 'Rejected', isActive: false }, { new: true });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }
        
        // Send SMS to student
        const student = await Student.findOne({ sspId: leave.sspId });
        if (student && student.phone) {
            const messageBody = `Hi ${student.name}. We regret to inform you that your leave request from ${new Date(leave.startDate).toLocaleDateString('en-GB')} has been REJECTED. Please contact the warden for details.`;
            await twilioClient.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${student.phone}`
            });
        }

        res.status(200).json({ success: true, message: 'Leave request rejected.' });
    } catch (error) {
        console.error("Error rejecting leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;