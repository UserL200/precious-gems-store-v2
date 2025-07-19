const express = require('express');
const router = express.Router();
const { User, Withdrawal } = require('../models');
const BalanceService = require('../services/balanceService');
const { authenticateToken, requireAdmin } = require('../middleware/jwtMiddleware');

// Apply JWT authentication to all routes
router.use(authenticateToken);

// GET /api/withdrawals/balance - Get user's current balance
router.get('/balance', async (req, res) => {
  try {
    console.log('🔍 Getting balance for user:', req.user.userId);
    
    // Use the centralized balance service
    const balance = await BalanceService.calculateUserBalance(req.user.userId);
    
    console.log('📊 Balance calculated:', balance);
    
    res.json({
      // Main balance (what user can withdraw)
      balance: balance.availableBalance,
      
      // Detailed breakdown
      commissionSum: balance.commissionSum,
      appreciationSum: balance.appreciationSum,
      grossTotal: balance.grossTotal,
      
      // Withdrawal tracking
      totalApprovedWithdrawals: balance.totalApprovedWithdrawals,
      totalPendingWithdrawals: balance.totalPendingWithdrawals,
      
      // Available vs pending balance
      availableBalance: balance.availableBalance,
      pendingBalance: balance.pendingBalance,
      
      // Status info
      hasPendingWithdrawals: balance.totalPendingWithdrawals > 0
    });

  } catch (error) {
    console.error('💥 Balance fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch balance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/withdrawals - Request withdrawal
router.post('/', async (req, res) => {
  try {
    console.log('🔍 Withdrawal request received:', {
      userId: req.user.userId,
      body: req.body
    });
    
    // Validate request data
    const { amount, bankName, accountNumber, forfeitPurchaseId } = req.body;
    
    if (!amount || !bankName || !accountNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, bankName, accountNumber' 
      });
    }
    
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount: must be a positive number' 
      });
    }
    
    // Process withdrawal using the centralized service
    const result = await BalanceService.processWithdrawalRequest(req.user.userId, {
      amount: parseFloat(amount),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      forfeitPurchaseId: forfeitPurchaseId || null
    });
    
    console.log('✅ Withdrawal request processed:', result);
    
    res.json({
      success: true,
      message: result.message,
      withdrawal: result.withdrawal
    });
    
  } catch (error) {
    console.error('💥 Withdrawal request error:', error);
    
    // Return user-friendly error messages
    let errorMessage = 'Failed to process withdrawal request';
    if (error.message.includes('Insufficient balance')) {
      errorMessage = error.message;
    } else if (error.message.includes('Invalid purchase')) {
      errorMessage = error.message;
    } else if (error.message.includes('Missing required')) {
      errorMessage = error.message;
    }
    
    res.status(400).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/withdrawals - Get user's withdrawal history
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Getting withdrawal history for user:', req.user.userId);
    
    // Get user's withdrawals
    const withdrawals = await Withdrawal.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']]
    });
    
    // Format withdrawal data for response
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
    
    // Calculate summary stats
    const totalRequested = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalApproved = withdrawals
      .filter(w => w.status === 'approved')
      .reduce((sum, w) => sum + w.amount, 0);
    const totalPending = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0);
    
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
    res.status(500).json({ 
      error: 'Failed to fetch withdrawal history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin Routes - Add admin middleware

// GET /api/withdrawals/admin - Get all withdrawal requests (admin only)
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin getting all withdrawal requests');
    
    // Get all withdrawal requests with user info
    const withdrawals = await Withdrawal.findAll({
      include: [{
        model: User,
        attributes: ['id', 'phone','referralCode']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Format data for admin view (with null check)
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
        referralCode: w.User.referralCode
      } : {
        id: null,
        phone: 'User Deleted',
        referralCode: 'N/A'
      }
    }));
    
    // Calculate admin summary
    const totalRequested = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalApproved = withdrawals
      .filter(w => w.status === 'approved')
      .reduce((sum, w) => sum + w.amount, 0);
    const totalPending = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0);
    
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
    res.status(500).json({ 
      error: 'Failed to fetch withdrawal requests',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/withdrawals/admin/process - Process withdrawal request (admin only)
router.post('/admin/process', requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin processing withdrawal:', req.body);
    
    const { withdrawalId, status, adminNote } = req.body;
    
    // Validate request
    if (!withdrawalId || !status) {
      return res.status(400).json({ 
        error: 'Missing required fields: withdrawalId, status' 
      });
    }
    
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be approved or declined' 
      });
    }
    
    // Process using the centralized service
    const result = await BalanceService.updateWithdrawalStatus(
      withdrawalId, 
      status, 
      adminNote
    );
    
    console.log('✅ Withdrawal processed by admin:', result);
    
    res.json({
      success: true,
      message: result.message,
      withdrawal: result.withdrawal
    });
    
  } catch (error) {
    console.error('💥 Admin withdrawal processing error:', error);
    
    let errorMessage = 'Failed to process withdrawal';
    if (error.message.includes('not found')) {
      errorMessage = 'Withdrawal request not found';
    } else if (error.message.includes('pending')) {
      errorMessage = 'Can only process pending withdrawal requests';
    }
    
    res.status(400).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;