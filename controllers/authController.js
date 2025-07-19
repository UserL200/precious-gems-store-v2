const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT utilities
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      phone: user.phone, 
      isAdmin: user.isAdmin 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Register user
exports.register = async (req, res) => {
  try {
    const { phone, password, referralCode } = req.body;

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
        userId: user.id,
        phone: user.phone,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

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
        userId: user.id,
        phone: user.phone,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current user (protected route)
exports.getMe = async (req, res) => {
  try {
    // req.user is set by JWT middleware
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
};

// Logout (client-side token removal)
exports.logout = (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // We can optionally implement a token blacklist for enhanced security
  res.json({ message: 'Logged out successfully' });
};

// Utility function to generate referral code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Export utilities for use in other controllers
module.exports = {
  ...exports,
  generateToken,
  verifyToken
};