const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
  equipment_name:  { type: String, required: true },
  serial_number:   { type: String },
  category_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  purchase_date:   { type: Date },
  warranty_expiry: { type: Date },
  location_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  is_active:       { type: Boolean, default: true }
});

module.exports = mongoose.model('Equipment', EquipmentSchema);
