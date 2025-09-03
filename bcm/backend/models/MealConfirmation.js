// models/MealConfirmation.js

const mongoose = require('mongoose');

const mealConfirmationSchema = new mongoose.Schema({
    sspId: {
        type: String,
        required: true,
        ref: 'Student'
    },
    date: {
        type: Date,
        required: true
    },
    meals: {
        type: [String],
        required: true
    },
    // --- NEW FIELD ADDED ---
    dinnerChoice: {
        type: String,
        enum: ['Veg', 'Non-Veg'], // Only allows these two values
        default: null
    },
    confirmedAt: {
        type: Date,
        default: Date.now
    }
});

mealConfirmationSchema.index({ sspId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('MealConfirmation', mealConfirmationSchema);