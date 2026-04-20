const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { P } = require('../utils/permissions');

// GET /api/users/assignees — minimal list for task assignment (supervisors/admins)
router.get('/assignees', protect, requireAnyPermission(P.TASKS_ASSIGN, P.TASKS_CREATE, P.ALL), async (req, res) => {
  try {
    const users = await User.find({ is_active: true }).select('name email username').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users
router.get('/', protect, requirePermission(P.USERS_MANAGE), async (req, res) => {
  try {
    const users = await User.find().populate('roles', 'role_name permissions').select('-password_hash');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users
router.post('/', protect, requirePermission(P.USERS_MANAGE), async (req, res) => {
  try {
    const { username, name, email, password, phone, roleIds } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ username, name, email, password_hash: password, phone, roles: roleIds || [] });
    await user.populate('roles', 'role_name permissions');
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', protect, requirePermission(P.USERS_MANAGE), async (req, res) => {
  try {
    const { name, email, phone, is_active, roleIds } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, is_active, roles: roleIds },
      { new: true }
    ).populate('roles', 'role_name permissions');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id — deactivate
router.delete('/:id', protect, requirePermission(P.USERS_MANAGE), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
