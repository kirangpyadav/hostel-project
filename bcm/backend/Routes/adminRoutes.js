// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const crypto = require('crypto');
const KitCycle = require('../models/KitCycle');
const KitCollection = require('../models/KitCollection');
const RationRequest = require('../models/RationRequest');
const InventoryItem = require('../models/InventoryItem');
const ChiefUser = require('../models/ChiefUser');
const KitchenChief = require('../models/kitchenChief');
const RationTransaction = require('../models/RationTransaction');

// Initialize Twilio client from environment variables
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ROUTE 1: Get all PENDING leave requests (This is correct, no changes)
router.get('/leave-requests/pending', async (req, res) => {
    try {
        const requests = await LeaveRequest.find({ status: 'Submitted' })
            .populate('sspId', 'name photo sspId')
            .sort({ createdAt: 1 });
        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error("Error fetching pending requests:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// ROUTE 2: Get all OTHER leave requests (This is correct, no changes)
router.get('/leave-requests/history', async (req, res) => {
    try {
        const requests = await LeaveRequest.find({ status: { $ne: 'Submitted' } })
           .populate('sspId', 'name photo sspId')
            .sort({ updatedAt: -1 });
        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error("Error fetching leave history:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// --- UPDATED Approve Route ---
router.post('/leave-requests/:leaveId/approve', async (req, res) => {
    try {
        const { leaveId } = req.params;
        const leave = await LeaveRequest.findByIdAndUpdate(leaveId, { status: 'Approved', isActive: true }, { new: true });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        // --- BUG FIX & NEW SMS ---
        // Use findById because leave.sspId is an ObjectId
        const student = await Student.findById(leave.sspId); 
        if (student && student.phone) {
            const messageBody = `Hi ${student.name}. Good news! Your leave request has been APPROVED by the admin. You can now check the updated status in your student portal history.`;
            await twilioClient.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${student.phone}`
            });
        }

        res.status(200).json({ success: true, message: 'Leave request approved and SMS sent.' });
    } catch (error) {
        console.error("Error approving leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// --- UPDATED Reject Route ---
router.post('/leave-requests/:leaveId/reject', async (req, res) => {
    try {
        const { leaveId } = req.params;
        const leave = await LeaveRequest.findByIdAndUpdate(leaveId, { status: 'Rejected', isActive: false }, { new: true });

        if (!leave) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }
        
        // --- BUG FIX & NEW SMS ---
        // Use findById because leave.sspId is an ObjectId
        const student = await Student.findById(leave.sspId); 
        if (student && student.phone) {
            const messageBody = `Hi ${student.name}. Your leave request has been REJECTED. Please check your student portal history and contact the hostel warden for more information.`;
            await twilioClient.messages.create({
                body: messageBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${student.phone}`
            });
        }

        res.status(200).json({ success: true, message: 'Leave request rejected and SMS sent.' });
    } catch (error) {
        console.error("Error rejecting leave:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});











// --- THIS IS THE MISSING ROUTE ---
// Get all Kit Cycles for the dashboard view
router.get('/kit-cycles', async (req, res) => {
    try {
        const cycles = await KitCycle.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, cycles });
    } catch (error) {
        console.error("Error fetching kit cycles:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});
// Create a new Kit Distribution Cycle
// In routes/adminRoutes.js

// Replace the entire router.post('/kit-cycles', ...) function with this:
router.post('/kit-cycles', async (req, res) => {
    const { name, startDate, endDate, contents } = req.body;
    if (!name || !startDate || !endDate || !contents) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const newCycle = new KitCycle({ name, startDate, endDate, contents });
        await newCycle.save();

        const allStudents = await Student.find({}, '_id phone name'); // Also get the name

        const collectionPromises = allStudents.map(student => {
            const newCollection = new KitCollection({
                cycle: newCycle._id,
                student: student._id,
                qrToken: crypto.randomBytes(16).toString('hex')
            });
            return newCollection.save();
        });
        await Promise.all(collectionPromises);

        // --- THIS IS THE UPDATED SECTION ---
        // We are now sending the actual SMS messages.
        const smsPromises = allStudents.map(student => {
            if (student.phone) {
                const messageBody = `Hi ${student.name}. The ${name}  kit is now available for collection from ${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}. Please check your student portal.and please go and collect it  from the warden`;
                return twilioClient.messages.create({
                    body: messageBody,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: `+91${student.phone}`
                });
            }
            return Promise.resolve(); // Resolve for students without a phone number
        });

        // Use a try/catch here so that if SMS fails, the whole request doesn't fail.
        try {
            await Promise.all(smsPromises);
            console.log(`Successfully sent announcement SMS to students.`);
        } catch (smsError) {
            console.error("Mass SMS sending failed (but cycle was created):", smsError.message);
        }
        // --- END OF UPDATED SECTION ---

        res.status(201).json({ success: true, message: `Kit cycle '${name}' created and announced successfully!` });

    } catch (error) {
        console.error("Error creating kit cycle:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});



// ROUTE 7: Verify a QR token and mark a kit as collected
// In routes/adminRoutes.js

// ROUTE: Verify a QR token and mark a kit as collected
router.post('/kit-collection/verify', async (req, res) => {
    const { qrToken } = req.body;
    if (!qrToken) {
        return res.status(400).json({ success: false, message: 'QR Token is required.' });
    }

    try {
        // --- THIS IS THE UPDATED QUERY ---
        // We now fetch the student's sspId and the cycle's name as well.
        const collection = await KitCollection.findOne({ qrToken: qrToken })
            .populate('student', 'name sspId') // Get name AND sspId
            .populate('cycle', 'name');      // Also get the cycle's name

        if (!collection) {
            return res.status(404).json({ success: false, message: 'Invalid QR Code. No matching record found.' });
        }

        if (collection.status === 'Collected') {
            // --- UPDATED "ALREADY COLLECTED" MESSAGE ---
            return res.status(409).json({ 
                success: false, 
                message: `Kit for '${collection.cycle.name}' was already collected by ${collection.student.name} on ${new Date(collection.collectedAt).toLocaleDateString()}` 
            });
        }

        // Update the status and timestamp (this is unchanged)
        collection.status = 'Collected';
        collection.collectedAt = new Date();
        await collection.save();

        // --- UPDATED SUCCESS MESSAGE ---
        res.status(200).json({ 
            success: true, 
            message: `Success! Kit for '${collection.cycle.name}' collected by ${collection.student.name} (SSP ID: ${collection.student.sspId}).`
        });

    } catch (error) {
        console.error("Error verifying QR token:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});



// ROUTE 8: Get a detailed report for a specific kit cycle
router.get('/kit-cycles/:cycleId/report', async (req, res) => {
    try {
        const { cycleId } = req.params;

        // Find all collection records for this cycle
        const collections = await KitCollection.find({ cycle: cycleId })
            .populate('student', 'name sspId photo') // Get student details
            .populate('cycle', 'name'); // Get cycle details

        if (!collections) {
            return res.status(404).json({ success: false, message: 'No collection data found for this cycle.' });
        }

        res.status(200).json({ success: true, collections });
    } catch (error) {
        console.error("Error fetching kit cycle report:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});


// ROUTE 9: Send a final reminder SMS for an active cycle
router.post('/kit-cycles/:cycleId/remind', async (req, res) => {
    try {
        const { cycleId } = req.params;
        // Find all pending collections for this cycle
        const pendingCollections = await KitCollection.find({ cycle: cycleId, status: 'Pending' })
            .populate('student', 'name phone'); // Get student's name and phone

        if (pendingCollections.length === 0) {
            return res.status(200).json({ success: true, message: 'No pending collections to remind.' });
        }

        // Prepare and send SMS to each student
        const smsPromises = pendingCollections.map(collection => {
            const student = collection.student;
            if (student && student.phone) {
                const messageBody = `Hi ${student.name}. FINAL REMINDER: The collection period for the current kit is ending soon. Please collect your kit from the office. - BCM Hostel`;
                return twilioClient.messages.create({
                    body: messageBody,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: `+91${student.phone}`
                });
            }
            return Promise.resolve();
        });

        await Promise.all(smsPromises);

        res.status(200).json({ success: true, message: `Final reminder sent to ${pendingCollections.length} students.` });

    } catch (error) {
        console.error("Error sending kit reminders:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});


// ROUTE 10: Close a kit cycle
router.post('/kit-cycles/:cycleId/close', async (req, res) => {
    try {
        const { cycleId } = req.params;

        // 1. Mark the main cycle as inactive
        await KitCycle.findByIdAndUpdate(cycleId, { isActive: false });

        // 2. Update all remaining 'Pending' records to 'Not Collected'
        await KitCollection.updateMany(
            { cycle: cycleId, status: 'Pending' },
            { $set: { status: 'Not Collected' } }
        );

        res.status(200).json({ success: true, message: 'Cycle has been successfully closed.' });
    } catch (error) {
        console.error("Error closing kit cycle:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Add this new route to the bottom of routes/adminRoutes.js

// ROUTE 11: Re-open a closed kit cycle
router.post('/kit-cycles/:cycleId/reopen', async (req, res) => {
    try {
        const { cycleId } = req.params;

        // 1. Mark the main cycle as active again
        await KitCycle.findByIdAndUpdate(cycleId, { isActive: true });

        // 2. Find all 'Not Collected' records for this cycle and revert them to 'Pending'
        await KitCollection.updateMany(
            { cycle: cycleId, status: 'Not Collected' },
            { $set: { status: 'Pending' } }
        );

        res.status(200).json({ success: true, message: 'Cycle has been successfully re-opened.' });
    } catch (error) {
        console.error("Error re-opening kit cycle:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});









// ROUTE: Get all PENDING ration requests
router.get('/ration-requests/pending', async (req, res) => {
    try {
        const requests = await RationRequest.find({ status: 'Pending' })
            .populate({ 
                path: 'requestedBy', 
                model: 'ChiefUser',
                select: 'name photo', // Select fields from ChiefUser
                populate: { // Nested populate
                    path: 'chiefInfo',
                    model: 'KitchenChief',
                    select: 'name photo' // Get the photo and name from the linked KitchenChief
                }
            })
            .populate({ path: 'items.item', model: 'InventoryItem', select: 'itemName currentStock unit' })
            .sort({ createdAt: 1 });

        // We need to manually construct the chief's info from the nested populate
        const formattedRequests = requests.map(req => {
            const chiefInfo = req.requestedBy.chiefInfo;
            return {
                ...req.toObject(),
                requestedBy: {
                    _id: req.requestedBy._id,
                    name: chiefInfo.name,
                    photo: chiefInfo.photo
                }
            };
        });

        res.status(200).json({ success: true, requests: formattedRequests });
    } catch (error) {
        console.error("Error fetching pending ration requests:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});



// ROUTE: Approve a ration request
router.post('/ration-requests/:requestId/approve', async (req, res) => {
    const { requestId } = req.params;
    try {
        const request = await RationRequest.findById(requestId)
            .populate({
                path: 'requestedBy',
                model: 'ChiefUser',
                populate: {
                    path: 'chiefInfo',
                    model: 'KitchenChief',
                    select: 'name'
                }
            })
            .populate('items.item');

        // ===================================================================
        // --- ADD THIS DEBUGGING CODE ---
        // ===================================================================
        console.log("\n--- DEBUGGING RATION APPROVAL ---");
        console.log("Full Request Object:", JSON.stringify(request, null, 2)); // See the full structure
        console.log("Value for 'preparationFor':", request.preparationFor);
        console.log("Value for 'requestedBy.chiefInfo.name':", request.requestedBy?.chiefInfo?.name);
        console.log("---------------------------------\n");
        // ===================================================================
        // --- END OF DEBUGGING CODE ---
        // ===================================================================
        
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }
        if (request.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'This request has already been processed.' });
        }

        // Final stock check
        for (const reqItem of request.items) {
            if (reqItem.item.currentStock < reqItem.quantity) {
                throw new Error(`Cannot approve: Insufficient stock for ${reqItem.item.itemName}.`);
            }
        }

        // Deduct from stock
        for (const reqItem of request.items) {
            await InventoryItem.findByIdAndUpdate(reqItem.item._id, {
                $inc: { currentStock: -reqItem.quantity }
            });
        }
        
        // Create the transaction history record
        const transactionRecords = request.items.map(reqItem => ({
            item: reqItem.item._id,
            type: 'OUT',
            quantity: reqItem.quantity,
            purpose: request.preparationFor || 'Admin Approved Request',
            chief: request.requestedBy?.chiefInfo?.name || 'N/A' // Using optional chaining for safety
        }));

        await RationTransaction.insertMany(transactionRecords);

        // Update request status
        request.status = 'Approved';
        await request.save();

        res.status(200).json({ success: true, message: 'Request approved, inventory and history updated.' });
    } catch (error) {
        console.error("Error approving ration request:", error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// ROUTE: Reject a ration request
router.post('/ration-requests/:requestId/reject', async (req, res) => {
    const { requestId } = req.params;
    try {
        const request = await RationRequest.findByIdAndUpdate(requestId, { status: 'Rejected' });
        if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

        // Optional: Send SMS to chief
        // ...

        res.status(200).json({ success: true, message: 'Request has been rejected.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});



module.exports = router;