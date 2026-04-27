const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const { protect, getPermissionsFromUser } = require('../middleware/auth');

const signToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

function userPayload(userDoc) {
  return {
    id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    username: userDoc.username,
    role: userDoc.roles.length > 0 ? userDoc.roles[0].role_name : 'User',
    roles: userDoc.roles.map((r) => r.role_name),
    permissions: getPermissionsFromUser(userDoc),
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, name, email, password, phone } = req.body;
    if (!username || !name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    // Assign default User role
    let userRole = await Role.findOne({ role_name: 'User' });
    if (!userRole) userRole = await Role.create({ role_name: 'User', description: 'Regular user' });

    const user = await User.create({ username, name, email, password_hash: password, phone, roles: [userRole._id] });
    const populated = await User.findById(user._id).populate('roles');
    const token = signToken(user._id, 'User');
    res.status(201).json({ token, user: userPayload(populated) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, is_active: true }).populate('roles');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    user.last_login = new Date();
    await user.save({ validateBeforeSave: false });

    const role = user.roles.length > 0 ? user.roles[0].role_name : 'User';
    const token = signToken(user._id, role);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id).populate('roles');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: req.user.role,
    roles: user.roles.map((r) => r.role_name),
    permissions: getPermissionsFromUser(user),
  });
});

module.exports = router;
