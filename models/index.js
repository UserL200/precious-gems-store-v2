const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    dialectModule: require('mysql2'), 
    logging: false
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./user')(sequelize, DataTypes);
db.Product = require('./product')(sequelize, DataTypes);
db.Purchase = require('./purchase')(sequelize, DataTypes);
db.Commission = require('./commission')(sequelize, DataTypes);
db.Withdrawal = require('./withdrawal')(sequelize, DataTypes);

// ✅ Only do this (no manual `hasMany` / `belongsTo`)
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
