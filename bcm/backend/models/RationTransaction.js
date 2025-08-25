const mongoose = require('mongoose');
const { Schema } = mongoose;

const rationTransactionSchema = new mongoose.Schema({
    // Link to the specific inventory item
    item: {
        type: Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true
    },
    // Was the stock added or used?
    type: {
        type: String,
        enum: ['IN', 'OUT'], // 'IN' for incoming, 'OUT' for outgoing
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    // For incoming stock
    source: {
        type: String, // e.g., 'Government Supply', 'Local Purchase'
        // This field is only required if the type is 'IN'
        required: function() { return this.type === 'IN'; } 
    },
    // For outgoing stock
    purpose: {
        type: String, // e.g., 'Breakfast', 'Lunch', 'Dinner'
        // This field is only required if the type is 'OUT'
        required: function() { return this.type === 'OUT'; } 
    },
    // Who took the stock? (For outgoing)
    chief: {
        type: String // We can store the Chief's name or ID here
    },
    transactionDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('RationTransaction', rationTransactionSchema);
