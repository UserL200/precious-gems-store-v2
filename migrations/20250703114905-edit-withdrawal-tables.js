'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('Withdrawals');

    if (!table.forfeitPurchaseId) {
      await queryInterface.addColumn('Withdrawals', 'forfeitPurchaseId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Purchases',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!table.forfeitedAmount) {
      await queryInterface.addColumn('Withdrawals', 'forfeitedAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      });
    }

    if (!table.adminNote) {
      await queryInterface.addColumn('Withdrawals', 'adminNote', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!table.processedAt) {
      await queryInterface.addColumn('Withdrawals', 'processedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    // Fix null/empty statuses
    await queryInterface.sequelize.query(`
      UPDATE Withdrawals 
      SET status = 'pending' 
      WHERE status IS NULL OR status = ''
    `);

    // Add indexes (safe to run without duplication)
    await queryInterface.addIndex('Withdrawals', ['userId', 'status']);
    await queryInterface.addIndex('Withdrawals', ['status', 'createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('Withdrawals');

    await queryInterface.removeIndex('Withdrawals', ['userId', 'status']);
    await queryInterface.removeIndex('Withdrawals', ['status', 'createdAt']);

    if (table.forfeitPurchaseId) {
      await queryInterface.removeColumn('Withdrawals', 'forfeitPurchaseId');
    }

    if (table.forfeitedAmount) {
      await queryInterface.removeColumn('Withdrawals', 'forfeitedAmount');
    }

    if (table.adminNote) {
      await queryInterface.removeColumn('Withdrawals', 'adminNote');
    }

    if (table.processedAt) {
      await queryInterface.removeColumn('Withdrawals', 'processedAt');
    }
  }
};
