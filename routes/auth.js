const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { generateReferralCode } = require('../utils/codeGenerator');

// Register


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

    req.session.userId = user.id;

    // ✅ Respond with user role info
    res.json({ 
      message: 'Registration successful', 
      referralCode: newCode,
      isAdmin: user.isAdmin // frontend will use this
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


// Login
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  const user = await User.findOne({ where: { phone } });

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  res.json({ 
    message: 'Login successful',
    isAdmin: user.isAdmin 
  });
});

// Get current user (for dashboard auth check)
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });

  const user = await User.findByPk(req.session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    id: user.id,
    phone: user.phone,
    referralCode: user.referralCode,
    isAdmin: user.isAdmin
  });
});


// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});


module.exports = router;
