const express = require('express');
const router = express.Router();
const { createTransaction, getTransactions, getTransaction, updateTransaction, deleteTransaction, getDashboardStats } = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { transactionValidation, validate } = require('../middleware/validate');

router.use(protect);
router.get('/dashboard', getDashboardStats);
router.route('/').get(getTransactions).post(transactionValidation, validate, createTransaction);
router.route('/:id').get(getTransaction).put(updateTransaction).delete(deleteTransaction);

module.exports = router;
