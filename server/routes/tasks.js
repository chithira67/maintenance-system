const express = require('express');
const router = express.Router();
const MaintenanceTask = require('../models/MaintenanceTask');
const Status = require('../models/Status');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { protect, userHasPermission, requirePermission } = require('../middleware/auth');
const { P } = require('../utils/permissions');

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
  if (userHasPermission(user, P.TASKS_VIEW_ALL)) return {};
  if (userHasPermission(user, P.TASKS_VIEW_ASSIGNED)) return { assigned_to: user._id };
  return null;
}

function canAccessTaskDoc(user, task) {
  if (userHasPermission(user, P.TASKS_VIEW_ALL)) return true;
  if (!task.assigned_to) return false;
  return String(task.assigned_to) === String(user._id);
}

function sanitizePayload(payload) {
  const result = { ...payload };
  ['maintenance_id', 'equipment_id', 'assigned_to'].forEach((field) => {
    if (result[field] === '' || result[field] === null) delete result[field];
  });
  return result;
}

// GET /api/tasks
router.get('/', protect, async (req, res) => {
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
router.get('/:id', protect, async (req, res) => {
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
router.post('/', protect, requirePermission(P.TASKS_CREATE), async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
    if (payload.assigned_to && !userHasPermission(req.user, P.TASKS_ASSIGN)) {
      delete payload.assigned_to;
    }
    const task = await MaintenanceTask.create(payload);
    await task.populate(populate);
    if (task.assigned_to) {
      await Notification.create({
        user_id: task.assigned_to._id || task.assigned_to,
        message: `New task assigned: ${task.maintenance_id?.reference_no || task.maintenance_reference || 'Task'}`,
      });
    }
    await ActivityLog.create({
      user_id: req.user._id,
      action: 'CREATE',
      table_name: 'MaintenanceTasks',
      record_id: task._id,
      new_value: 'Task created',
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await MaintenanceTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!canAccessTaskDoc(req.user, task)) return res.status(403).json({ message: 'Forbidden' });

    let allowedFields;
    if (userHasPermission(req.user, P.TASKS_EDIT)) {
      allowedFields = sanitizePayload(req.body);
      if (allowedFields.assigned_to && !userHasPermission(req.user, P.TASKS_ASSIGN)) {
        delete allowedFields.assigned_to;
      }
    } else if (userHasPermission(req.user, P.TASKS_EDIT_OWN) && String(task.assigned_to) === String(req.user._id)) {
      allowedFields = {
        status_id: req.body.status_id,
        remarks: req.body.remarks,
        completed_date: req.body.completed_date,
      };
    } else {
      return res.status(403).json({ message: 'Cannot update this task' });
    }

    Object.assign(task, allowedFields);
    await task.save();
    await task.populate(populate);
    await ActivityLog.create({
      user_id: req.user._id,
      action: 'UPDATE',
      table_name: 'MaintenanceTasks',
      record_id: task._id,
      new_value: JSON.stringify(allowedFields),
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/complete
router.patch('/:id/complete', protect, async (req, res) => {
  try {
    if (!userHasPermission(req.user, P.TASKS_COMPLETE)) {
      return res.status(403).json({ message: 'Cannot complete tasks' });
    }
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

    const updatedTask = await MaintenanceTask.findByIdAndUpdate(req.params.id, update, { new: true }).populate(populate);
    await ActivityLog.create({
      user_id: req.user._id,
      action: 'COMPLETE',
      table_name: 'MaintenanceTasks',
      record_id: updatedTask._id,
      new_value: 'Status set to Done and next due generated',
    });
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/verify
router.patch('/:id/verify', protect, requirePermission(P.TASKS_VERIFY), async (req, res) => {
  try {
    const verifiedStatus = await Status.findOne({ status_name: 'Verified' });
    const task = await MaintenanceTask.findByIdAndUpdate(
      req.params.id,
      { status_id: verifiedStatus?._id, verified_by: req.user._id, verified_date: new Date() },
      { new: true }
    ).populate(populate);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', protect, requirePermission(P.TASKS_DELETE), async (req, res) => {
  try {
    await MaintenanceTask.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
