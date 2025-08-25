const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    unit: {
        type: String, // e.g., 'kg', 'liters', 'packets', 'units'
        required: true,
        trim: true
    },
    category: {
        type: String, // e.g., 'Grains', 'Oils', 'Vegetables', 'Spices'
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
        min: 0 // Stock cannot be negative
    }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
