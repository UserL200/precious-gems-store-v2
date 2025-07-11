const { Product } = require('../models');

const sampleProducts = [
  {
    name: 'Brilliant Diamond',
    type: 'Diamond',
    price: 7500.00,
    imageUrl: '/images/diamond1.jpg'
  },
  {
    name: 'Green Emerald',
    type: 'Emerald',
    price: 4200.00,
    imageUrl: '/images/emerald1.jpg'
  },
  {
    name: 'Red Ruby Classic',
    type: 'Ruby',
    price: 3800.00,
    imageUrl: '/images/ruby1.jpg'
  },
  {
    name: 'Blue Sapphire Shine',
    type: 'Sapphire',
    price: 5600.00,
    imageUrl: '/images/sapphire1.jpg'
  }
];

async function seedProducts() {
  try {
    const count = await Product.count();
    if (count === 0) {
      await Product.bulkCreate(sampleProducts);
      console.log('✅ Products seeded');
    } else {
      console.log('ℹ️ Products already exist, skipping seeding.');
    }
  } catch (err) {
    console.error('💥 Error seeding products:', err);
  }
}

module.exports = seedProducts;
