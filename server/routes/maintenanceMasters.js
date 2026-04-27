const express = require('express');
const router = express.Router();
const MaintenanceMaster = require('../models/MaintenanceMaster');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// GET /api/maintenance-masters
router.get('/', verifyToken, async (req, res) => {
  try {
    const masters = await MaintenanceMaster.find()
      .populate('category_id')
      .sort({ reference_no: 1 });
    res.json(masters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/maintenance-masters/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await MaintenanceMaster.findById(req.params.id).populate('category_id locations responsible_persons');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/maintenance-masters
router.post('/', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    const master = await MaintenanceMaster.create(req.body);
    await master.populate('category_id');
    res.status(201).json(master);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/maintenance-masters/:id
router.put('/:id', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    const master = await MaintenanceMaster.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('category_id');
    if (!master) return res.status(404).json({ message: 'Not found' });
    res.json(master);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/maintenance-masters/:id — soft deactivate
router.delete('/:id', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    const master = await MaintenanceMaster.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    if (!master) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Template deactivated', master });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
