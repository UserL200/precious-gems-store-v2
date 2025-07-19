const express = require('express');
const router = express.Router();
const { Purchase, Commission, User, Product, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/jwtMiddleware');

// Apply JWT authentication to all routes
router.use(authenticateToken);

// Checkout route
router.post('/checkout', async (req, res) => {
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
      userId: req.user.userId,
      totalAmount: total
    }, { transaction: t });

    // Handle referral commission
    const buyer = await User.findByPk(req.user.userId, { transaction: t });
    if (buyer.referredBy) {
      const commissionAmount = total * 0.20;
      await Commission.create({
        userId: buyer.referredBy,
        amount: commissionAmount,
        referredPurchaseId: purchase.id
      }, { transaction: t });
    }

    await t.commit();
    return res.json({ 
      message: 'Checkout successful', 
      total,
      purchaseId: purchase.id
    });

  } catch (err) {
    await t.rollback();
    console.error('💥 Checkout failed:', err);
    return res.status(500).json({ error: 'Something went wrong during checkout' });
  }
});

module.exports = router;