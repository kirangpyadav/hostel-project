const express = require("express");
const router = express.Router();
const Meal = require("../models/Meal");

router.post("/submit", async (req, res) => {
  // ✅ Log the full incoming request body for debugging
  console.log("Meal submission request received:", req.body);

  const { name, sspId, hostel, meals } = req.body;

  if (!name || !sspId || !hostel || !Array.isArray(meals)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const newMeal = new Meal({ name, sspId, hostel, meals });
    await newMeal.save();
    res.json({ message: "Meals submitted successfully" });
  } catch (err) {
    console.error("Meal submission error:", err);
    res.status(500).json({ message: "Server error while saving meals" });
  }
});

module.exports = router;
