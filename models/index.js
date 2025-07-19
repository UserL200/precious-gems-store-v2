require('dotenv').config(); // This must be first!

const { Sequelize, DataTypes } = require('sequelize');

// Global variable to store the singleton instance
global.sequelize = global.sequelize || null;

if (!global.sequelize) {
  global.sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: false,
    pool: {
      max: 1,
      min: 0,
      acquire: 60000,
      idle: 5000,
    },
    dialectOptions: {
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000,
    }
  });
}

const sequelize = global.sequelize;

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./user')(sequelize, DataTypes);
db.Product = require('./product')(sequelize, DataTypes);
db.Purchase = require('./purchase')(sequelize, DataTypes);
db.Commission = require('./commission')(sequelize, DataTypes);
db.Withdrawal = require('./withdrawal')(sequelize, DataTypes);

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;