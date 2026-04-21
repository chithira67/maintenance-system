const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, requirePermission } = require('../middleware/auth');
const { P } = require('../utils/permissions');

router.get('/', protect, async (req, res) => {
  res.json(await Category.find().sort({ category_name: 1 }));
});

router.post('/', protect, requirePermission(P.MASTERS_MANAGE), async (req, res) => {
  try {
    res.status(201).json(await Category.create(req.body));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/:id', protect, requirePermission(P.MASTERS_MANAGE), async (req, res) => {
  try {
    res.json(await Category.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/:id', protect, requirePermission(P.MASTERS_MANAGE), async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
