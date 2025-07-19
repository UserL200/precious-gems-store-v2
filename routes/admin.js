const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/jwtMiddleware');

// Apply JWT authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// User management routes
router.get('/users', adminController.getAllUsers);
router.post('/users/role', adminController.updateUserRole);  // Fixed: was '/user-role'
router.delete('/users/:userId', adminController.deleteUser);  // Added: missing delete route
router.post('/users/deactivate', adminController.deactivateUser);  // Fixed: was '/deactivate-user'

// Purchase management routes
router.get('/purchases', adminController.getAllPurchases);
router.get('/purchases/pending', adminController.getPendingPurchases);
router.post('/purchases/:id/process', adminController.processPurchase);

// Withdrawal management routes
router.get('/withdrawals', adminController.getAllWithdrawals);
router.post('/withdrawals/process', adminController.processWithdrawal);  // Fixed: was '/withdrawals/process'

module.exports = router;