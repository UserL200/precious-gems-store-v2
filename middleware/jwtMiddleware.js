const jwt = require('jsonwebtoken');
const db = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔍 Auth middleware - Headers:', {
      authorization: req.headers.authorization,
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
    });

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ Auth middleware - No token provided');
      return res.status(401).json({ 
        error: 'Access token required',
        details: 'No authorization header or token found'
      });
    }

    console.log('🔍 Auth middleware - Token extracted: Found');

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Auth middleware - Token decoded:', { 
      userId: decoded.id || decoded.userId, // Handle both formats
      phone: decoded.phone, 
      isAdmin: decoded.isAdmin 
    });

    // Handle both 'id' and 'userId' from token payload
    const userId = decoded.id || decoded.userId;
    
    if (!userId) {
      console.log('❌ Auth middleware - No user ID in token');
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'Token missing user ID'
      });
    }

    // Fetch user from database to ensure they still exist
    const user = await db.User.findByPk(userId);
    
    if (!user) {
      console.log('❌ Auth middleware - User not found in database');
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'User not found'
      });
    }

    // Attach user info to request object
    req.user = {
      userId: user.id,
      phone: user.phone,
      isAdmin: user.isAdmin
    };

    console.log('✅ Auth middleware - User attached to request:', req.user.id);
    next();

  } catch (error) {
    console.error('❌ Auth middleware - Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        details: 'Please login again'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'Token is malformed'
      });
    }

    return res.status(401).json({ 
      error: 'Authentication failed',
      details: 'Token verification error'
    });
  }
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      details: 'No user context found'
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Admin access required',
      details: 'Insufficient permissions'
    });
  }

  console.log('✅ Admin middleware - Admin access granted:', req.user.phone);
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
};