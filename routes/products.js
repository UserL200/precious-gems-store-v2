const express = require('express');
const { authenticateToken,  requireAdmin } = require('../middleware/jwtMiddleware');
const { Product } = require('../models');
const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, price, description, imageUrl } = req.body;
    
    const product = await Product.create({
      nameame, type, price, description, imageUrl
    });
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
