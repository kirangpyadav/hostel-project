const mongoose = require('mongoose');
const { Schema } = mongoose;

const chiefUserSchema = new mongoose.Schema({
    // Link to the main chief record created by the admin
    chiefInfo: {
        type: Schema.Types.ObjectId,
        ref: 'KitchenChief',
        required: true
    },
    loginId: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    // Fields for password reset
    resetPasswordOtp: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('ChiefUser', chiefUserSchema);
