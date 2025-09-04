const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    sspId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Student'
        // --- THE FIX ---
        // unique: true has been REMOVED from this spot.
    },
    startDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    destination: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    isActive: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['Submitted', 'Approved', 'Rejected', 'Completed'],
        default: 'Submitted'
    }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);

