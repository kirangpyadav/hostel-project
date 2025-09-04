    const mongoose = require('mongoose');

    const kitCollectionSchema = new mongoose.Schema({
        cycle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'KitCycle',
            required: true
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Collected', 'Not Collected'],
            default: 'Pending'
        },
        // This unique token will be embedded in the QR code
        qrToken: {
            type: String,
            required: true,
            unique: true
        },
        collectedAt: {
            type: Date
        }
    });

    module.exports = mongoose.model('KitCollection', kitCollectionSchema);
    
