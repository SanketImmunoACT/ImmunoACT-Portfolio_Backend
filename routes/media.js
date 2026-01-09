const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getAllMedia,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
  bulkUpdateStatus,
  getMediaStats,
  getPublicMedia
} = require('../controllers/mediaController');
const {
  authenticateToken,
  authorize
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createMediaValidation = [
  body('title')
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters')
    .trim(),
  body('link')
    .isURL()
    .withMessage('Link must be a valid URL'),
  body('publishedDate')
    .isISO8601()
    .withMessage('Published date must be a valid date'),
  body('sourceName')
    .isLength({ min: 1, max: 200 })
    .withMessage('Source name must be between 1 and 200 characters')
    .trim(),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be one of: draft, published, archived'),
  body('excerpt')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Excerpt must not exceed 1000 characters')
    .trim(),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('metaTitle')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Meta title must not exceed 200 characters')
    .trim(),
  body('metaDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Meta description must not exceed 500 characters')
    .trim()
];

const updateMediaValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters')
    .trim(),
  body('link')
    .optional()
    .isURL()
    .withMessage('Link must be a valid URL'),
  body('publishedDate')
    .optional()
    .isISO8601()
    .withMessage('Published date must be a valid date'),
  body('sourceName')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Source name must be between 1 and 200 characters')
    .trim(),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be one of: draft, published, archived'),
  body('excerpt')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Excerpt must not exceed 1000 characters')
    .trim(),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('metaTitle')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Meta title must not exceed 200 characters')
    .trim(),
  body('metaDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Meta description must not exceed 500 characters')
    .trim()
];

const bulkUpdateValidation = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('IDs array is required and cannot be empty'),
  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('Each ID must be a positive integer'),
  body('status')
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be one of: draft, published, archived')
];

const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Media ID must be a positive integer')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be one of: draft, published, archived'),
  query('sortBy')
    .optional()
    .isIn(['title', 'publishedDate', 'sourceName', 'createdAt', 'updatedAt'])
    .withMessage('Sort by must be one of: title, publishedDate, sourceName, createdAt, updatedAt'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
];

// Routes

// Public route for published media (no authentication required)
router.get('/public', 
  queryValidation, 
  getPublicMedia
);

router.get('/', 
  authenticateToken, 
  authorize('super_admin', 'office_executive'), 
  queryValidation, 
  getAllMedia
);

router.get('/stats', 
  authenticateToken, 
  authorize('super_admin', 'office_executive'), 
  getMediaStats
);

router.get('/:id', 
  authenticateToken, 
  authorize('super_admin', 'office_executive'), 
  idValidation, 
  getMediaById
);

router.post('/', 
  authenticateToken, 
  authorize('super_admin', 'office_executive'), 
  createMediaValidation, 
  createMedia
);

router.put('/:id', 
  authenticateToken, 
  authorize('super_admin', 'office_executive'), 
  idValidation, 
  updateMediaValidation, 
  updateMedia
);

router.delete('/:id', 
  authenticateToken, 
  authorize('super_admin'), 
  idValidation, 
  deleteMedia
);

router.patch('/bulk-update', 
  authenticateToken, 
  authorize('super_admin', 'office_executive'), 
  bulkUpdateValidation, 
  bulkUpdateStatus
);

module.exports = router;