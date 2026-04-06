const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  const notes = await Notification.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(20);
  res.json(notes);
});

router.patch('/:id/read', protect, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { is_read: true });
  res.json({ message: 'Marked as read' });
});

router.patch('/read-all', protect, async (req, res) => {
  await Notification.updateMany({ user_id: req.user._id }, { is_read: true });
  res.json({ message: 'All marked as read' });
});

module.exports = router;
