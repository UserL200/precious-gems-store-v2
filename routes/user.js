const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/jwtMiddleware');


router.get('/user/balance', authenticateToken, userController.getWithdrawalBalance);

module.exports = router;
