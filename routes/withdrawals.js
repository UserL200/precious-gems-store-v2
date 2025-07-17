const express = require('express');
const router = express.Router();
const { User, Withdrawal } = require('../models');
const BalanceService = require('../services/balanceService');
const { verifyToken } = require('./auth'); // ✅ JWT middleware

// 🔒 User Routes (Require JWT)

// GET /api/withdrawals/balance - Get user's current balance
router.get('/balance', verifyToken, async (req, res) => {
  try {
    const balance = await BalanceService.calculateUserBalance(req.user.id);

    res.json({
      balance: balance.availableBalance,
      commissionSum: balance.commissionSum,
      appreciationSum: balance.appreciationSum,
      grossTotal: balance.grossTotal,
      totalApprovedWithdrawals: balance.totalApprovedWithdrawals,
      totalPendingWithdrawals: balance.totalPendingWithdrawals,
      availableBalance: balance.availableBalance,
      pendingBalance: balance.pendingBalance,
      hasPendingWithdrawals: balance.totalPendingWithdrawals > 0
    });
  } catch (error) {
    console.error('💥 Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// POST /api/withdrawals - Request withdrawal
router.post('/', verifyToken, async (req, res) => {
  try {
    const { amount, bankName, accountNumber, forfeitPurchaseId } = req.body;

    if (!amount || !bankName || !accountNumber) {
      return res.status(400).json({ error: 'Missing required fields: amount, bankName, accountNumber' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount: must be a positive number' });
    }

    const result = await BalanceService.processWithdrawalRequest(req.user.id, {
      amount: parseFloat(amount),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      forfeitPurchaseId: forfeitPurchaseId || null
    });

    res.json({
      success: true,
      message: result.message,
      withdrawal: result.withdrawal
    });
  } catch (error) {
    console.error('💥 Withdrawal request error:', error);

    let errorMessage = 'Failed to process withdrawal request';
    if (error.message.includes('Insufficient balance')) errorMessage = error.message;
    if (error.message.includes('Invalid purchase')) errorMessage = error.message;
    if (error.message.includes('Missing required')) errorMessage = error.message;

    res.status(400).json({ error: errorMessage });
  }
});

// GET /api/withdrawals - Get user's withdrawal history
router.get('/', verifyToken, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    const formattedWithdrawals = withdrawals.map(w => ({
      id: w.id,
      amount: w.amount,
      bankName: w.bankName,
      accountNumber: w.accountNumber,
      status: w.status,
      forfeitPurchaseId: w.forfeitPurchaseId,
      forfeitedAmount: w.forfeitedAmount,
      adminNote: w.adminNote,
      createdAt: w.createdAt,
      processedAt: w.processedAt
    }));

    const totalRequested = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalApproved = withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0);
    const totalPending = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);

    res.json({
      withdrawals: formattedWithdrawals,
      summary: {
        total: withdrawals.length,
        totalRequested: Math.round(totalRequested * 100) / 100,
        totalApproved: Math.round(totalApproved * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        pendingCount: withdrawals.filter(w => w.status === 'pending').length,
        approvedCount: withdrawals.filter(w => w.status === 'approved').length,
        rejectedCount: withdrawals.filter(w => w.status === 'declined').length
      }
    });
  } catch (error) {
    console.error('💥 Withdrawal history error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal history' });
  }
});

// 🔐 Admin Routes

// GET /api/withdrawals/admin - Get all withdrawal requests (admin only)
router.get('/admin', verifyToken, async (req, res) => {
  // Enhanced admin check with better error message
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }

  try {
    const withdrawals = await Withdrawal.findAll({
      include: [{
        model: User,
        attributes: ['id', 'phone', 'email', 'referralCode']
      }],
      order: [['createdAt', 'DESC']]
    });

    const formattedWithdrawals = withdrawals.map(w => ({
      id: w.id,
      amount: w.amount,
      bankName: w.bankName,
      accountNumber: w.accountNumber,
      status: w.status,
      forfeitPurchaseId: w.forfeitPurchaseId,
      forfeitedAmount: w.forfeitedAmount,
      adminNote: w.adminNote,
      createdAt: w.createdAt,
      processedAt: w.processedAt,
      user: w.User ? {
        id: w.User.id,
        phone: w.User.phone,
        email: w.User.email,
        referralCode: w.User.referralCode
      } : {
        id: null,
        phone: 'User Deleted',
        email: 'User Deleted',
        referralCode: 'N/A'
      }
    }));

    const totalRequested = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalApproved = withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0);
    const totalPending = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);

    res.json({
      withdrawals: formattedWithdrawals,
      summary: {
        total: withdrawals.length,
        totalRequested: Math.round(totalRequested * 100) / 100,
        totalApproved: Math.round(totalApproved * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        pendingCount: withdrawals.filter(w => w.status === 'pending').length,
        approvedCount: withdrawals.filter(w => w.status === 'approved').length,
        rejectedCount: withdrawals.filter(w => w.status === 'declined').length
      }
    });
  } catch (error) {
    console.error('💥 Admin withdrawal fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal requests' });
  }
});

// POST /api/withdrawals/admin/process - Process withdrawal request (admin only)
router.post('/admin/process', verifyToken, async (req, res) => {
  // Enhanced admin check with better error message
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'You do not have permission to process withdrawal requests'
    });
  }

  try {
    const { withdrawalId, status, adminNote } = req.body;

    if (!withdrawalId || !status) {
      return res.status(400).json({ error: 'Missing required fields: withdrawalId, status' });
    }

    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or declined' });
    }

    const result = await BalanceService.updateWithdrawalStatus(
      withdrawalId, 
      status, 
      adminNote
    );

    res.json({
      success: true,
      message: result.message,
      withdrawal: result.withdrawal
    });
  } catch (error) {
    console.error('💥 Admin withdrawal processing error:', error);

    let errorMessage = 'Failed to process withdrawal';
    if (error.message.includes('not found')) errorMessage = 'Withdrawal request not found';
    if (error.message.includes('pending')) errorMessage = 'Can only process pending withdrawal requests';

    res.status(400).json({ error: errorMessage });
  }
});

module.exports = router;