const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { protect, requireAnyPermission, requirePermission } = require('../middleware/auth');
const { P } = require('../utils/permissions');

router.get('/', protect, requireAnyPermission(P.ROLES_VIEW, P.ROLES_MANAGE, P.USERS_MANAGE, P.ALL), async (req, res) => {
  const roles = await Role.find().sort({ role_name: 1 });
  res.json(roles);
});

router.post('/', protect, requirePermission(P.ROLES_MANAGE), async (req, res) => {
  try {
    const { role_name, description, permissions } = req.body;
    const role = await Role.create({
      role_name,
      description,
      permissions: Array.isArray(permissions) ? permissions : [],
    });
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, requirePermission(P.ROLES_MANAGE), async (req, res) => {
  try {
    const { role_name, description, permissions } = req.body;
    const update = {};
    if (role_name !== undefined) update.role_name = role_name;
    if (description !== undefined) update.description = description;
    if (permissions !== undefined) update.permissions = Array.isArray(permissions) ? permissions : [];
    const role = await Role.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, requirePermission(P.ROLES_MANAGE), async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
