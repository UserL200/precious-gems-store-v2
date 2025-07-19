const db = require('../models');

exports.getProducts = async (req, res) => {
  try {
    const products = await db.Product.findAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
