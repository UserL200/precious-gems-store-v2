const { User, Purchase, Withdrawal, sequelize } = require('../models');

/**
 * Centralized balance calculation service
 * Handles all balance-related operations with proper transaction support
 */
class BalanceService {
  
 /**
   * Calculate user's current balance with proper accounting
   * @param {number} userId - User ID
   * @param {Object} transaction - Optional database transaction
   * @returns {Object} Balance breakdown
   */
  static async calculateUserBalance(userId, transaction = null) {
    console.log('🔍 Calculating balance for user:', userId);
    
    try {
      // 1. Calculate Commission: 15% from approved purchases of people you referred
      let commissionSum = 0;
      
      // Get all users that this user referred (consistent query)
      const referredUsers = await User.findAll({ 
        where: { referredBy: userId },
        include: [{
          model: Purchase,
          where: { status: 'approved' },
          required: false // LEFT JOIN to include users even without purchases
        }]
      }, { transaction });
      
      console.log('👥 Found referred users:', referredUsers.length);
      
      // Calculate commissions from referred users' approved purchases
      for (const referredUser of referredUsers) {
        for (const purchase of referredUser.Purchases || []) {
          const commission = purchase.totalAmount * 0.15; // 15% commission
          commissionSum += commission;
          console.log('💰 Commission earned from user', referredUser.id, ':', commission);
        }
      }
      
      // 2. Calculate Principal: Total amount of YOUR approved and active purchases
      let principalSum = 0;
      
      // Get YOUR approved and active purchases
      const userPurchases = await Purchase.findAll({ 
        where: { 
          userId: userId,
          status: 'approved', // Only approved purchases
          active: true        // Only active purchases
        } 
      }, { transaction });
      
      console.log('🛒 Found approved active purchases:', userPurchases.length);
      
      // Add principal amounts
      for (const purchase of userPurchases) {
        principalSum += purchase.totalAmount;
        console.log('💵 Principal from purchase', purchase.id, ':', purchase.totalAmount);
      }
      
      // 3. Calculate Appreciation: 1% per day for up to 60 days from YOUR approved purchases
      let appreciationSum = 0;
      const now = new Date();
      
      for (const purchase of userPurchases) {
        const daysActive = Math.min(
          60,
          Math.floor((now - new Date(purchase.createdAt)) / (1000 * 60 * 60 * 24))
        );
        
        const appreciation = purchase.totalAmount * 0.01 * daysActive;
        appreciationSum += appreciation;
        
        console.log('📈 Appreciation for purchase', purchase.id, ':', {
          totalAmount: purchase.totalAmount,
          daysActive,
          appreciation
        });
      }
      
      // 4. Calculate approved withdrawals (only subtract what's been actually paid out)
      const approvedWithdrawals = await Withdrawal.findAll({
        where: { 
          userId: userId,
          status: 'approved' // Only subtract approved withdrawals
        }
      }, { transaction });
      
      const totalApprovedWithdrawals = approvedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      
      // 5. Calculate pending withdrawals (for display purposes)
      const pendingWithdrawals = await Withdrawal.findAll({
        where: { 
          userId: userId,
          status: 'pending'
        }
      }, { transaction });
      
      const totalPendingWithdrawals = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      
      // Calculate balances - NOW INCLUDING PRINCIPAL
      const grossTotal = commissionSum + principalSum + appreciationSum;
      const availableBalance = Math.max(0, grossTotal - totalApprovedWithdrawals);
      const pendingBalance = Math.max(0, availableBalance - totalPendingWithdrawals);
      
      console.log('💰 Balance calculation complete:', { 
        commissionSum, 
        principalSum,
        appreciationSum,
        grossTotal,
        totalApprovedWithdrawals,
        totalPendingWithdrawals,
        availableBalance,
        pendingBalance
      });
      
      return { 
        commissionSum: Math.round(commissionSum * 100) / 100,
        principalSum: Math.round(principalSum * 100) / 100,
        appreciationSum: Math.round(appreciationSum * 100) / 100,
        grossTotal: Math.round(grossTotal * 100) / 100,
        totalApprovedWithdrawals: Math.round(totalApprovedWithdrawals * 100) / 100,
        totalPendingWithdrawals: Math.round(totalPendingWithdrawals * 100) / 100,
        availableBalance: Math.round(availableBalance * 100) / 100,
        pendingBalance: Math.round(pendingBalance * 100) / 100
      };
      
    } catch (error) {
      console.error('💥 Balance calculation error:', error);
      throw error;
    }
  }
  
