const express = require('express');
const { body, param } = require('express-validator');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/userController');
const {
  authenticateToken,
  requireSuperAdmin,
  authorize
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createUserValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers'),
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .trim(),
  body('lastName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .trim(),
  body('role')
    .optional()
    .isIn(['super_admin', 'office_executive', 'hr_manager'])
    .withMessage('Role must be one of: super_admin, office_executive, hr_manager')
];

const updateUserValidation = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .trim(),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .trim(),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['super_admin', 'office_executive', 'hr_manager'])
    .withMessage('Role must be one of: super_admin, office_executive, hr_manager'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
];

// Routes
router.get('/', authenticateToken, requireSuperAdmin, getAllUsers);
router.get('/stats', authenticateToken, requireSuperAdmin, getUserStats);
router.get('/:id', authenticateToken, authorize('super_admin', 'office_executive', 'hr_manager'), idValidation, getUserById);
router.post('/', authenticateToken, requireSuperAdmin, createUserValidation, createUser);
router.put('/:id', authenticateToken, authorize('super_admin', 'office_executive', 'hr_manager'), idValidation, updateUserValidation, updateUser);
router.delete('/:id', authenticateToken, requireSuperAdmin, idValidation, deleteUser);

module.exports = router;