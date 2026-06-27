const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getDashboardSummary, getRoleDashboard } = require('../controllers/dashboardController');

router.get('/summary', auth, getDashboardSummary);
router.get('/role', auth, getRoleDashboard);

module.exports = router;
