const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    unit: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    itemImage: {
        type: String,
        required: true
    },
    currentStock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    }
}, { timestamps: true });

// --- THIS IS THE FIX ---
// This line checks if the model already exists before trying to create it.
// This prevents the "OverwriteModelError" completely.
module.exports = mongoose.models.InventoryItem || mongoose.model('InventoryItem', inventoryItemSchema);
