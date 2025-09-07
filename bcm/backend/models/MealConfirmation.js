const mongoose = require('mongoose');

const mealConfirmationSchema = new mongoose.Schema({
    // --- THIS IS THE CRITICAL FIX ---
    // The type must be ObjectId to correctly link to the Student model.
    sspId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Student' 
    },
    // --- END OF FIX ---
    date: {
        type: Date,
        required: true
    },
    meals: {
        type: [String],
        required: true
    },
    dinnerChoice: {
        type: String,
        enum: ['Veg', 'Non-Veg'],
        default: null
    },
    confirmedAt: {
        type: Date,
        default: Date.now
    }
});

// This index now uses the corrected sspId field.
mealConfirmationSchema.index({ sspId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('MealConfirmation', mealConfirmationSchema);
