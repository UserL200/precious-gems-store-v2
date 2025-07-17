const db = require('../models');
const { Op } = require('sequelize');

exports.checkout = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Get userId from JWT payload (set by auth middleware)
    const userId = req.user.id;
    const { items, paymentMethod, shippingAddress } = req.body;

    // Validate input
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Validate items structure
    const invalidItems = items.filter(item => 
      !item.id || !item.quantity || !item.price || item.quantity <= 0 || item.price <= 0
    );
    
    if (invalidItems.length > 0) {
      return res.status(400).json({ error: 'Invalid item data in cart' });
    }

    // Get user details
    const user = await db.User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify user account status
    if (user.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Account must be active to make purchases' });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    // Validate minimum order amount (optional)
    const minimumOrderAmount = 10; // Set your minimum order amount
    if (totalAmount < minimumOrderAmount) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Minimum order amount is $${minimumOrderAmount}`,
        currentTotal: totalAmount,
        minimumRequired: minimumOrderAmount
      });
    }

    // Create purchase record
    const purchase = await db.Purchase.create({
      userId,
      totalAmount,
      paymentMethod,
      shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : null,
      status: 'pending', // Start with pending status
      orderDate: new Date()
    }, { transaction });

    // Create purchase items
    const purchaseItems = items.map(item => ({
      purchaseId: purchase.id,
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.quantity * item.price
    }));

    await db.PurchaseItem.bulkCreate(purchaseItems, { transaction });

    // Commission logic for referrals
    let commissionCreated = null;
    if (user.referredBy) {
      // Find referrer by referral code
      const referrer = await db.User.findOne({ 
        where: { referralCode: user.referredBy },
        transaction 
      });
      
      if (referrer && referrer.id !== userId) { // Prevent self-referral
        const commissionRate = 0.20; // 20% commission
        const commissionAmount = totalAmount * commissionRate;
        
        // Create commission record
        const commission = await db.Commission.create({
          referrerId: referrer.id,
          referredUserId: userId,
          purchaseId: purchase.id,
          commissionAmount,
          commissionRate,
          status: 'pending', // Commission pending until purchase is approved
          reason: 'Purchase referral commission'
        }, { transaction });

        commissionCreated = {
          id: commission.id,
          referrerId: referrer.id,
          referrerPhone: referrer.phone,
          amount: commissionAmount,
          rate: commissionRate
        };

        // Log commission creation
        console.log(`Commission created: ${commissionAmount} for referrer ${referrer.id} from purchase ${purchase.id}`);
      }
    }

    // Update user's total spent (optional tracking)
    if (user.totalSpent !== undefined) {
      user.totalSpent = (user.totalSpent || 0) + totalAmount;
      await user.save({ transaction });
    }

    // Commit transaction
    await transaction.commit();

    // Log successful purchase
    console.log(`Purchase completed: User ${userId}, Amount: ${totalAmount}, Purchase ID: ${purchase.id}`);

    // Return success response
    res.status(201).json({ 
      message: 'Purchase completed successfully',
      purchase: {
        id: purchase.id,
        totalAmount,
        status: purchase.status,
        orderDate: purchase.orderDate,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price
        }))
      },
      commission: commissionCreated,
      paymentMethod,
      nextSteps: 'Your order is being processed. You will receive a confirmation email shortly.'
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Server error processing purchase' });
  }
};

// Additional checkout-related endpoints

exports.getPurchaseHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const whereClause = { userId };
    if (status) {
      whereClause.status = status;
    }

    const purchases = await db.Purchase.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.PurchaseItem,
          as: 'items',
          attributes: ['productId', 'productName', 'quantity', 'unitPrice', 'totalPrice']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      purchases: purchases.rows.map(purchase => ({
        id: purchase.id,
        totalAmount: purchase.totalAmount,
        status: purchase.status,
        orderDate: purchase.orderDate,
        paymentMethod: purchase.paymentMethod,
        itemCount: purchase.items?.length || 0,
        items: purchase.items || []
      })),
      totalCount: purchases.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(purchases.count / parseInt(limit))
    });

  } catch (err) {
    console.error('Get purchase history error:', err);
    res.status(500).json({ error: 'Server error fetching purchase history' });
  }
};

exports.getPurchaseById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { purchaseId } = req.params;

    const purchase = await db.Purchase.findOne({
      where: { id: purchaseId, userId },
      include: [
        {
          model: db.PurchaseItem,
          as: 'items',
          attributes: ['productId', 'productName', 'quantity', 'unitPrice', 'totalPrice']
        },
        {
          model: db.Commission,
          as: 'commission',
          attributes: ['commissionAmount', 'status'],
          required: false
        }
      ]
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json({
      purchase: {
        id: purchase.id,
        totalAmount: purchase.totalAmount,
        status: purchase.status,
        orderDate: purchase.orderDate,
        paymentMethod: purchase.paymentMethod,
        shippingAddress: purchase.shippingAddress ? JSON.parse(purchase.shippingAddress) : null,
        items: purchase.items || [],
        commission: purchase.commission
      }
    });

  } catch (err) {
    console.error('Get purchase error:', err);
    res.status(500).json({ error: 'Server error fetching purchase details' });
  }
};

exports.cancelPurchase = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { purchaseId } = req.params;
    const { reason } = req.body;

    // Find purchase
    const purchase = await db.Purchase.findOne({
      where: { id: purchaseId, userId, status: 'pending' },
      transaction
    });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Pending purchase not found' });
    }

    // Update purchase status
    purchase.status = 'cancelled';
    purchase.cancelReason = reason || 'Cancelled by user';
    purchase.cancelledAt = new Date();
    await purchase.save({ transaction });

    // Cancel associated commission if exists
    const commission = await db.Commission.findOne({
      where: { purchaseId: purchase.id },
      transaction
    });

    if (commission) {
      commission.status = 'cancelled';
      await commission.save({ transaction });
    }

    await transaction.commit();

    res.json({ message: 'Purchase cancelled successfully' });

  } catch (err) {
    await transaction.rollback();
    console.error('Cancel purchase error:', err);
    res.status(500).json({ error: 'Server error cancelling purchase' });
  }
};

exports.getCheckoutSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * 0.08; // 8% tax rate - adjust as needed
    const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
    const total = subtotal + tax + shipping;

    res.json({
      summary: {
        subtotal,
        tax,
        shipping,
        total,
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
      },
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.quantity * item.price
      }))
    });

  } catch (err) {
    console.error('Get checkout summary error:', err);
    res.status(500).json({ error: 'Server error calculating checkout summary' });
  }
};