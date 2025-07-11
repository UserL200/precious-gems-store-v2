const { Product } = require('../models');

const updates = [
  { id: 1, imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop' },
  { id: 2, imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop' },
  { id: 3, imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=200&fit=crop' },
  { id: 4, imageUrl: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=300&h=200&fit=crop' },
];

(async () => {
  for (const update of updates) {
    await Product.update({ imageUrl: update.imageUrl }, { where: { id: update.id } });
  }
  console.log('✅ Product images updated.');
  process.exit();
})();
