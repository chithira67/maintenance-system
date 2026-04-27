const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getPermissionsFromUser } = require('../utils/permissions');

// verifyToken middleware: checks Bearer JWT and attaches decoded user (id, role) to req.user
exports.verifyToken = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalid' });
  }
};

// authorizeRoles middleware: accepts allowed roles and blocks with 403 if user's role doesn't match
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

// Keep for backward compatibility
exports.getPermissionsFromUser = getPermissionsFromUser;
