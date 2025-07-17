const bcrypt = require('bcryptjs');
const db = require('../models');
const { generateReferralCode } = require('../utils/codeGenerator');
const { generateToken, setAuthCookie, clearAuthCookie } = require('../middleware/authMiddleware');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { phone, password, referralCode } = req.body;
    
    // Validate required fields
    if (!phone || !password || !referralCode) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await db.User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Validate referral code
    const referrer = await db.User.findOne({ where: { referralCode } });
    if (!referrer) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12); // Increased salt rounds for better security

    // Create new user
    const newUser = await db.User.create({
      phone,
      passwordHash,
      referralCode: generateReferralCode(),
      referredBy: referrer.referralCode,
      isAdmin: false // Explicitly set to false for security
    });

    // Generate JWT token
    const token = generateToken(newUser);

    // Set secure cookie
    setAuthCookie(res, token);

    console.log(`New user registered: ${phone} with referral code: ${newUser.referralCode}`);

    res.status(201).json({ 
      message: 'Registration successful!',
      user: {
        id: newUser.id,
        phone: newUser.phone,
        referralCode: newUser.referralCode,
        isAdmin: newUser.isAdmin
      }
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // Validate required fields
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    // Find user by phone
    const user = await db.User.findOne({ where: { phone } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set secure cookie
    setAuthCookie(res, token);

    console.log(`User logged in: ${phone}`);

    res.json({ 
      message: 'Login successful',
      user: {
        id: user.id,
        phone: user.phone,
        referralCode: user.referralCode,
        isAdmin: user.isAdmin,
        totalReceived: user.totalReceived || 0
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

/**
 * Logout user
 */
exports.logout = (req, res) => {
  try {
    // Clear the auth cookie
    clearAuthCookie(res);

    console.log('User logged out');

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error during logout' });
  }
};

/**
 * Get current user profile
 */
exports.profile = async (req, res) => {
  try {
    // User info is set by authentication middleware
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        referralCode: user.referralCode,
        isAdmin: user.isAdmin,
        totalReceived: user.totalReceived || 0,
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
};

/**
 * Refresh JWT token
 */
exports.refreshToken = async (req, res) => {
  try {
    // User info is set by authentication middleware
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate new token
    const token = generateToken(user);

    // Set new secure cookie
    setAuthCookie(res, token);

    console.log(`Token refreshed for user: ${user.phone}`);

    res.json({ 
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        phone: user.phone,
        referralCode: user.referralCode,
        isAdmin: user.isAdmin
      }
    });

  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Server error refreshing token' });
  }
};

/**
 * Change user password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await db.User.update(
      { passwordHash: newPasswordHash },
      { where: { id: user.id } }
    );

    console.log(`Password changed for user: ${user.phone}`);

    res.json({ message: 'Password changed successfully' });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error changing password' });
  }
};

/**
 * Verify if user is authenticated (for frontend checks)
 */
exports.verifyAuth = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

    res.json({ 
      authenticated: true,
      user: {
        id: user.id,
        phone: user.phone,
        referralCode: user.referralCode,
        isAdmin: user.isAdmin,
        totalReceived: user.totalReceived || 0
      }
    });

  } catch (err) {
    console.error('Verify auth error:', err);
    res.status(500).json({ error: 'Server error verifying authentication' });
  }
};