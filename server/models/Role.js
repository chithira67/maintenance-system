const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  role_name:   { type: String, required: true, unique: true },
  description: { type: String },
  /** Permission keys; use '*' for full access (typically Admin only). */
  permissions: [{ type: String }]
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('Role', RoleSchema);