  /**
   * Get user's referral statistics
   * @param {number} userId - User ID
   * @param {Object} transaction - Optional database transaction
   * @returns {Object} Referral stats
   */
  static async getUserReferralStats(userId, transaction = null) {
    console.log('🔍 Getting referral stats for user:', userId);
    
    try {
      // Get user with referrals and their purchases
      const currentUser = await User.findByPk(userId, {
        include: [
          {
            model: User,
            as: 'Referrals',
            include: [{
              model: Purchase,
              required: false
            }]
          },
          {
            model: Purchase
          }
        ]
      }, { transaction });

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Process referral data
      const referrals = (currentUser.Referrals || []).map(ref => ({
        id: ref.id,
        phone: ref.phone,
        createdAt: ref.createdAt,
        purchases: (ref.Purchases || []).map(p => ({
          id: p.id,
          price: p.totalAmount,
          status: p.status,
          createdAt: p.createdAt
        }))
      }));

      // Commission breakdown
      let commissionBreakdown = [];
      for (const referral of currentUser.Referrals || []) {
        const approvedPurchases = (referral.Purchases || []).filter(p => p.status === 'approved');
        
        for (const purchase of approvedPurchases) {
          const commission = purchase.totalAmount * 0.15;
          commissionBreakdown.push({
            referralId: referral.id,
            referralPhone: referral.phone,
            purchaseId: purchase.id,
            purchaseAmount: purchase.totalAmount,
            commissionEarned: commission,
            purchaseDate: purchase.createdAt
          });
        }
      }

      // User's purchase stats
      const allPurchases = currentUser.Purchases || [];
      const pendingPurchases = allPurchases.filter(p => p.status === 'pending');
      const approvedPurchases = allPurchases.filter(p => p.status === 'approved');
      const activePurchases = allPurchases.filter(p => p.status === 'approved' && p.active === true);
      
      // Calculate spending totals
      const totalSpent = allPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const approvedSpent = approvedPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const activeSpent = activePurchases.reduce((sum, p) => sum + p.totalAmount, 0);

      return {
        referralCode: currentUser.referralCode,
        referrals,
        referralCount: referrals.length,
        commissionBreakdown,
        
        // Purchase statistics
        totalPurchases: allPurchases.length,
        pendingPurchases: pendingPurchases.length,
        approvedPurchases: approvedPurchases.length,
        activePurchases: activePurchases.length,
        
        // Spending statistics
        totalSpent: Math.round(totalSpent * 100) / 100,
        approvedSpent: Math.round(approvedSpent * 100) / 100,
        activeSpent: Math.round(activeSpent * 100) / 100
      };
      
    } catch (error) {
      console.error('💥 Referral stats error:', error);
      throw error;
    }
  }
  
  /**
   * Process withdrawal request with proper validation
   * @param {number} userId - User ID
   * @param {Object} withdrawalData - Withdrawal request data
   * @returns {Object} Withdrawal result
   */
  static async processWithdrawalRequest(userId, withdrawalData) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('🔍 Processing withdrawal request:', { userId, ...withdrawalData });
      
      const { amount, bankName, accountNumber, forfeitPurchaseId } = withdrawalData;
      
      // Validate required fields
      if (!amount || !bankName || !accountNumber) {
        throw new Error('Missing required withdrawal information');
      }
      
      if (amount <= 0) {
        throw new Error('Withdrawal amount must be positive');
      }
      
