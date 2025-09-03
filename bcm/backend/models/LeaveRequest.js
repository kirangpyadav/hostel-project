// models/LeaveRequest.js

const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    // --- THIS IS THE FIX ---
    // The 'type' must be mongoose.Schema.Types.ObjectId
    sspId: {
        type: mongoose.Schema.Types.ObjectId, // Correct type for .populate()
        required: true,
        ref: 'Student' // This tells Mongoose which model to look in
    },
    // --- END OF FIX ---
    startDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    destination: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    status: {
        type: String,
        enum: ['Submitted', 'Approved', 'Rejected', 'Completed'],
        default: 'Submitted'
    }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);