'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('Purchases');

    if (!table.userId) {
      await queryInterface.addColumn('Purchases', 'userId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    if (!table.productId) {
      await queryInterface.addColumn('Purchases', 'productId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('Purchases');

    if (table.userId) {
      await queryInterface.removeColumn('Purchases', 'userId');
    }

    if (table.productId) {
      await queryInterface.removeColumn('Purchases', 'productId');
    }}}