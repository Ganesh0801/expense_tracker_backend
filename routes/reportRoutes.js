// reportRoutes.js
const express = require('express');
const router = express.Router();
const { downloadMonthlyReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/monthly/:month/:year', downloadMonthlyReport);
module.exports = router;
