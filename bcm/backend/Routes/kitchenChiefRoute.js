const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const KitchenChief = require('../models/kitchenChief');

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, file.fieldname + '-' + uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 }, // 200KB
}).fields([
  { name: 'aadharFile', maxCount: 1 },
  { name: 'passbook', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]);

// Generate a unique 10-digit login ID
const generateLoginId = async () => {
  let idExists = true;
  let loginId;

  while (idExists) {
    loginId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const existing = await KitchenChief.findOne({ loginId });
    if (!existing) idExists = false;
  }

  return loginId;
};



router.post('/register', (req, res) => {
  upload(req, res, async function (err) {
    if (err) return res.status(400).json({ message: err.message });

    try {
      // Generate unique 10-digit login ID
      const loginId = String(await generateLoginId());
  // ✅ generate here

      // Create new chief entry with loginId included
      const newChief = new KitchenChief({
        loginId,  // ✅ include loginId in MongoDB
        name: req.body.name,
        age: req.body.age,
        gender: req.body.gender,
        mobile: req.body.mobile,
        address: req.body.address,
        aadhar: req.body.aadhar,
        account: req.body.account,
        ifsc: req.body.ifsc,
        aadharFile: req.files['aadharFile']?.[0]?.filename || '',
        passbook: req.files['passbook']?.[0]?.filename || '',
        photo: req.files['photo']?.[0]?.filename || ''
      });

      await newChief.save();

      // ✅ Send loginId in the response
      res.json({
        success: true,
        message: 'Kitchen Chief registered successfully',
        loginId: loginId
      });

    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  });
});


router.get('/all', async (req, res) => {
  try {
    const chiefs = await KitchenChief.find();
    console.log('✅ Sending all chiefs:', chiefs); // <-- ADD THIS
    res.json({ success: true, chiefs });
  } catch (err) {
    console.error('❌ Error fetching chiefs:', err); // <-- ADD THIS
    res.status(500).json({ success: false, message: 'Failed to fetch chiefs' });
  }
});





// --- GET /kitchen-chief/find/:loginId ---
// Finds a single chief by their unique Login ID
router.get('/find/:loginId', async (req, res) => {
    try {
        const { loginId } = req.params;

        if (!loginId || loginId.length !== 10) {
            return res.status(400).json({ message: 'A valid 10-digit Login ID is required.' });
        }

        const chief = await KitchenChief.findOne({ loginId: loginId });

        if (!chief) {
            return res.status(404).json({ message: 'Chief with that Login ID not found.' });
        }

        // Return all chief data
        res.status(200).json(chief);

    } catch (error) {
        console.error('Find Chief Error:', error);
        res.status(500).json({ message: 'Server error while finding chief.' });
    }
});




// --- PUT /kitchen-chief/update/:id ---
// Finds a chief by their _id and updates their details
router.put('/update/:id', (req, res) => {
    upload(req, res, async function (err) {
        if (err) return res.status(400).json({ success: false, message: err.message });

        try {
            const { id } = req.params;
            const updateData = { ...req.body }; // Get all text fields

            const existingChief = await KitchenChief.findById(id);
            if (!existingChief) {
                return res.status(404).json({ success: false, message: 'Chief not found.' });
            }

            // Check for new file uploads and add them to the update data
            if (req.files['aadharFile']) {
                updateData.aadharFile = req.files['aadharFile'][0].filename;
            }
            if (req.files['passbook']) {
                updateData.passbook = req.files['passbook'][0].filename;
            }
            if (req.files['photo']) {
                updateData.photo = req.files['photo'][0].filename;
            }

            await KitchenChief.findByIdAndUpdate(id, updateData);

            res.json({
                success: true,
                message: 'Chief details updated successfully'
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });
});



// --- DELETE /kitchen-chief/delete/:id ---
// Deletes a chief's record and their uploaded files
router.delete('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // First, find the chief to get their file paths
        const chief = await KitchenChief.findById(id);
        if (!chief) {
            return res.status(404).json({ success: false, message: 'Chief not found.' });
        }

        // List of file fields to check and delete
        const filesToDelete = [chief.aadharFile, chief.passbook, chief.photo];

        filesToDelete.forEach(filename => {
            if (filename) {
                const filePath = path.join(__dirname, '..', 'uploads', filename);
                // Check if the file exists before trying to delete it
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        });

        // Now, delete the chief's record from the database
        await KitchenChief.findByIdAndDelete(id);

        res.json({ success: true, message: 'Chief deleted successfully.' });

    } catch (e) {
        console.error('Delete Chief Error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});




// --- GET /kitchen-chief/details/:id ---
// Fetches the full details for a single chief by their _id
router.get('/details/:id', async (req, res) => {
    try {
        const chief = await KitchenChief.findById(req.params.id);
        if (!chief) {
            return res.status(404).json({ success: false, message: 'Chief not found.' });
        }
        res.json({ success: true, chief });
    } catch (err) {
        console.error('Error fetching chief details:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



module.exports = router;
