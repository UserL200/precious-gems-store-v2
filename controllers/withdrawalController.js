const db = require('../models');

exports.requestWithdrawal = async (req, res) => {
  try {
    // Get userId from JWT payload (set by auth middleware)
    const userId = req.user.id; // or req.user.userId depending on your JWT payload structure
    const { amount, bankName, accountNumber } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    if (!bankName || !accountNumber) {
      return res.status(400).json({ error: 'Bank name and account number are required' });
    }

    // Find user
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user account is active/verified
    if (user.status !== 'active') {
      return res.status(400).json({ error: 'Account must be verified before withdrawal' });
    }

    // Calculate charges
    const chargeRate = 0.15;
    const chargeAmount = amount * chargeRate;
    const netAmount = amount - chargeAmount;

    // Check if user has sufficient balance
    if (amount > user.totalReceived) {
      return res.status(400).json({ 
        error: 'Withdrawal exceeds your total available balance',
        availableBalance: user.totalReceived,
        requestedAmount: amount
      });
    }

    // Check for pending withdrawals (optional business rule)
    const pendingWithdrawal = await db.Withdrawal.findOne({
      where: { userId, status: 'pending' }
    });

    if (pendingWithdrawal) {
      return res.status(400).json({ 
        error: 'You have a pending withdrawal request. Please wait for it to be processed.' 
      });
    }

    // Create withdrawal record
    const withdrawal = await db.Withdrawal.create({
      userId,
      amount: netAmount,
      originalAmount: amount,
      chargeAmount,
      bankName,
      accountNumber,
      status: 'pending',
      requestedAt: new Date()
    });

    // Deduct from user's totalReceived
    user.totalReceived -= amount;
    await user.save();

    // Log the withdrawal request
    console.log(`Withdrawal request created: User ${userId}, Amount: ${amount}, Net: ${netAmount}`);

    res.status(201).json({ 
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal.id,
        netAmount,
        originalAmount: amount,
        chargeAmount,
        status: 'pending',
        requestedAt: withdrawal.requestedAt
      }
    });

  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Server error processing withdrawal request' });
  }
};

// Additional withdrawal-related endpoints that work with JWT

exports.getUserWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const withdrawals = await db.Withdrawal.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      withdrawals: withdrawals.rows,
      totalCount: withdrawals.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(withdrawals.count / parseInt(limit))
    });

  } catch (err) {
    console.error('Get withdrawals error:', err);
    res.status(500).json({ error: 'Server error fetching withdrawals' });
  }
};

exports.getWithdrawalById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { withdrawalId } = req.params;

    const withdrawal = await db.Withdrawal.findOne({
      where: { id: withdrawalId, userId }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    res.json({ withdrawal });

  } catch (err) {
    console.error('Get withdrawal error:', err);
    res.status(500).json({ error: 'Server error fetching withdrawal' });
  }
};

exports.cancelWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { withdrawalId } = req.params;

    const withdrawal = await db.Withdrawal.findOne({
      where: { id: withdrawalId, userId, status: 'pending' }
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Pending withdrawal not found' });
    }

    // Refund the amount back to user
    const user = await db.User.findByPk(userId);
    user.totalReceived += withdrawal.originalAmount;
    await user.save();

    // Update withdrawal status
    withdrawal.status = 'cancelled';
    withdrawal.cancelledAt = new Date();
    await withdrawal.save();

    res.json({ message: 'Withdrawal cancelled successfully' });

  } catch (err) {
    console.error('Cancel withdrawal error:', err);
    res.status(500).json({ error: 'Server error cancelling withdrawal' });
  }
};