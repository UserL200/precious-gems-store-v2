const db = require('../models');

exports.getWithdrawalBalance = async (req, res) => {
  try {
    const userId = req.session.userId;  // Assuming session holds userId
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch user totalReceived
    const user = await db.User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Sum of approved withdrawals
    const approvedWithdrawals = await db.Withdrawal.sum('amount', {
      where: {
        userId,
        status: 'approved',
      }
    }) || 0;

    // Calculate available balance = totalReceived - sum(approved withdrawals)
    const availableBalance = user.totalReceived - approvedWithdrawals;

    return res.json({ balance: availableBalance > 0 ? availableBalance : 0 });
  } catch (err) {
    console.error('Get withdrawal balance error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};