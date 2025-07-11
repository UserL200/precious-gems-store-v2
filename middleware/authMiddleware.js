const db = require('../models');

exports.isAdminPage = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login.html');
    }

    const user = await db.User.findByPk(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.redirect('/login.html');
    }

    // 🔥 SET req.session.isAdmin for withdrawal.js compatibility
    req.session.isAdmin = user.isAdmin;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.redirect('/login.html');
  }
};

// Add this for API routes (returns JSON instead of redirecting)
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await db.User.findByPk(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // 🔥 SET req.session.isAdmin for withdrawal.js compatibility
    req.session.isAdmin = user.isAdmin;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}; // 🔥 FIXED: Added missing closing brace

exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Please log in' });
};
