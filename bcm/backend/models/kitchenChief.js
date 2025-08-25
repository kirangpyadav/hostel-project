const mongoose = require('mongoose');

const kitchenChiefSchema = new mongoose.Schema({
  loginId: { type: String, unique: true, required: true }, // ✅ added field
  name: String,
  age: Number,
  gender: String,
  mobile: String,
  address: String,
  aadhar: String,
  account: String,
  ifsc: String,
  aadharFile: String,
  passbook: String,
  photo: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('KitchenChief', kitchenChiefSchema);
