const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Student = require('../models/Student');  
const PDFDocument = require('pdfkit-table');
const LeaveRequest = require('../models/LeaveRequest');
const MealConfirmation = require('../models/MealConfirmation');
const RationRequest = require('../models/RationRequest');
const InventoryItem = require('../models/InventoryItem');


// The main GET endpoint for the Live Kitchen Dashboard
router.get('/meal-counts/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const selectedDate = new Date(date);
        
        // Find all students who have an APPROVED leave for the selected date
        const leaves = await LeaveRequest.find({
            status: 'Approved',
            startDate: { $lte: selectedDate },
            returnDate: { $gte: selectedDate }
        }).select('sspId'); // This gives us the Student _id
        const onLeaveStudentIds = leaves.map(l => l.sspId);

        // Find all meal confirmations for the selected date
        const confirmations = await MealConfirmation.find({ date: selectedDate })
            .populate('sspId', 'name sspId photo'); // This .populate() will now work correctly

        // Get the IDs of students who have already confirmed a meal
        const confirmedStudentIds = confirmations.map(c => c.sspId._id);

        // Find all students who are NOT on leave AND have NOT confirmed a meal
        const notConfirmedStudents = await Student.find({
            _id: { $nin: [...onLeaveStudentIds, ...confirmedStudentIds] } // $nin means "not in this array"
        }, 'name sspId photo');

        // Process the confirmed list into a clean format for the frontend
        const confirmedList = confirmations.map(conf => ({
            ...conf.sspId.toObject(), // Converts the Mongoose document to a plain object
            meals: conf.meals,
            dinnerChoice: conf.dinnerChoice
        }));

        // Get the full details for the students who are on leave
        const onLeaveList = await Student.find({ _id: { $in: onLeaveStudentIds } }, 'name sspId photo');

        // Calculate the final counts
        const counts = {
            breakfast: confirmedList.filter(s => s.meals.includes('Breakfast')).length,
            lunch: confirmedList.filter(s => s.meals.includes('Lunch')).length,
            snacks: confirmedList.filter(s => s.meals.includes('Evening Snacks')).length,
            dinner: confirmedList.filter(s => s.meals.includes('Dinner')).length,
            veg: confirmedList.filter(s => s.dinnerChoice === 'Veg').length,
            nonVeg: confirmedList.filter(s => s.dinnerChoice === 'Non-Veg').length
        };

        res.status(200).json({
            success: true,
            counts,
            confirmedStudents: confirmedList,
            notConfirmedStudents: notConfirmedStudents,
            onLeaveStudents: onLeaveList
        });

    } catch (error) {
        console.error("Error fetching meal counts:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});







// --- UPGRADED RATION REQUEST ROUTES ---

// GET route to fetch available rations (this is correct)
router.get('/available-rations', async (req, res) => {
    try {
        const availableItems = await InventoryItem.find({ currentStock: { $gt: 0 } }).select('itemName itemImage unit category currentStock');
        const categorizedItems = availableItems.reduce((acc, item) => {
            const category = item.category || 'Uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});
        res.status(200).json({ success: true, items: categorizedItems });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});
// POST route with stock validation (this is correct)
router.post('/request-ration', async (req, res) => {
    try {
        const { items, chiefId, hostelName, hostelCode, preparationFor } = req.body;
        if (!items || items.length === 0 || !chiefId || !preparationFor) {
            throw new Error('Missing required fields.');
        }
        for (const cartItem of items) {
            const stockItem = await InventoryItem.findById(cartItem.item);
            if (!stockItem || stockItem.currentStock < cartItem.quantity) {
                throw new Error(`Insufficient stock for ${stockItem.itemName}. Only ${stockItem.currentStock} ${stockItem.unit} available.`);
            }
        }
        let newRequest = new RationRequest({ items, requestedBy: chiefId, hostelName, hostelCode, preparationFor });
        await newRequest.save();
        newRequest = await newRequest.populate({ path: 'items.item', model: 'InventoryItem', select: 'itemName' });
        res.status(201).json({ success: true, message: 'Ration request submitted successfully!', request: newRequest });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});


// --- THIS IS THE CORRECTED HISTORY ROUTE ---
router.get('/my-requests/:chiefId', async (req, res) => {
    try {
        const { chiefId } = req.params;
        const requests = await RationRequest.find({ requestedBy: chiefId })
            // The populate path needs to be 'items.item' to correctly fetch the name
            .populate({ path: 'items.item', model: 'InventoryItem', select: 'itemName' })
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});
/// In your routes/chiefRoutes.js file
// In your routes/chiefRoutes.js file

router.post('/generate-pdf', (req, res) => {
    try {
        const { items, chiefName, chiefId, hostelName, hostelCode, preparationFor, requestDate } = req.body;
        
        if (!items || !Array.isArray(items)) {
            throw new Error("Items data is missing or not an array.");
        }

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Ration_Request_${new Date(requestDate).toISOString().split('T')[0]}.pdf`);
        doc.pipe(res);

        // PDF Header (Unchanged)
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#1A237E').text('D. Devaraj Urs Backward Classes Welfare Department', { align: 'center' });
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(14).fillColor('#34495e').text(`Ration Request Slip - ${hostelName} (${hostelCode})`, { align: 'center' });
        doc.moveTo(40, doc.y + 15).lineTo(555, doc.y + 15).lineWidth(0.5).stroke('#cccccc');
        doc.moveDown(2);
        
        // Details Section (Unchanged)
        doc.fontSize(11).fillColor('#333333');
        const detailStartY = doc.y;
        doc.font('Helvetica-Bold').text('Request Date:', 40, detailStartY, { continued: true });
        doc.font('Helvetica').text(` ${new Date(requestDate).toLocaleString('en-GB')}`);
        doc.font('Helvetica-Bold').text('Requested By:', 300, detailStartY, { continued: true });
        doc.font('Helvetica').text(` ${chiefName}`);
        doc.font('Helvetica-Bold').text('Preparation For:', 40, detailStartY + 15, { continued: true });
        doc.font('Helvetica').text(` ${preparationFor}`);
        doc.font('Helvetica-Bold').text('Chief ID:', 300, detailStartY + 15, { continued: true });
        doc.font('Helvetica').text(` ${chiefId}`);
        doc.y = detailStartY + 30;
        doc.moveDown(1.5);

        // ===================================================================
        // --- MANUAL TABLE DRAWING (100% RELIABLE METHOD) ---
        // We are no longer using the buggy pdfkit-table plugin
        // ===================================================================
        const tableTop = doc.y;
        const itemX = 50;
        const quantityX = 300;
        const unitX = 450;

        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Item Name', itemX, tableTop);
        doc.text('Quantity Requested', quantityX, tableTop);
        doc.text('Unit', unitX, tableTop);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).lineWidth(0.5).stroke('#333333');
        doc.moveDown(0.5);
        
        doc.font('Helvetica').fontSize(10);
        let rowY = doc.y;
        
        items.forEach(item => {
            doc.text(item.itemName, itemX, rowY);
            doc.text(item.quantity.toString(), quantityX, rowY);
            doc.text(item.unit, unitX, rowY);
            rowY += 20; // Move down for the next row
        });

        doc.y = rowY; // Update the document's y position to be after the table
        // ===================================================================

        // ===================================================================
        // --- CORRECTED FOOTER SECTION ---
        // ===================================================================
        const footerY = doc.page.height - 100;
        doc.font('Helvetica-Bold').fontSize(10);

        // Draw the text labels first
        doc.text("Chief's Signature", 40, footerY);
        doc.text("Warden's Signature", 350, footerY);

        // Then draw the lines above the text
        doc.moveTo(40, footerY - 2).lineTo(200, footerY - 2).lineWidth(0.5).stroke('#333333');
        doc.moveTo(350, footerY - 2).lineTo(510, footerY - 2).lineWidth(0.5).stroke('#333333');
        // ===================================================================

        doc.end();
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF on the server.");
    }
});

module.exports = router;

