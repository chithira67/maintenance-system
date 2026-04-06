const express = require('express');
const router = express.Router();
const MaintenanceTask = require('../models/MaintenanceTask');
const Status = require('../models/Status');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');

const populate = [
  { path: 'maintenance_id', populate: { path: 'category_id' } },
  { path: 'equipment_id', populate: { path: 'location_id' } },
  { path: 'status_id' },
  { path: 'assigned_to', select: 'name email' },
  { path: 'verified_by', select: 'name email' }
];

// GET /api/tasks - Admin: all tasks | User: own tasks
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.roles.some(r => r.role_name === 'Admin');
    const filter = isAdmin ? {} : { assigned_to: req.user._id };
    const tasks = await MaintenanceTask.find(filter).populate(populate).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await MaintenanceTask.findById(req.params.id).populate(populate);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks - Admin only
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const task = await MaintenanceTask.create(req.body);
    await task.populate(populate);
    // Notify assigned user
    if (task.assigned_to) {
      await Notification.create({
        user_id: task.assigned_to._id,
        message: `New task assigned: ${task.maintenance_id?.reference_no || 'Task'}`
      });
    }
    await ActivityLog.create({ user_id: req.user._id, action: 'CREATE', table_name: 'MaintenanceTasks', record_id: task._id, new_value: 'Task created' });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tasks/:id - Admin: full update | User: update status/remarks
router.put('/:id', protect, async (req, res) => {
  try {
    const isAdmin = req.user.roles.some(r => r.role_name === 'Admin');
    const task = await MaintenanceTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const allowedFields = isAdmin
      ? req.body
      : { status_id: req.body.status_id, remarks: req.body.remarks, completed_date: req.body.completed_date };

    Object.assign(task, allowedFields);
    await task.save();
    await task.populate(populate);
    await ActivityLog.create({ user_id: req.user._id, action: 'UPDATE', table_name: 'MaintenanceTasks', record_id: task._id, new_value: JSON.stringify(allowedFields) });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/complete
router.patch('/:id/complete', protect, async (req, res) => {
  try {
    const doneStatus = await Status.findOne({ status_name: 'Done' });
    const task = await MaintenanceTask.findByIdAndUpdate(
      req.params.id,
      { status_id: doneStatus?._id, completed_date: new Date(), remarks: req.body.remarks },
      { new: true }
    ).populate(populate);
    await ActivityLog.create({ user_id: req.user._id, action: 'COMPLETE', table_name: 'MaintenanceTasks', record_id: task._id, new_value: 'Status set to Done' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/verify - Admin only
router.patch('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const verifiedStatus = await Status.findOne({ status_name: 'Verified' });
    const task = await MaintenanceTask.findByIdAndUpdate(
      req.params.id,
      { status_id: verifiedStatus?._id, verified_by: req.user._id, verified_date: new Date() },
      { new: true }
    ).populate(populate);
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id - Admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await MaintenanceTask.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
