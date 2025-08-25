const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  sspId: { type: String, unique: true },
  password: String,
  phone: String,
  hostel: String,
  otp: String,
});

module.exports = mongoose.model('User', userSchema);
