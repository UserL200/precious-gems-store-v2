const express = require('express');
const router = express.Router();
const BalanceService = require('../services/balanceService');

// GET /api/referrals/stats
router.get('/stats', async (req, res) => {
  try {
    console.log('🔍 Getting stats for user:', req.session.userId);
    
    // Authentication check
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get referral stats and balance using the centralized service
    const [referralStats, balance] = await Promise.all([
      BalanceService.getUserReferralStats(req.session.userId),
      BalanceService.calculateUserBalance(req.session.userId)
    ]);

    console.log('📊 Stats calculated:', {
      referralsCount: referralStats.referralCount,
      totalCommission: balance.commissionSum,
      totalPurchases: referralStats.totalPurchases,
      approvedPurchases: referralStats.approvedPurchases,
      activePurchases: referralStats.activePurchases,
      totalSpent: referralStats.totalSpent,
      totalAppreciation: balance.appreciationSum,
      availableBalance: balance.availableBalance
    });

    // Return comprehensive stats
    res.json({
      // User info
      referralCode: referralStats.referralCode,
      
      // Referral data
      referrals: referralStats.referrals,
      referralCount: referralStats.referralCount,
      
      // Commission data
      totalCommission: balance.commissionSum,
      commissionBreakdown: referralStats.commissionBreakdown,
      
      // Purchase statistics
      totalPurchases: referralStats.totalPurchases,
      pendingPurchases: referralStats.pendingPurchases,
      approvedPurchases: referralStats.approvedPurchases,
      activePurchases: referralStats.activePurchases,
      
      // Spending statistics
      totalSpent: referralStats.totalSpent,
      approvedSpent: referralStats.approvedSpent,
      activeSpent: referralStats.activeSpent,
      
      // Balance information (consistent with /balance endpoint)
      totalAppreciation: balance.appreciationSum,
      grossTotal: balance.grossTotal,
      availableBalance: balance.availableBalance,
      pendingBalance: balance.pendingBalance,
      totalApprovedWithdrawals: balance.totalApprovedWithdrawals,
      totalPendingWithdrawals: balance.totalPendingWithdrawals,
      
      // Combined balance for backwards compatibility
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
router.get('/balance', async (req, res) => {
  try {
    console.log('🔍 Getting balance for user:', req.session.userId);
    
    // Authentication check
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get balance using the centralized service
    const balance = await BalanceService.calculateUserBalance(req.session.userId);
    
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

module.exports = router;