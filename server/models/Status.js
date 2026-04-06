const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
  status_name: { type: String, required: true, unique: true },
  description: { type: String },
  is_final:    { type: Boolean, default: false }
});

module.exports = mongoose.model('Status', StatusSchema);
