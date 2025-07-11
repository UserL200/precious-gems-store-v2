exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await db.User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const referrals = await db.User.findAll({
      where: { referredBy: user.id },
      include: [
        {
          model: db.Purchase,
          where: { status: 'approved' },
          required: false
        }
      ]
    });

    const commissions = await db.Commission.findAll({
      where: { referrerId: userId }
    });

    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);

    const approvedPurchases = await db.Purchase.findAll({
      where: { userId, status: 'approved' }
    });

    const totalSpent = approvedPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPurchases = approvedPurchases.length;

    res.json({
      referralCode: user.referralCode,
      referrals: referrals.map(ref => ({
        id: ref.id,
        phone: ref.phone,
        totalPurchases: ref.Purchases?.length || 0
      })),
      totalCommission,
      totalSpent,
      totalPurchases
    });
  } catch (err) {
    console.error('Get referral stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
