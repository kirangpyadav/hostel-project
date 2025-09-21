const mongoose = require('mongoose');

const rationRequestSchema = new mongoose.Schema({
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true }
    }],
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ChiefUser', required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    hostelName: { type: String },
    hostelCode: { type: String },
    
    // --- NEW FIELD ADDED ---
    preparationFor: {
        type: String,
        enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner', 'Special Event', 'General Stock'],
        required: true
    }
    
}, { timestamps: true });

module.exports = mongoose.model('RationRequest', rationRequestSchema);