const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  role_name:   { type: String, required: true, unique: true },
  description: { type: String }
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('Role', RoleSchema);
