const mongoose = require('mongoose');

const MaintenanceMasterSchema = new mongoose.Schema({
  category_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  reference_no:               { type: String, required: true, unique: true },
  description:                { type: String, required: true },
  estimated_duration_hours:   { type: Number },
  is_active:                  { type: Boolean, default: true },
  frequencies:                [{ type: String }],
  locations:                  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
  responsible_persons:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('MaintenanceMaster', MaintenanceMasterSchema);
