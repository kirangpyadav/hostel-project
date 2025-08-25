const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const InventoryItem = require('../models/InventoryItem');
const RationTransaction = require('../models/RationTransaction');
const mongoose = require('mongoose');

// ===================================================================
// MULTER CONFIGURATION
// ===================================================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // For adding new items, we save to a general uploads folder first
        const uploadPath = 'uploads/';
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


// ===================================================================
// INVENTORY ROUTES
// ===================================================================

// --- POST /api/rations/inventory/add ---
// Adds a new type of item to the main inventory list
router.post('/inventory/add', upload.single('itemImage'), async (req, res) => {
    try {
        const { itemName, unit, category } = req.body;
        const itemImage = req.file ? req.file.path.replace(/\\/g, "/") : '';
        
        if (!itemName || !unit || !category || !itemImage) {
            return res.status(400).json({ message: 'Item name, unit, category, and image are required.' });
        }

        const newItem = new InventoryItem({ itemName, unit, category, itemImage });
        await newItem.save();
        res.status(201).json({ message: `'${itemName}' added to inventory.`, item: newItem });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'An inventory item with this name already exists.' });
        }
        console.error('Add Inventory Item Error:', error);
        res.status(500).json({ message: 'Server error while adding inventory item.' });
    }
});

// --- GET /api/rations/inventory ---
// Gets a list of all items in the inventory
router.get('/inventory', async (req, res) => {
    try {
        const items = await InventoryItem.find({}).sort({ category: 1, itemName: 1 });
        res.status(200).json(items);
    } catch (error) {
        console.error('Get Inventory Error:', error);
        res.status(500).json({ message: 'Server error while fetching inventory.' });
    }
});


// ===================================================================
// TRANSACTION ROUTES
// ===================================================================

// --- POST /api/rations/transaction/in ---
router.post('/transaction/in', async (req, res) => {
    try {
        const { itemId, quantity, source } = req.body;
        if (!itemId || !quantity || !source) {
            return res.status(400).json({ message: 'Item ID, quantity, and source are required.' });
        }

        const item = await InventoryItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }

        const transaction = new RationTransaction({ item: itemId, type: 'IN', quantity, source });
        await transaction.save();

        item.currentStock += Number(quantity);
        await item.save();

        res.status(200).json({ message: 'Stock added successfully.', item });
    } catch (error) {
        console.error('Incoming Transaction Error:', error);
        res.status(500).json({ message: 'Server error during incoming transaction.' });
    }
});






// --- POST /api/rations/transaction/in/bulk ---
// Records multiple incoming stock transactions at once
router.post('/transaction/in/bulk', async (req, res) => {
    try {
        const { items, source } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0 || !source) {
            return res.status(400).json({ message: 'A list of items and a source are required.' });
        }

        const transactionPromises = [];
        const updatePromises = [];

        for (const incomingItem of items) {
            // Create a transaction record for each item
            const transaction = new RationTransaction({
                item: incomingItem.itemId,
                type: 'IN',
                quantity: incomingItem.quantity,
                source
            });
            transactionPromises.push(transaction.save());

            // Prepare the stock update for each item
            updatePromises.push(
                InventoryItem.updateOne(
                    { _id: incomingItem.itemId },
                    { $inc: { currentStock: Number(incomingItem.quantity) } }
                )
            );
        }

        // Execute all database operations
        await Promise.all(transactionPromises);
        await Promise.all(updatePromises);

        res.status(200).json({ message: 'Stock added successfully for all items.' });

    } catch (error) {
        console.error('Bulk Incoming Transaction Error:', error);
        res.status(500).json({ message: 'Server error during bulk stock addition.' });
    }
});




// --- POST /api/rations/transaction/out ---
router.post('/transaction/out', async (req, res) => {
    try {
        const { itemId, quantity, purpose, chief } = req.body;
        if (!itemId || !quantity || !purpose) {
            return res.status(400).json({ message: 'Item ID, quantity, and purpose are required.' });
        }

        const item = await InventoryItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }

        if (item.currentStock < quantity) {
            return res.status(400).json({ message: `Not enough stock for ${item.itemName}. Only ${item.currentStock} ${item.unit} available.` });
        }

        const transaction = new RationTransaction({ item: itemId, type: 'OUT', quantity, purpose, chief });
        await transaction.save();

        item.currentStock -= Number(quantity);
        await item.save();

        res.status(200).json({ message: 'Stock usage recorded successfully.', item });
    } catch (error) {
        console.error('Outgoing Transaction Error:', error);
        res.status(500).json({ message: 'Server error during outgoing transaction.' });
    }
});

// --- GET /api/rations/history/:itemId ---
router.get('/history/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const transactions = await RationTransaction.find({ item: itemId }).sort({ transactionDate: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Get History Error:', error);
        res.status(500).json({ message: 'Server error while fetching transaction history.' });
    }
});


module.exports = router;
