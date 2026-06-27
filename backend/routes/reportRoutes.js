const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { permission } = require('../middleware/roleMiddleware');
const { getInventoryReport, getShipmentReport, getUsageReport, exportCSV } = require('../controllers/reportController');

router.use(auth);

router.get('/inventory', permission('reports', 'view'), getInventoryReport);
router.get('/shipments', permission('reports', 'view'), getShipmentReport);
router.get('/usage', permission('reports', 'view'), getUsageReport);
router.get('/export/:type', permission('reports', 'view'), exportCSV);

module.exports = router;
