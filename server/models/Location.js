const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  location_name:      { type: String, required: true },
  description:        { type: String },
  parent_location_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null }
});

module.exports = mongoose.model('Location', LocationSchema);
