module.exports = (sequelize, DataTypes) => {
  const Purchase = sequelize.define('Purchase', {
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    totalAmount: { type: DataTypes.FLOAT, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'declined'),
      defaultValue: 'pending',
    }
  });

  Purchase.associate = (models) => {
    Purchase.belongsTo(models.User, { foreignKey: 'userId' });
    Purchase.belongsTo(models.Product, { foreignKey: 'productId' });
    Purchase.hasMany(models.Commission, { foreignKey: 'referredPurchaseId' });
  };

  return Purchase;
};
