'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns to Withdrawals table
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

    await queryInterface.addColumn('Withdrawals', 'forfeitedAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    });

    await queryInterface.addColumn('Withdrawals', 'adminNote', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Withdrawals', 'processedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Update existing withdrawals to have proper status if needed
    await queryInterface.sequelize.query(`
      UPDATE Withdrawals 
      SET status = 'pending' 
      WHERE status IS NULL OR status = ''
    `);

    // Add index for better performance
    await queryInterface.addIndex('Withdrawals', ['userId', 'status']);
    await queryInterface.addIndex('Withdrawals', ['status', 'createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('Withdrawals', ['userId', 'status']);
    await queryInterface.removeIndex('Withdrawals', ['status', 'createdAt']);

    // Remove columns
    await queryInterface.removeColumn('Withdrawals', 'forfeitPurchaseId');
    await queryInterface.removeColumn('Withdrawals', 'forfeitedAmount');
    await queryInterface.removeColumn('Withdrawals', 'adminNote');
    await queryInterface.removeColumn('Withdrawals', 'processedAt');
  }
};