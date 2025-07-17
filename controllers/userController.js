const db = require('../models');
const { verifyToken, extractToken } = require('./auth');

/**
 * Get user's withdrawal balance
 */
exports.getWithdrawalBalance = async (req, res) => {
  try {
    // Extract and verify JWT token
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Fetch user totalReceived
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Sum of approved withdrawals
    const approvedWithdrawals = await db.Withdrawal.sum('amount', {
      where: {
        userId,
        status: 'approved',
      }
    }) || 0;

    // Calculate available balance = totalReceived - sum(approved withdrawals)
    const availableBalance = user.totalReceived - approvedWithdrawals;

    return res.json({ 
      balance: availableBalance > 0 ? availableBalance : 0,
      totalReceived: user.totalReceived,
      totalWithdrawn: approvedWithdrawals
    });

  } catch (err) {
    console.error('Get withdrawal balance error:', err);
    
    // Handle JWT-specific errors
    if (err.message === 'Invalid or expired token') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get user profile
 */
exports.getUserProfile = async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId || decoded.id;

    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'totalReceived', 'isActive', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });

  } catch (err) {
    console.error('Get user profile error:', err);
    
    if (err.message === 'Invalid or expired token') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Update user profile
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId || decoded.id;

    const { firstName, lastName, email } = req.body;

    // Validate input
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email is already taken by another user
    const existingUser = await db.User.findOne({
      where: { 
        email,
        id: { [db.Sequelize.Op.ne]: userId }
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Update user
    const [updatedCount] = await db.User.update(
      { firstName, lastName, email },
      { where: { id: userId } }
    );

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get updated user
    const updatedUser = await db.User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'totalReceived', 'isActive', 'createdAt']
    });

    return res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });

  } catch (err) {
    console.error('Update user profile error:', err);
    
    if (err.message === 'Invalid or expired token') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    return res.status(500).json({ error: 'Server error' });
  }
};