const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { P, ALL_KEYS } = require('../utils/permissions');

const LABELS = {
  [P.USERS_MANAGE]: 'Manage users',
  [P.ROLES_VIEW]: 'View roles',
  [P.ROLES_MANAGE]: 'Manage roles',
  [P.TASKS_VIEW_ALL]: 'View all maintenance tasks',
  [P.TASKS_VIEW_ASSIGNED]: 'View assigned tasks only',
  [P.TASKS_CREATE]: 'Create tasks',
  [P.TASKS_EDIT]: 'Edit any task',
  [P.TASKS_EDIT_OWN]: 'Edit own assigned task (limited fields)',
  [P.TASKS_DELETE]: 'Delete tasks',
  [P.TASKS_ASSIGN]: 'Assign tasks',
  [P.TASKS_COMPLETE]: 'Complete tasks',
  [P.TASKS_VERIFY]: 'Verify completed tasks',
  [P.MASTERS_MANAGE]: 'Manage master data (equipment, locations, categories, templates)',
  [P.DASHBOARD_TEAM]: 'Team / analytics dashboard',
  [P.DASHBOARD_SELF]: 'Personal dashboard',
};

// GET /api/permissions — for role editor UI
router.get('/', verifyToken, authorizeRoles('Admin'), (req, res) => {
  res.json({
    keys: ALL_KEYS,
    labels: LABELS,
  });
});

module.exports = router;
