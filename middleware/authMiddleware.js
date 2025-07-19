const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT Authentication Middleware
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Optional: Verify user still exists in database
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user data to request object
    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      isAdmin: decoded.isAdmin
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else {
      return res.status(500).json({ error: 'Server error' });
    }
  }
};

// Admin Authorization Middleware
const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Optional: Check if user is authenticated (for optional auth routes)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findByPk(decoded.id);
      if (user) {
        req.user = {
          id: decoded.id,
          phone: decoded.phone,
          isAdmin: decoded.isAdmin
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth routes
    next();
  }
};

// Legacy middleware names for backward compatibility
const isAuthenticated = authenticateJWT;
const isAdmin = [authenticateJWT, authorizeAdmin];

module.exports = {
  authenticateJWT,
  authorizeAdmin,
  optionalAuth,
  isAuthenticated, // backward compatibility
  isAdmin // backward compatibility
};