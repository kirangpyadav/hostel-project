    const mongoose = require('mongoose');

    const kitCycleSchema = new mongoose.Schema({
        name: { // e.g., "September 2025 Kit"
            type: String,
            required: true,
            trim: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        contents: {
            type: String,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }, { timestamps: true });

    module.exports = mongoose.model('KitCycle', kitCycleSchema);
    
