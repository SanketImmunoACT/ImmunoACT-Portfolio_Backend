const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getAllPublications,
  getPublicationById,
  createPublication,
  updatePublication,
  deletePublication,
  bulkUpdateStatus,
  getPublicationStats
} = require('../controllers/publicationController');
const {
  authenticateToken,
  requirePermission
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createPublicationValidation = [
  body('title')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Title must be between 1 and 1000 characters')
    .trim(),
  body('authors')
    .isLength({ min: 1 })
    .withMessage('Authors field is required')
    .trim(),
  body('journal')
    .isLength({ min: 1, max: 300 })
    .withMessage('Journal must be between 1 and 300 characters')
    .trim(),
  body('url')
    .isURL()
    .withMessage('URL must be a valid URL'),
  body('publishedDate')
    .isISO8601()
    .withMessage('Published date must be a valid date'),
  body('category')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must be between 1 and 100 characters')
    .trim(),
  body('buttonText')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Button text must be between 1 and 50 characters')
    .trim(),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be one of: draft, published, archived'),
  body('abstract')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Abstract must not exceed 5000 characters')
    .trim(),
  body('doi')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('DOI must be between 1 and 200 characters')
    .trim(),
  body('pmid')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('PMID must be between 1 and 50 characters')
    .trim(),
  body('imageUrl')
    .optional()
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
    .trim(),
  body('impactFactor')
    .optional()
    .isFloat({ min: 0, max: 999.999 })
    .withMessage('Impact factor must be a number between 0 and 999.999')
];

const updatePublicationValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Title must be between 1 and 1000 characters')
    .trim(),
  body('authors')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Authors field cannot be empty')
    .trim(),
  body('journal')
    .optional()
    .isLength({ min: 1, max: 300 })
    .withMessage('Journal must be between 1 and 300 characters')
    .trim(),
  body('url')
    .optional()
    .isURL()
    .withMessage('URL must be a valid URL'),
  body('publishedDate')
    .optional()
    .isISO8601()
    .withMessage('Published date must be a valid date'),
  body('category')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must be between 1 and 100 characters')
    .trim(),
  body('buttonText')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Button text must be between 1 and 50 characters')
    .trim(),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be one of: draft, published, archived'),
  body('abstract')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Abstract must not exceed 5000 characters')
    .trim(),
  body('doi')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('DOI must be between 1 and 200 characters')
    .trim(),
  body('pmid')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('PMID must be between 1 and 50 characters')
    .trim(),
  body('imageUrl')
    .optional()
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
    .trim(),
  body('impactFactor')
    .optional()
    .isFloat({ min: 0, max: 999.999 })
    .withMessage('Impact factor must be a number between 0 and 999.999')
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
    .withMessage('Publication ID must be a positive integer')
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
    .isIn(['title', 'publishedDate', 'journal', 'category', 'createdAt', 'updatedAt'])
    .withMessage('Sort by must be one of: title, publishedDate, journal, category, createdAt, updatedAt'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
];

// Routes
router.get('/', 
  authenticateToken, 
  requirePermission('publications', 'read'), 
  queryValidation, 
  getAllPublications
);

router.get('/stats', 
  authenticateToken, 
  requirePermission('publications', 'read'), 
  getPublicationStats
);

router.get('/:id', 
  authenticateToken, 
  requirePermission('publications', 'read'), 
  idValidation, 
  getPublicationById
);

router.post('/', 
  authenticateToken, 
  requirePermission('publications', 'create'), 
  createPublicationValidation, 
  createPublication
);

router.put('/:id', 
  authenticateToken, 
  requirePermission('publications', 'update'), 
  idValidation, 
  updatePublicationValidation, 
  updatePublication
);

router.delete('/:id', 
  authenticateToken, 
  requirePermission('publications', 'delete'), 
  idValidation, 
  deletePublication
);

router.patch('/bulk-update', 
  authenticateToken, 
  requirePermission('publications', 'update'), 
  bulkUpdateValidation, 
  bulkUpdateStatus
);

module.exports = router;