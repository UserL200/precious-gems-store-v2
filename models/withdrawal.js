module.exports = (sequelize, DataTypes) => {
  const Withdrawal = sequelize.define('Withdrawal', {
    amount: { type: DataTypes.FLOAT, allowNull: false },
    bankName: { type: DataTypes.STRING, allowNull: false },
    accountNumber: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'approved', 'declined'), defaultValue: 'pending' }
  });

  Withdrawal.associate = (models) => {
    Withdrawal.belongsTo(models.User, { foreignKey: 'userId' });
  };
  return Withdrawal;
};
