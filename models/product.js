module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    imageUrl: { type: DataTypes.TEXT, allowNull: true },
    description: DataTypes.TEXT,
    
  });
  
   Product.associate = (models) => {
    Product.hasMany(models.Purchase, { foreignKey: 'productId' });
  };
  return Product;
};
