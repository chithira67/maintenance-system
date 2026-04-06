const mongoose = require('mongoose');

const MaintenanceTaskSchema = new mongoose.Schema({
  maintenance_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceMaster', required: true },
  equipment_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  start_date:     { type: Date },
  last_done:      { type: Date },
  next_due:       { type: Date },
  assigned_to:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Status', required: true },
  priority:       { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
  remarks:        { type: String },
  completed_date: { type: Date },
  verified_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verified_date:  { type: Date },
  attachments:    [{
    file_name:   String,
    file_path:   String,
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploaded_at: { type: Date, default: Date.now }
  }]
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('MaintenanceTask', MaintenanceTaskSchema);
