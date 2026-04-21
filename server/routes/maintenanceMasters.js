const express = require('express');
const router = express.Router();
const MaintenanceMaster = require('../models/MaintenanceMaster');
const { protect } = require('../middleware/auth');

// GET /api/maintenance-masters
router.get('/', protect, async (req, res) => {
  try {
    const masters = await MaintenanceMaster.find().sort({ reference_no: 1 });
    res.json(masters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
