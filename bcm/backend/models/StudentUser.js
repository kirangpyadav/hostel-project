const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentUserSchema = new mongoose.Schema({
    // Link to the main student record created by the admin
    studentInfo: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    sspId: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    resetPasswordOtp: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    }

}, { timestamps: true });

module.exports = mongoose.model('StudentUser', studentUserSchema);
