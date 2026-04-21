const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/users - Admin: get all users
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().populate('roles', 'role_name').select('-password_hash');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users - Admin: create user
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { username, name, email, password, phone, roleIds } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ username, name, email, password_hash: password, phone, roles: roleIds || [] });
    await user.populate('roles', 'role_name');
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id - Admin: update user
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, is_active, roleIds } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, is_active, roles: roleIds },
      { new: true }
    ).populate('roles', 'role_name');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id - Admin: deactivate user
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
