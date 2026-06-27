const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const { role } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validationMiddleware');
const { register, login, getProfile, updateProfile, getUsers, getUserById, updateUserRole, deleteUser } = require('../controllers/authController');

const validRoles = ['admin', 'supply-manager', 'base-officer', 'logistics-officer', 'warehouse-officer', 'transport-officer', 'inventory-manager', 'auditor', 'emergency-response-officer', 'viewer'];
const validBases = ['Base Alpha', 'Base Bravo', 'Base Charlie', 'Base Delta', 'Base Echo'];

router.post('/register', [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(validRoles).withMessage('Invalid role'),
  body('assignedBase').optional().isIn(validBases).withMessage('Invalid base'),
  validate
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], login);

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

// User Management (Admin only)
router.get('/users', auth, role('admin'), getUsers);
router.get('/users/:id', auth, role('admin'), getUserById);
router.put('/users/:id/role', auth, role('admin'), [
  body('role').isIn(validRoles).withMessage('Invalid role'),
  validate
], updateUserRole);
router.delete('/users/:id', auth, role('admin'), deleteUser);

module.exports = router;
