const express = require('express');
const router = express.Router();
const Status = require('../models/Status');
const { protect } = require('../middleware/auth');

// GET /api/statuses
router.get('/', protect, async (req, res) => {
  try {
    const statuses = await Status.find().sort({ status_name: 1 });
    res.json(statuses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
