const express = require('express');
const router = express.Router();
const { Product } = require('../models');

// Public: get all products
router.get('/', async (req, res) => {
  const products = await Product.findAll();
  res.json(products);
});

// Admin: create product
router.post('/', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Admins only' });

  const { name, type, price, description, imageUrl } = req.body;
  const product = await Product.create({ name, type, price, description, imageUrl });
  res.status(201).json(product);
});

module.exports = router;
