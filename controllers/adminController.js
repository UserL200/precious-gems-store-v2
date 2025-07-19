const db = require('../models');
const BalanceService = require('../services/balanceService'); // Add this import

// List all users
const getAllUsers = async (req, res) => {
  try {
    const users = await db.User.findAll({
      attributes: ['id', 'phone', 'referralCode', 'referredBy', 'isAdmin', 'createdAt']
    });
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// List all purchases
const getAllPurchases = async (req, res) => {
  try {
    const purchases = await db.Purchase.findAll({
      include: [{ model: db.User, attributes: ['phone'] }]
    });
    res.json(purchases);
  } catch (err) {
    console.error('Get purchases error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// List pending purchases
const getPendingPurchases = async (req, res) => {
  try {
    const purchases = await db.Purchase.findAll({
      where: { status: 'pending' },
      include: [
        { model: db.User, attributes: ['phone'] },
        { model: db.Product, attributes: ['name', 'type'] }
      ]
    });
    res.json(purchases);
  } catch (err) {
    console.error('Get pending purchases error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Process purchase (approve/decline)
const processPurchase = async (req, res) => {
  try {
    const { status } = req.body;
    const purchase = await db.Purchase.findByPk(req.params.id);

    if (!purchase || purchase.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already processed purchase' });
    }

    purchase.status = status;
    await purchase.save();
    res.json({ message: `Purchase ${status}` });
  } catch (err) {
    console.error('Process purchase error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve purchase (alternative method)
const approvePurchase = async (req, res) => {
  const { purchaseId } = req.params;
  const { status } = req.body;

  if (!['approved', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const purchase = await db.Purchase.findByPk(purchaseId, {
      include: [{ model: db.User }],
    });

    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    if (purchase.status !== 'pending')
      return res.status(400).json({ error: 'Purchase already processed' });

    purchase.status = status;
    await purchase.save();

    return res.json({ message: `Purchase ${status} successfully` });

  } catch (error) {
    console.error('Purchase process error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// List all withdrawals - FIXED for NULL users
const getAllWithdrawals = async (req, res) => {
  try {
    console.log('🔍 Available db models:', Object.keys(db));
    
    // Check if Withdrawal model exists
    if (!db.Withdrawal) {
      console.error('❌ Withdrawal model not found in db object');
      return res.status(500).json({ 
        error: 'Withdrawal model not configured',
        availableModels: Object.keys(db)
      });
    }

    const withdrawals = await db.Withdrawal.findAll({
      include: [{ 
        model: db.User, 
        attributes: ['id', 'phone'],
        required: false // LEFT JOIN - includes withdrawals even if user is null
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('🔍 Found withdrawals:', withdrawals.length);
    
    // Format withdrawal data for admin view - SAFELY handle null users
    const formattedWithdrawals = withdrawals.map(w => {
      console.log('🔍 Processing withdrawal:', w.id, 'User:', w.User ? w.User.id : 'NULL');
      
      // Safe formatting to handle null users
      const withdrawalData = {
        id: w.id,
        amount: w.amount || 0,
        bankName: w.bankName || 'N/A',
        accountNumber: w.accountNumber || 'N/A',
        status: w.status || 'pending',
        forfeitPurchaseId: w.forfeitPurchaseId || null,
        forfeitedAmount: w.forfeitedAmount || 0,
        adminNote: w.adminNote || '',
        createdAt: w.createdAt,
        processedAt: w.processedAt || null,
        userId: w.userId || null, // Include userId for debugging
        user: null // Initialize as null
      };

      // Only add user data if User exists and is not null
      if (w.User && w.User.id) {
        withdrawalData.user = {
          id: w.User.id,
          phone: w.User.phone || 'Unknown'
        };
      } else {
        withdrawalData.user = {
          id: null,
          phone: 'Unknown User'
        };
      }
      
      return withdrawalData;
    });
    
    // Calculate admin summary - safely handle null/undefined values
    const totalRequested = withdrawals.reduce((sum, w) => {
      const amount = parseFloat(w.amount) || 0;
      return sum + amount;
    }, 0);
    
    const totalApproved = withdrawals
      .filter(w => w.status === 'approved')
      .reduce((sum, w) => {
        const amount = parseFloat(w.amount) || 0;
        return sum + amount;
      }, 0);
    
    const totalPending = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => {
        const amount = parseFloat(w.amount) || 0;
        return sum + amount;
      }, 0);
    
    const responseData = {
      withdrawals: formattedWithdrawals,
      summary: {
        total: withdrawals.length,
        totalRequested: Math.round(totalRequested * 100) / 100,
        totalApproved: Math.round(totalApproved * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        pendingCount: withdrawals.filter(w => w.status === 'pending').length,
        approvedCount: withdrawals.filter(w => w.status === 'approved').length,
        rejectedCount: withdrawals.filter(w => w.status === 'declined').length
      }
    };

    console.log('✅ Sending withdrawal response with', formattedWithdrawals.length, 'withdrawals');
    res.json(formattedWithdrawals);
    
  } catch (err) {
    console.error('Get withdrawals error:', err);
    res.status(500).json({ 
      error: 'Server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// Process withdrawal using BalanceService (UPDATED)
const processWithdrawal = async (req, res) => {
  try {
    console.log('🔍 Admin processing withdrawal:', req.body);
    
    const { withdrawalId, status, adminNote } = req.body;
    
    // Validate request
    if (!withdrawalId || !status) {
      return res.status(400).json({ 
        error: 'Missing required fields: withdrawalId, status' 
      });
    }
    
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be approved or rejected' 
      });
    }
    
    // Use BalanceService instead of old logic
    const result = await BalanceService.updateWithdrawalStatus(
      withdrawalId, 
      status, 
      adminNote
    );
    
    console.log('✅ Withdrawal processed by admin:', result);
    
    res.json({
      success: true,
      message: result.message,
      withdrawal: result.withdrawal
    });
    
  } catch (error) {
    console.error('💥 Admin withdrawal processing error:', error);
    
    let errorMessage = 'Failed to process withdrawal';
    if (error.message.includes('not found')) {
      errorMessage = 'Withdrawal request not found';
    } else if (error.message.includes('pending')) {
      errorMessage = 'Can only process pending withdrawal requests';
    }
    
    res.status(400).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { userId, isAdmin } = req.body;
    const user = await db.User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isAdmin = isAdmin;
    await user.save();
    res.json({ message: `User ${user.phone} role updated` });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Deactivate user
const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await db.User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isActive = false;
    await user.save();
    res.json({ message: `User ${user.phone} deactivated` });
  } catch (err) {
    console.error('Deactivate user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is trying to delete themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Prevent deletion of other admins (optional security measure)
    if (user.isAdmin) {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }

    await user.destroy();
    res.json({ message: `User ${user.phone} deleted successfully` });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


// Make sure to export the deleteUser function
module.exports = {
  getAllUsers,
  getAllPurchases,
  getAllWithdrawals,
  updateUserRole,
  deactivateUser,
  deleteUser,  // Add this export
  processWithdrawal, 
  getPendingPurchases,
  processPurchase,
  approvePurchase
};
