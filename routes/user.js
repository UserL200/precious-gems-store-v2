const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/authMiddleware'); // your auth middleware

router.get('/user/balance', isAuthenticated, userController.getWithdrawalBalance);

module.exports = router;
