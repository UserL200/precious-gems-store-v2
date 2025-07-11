const express = require('express');
const router = express.Router();
const { Purchase, Commission, User, Product, sequelize } = require('../models');

// Checkout route
router.post('/checkout', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items' });
  }

  const t = await sequelize.transaction();
  try {
    let total = 0;

    for (const item of items) {
      // Still validate product exists
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(400).json({ error: `Invalid product ${item.productId}` });
      }
      
      // Use the price from the cart (user's selection) instead of database
      total += item.price * item.quantity;
    }

    const purchase = await Purchase.create({
      userId: req.session.userId,
      totalAmount: total
    }, { transaction: t });

    // Rest of your code stays the same...
    const buyer = await User.findByPk(req.session.userId, { transaction: t });
    if (buyer.referredBy) {
      const commissionAmount = total * 0.20;
      await Commission.create({
        userId: buyer.referredBy,
        amount: commissionAmount,
        referredPurchaseId: purchase.id
      }, { transaction: t });
    }

    await t.commit();
    return res.json({ message: 'Checkout successful', total });

  } catch (err) {
    await t.rollback();
    console.error('💥 Checkout failed:', err);
    return res.status(500).json({ error: 'Something went wrong during checkout' });
  }
});

module.exports = router;

