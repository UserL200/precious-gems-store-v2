const express = require('express');
const router = express.Router();
const BalanceService = require('../services/balanceService');
const { verifyToken } = require('./auth'); // JWT middleware

// GET /api/referrals/stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    console.log('🔍 Getting stats for user:', req.user.id);

    const [referralStats, balance] = await Promise.all([
      BalanceService.getUserReferralStats(req.user.id),
      BalanceService.calculateUserBalance(req.user.id)
    ]);

    res.json({
      referralCode: referralStats.referralCode,
      referrals: referralStats.referrals,
      referralCount: referralStats.referralCount,
      totalCommission: balance.commissionSum,
      commissionBreakdown: referralStats.commissionBreakdown,
      totalPurchases: referralStats.totalPurchases,
      pendingPurchases: referralStats.pendingPurchases,
      approvedPurchases: referralStats.approvedPurchases,
      activePurchases: referralStats.activePurchases,
      totalSpent: referralStats.totalSpent,
      approvedSpent: referralStats.approvedSpent,
      activeSpent: referralStats.activeSpent,
      totalAppreciation: balance.appreciationSum,
      grossTotal: balance.grossTotal,
      availableBalance: balance.availableBalance,
      pendingBalance: balance.pendingBalance,
      totalApprovedWithdrawals: balance.totalApprovedWithdrawals,
      totalPendingWithdrawals: balance.totalPendingWithdrawals,
      totalBalance: balance.availableBalance
    });

  } catch (err) {
    console.error('💥 Stats error:', err);
    res.status(500).json({ 
      error: 'Failed to load stats',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/referrals/balance - dedicated balance endpoint
router.get('/balance', verifyToken, async (req, res) => {
  try {
    console.log('🔍 Getting balance for user:', req.user.id);

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
    res.status(500).json({ 
      error: 'Failed to fetch balance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
