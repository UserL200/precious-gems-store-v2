const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../controllers/auth'); // Import JWT middleware
const { User } = require('../models'); // Need User model to check admin status

// JWT Admin middleware - verifies token AND checks if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // First verify the JWT token (this sets req.userId)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;

    // Now check if user is admin
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // User is authenticated and is admin, proceed
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Admin middleware error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/** 🔒 Admin API routes (JWT protected) */
router.get('/users', isAdmin, adminController.getAllUsers);
router.get('/purchases', isAdmin, adminController.getAllPurchases);
router.get('/withdrawals', isAdmin, adminController.getAllWithdrawals);
router.post('/user-role', isAdmin, adminController.updateUserRole);
router.post('/deactivate-user', isAdmin, adminController.deactivateUser);
router.post('/withdrawals/process', isAdmin, adminController.processWithdrawal); 
router.get('/purchases/pending', isAdmin, adminController.getPendingPurchases);
router.post('/purchases/:id/process', isAdmin, adminController.processPurchase);
router.post('/purchases/:purchaseId/process', isAdmin, adminController.approvePurchase);

module.exports = router;