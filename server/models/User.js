const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username:      { type: String, required: true, unique: true, trim: true },
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password_hash: { type: String, required: true },
  phone:         { type: String },
  is_active:     { type: Boolean, default: true },
  last_login:    { type: Date },
  roles:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { timestamps: { createdAt: 'created_at' } });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) return next();
  this.password_hash = await bcrypt.hash(this.password_hash, 10);
  next();
});

UserSchema.methods.matchPassword = function (password) {
  return bcrypt.compare(password, this.password_hash);
};

module.exports = mongoose.model('User', UserSchema);
