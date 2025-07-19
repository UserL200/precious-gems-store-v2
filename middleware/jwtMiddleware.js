const jwt = require('jsonwebtoken');
const db = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        details: 'No authorization header or token found'
      });
    }


    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Handle both 'id' and 'userId' from token payload
    const userId = decoded.id || decoded.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'Token missing user ID'
      });
    }

    // Fetch user from database to ensure they still exist
    const user = await db.User.findByPk(userId);
    
    if (!user) {
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

    next();

  } catch (error) {
    
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

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
};