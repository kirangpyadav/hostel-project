// models/Meal.js
const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sspId: { type: String, required: true },
  hostel: { type: String, required: true },  // ✅ include hostel
  meals: [{ type: String, required: true }],
}, { timestamps: true });

module.exports = mongoose.model("Meal", mealSchema);
