const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { userHasPermission, userHasAnyPermission, getPermissionsFromUser } = require('../utils/permissions');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).populate('roles');
    if (!req.user || !req.user.is_active) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid' });
  }
};

/** @deprecated Prefer requirePermission with explicit keys */
exports.adminOnly = (req, res, next) => {
  const isAdminRole = req.user.roles.some((r) => r.role_name === 'Admin');
  const isSuper = userHasPermission(req.user, '*');
  if (!isAdminRole && !isSuper) return res.status(403).json({ message: 'Admin access required' });
  next();
};

exports.userHasPermission = userHasPermission;
exports.userHasAnyPermission = userHasAnyPermission;
exports.getPermissionsFromUser = getPermissionsFromUser;

/**
 * Require user to have ANY of the listed permissions (or '*').
 * Usage: requireAnyPermission('a', 'b') or requireAnyPermission(['a','b'])
 */
exports.requireAnyPermission = (...perms) => (req, res, next) => {
  const flat = perms.flat().filter(Boolean);
  if (!userHasAnyPermission(req.user, flat)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

/** Require user to have ALL listed permissions (or '*' satisfies all). */
exports.requireAllPermissions = (...perms) => (req, res, next) => {
  const flat = perms.flat().filter(Boolean);
  if (flat.length === 0) return next();
  const ok = flat.every((p) => userHasPermission(req.user, p));
  if (!ok) return res.status(403).json({ message: 'Insufficient permissions' });
  next();
};

/** Single permission shorthand */
exports.requirePermission = (perm) => exports.requireAnyPermission(perm);
