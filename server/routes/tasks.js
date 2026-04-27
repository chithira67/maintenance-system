const express = require('express');
const router = express.Router();
const MaintenanceTask = require('../models/MaintenanceTask');
const Status = require('../models/Status');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const populate = [
  { path: 'maintenance_id', populate: { path: 'category_id' } },
  { path: 'equipment_id', populate: { path: 'location_id' } },
  { path: 'status_id' },
  { path: 'assigned_to', select: 'name email' },
  { path: 'verified_by', select: 'name email' },
];

function normalizeDate(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getNextDueDate(baseDate, frequency) {
  if (!frequency) return null;
  const next = normalizeDate(baseDate);

  switch (frequency) {
    case 'Daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'Weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'Monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'Quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'Semi-Annual':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'Annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      return null;
  }

  return next;
}

function taskListFilter(user) {
  if (['Admin', 'Supervisor'].includes(user.role)) return {};
  if (['Technician', 'User'].includes(user.role)) return { assigned_to: user.id };
  return null;
}

function canAccessTaskDoc(user, task) {
  if (['Admin', 'Supervisor'].includes(user.role)) return true;
  if (!task.assigned_to) return false;
  return String(task.assigned_to) === String(user.id);
}

function sanitizePayload(payload) {
  const result = { ...payload };
  ['maintenance_id', 'equipment_id', 'assigned_to'].forEach((field) => {
    if (result[field] === '' || result[field] === null) delete result[field];
  });
  return result;
}

// GET /api/tasks
router.get('/', verifyToken, async (req, res) => {
  try {
    const filter = taskListFilter(req.user);
    if (filter === null) return res.status(403).json({ message: 'Insufficient permissions to view tasks' });
    const tasks = await MaintenanceTask.find(filter).populate(populate).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const task = await MaintenanceTask.findById(req.params.id).populate(populate);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!canAccessTaskDoc(req.user, task)) return res.status(403).json({ message: 'Forbidden' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks
router.post('/', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    const task = await MaintenanceTask.create(payload);
    await task.populate(populate);
    if (task.assigned_to) {
      await Notification.create({
        user_id: task.assigned_to._id || task.assigned_to,
        message: `New task assigned: ${task.maintenance_id?.reference_no || task.maintenance_reference || 'Task'}`,
      });
    }
    // ActivityLog removed for simplicity
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const task = await MaintenanceTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!canAccessTaskDoc(req.user, task)) return res.status(403).json({ message: 'Forbidden' });

    let allowedFields;
    if (['Admin', 'Supervisor'].includes(req.user.role)) {
      allowedFields = sanitizePayload(req.body);
    } else if (['Technician', 'User'].includes(req.user.role) && String(task.assigned_to) === String(req.user.id)) {
      // Limited fields for Technician/User
      allowedFields = {};
      if (req.body.status_id) allowedFields.status_id = req.body.status_id;
      if (req.body.remarks) allowedFields.remarks = req.body.remarks;
      if (req.body.completed_date) allowedFields.completed_date = req.body.completed_date;
      // For attachments, perhaps separate route
    } else {
      return res.status(403).json({ message: 'Cannot update this task' });
    }

    Object.assign(task, allowedFields);
    await task.save();
    await task.populate(populate);
    // ActivityLog would need user id, but req.user.id is string, need to fetch or adjust
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/complete
router.patch('/:id/complete', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    const doneStatus = await Status.findOne({ status_name: 'Done' });
    const task = await MaintenanceTask.findById(req.params.id).populate('maintenance_id');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!canAccessTaskDoc(req.user, task)) return res.status(403).json({ message: 'Forbidden' });

    const frequency = task.frequency || task.maintenance_id?.frequencies?.[0] || null;
    const nextDue = getNextDueDate(new Date(), frequency);

    const update = {
      status_id: doneStatus?._id,
      completed_date: new Date(),
      last_done: new Date(),
      remarks: req.body.remarks,
    };

    if (nextDue) update.next_due = nextDue;

    const updatedTask = await MaintenanceTask.findByIdAndUpdate(req.params.id, update, { new: true });
    // await updatedTask.populate(populate); // removed for simplicity
    // await ActivityLog.create({
    //   user_id: req.user.id,
    //   action: 'COMPLETE',
    //   table_name: 'MaintenanceTasks',
    //   record_id: updatedTask._id,
    //   new_value: 'Status set to Done and next due generated',
    // });
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/verify
router.patch('/:id/verify', verifyToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
  try {
    const verifiedStatus = await Status.findOne({ status_name: 'Verified' });
    const task = await MaintenanceTask.findByIdAndUpdate(
      req.params.id,
      { status_id: verifiedStatus?._id, verified_by: req.user.id, verified_date: new Date() },
      { new: true }
    );
    // await task.populate(populate); // removed for simplicity
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', verifyToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    await MaintenanceTask.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
