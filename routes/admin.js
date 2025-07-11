const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin, isAdminPage } = require('../middleware/authMiddleware'); // ✅

/** 🔒 Admin API routes (use isAdmin for JSON response auth checks) */
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