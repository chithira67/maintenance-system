const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  const notes = await Notification.find({ user_id: req.user.id }).sort({ createdAt: -1 }).limit(20);
  res.json(notes);
});

router.patch('/:id/read', verifyToken, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { is_read: true });
  res.json({ message: 'Marked as read' });
});

router.patch('/read-all', verifyToken, async (req, res) => {
  await Notification.updateMany({ user_id: req.user.id }, { is_read: true });
  res.json({ message: 'All marked as read' });
});

module.exports = router;
