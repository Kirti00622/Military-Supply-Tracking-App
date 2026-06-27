const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const { permission } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validationMiddleware');
const { createInventory, getInventory, getInventoryById, updateInventory, deleteInventory } = require('../controllers/inventoryController');

const bases = ['Base Alpha', 'Base Bravo', 'Base Charlie', 'Base Delta', 'Base Echo'];
const categories = ['Food Packs', 'Medical Kits', 'Fuel Supplies', 'Uniforms', 'Equipment Parts'];

router.use(auth);

router.get('/', permission('inventory', 'view'), getInventory);
router.get('/:id', permission('inventory', 'view'), getInventoryById);

router.post('/', permission('inventory', 'create'), [
  body('itemName').trim().notEmpty().withMessage('Item name is required'),
  body('category').isIn(categories).withMessage('Invalid category'),
  body('quantity').isNumeric().withMessage('Quantity must be a number'),
  body('minimumThreshold').isNumeric().withMessage('Minimum threshold must be a number'),
  body('locationBase').isIn(bases).withMessage('Invalid base location'),
  validate
], createInventory);

router.put('/:id', permission('inventory', 'update'), updateInventory);
router.delete('/:id', permission('inventory', 'delete'), deleteInventory);

module.exports = router;
