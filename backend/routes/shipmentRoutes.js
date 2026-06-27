const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const { permission } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createShipment, getShipments, getShipmentById, updateShipment, deleteShipment, updateShipmentStatus } = require('../controllers/shipmentController');

const bases = ['Base Alpha', 'Base Bravo', 'Base Charlie', 'Base Delta', 'Base Echo'];

router.use(auth);

router.get('/', permission('shipments', 'view'), getShipments);
router.get('/:id', permission('shipments', 'view'), getShipmentById);

router.post('/', permission('shipments', 'create'), [
  body('originBase').isIn(bases).withMessage('Invalid origin base'),
  body('destinationBase').isIn(bases).withMessage('Invalid destination base'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('dispatchDate').isISO8601().withMessage('Valid dispatch date is required'),
  validate
], createShipment);

router.put('/:id', permission('shipments', 'update'), updateShipment);
router.delete('/:id', permission('shipments', 'delete'), deleteShipment);

router.patch('/:id/status', permission('shipments', 'update'), [
  body('status').isIn(['Packed', 'Dispatched', 'In Transit', 'Delivered']).withMessage('Invalid status'),
  validate
], updateShipmentStatus);

module.exports = router;
