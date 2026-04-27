const express = require('express');
const router = express.Router();
const Equipment = require('../models/Equipment');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  const equipment = await Equipment.find({ is_active: true }).populate('category_id location_id');
  res.json(equipment);
});

router.post('/', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    res.status(201).json(await Equipment.create(req.body));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/:id', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    res.json(await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/:id', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    await Equipment.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'Deactivated' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
