const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
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



module.exports = router;
