const db = require('../models');
const { Op } = require('sequelize');

exports.getReferralStats = async (req, res) => {
  try {
    // Get userId from JWT payload (set by auth middleware)
    const userId = req.user.id;
    
    // Find the current user
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all users referred by this user
    const referrals = await db.User.findAll({
      where: { referredBy: user.id },
      include: [
        {
          model: db.Purchase,
          where: { status: 'approved' },
          required: false,
          attributes: ['id', 'totalAmount', 'createdAt']
        }
      ],
      attributes: ['id', 'phone', 'firstName', 'lastName', 'createdAt', 'status']
    });

    // Get all commissions earned by this user
    const commissions = await db.Commission.findAll({
      where: { referrerId: userId },
      include: [
        {
          model: db.User,
          as: 'referredUser', // assuming you have this association
          attributes: ['id', 'phone', 'firstName'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calculate total commission
    const totalCommission = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount || 0), 0);

    // Get current user's approved purchases
    const approvedPurchases = await db.Purchase.findAll({
      where: { 
        userId, 
        status: 'approved' 
      },
      attributes: ['id', 'totalAmount', 'createdAt']
    });

    // Calculate totals
    const totalSpent = approvedPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);
    const totalPurchases = approvedPurchases.length;

    // Get referral statistics
    const activeReferrals = referrals.filter(ref => ref.status === 'active').length;
    const totalReferrals = referrals.length;

    // Calculate referral performance
    const referralPerformance = referrals.map(ref => {
      const purchases = ref.Purchases || [];
      const referralSpent = purchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);
      
      return {
        id: ref.id,
        phone: ref.phone,
        firstName: ref.firstName,
        lastName: ref.lastName,
        joinedAt: ref.createdAt,
        status: ref.status,
        totalPurchases: purchases.length,
        totalSpent: referralSpent,
        lastPurchase: purchases.length > 0 ? purchases[purchases.length - 1].createdAt : null
      };
    });

    // Get recent commissions for activity feed
    const recentCommissions = commissions.slice(0, 10).map(comm => ({
      id: comm.id,
      amount: parseFloat(comm.commissionAmount || 0),
      earnedAt: comm.createdAt,
      referredUser: comm.referredUser ? {
        id: comm.referredUser.id,
        phone: comm.referredUser.phone,
        firstName: comm.referredUser.firstName
      } : null,
      reason: comm.reason || 'Purchase commission'
    }));

    // Calculate monthly commission (current month)
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthlyCommissions = commissions.filter(c => new Date(c.createdAt) >= startOfMonth);
    const monthlyTotal = monthlyCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount || 0), 0);

    res.json({
      user: {
        id: user.id,
        referralCode: user.referralCode,
        totalReceived: parseFloat(user.totalReceived || 0)
      },
      referrals: {
        total: totalReferrals,
        active: activeReferrals,
        performance: referralPerformance
      },
      commissions: {
        total: totalCommission,
        monthly: monthlyTotal,
        recent: recentCommissions
      },
      purchases: {
        total: totalPurchases,
        totalSpent: totalSpent
      },
      summary: {
        referralCode: user.referralCode,
        totalReferrals,
        activeReferrals,
        totalCommission,
        monthlyCommission: monthlyTotal,
        totalSpent,
        totalPurchases,
        availableBalance: parseFloat(user.totalReceived || 0)
      }
    });

  } catch (err) {
    console.error('Get referral stats error:', err);
    res.status(500).json({ error: 'Server error fetching referral statistics' });
  }
};

// Additional referral-related endpoints

exports.getReferralHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const referrals = await db.User.findAndCountAll({
      where: { referredBy: userId },
      include: [
        {
          model: db.Purchase,
          where: { status: 'approved' },
          required: false,
          attributes: ['totalAmount', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      referrals: referrals.rows.map(ref => ({
        id: ref.id,
        phone: ref.phone,
        firstName: ref.firstName,
        lastName: ref.lastName,
        joinedAt: ref.createdAt,
        status: ref.status,
        totalPurchases: ref.Purchases?.length || 0,
        totalSpent: ref.Purchases?.reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0) || 0
      })),
      totalCount: referrals.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(referrals.count / parseInt(limit))
    });

  } catch (err) {
    console.error('Get referral history error:', err);
    res.status(500).json({ error: 'Server error fetching referral history' });
  }
};

exports.getCommissionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    const whereClause = { referrerId: userId };
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const commissions = await db.Commission.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'referredUser',
          attributes: ['id', 'phone', 'firstName'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const totalCommission = commissions.rows.reduce((sum, c) => sum + parseFloat(c.commissionAmount || 0), 0);

    res.json({
      commissions: commissions.rows.map(comm => ({
        id: comm.id,
        amount: parseFloat(comm.commissionAmount || 0),
        earnedAt: comm.createdAt,
        reason: comm.reason || 'Purchase commission',
        referredUser: comm.referredUser ? {
          id: comm.referredUser.id,
          phone: comm.referredUser.phone,
          firstName: comm.referredUser.firstName
        } : null
      })),
      totalCount: commissions.count,
      totalAmount: totalCommission,
      currentPage: parseInt(page),
      totalPages: Math.ceil(commissions.count / parseInt(limit))
    });

  } catch (err) {
    console.error('Get commission history error:', err);
    res.status(500).json({ error: 'Server error fetching commission history' });
  }
};

exports.getReferralLeaderboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Get top referrers by total commission
    const topReferrers = await db.User.findAll({
      include: [
        {
          model: db.Commission,
          as: 'commissions',
          attributes: [],
          required: false
        }
      ],
      attributes: [
        'id', 
        'phone', 
        'firstName', 
        'lastName',
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('commissions.commissionAmount')), 0), 'totalCommission'],
        [db.sequelize.fn('COUNT', db.sequelize.col('commissions.id')), 'totalCommissions']
      ],
      group: ['User.id'],
      order: [[db.sequelize.literal('totalCommission'), 'DESC']],
      limit: parseInt(limit)
    });

    // Find current user's rank
    const userRank = await db.User.findAll({
      include: [
        {
          model: db.Commission,
          as: 'commissions',
          attributes: [],
          required: false
        }
      ],
      attributes: [
        'id',
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('commissions.commissionAmount')), 0), 'totalCommission']
      ],
      group: ['User.id'],
      order: [[db.sequelize.literal('totalCommission'), 'DESC']]
    });

    const currentUserRank = userRank.findIndex(user => user.id === userId) + 1;

    res.json({
      leaderboard: topReferrers.map((user, index) => ({
        rank: index + 1,
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName
        },
        totalCommission: parseFloat(user.get('totalCommission') || 0),
        totalCommissions: parseInt(user.get('totalCommissions') || 0),
        isCurrentUser: user.id === userId
      })),
      currentUserRank: currentUserRank || 'Not ranked'
    });

  } catch (err) {
    console.error('Get referral leaderboard error:', err);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
};