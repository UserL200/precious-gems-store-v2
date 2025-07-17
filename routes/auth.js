const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateReferralCode } = require('../utils/codeGenerator');

// JWT Secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

// JWT Token verification middleware - FIXED VERSION
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token decoded:', decoded);

    // Fetch the user from database
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      console.log('❌ User not found for userId:', decoded.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('✅ User authenticated:', { id: user.id, phone: user.phone });

    // Attach BOTH user object AND userId to request
    req.user = user;        // This is what your routes expect
    req.userId = user.id;   // This is for backward compatibility

    next();
  } catch (err) {
    console.error('❌ Token verification error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    } else {
      return res.status(500).json({ error: 'Authentication server error' });
    }
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

// Register endpoint
router.post('/register', async (req, res) => {
  const { phone, password, referralCode } = req.body;
  if (!referralCode) return res.status(400).json({ error: 'Referral code is required' });

  try {
    const referrer = await User.findOne({ where: { referralCode } });
    if (!referrer) return res.status(400).json({ error: 'Invalid referral code' });

    const hash = await bcrypt.hash(password, 10);
    const newCode = generateReferralCode();

    const user = await User.create({
      phone,
      password: hash,
      referralCode: newCode,
      referredBy: referrer.id
    });

    // Generate JWT token instead of setting session
    const token = generateToken(user.id);

    res.json({ 
      message: 'Registration successful', 
      token,
      referralCode: newCode,
      isAdmin: user.isAdmin
    });

  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Phone number already registered' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  const user = await User.findOne({ where: { phone } });

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token instead of setting session
  const token = generateToken(user.id);

  res.json({ 
    message: 'Login successful',
    token,
    isAdmin: user.isAdmin 
  });
});

// GET /api/auth/me - FIXED VERSION
router.get('/me', verifyToken, async (req, res) => {
  try {
    // Now we can use req.user directly since it's set in verifyToken
    console.log('📱 /me endpoint called for user:', req.user.id);
    
    res.json({
      id: req.user.id,
      phone: req.user.phone,
      referralCode: req.user.referralCode,
      isAdmin: req.user.isAdmin,
      isActive: req.user.isActive,
      createdAt: req.user.createdAt
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
module.exports.verifyToken = verifyToken;