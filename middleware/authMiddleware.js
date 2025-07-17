const jwt = require('jsonwebtoken');
const db = require('../models');

/**
 * Verify JWT token from cookie or Authorization header
 */
const verifyToken = (req) => {
  let token;
  
  // Try to get token from cookie first (httpOnly cookie)
  if (req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  }
  
  // Fallback to Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }
  
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
};

/**
 * Middleware for protecting admin pages (redirects to login)
 */
exports.isAdminPage = async (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    
    if (!decoded || !decoded.userId) {
      return res.redirect('/login.html');
    }

    const user = await db.User.findByPk(decoded.userId);
    if (!user || !user.isAdmin) {
      return res.redirect('/login.html');
    }

    // Set user info on request for downstream middleware
    req.user = user;
    req.userId = user.id;
    req.isAdmin = user.isAdmin;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.redirect('/login.html');
  }
};

/**
 * Middleware for protecting admin API routes (returns JSON response)
 */
exports.isAdmin = async (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await db.User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Set user info on request for downstream middleware
    req.user = user;
    req.userId = user.id;
    req.isAdmin = user.isAdmin;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Middleware for protecting general authenticated routes
 */
exports.isAuthenticated = async (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await db.User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Set user info on request for downstream middleware
    req.user = user;
    req.userId = user.id;
    req.isAdmin = user.isAdmin;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Optional middleware to get user info if authenticated (doesn't fail if not authenticated)
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    
    if (decoded && decoded.userId) {
      const user = await db.User.findByPk(decoded.userId);
      if (user) {
        req.user = user;
        req.userId = user.id;
        req.isAdmin = user.isAdmin;
      }
    }
    
    next();
  } catch (err) {
    console.error('Optional auth middleware error:', err);
    // Don't fail the request, just continue without user info
    next();
  }
};

/**
 * Middleware to refresh JWT token if it's close to expiry
 */
exports.refreshTokenIfNeeded = async (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    
    if (decoded && decoded.userId) {
      const now = Math.floor(Date.now() / 1000);
      const tokenExp = decoded.exp;
      const timeUntilExpiry = tokenExp - now;
      
      // If token expires in less than 30 minutes, refresh it
      if (timeUntilExpiry < 30 * 60) {
        const user = await db.User.findByPk(decoded.userId);
        if (user) {
          const newToken = jwt.sign(
            { userId: user.id, phone: user.phone },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
          );
          
          // Set new token in cookie
          res.cookie('authToken', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
          });
          
          console.log(`Token refreshed for user ${user.phone}`);
        }
      }
    }
    
    next();
  } catch (err) {
    console.error('Token refresh middleware error:', err);
    // Don't fail the request, just continue
    next();
  }
};

/**
 * Utility function to generate JWT token
 */
exports.generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      phone: user.phone,
      isAdmin: user.isAdmin 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

/**
 * Utility function to set auth cookie
 */
exports.setAuthCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
};

/**
 * Utility function to clear auth cookie
 */
exports.clearAuthCookie = (res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};