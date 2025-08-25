const mongoose = require('mongoose');

const chiefSchema = new mongoose.Schema({
  name: { type: String, required: true },
  aadharLast4: { type: String, required: true },
  loginId: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

module.exports = mongoose.model('Chief', chiefSchema);