      // Get current balance
      const balance = await this.calculateUserBalance(userId, transaction);
      console.log('🔍 Current balance:', balance);
      
      let forfeitedAmount = 0;
      if (forfeitPurchaseId) {
        const purchase = await Purchase.findOne({ 
          where: { 
            id: forfeitPurchaseId, 
            userId: userId,
            status: 'approved',
            active: true
          } 
        }, { transaction });
        
        if (!purchase) {
          throw new Error('Invalid purchase for forfeit - purchase not found or not eligible');
        }
        
        // Calculate forfeit amount (85% of purchase value)
        forfeitedAmount = purchase.totalAmount * 0.85;
        
        // Deactivate the purchase
        purchase.active = false;
        await purchase.save({ transaction });
        
        console.log('🔍 Purchase forfeited:', { 
          purchaseId: forfeitPurchaseId, 
          originalAmount: purchase.totalAmount,
          forfeitedAmount 
        });
      }
      
      // Check if user has sufficient balance
      const availableAmount = balance.pendingBalance + forfeitedAmount;
      if (amount > availableAmount) {
        throw new Error(`Insufficient balance. Available: $${availableAmount.toFixed(2)}, Requested: $${amount.toFixed(2)}`);
      }
      
      // Create withdrawal request
      const withdrawal = await Withdrawal.create({
        userId: userId,
        amount: amount,
        bankName: bankName,
        accountNumber: accountNumber,
        forfeitPurchaseId: forfeitPurchaseId || null,
        forfeitedAmount: forfeitedAmount,
        status: 'pending',
        createdAt: new Date()
      }, { transaction });
      
      await transaction.commit();
      
      console.log('✅ Withdrawal request created:', withdrawal.id);
      return { 
        success: true,
        message: 'Withdrawal request submitted successfully',
        withdrawal: {
          id: withdrawal.id,
          amount: withdrawal.amount,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt
        }
      };
      
    } catch (error) {
      await transaction.rollback();
      console.error('💥 Withdrawal processing error:', error);
      throw error;
    }
  }
  
  /**
   * Update withdrawal status (admin function)
   * @param {number} withdrawalId - Withdrawal ID
   * @param {string} status - New status (approved/declined)
   * @param {string} adminNote - Optional admin note
   * @returns {Object} Update result
   */
  static async updateWithdrawalStatus(withdrawalId, status, adminNote = null) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('🔍 Updating withdrawal status:', { withdrawalId, status, adminNote });
      
      if (!['approved', 'declined'].includes(status)) {
        throw new Error('Invalid status. Must be approved or declined');
      }
      
      const withdrawal = await Withdrawal.findByPk(withdrawalId, { transaction });
      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }
      
      if (withdrawal.status !== 'pending') {
        throw new Error('Can only update pending withdrawals');
      }
      
      // If rejecting and there was a forfeited purchase, restore it
      if (status === 'declined' && withdrawal.forfeitPurchaseId) {
        const purchase = await Purchase.findByPk(withdrawal.forfeitPurchaseId, { transaction });
        if (purchase) {
          purchase.active = true;
          await purchase.save({ transaction });
          console.log('🔍 Restored forfeited purchase:', withdrawal.forfeitPurchaseId);
        }
      }
      
      // Update withdrawal status
      withdrawal.status = status;
      withdrawal.adminNote = adminNote;
      withdrawal.processedAt = new Date();
      await withdrawal.save({ transaction });
      
      await transaction.commit();
      
      console.log('✅ Withdrawal status updated:', { withdrawalId, status });
      return { 
        success: true,
        message: `Withdrawal ${status} successfully`,
        withdrawal: {
          id: withdrawal.id,
          status: withdrawal.status,
          processedAt: withdrawal.processedAt
        }
      };
      
    } catch (error) {
      await transaction.rollback();
      console.error('💥 Withdrawal status update error:', error);
      throw error;
    }
  }
}

module.exports = BalanceService;