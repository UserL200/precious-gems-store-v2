// models/commission.js
module.exports = (sequelize, DataTypes) => {
  const Commission = sequelize.define('Commission', {
    amount: DataTypes.FLOAT,
    referredPurchaseId: DataTypes.INTEGER
  });

  Commission.associate = (models) => {
    Commission.belongsTo(models.User, { foreignKey: 'referrerId' });
    Commission.belongsTo(models.Purchase, { foreignKey: 'referredPurchaseId' });
  };

  return Commission;
};
