module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    phone: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    referralCode: { type: DataTypes.STRING, unique: true },
    referredBy: { type: DataTypes.INTEGER, allowNull: true },
    isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  });

  User.associate = (models) => {
    User.hasMany(models.Purchase, { foreignKey: 'userId' });
    User.hasMany(models.Withdrawal, { foreignKey: 'userId' });
    User.hasMany(models.Commission, { foreignKey: 'userId' });

    User.hasMany(models.User, {
    foreignKey: 'referredBy',
    as: 'Referrals'
  });

  User.belongsTo(models.User, {
    foreignKey: 'referredBy',
    as: 'Referrer'
  });
  };

  return User;
};
