const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const { Sequelize, DataTypes } = require('sequelize');

let sequelize;

if (!sequelize) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
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