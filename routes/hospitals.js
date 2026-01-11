const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const { authenticateToken, authorize } = require('../middleware/auth');

// Validation middleware
const validateLocationSearch = [
  query('location')
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),
  
  query('radius')
    .optional()
    .isFloat({ min: 1, max: 1500 })
    .withMessage('Radius must be between 1 and 1500 km'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('services')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every(service => typeof service === 'string');
      }
      return false;
    })
    .withMessage('Services must be a string or array of strings'),
  
  handleValidationErrors
];

const validateHospitalCreation = [
  body('name')
    .notEmpty()
    .withMessage('Hospital name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  
  body('address')
    .notEmpty()
    .withMessage('Address is required'),
  
  body('city')
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  body('state')
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[\+]?[0-9\s\-\(\)]+$/)
    .withMessage('Invalid phone number format'),
  
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('website')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Invalid website URL'),
  
  body('type')
    .optional()
    .isIn(['Private', 'Government'])
    .withMessage('Type must be either Private or Government'),
  
  handleValidationErrors
];

const validateHospitalId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid hospital ID'),
  
  handleValidationErrors
];

// Public routes
/**
 * @route   GET /api/hospitals/search
 * @desc    Search hospitals by location and radius
 * @access  Public
 * @params  location (required), radius (optional, default: 50), limit (optional, default: 20), services (optional)
 */
router.get('/search', validateLocationSearch, hospitalController.searchByLocation);

/**
 * @route   GET /api/hospitals/stats
 * @desc    Get hospital statistics
 * @access  Admin only
 */
router.get('/stats', 
  authenticateToken, 
  authorize('super_admin', 'office_executive', 'hr_manager'), 
  hospitalController.getHospitalStats
);

/**
 * @route   GET /api/hospitals
 * @desc    Get all hospitals with optional filters
 * @access  Public
 * @params  city, state, services, limit, offset
 */
router.get('/', hospitalController.getAllHospitals);

/**
 * @route   GET /api/hospitals/:id
 * @desc    Get hospital by ID
 * @access  Public
 */
router.get('/:id', validateHospitalId, hospitalController.getHospitalById);

// Admin routes (require authentication)
/**
 * @route   POST /api/hospitals
 * @desc    Create new hospital
 * @access  Admin only
 */
router.post('/', 
  authenticateToken, 
  authorize('super_admin', 'office_executive'), 
  validateHospitalCreation, 
  hospitalController.createHospital
);

/**
 * @route   PUT /api/hospitals/:id
 * @desc    Update hospital
 * @access  Admin only
 */
router.put('/:id', 
  authenticateToken, 
  authorize('super_admin', 'office_executive'), 
  validateHospitalId, 
  validateHospitalCreation, 
  hospitalController.updateHospital
);

/**
 * @route   DELETE /api/hospitals/:id
 * @desc    Delete hospital (soft delete by default, permanent with ?permanent=true)
 * @access  Admin only
 */
router.delete('/:id', 
  authenticateToken, 
  authorize('super_admin'), 
  validateHospitalId, 
  hospitalController.deleteHospital
);

/**
 * @route   PUT /api/hospitals/:id/restore
 * @desc    Restore soft-deleted hospital
 * @access  Admin only
 */
router.put('/:id/restore', 
  authenticateToken, 
  authorize('super_admin'), 
  validateHospitalId, 
  hospitalController.restoreHospital
);

/**
 * @route   GET /api/hospitals/deleted
 * @desc    Get all soft-deleted hospitals
 * @access  Admin only
 */
router.get('/deleted', 
  authenticateToken, 
  authorize('super_admin'), 
  hospitalController.getDeletedHospitals
);

module.exports = router;