const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const LeaveRequest = require('../models/LeaveRequest');
const MealConfirmation = require('../models/MealConfirmation');

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

// We will add the "Request Rations" routes here later
// router.post('/ration-request', ...);
// router.get('/my-ration-requests', ...);

module.exports = router;

