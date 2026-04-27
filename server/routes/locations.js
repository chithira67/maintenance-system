const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  res.json(await Location.find().populate('parent_location_id', 'location_name').sort({ location_name: 1 }));
});

router.post('/', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    res.status(201).json(await Location.create(req.body));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/:id', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    res.json(await Location.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/:id', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    await Location.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
