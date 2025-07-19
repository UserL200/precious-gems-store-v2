const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/jwtMiddleware');



// JWT utility functions
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      phone: user.phone, 
      isAdmin: user.isAdmin 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { phone, password, referralCode } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle referral logic
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ where: { referralCode } });
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    // Create user
    const user = await User.create({
      phone,
      password: hashedPassword,
      referredBy,
      referralCode: generateReferralCode()
    });

    // Generate JWT token
    const token = generateToken(user);

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
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find user
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user);
    

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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user info (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // We can optionally implement a token blacklist for enhanced security
  res.json({ message: 'Logged out successfully' });
});

// Verify token endpoint (useful for frontend auth checks)
router.get('/verify', authenticateToken, (req, res) => {
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

