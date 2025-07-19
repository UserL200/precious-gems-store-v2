const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/jwtMiddleware');

// Validate environment variables on startup
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!');
  console.error('Please set JWT_SECRET in your environment variables.');
}

// JWT utility functions
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('❌ JWT_SECRET not found in environment variables');
    throw new Error('JWT configuration error');
  }
  
  return jwt.sign(
    { 
      id: user.id, 
      phone: user.phone, 
      isAdmin: user.isAdmin 
    },
    secret,
    { expiresIn: '24h' }
  );
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt for phone:', req.body.phone?.slice(0, 4) + '***');
    
    const { phone, password, referralCode } = req.body;

    // Validate input
    if (!phone || !password) {
      console.log('❌ Registration failed: Missing phone or password');
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      console.log('❌ Registration failed: User already exists');
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle referral logic
    let referredBy = null;
    if (referralCode) {
      console.log('🔗 Checking referral code:', referralCode);
      const referrer = await User.findOne({ where: { referralCode } });
      if (referrer) {
        referredBy = referrer.id;
        console.log('✅ Valid referral code found');
      } else {
        console.log('⚠️ Invalid referral code provided');
      }
    }

    // Create user
    console.log('👤 Creating new user...');
    const user = await User.create({
      phone,
      password: hashedPassword,
      referredBy,
      referralCode: generateReferralCode()
    });

    console.log('✅ User created successfully with ID:', user.id);

    // Generate JWT token
    console.log('🔑 Generating JWT token...');
    const token = generateToken(user);

    console.log('✅ Registration completed successfully');
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error('❌ Registration error details:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check for specific error types
    if (error.message.includes('JWT configuration')) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        code: 'JWT_CONFIG_ERROR'
      });
    }
    
    if (error.name === 'SequelizeError' || error.name === 'SequelizeValidationError') {
      console.error('Database error during registration');
      return res.status(500).json({ 
        error: 'Database error during registration',
        code: 'DB_ERROR'
      });
    }
    
    res.status(500).json({ 
      error: 'Server error during registration',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt for phone:', req.body.phone?.slice(0, 4) + '***');
    
    const { phone, password } = req.body;

    // Validate input
    if (!phone || !password) {
      console.log('❌ Login failed: Missing credentials');
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find user
    console.log('🔍 Looking up user...');
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    console.log('🔒 Verifying password...');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Login failed: Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    console.log('🔑 Generating JWT token for user:', user.id);
    const token = generateToken(user);
    
    console.log('✅ Login successful');
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error('❌ Login error details:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('JWT configuration')) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        code: 'JWT_CONFIG_ERROR'
      });
    }
    
    res.status(500).json({ 
      error: 'Server error during login',
      code: 'LOGIN_ERROR'
    });
  }
});

// Get current user info (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Getting user info for ID:', req.user.id);
    
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ User info retrieved successfully');
    res.json({ user });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ 
      error: 'Server error getting user info',
      code: 'GET_USER_ERROR'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  console.log('👋 User logout');
  // With JWT, logout is handled client-side by removing the token
  // We can optionally implement a token blacklist for enhanced security
  res.json({ message: 'Logged out successfully' });
});

// Verify token endpoint (useful for frontend auth checks)
router.get('/verify', authenticateToken, (req, res) => {
  console.log('🔍 Token verification for user:', req.user.id);
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      phone: req.user.phone,
      isAdmin: req.user.isAdmin
    }
  });
});

// Utility function to generate referral code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = router;