const bcrypt = require('bcryptjs');
const db = require('../models');
const { generateReferralCode } = require('../utils/codeGenerator');

exports.register = async (req, res) => {
  try {
    const { phone, password, referralCode } = req.body;
    if (!phone || !password || !referralCode) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await db.User.findOne({ where: { phone } });
    if (existingUser) return res.status(400).json({ error: 'Phone already registered' });

    const referrer = await db.User.findOne({ where: { referralCode } });
    if (!referrer) return res.status(400).json({ error: 'Invalid referral code' });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await db.User.create({
      phone,
      passwordHash,
      referralCode: generateReferralCode(),
      referredBy: referrer.referralCode
    });

    res.json({ message: `Registered! Your code: ${newUser.referralCode}` });
        console.log("............................................................we are in controller");
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await db.User.findOne({ where: { phone } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // Save session or token — simplified
    req.session.userId = user.id;
    res.json({ message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
};
