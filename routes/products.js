const express = require('express');
const router = express.Router();
const { Product } = require('../models');
const { verifyToken } = require('./auth'); // Import JWT middleware

// Public: get all products (no authentication needed)
router.get('/', async (req, res) => {
  const products = await Product.findAll();
  res.json(products);
});

// Admin: create product - now uses JWT authentication
router.post('/', verifyToken, async (req, res) => {
  // Check if user is admin using JWT payload
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admins only' });
  }

  const { name, type, price, description, imageUrl } = req.body;
  const product = await Product.create({ name, type, price, description, imageUrl });
  res.status(201).json(product);
});

module.exports = router;