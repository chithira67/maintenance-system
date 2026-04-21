const express = require('express');
const router = express.Router();
const MaintenanceTask = require('../models/MaintenanceTask');
const Status = require('../models/Status');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const statuses = await Status.find();
    const today = new Date(); today.setHours(0,0,0,0);

    const summary = await Promise.all(statuses.map(async s => ({
      status: s.status_name,
      count: await MaintenanceTask.countDocuments({ status_id: s._id })
    })));

    const overdue = await MaintenanceTask.find({ next_due: { $lt: today } })
      .populate([
        { path: 'maintenance_id', select: 'reference_no description' },
        { path: 'equipment_id', select: 'equipment_name' },
        { path: 'assigned_to', select: 'name email' },
        { path: 'status_id', select: 'status_name' }
      ])
      .sort({ next_due: 1 })
      .limit(10);

    const totalTasks = await MaintenanceTask.countDocuments();
    const completedToday = await MaintenanceTask.countDocuments({ completed_date: { $gte: today } });

    res.json({ summary, overdue, totalTasks, completedToday });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User dashboard - own stats
router.get('/my', protect, async (req, res) => {
  try {
    const statuses = await Status.find();
    const summary = await Promise.all(statuses.map(async s => ({
      status: s.status_name,
      count: await MaintenanceTask.countDocuments({ assigned_to: req.user._id, status_id: s._id })
    })));
    const today = new Date(); today.setHours(0,0,0,0);
    const overdue = await MaintenanceTask.find({ assigned_to: req.user._id, next_due: { $lt: today } })
      .populate('maintenance_id status_id equipment_id')
      .sort({ next_due: 1 });
    res.json({ summary, overdue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
