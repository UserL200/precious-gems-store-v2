const db = require('../models');

exports.requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user?.id;  
    const { amount, bankName, accountNumber } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    const user = await db.User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const chargeRate = 0.15;
    const chargeAmount = amount * chargeRate;
    const netAmount = amount - chargeAmount;

    if (amount > user.totalReceived) {
      return res.status(400).json({ error: 'Withdrawal exceeds your total available balance' });
    }

    // Create withdrawal record
    await db.Withdrawal.create({
      userId,
      amount: netAmount,
      originalAmount: amount, // if you have this column
      bankName,
      accountNumber,
      status: 'pending'
    });

    // Deduct from user's totalReceived
    user.totalReceived -= amount;
    await user.save();

    res.json({ message: 'Withdrawal request submitted successfully' });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
