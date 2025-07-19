const db = require('../models');

exports.checkout = async (req, res) => {
  try {
    const userId = req.user?.id;  
    const { items } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const purchase = await db.Purchase.create({
      userId,
      totalAmount
    });

    // Commission logic
    const user = await db.User.findByPk(userId);
    if (user.referredBy) {
      const referrer = await db.User.findOne({ where: { referralCode: user.referredBy } });
      if (referrer) {
        const commissionAmount = totalAmount * 0.20;
        await db.Commission.create({
          referrerId: referrer.id,
          referredUserId: user.id,
          purchaseId: purchase.id,
          commissionAmount
        });
      }
    }

    res.json({ message: 'Purchase completed', purchaseId: purchase.id });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
