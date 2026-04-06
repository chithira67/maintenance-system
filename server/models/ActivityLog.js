const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:     { type: String, required: true },
  table_name: { type: String },
  record_id:  { type: String },
  old_value:  { type: String },
  new_value:  { type: String },
  timestamp:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
