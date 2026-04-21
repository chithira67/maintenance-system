const express = require('express');
const router = express.Router();
const MaintenanceTask = require('../models/MaintenanceTask');
const Status = require('../models/Status');
const { protect, requirePermission } = require('../middleware/auth');
const { P } = require('../utils/permissions');

router.get('/', protect, requirePermission(P.DASHBOARD_TEAM), async (req, res) => {
  try {
    const statuses = await Status.find();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const summary = await Promise.all(
      statuses.map(async (s) => ({
        status: s.status_name,
        count: await MaintenanceTask.countDocuments({ status_id: s._id }),
      }))
    );

    const overdue = await MaintenanceTask.find({ next_due: { $lt: today } })
      .populate([
        { path: 'maintenance_id', select: 'reference_no description' },
        { path: 'equipment_id', select: 'equipment_name' },
        { path: 'assigned_to', select: 'name email' },
        { path: 'status_id', select: 'status_name' },
      ])
      .sort({ next_due: 1 })
      .limit(10);

    const finalStatusIds = await Status.find({ status_name: { $in: ['Verified', 'Cancelled'] } }).distinct('_id');
    const dueSoon = await MaintenanceTask.countDocuments({
      next_due: { $gte: today, $lte: weekAhead },
      status_id: { $nin: finalStatusIds },
    });

    const totalTasks = await MaintenanceTask.countDocuments();
    const completedToday = await MaintenanceTask.countDocuments({ completed_date: { $gte: today } });

    const trendStart = new Date(today);
    trendStart.setDate(trendStart.getDate() - 13);
    const completionTrend = await MaintenanceTask.aggregate([
      { $match: { completed_date: { $gte: trendStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completed_date' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byFrequency = await MaintenanceTask.aggregate([
      { $group: { _id: '$frequency', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const workload = await MaintenanceTask.aggregate([
      {
        $match: {
          assigned_to: { $ne: null },
          status_id: { $nin: finalStatusIds },
        },
      },
      { $group: { _id: '$assigned_to', openCount: { $sum: 1 } } },
      { $sort: { openCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          openCount: 1,
        },
      },
    ]);

    res.json({
      summary,
      overdue,
      totalTasks,
      completedToday,
      dueSoon,
      completionTrend: completionTrend.map((d) => ({ date: d._id, count: d.count })),
      byFrequency: byFrequency.map((d) => ({ frequency: d._id || 'Other', count: d.count })),
      workload,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const statuses = await Status.find();
    const summary = await Promise.all(
      statuses.map(async (s) => ({
        status: s.status_name,
        count: await MaintenanceTask.countDocuments({ assigned_to: req.user._id, status_id: s._id }),
      }))
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = await MaintenanceTask.find({ assigned_to: req.user._id, next_due: { $lt: today } })
      .populate('maintenance_id status_id equipment_id')
      .sort({ next_due: 1 });

    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);
    const myDueSoon = await MaintenanceTask.countDocuments({
      assigned_to: req.user._id,
      next_due: { $gte: today, $lte: weekAhead },
    });

    res.json({ summary, overdue, myDueSoon });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
