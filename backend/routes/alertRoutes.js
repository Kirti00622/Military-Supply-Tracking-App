const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { permission } = require('../middleware/roleMiddleware');
const { getAlerts, getCriticalAlerts, resolveAlert } = require('../controllers/alertController');

router.use(auth);

router.get('/', permission('alerts', 'view'), getAlerts);
router.get('/critical', permission('alerts', 'view'), getCriticalAlerts);
router.patch('/:id/resolve', permission('alerts', 'approve'), resolveAlert);

module.exports = router;
