const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, async (req, res) => { res.json(await Category.find()); });
router.post('/', protect, adminOnly, async (req, res) => {
  try { res.status(201).json(await Category.create(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
router.put('/:id', protect, adminOnly, async (req, res) => {
  try { res.json(await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(500).json({ message: e.message }); }
});
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try { await Category.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (e) { res.status(500).json({ message: e.message }); }
});
module.exports = router;
