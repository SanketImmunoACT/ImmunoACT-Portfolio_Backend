const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getAllCareers,
  getCareerById,
  createCareer,
  updateCareer,
  deleteCareer,
  bulkUpdateStatus,
  getCareerStats
} = require('../controllers/careerController');
const {
  authenticateToken,
  requirePermission
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createCareerValidation = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('department')
    .isLength({ min: 1, max: 100 })
    .withMessage('Department must be between 1 and 100 characters')
    .trim(),
  body('location')
    .isLength({ min: 1, max: 200 })
    .withMessage('Location must be between 1 and 200 characters')
    .trim(),
  body('employmentType')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship', 'temporary'])
    .withMessage('Employment type must be one of: full-time, part-time, contract, internship, temporary'),
  body('experienceLevel')
    .optional()
    .isIn(['entry-level', 'mid-level', 'senior-level', 'executive', 'internship'])
    .withMessage('Experience level must be one of: entry-level, mid-level, senior-level, executive, internship'),
  body('salaryRange')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Salary range must not exceed 100 characters')
    .trim(),
  body('description')
    .isLength({ min: 1 })
    .withMessage('Description is required')
    .trim(),
  body('responsibilities')
    .optional()
    .isArray()
    .withMessage('Responsibilities must be an array'),
  body('responsibilities.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each responsibility must be between 1 and 500 characters'),
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  body('requirements.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each requirement must be between 1 and 500 characters'),
  body('qualifications')
    .optional()
    .isArray()
    .withMessage('Qualifications must be an array'),
  body('qualifications.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each qualification must be between 1 and 500 characters'),
  body('benefits')
    .optional()
    .isArray()
    .withMessage('Benefits must be an array'),
  body('benefits.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each benefit must be between 1 and 200 characters'),
  body('applicationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Application deadline must be a valid date'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'paused', 'closed', 'archived'])
    .withMessage('Status must be one of: draft, active, paused, closed, archived'),
  body('isRemote')
    .optional()
    .isBoolean()
    .withMessage('isRemote must be a boolean value'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('applicationEmail')
    .optional()
    .isEmail()
    .withMessage('Application email must be a valid email address'),
  body('applicationUrl')
    .optional()
    .isURL()
    .withMessage('Application URL must be a valid URL'),
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
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Urgency must be one of: low, medium, high, urgent'),
  body('workSchedule')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Work schedule must not exceed 200 characters')
    .trim(),
  body('travelRequired')
    .optional()
    .isBoolean()
    .withMessage('travelRequired must be a boolean value')
];

const updateCareerValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('department')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department must be between 1 and 100 characters')
    .trim(),
  body('location')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Location must be between 1 and 200 characters')
    .trim(),
  body('employmentType')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship', 'temporary'])
    .withMessage('Employment type must be one of: full-time, part-time, contract, internship, temporary'),
  body('experienceLevel')
    .optional()
    .isIn(['entry-level', 'mid-level', 'senior-level', 'executive', 'internship'])
    .withMessage('Experience level must be one of: entry-level, mid-level, senior-level, executive, internship'),
  body('salaryRange')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Salary range must not exceed 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Description cannot be empty')
    .trim(),
  body('responsibilities')
    .optional()
    .isArray()
    .withMessage('Responsibilities must be an array'),
  body('responsibilities.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each responsibility must be between 1 and 500 characters'),
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  body('requirements.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each requirement must be between 1 and 500 characters'),
  body('qualifications')
    .optional()
    .isArray()
    .withMessage('Qualifications must be an array'),
  body('qualifications.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Each qualification must be between 1 and 500 characters'),
  body('benefits')
    .optional()
    .isArray()
    .withMessage('Benefits must be an array'),
  body('benefits.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each benefit must be between 1 and 200 characters'),
  body('applicationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Application deadline must be a valid date'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'paused', 'closed', 'archived'])
    .withMessage('Status must be one of: draft, active, paused, closed, archived'),
  body('isRemote')
    .optional()
    .isBoolean()
    .withMessage('isRemote must be a boolean value'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('applicationEmail')
    .optional()
    .isEmail()
    .withMessage('Application email must be a valid email address'),
  body('applicationUrl')
    .optional()
    .isURL()
    .withMessage('Application URL must be a valid URL'),
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
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Urgency must be one of: low, medium, high, urgent'),
  body('workSchedule')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Work schedule must not exceed 200 characters')
    .trim(),
  body('travelRequired')
    .optional()
    .isBoolean()
    .withMessage('travelRequired must be a boolean value')
];

const bulkUpdateValidation = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('IDs array is required and cannot be empty'),
  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('Each ID must be a positive integer'),
  body('status')
    .isIn(['draft', 'active', 'paused', 'closed', 'archived'])
    .withMessage('Status must be one of: draft, active, paused, closed, archived')
];

const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Career ID must be a positive integer')
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
    .isIn(['draft', 'active', 'paused', 'closed', 'archived'])
    .withMessage('Status must be one of: draft, active, paused, closed, archived'),
  query('employmentType')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship', 'temporary'])
    .withMessage('Employment type must be one of: full-time, part-time, contract, internship, temporary'),
  query('experienceLevel')
    .optional()
    .isIn(['entry-level', 'mid-level', 'senior-level', 'executive', 'internship'])
    .withMessage('Experience level must be one of: entry-level, mid-level, senior-level, executive, internship'),
  query('isRemote')
    .optional()
    .isBoolean()
    .withMessage('isRemote must be a boolean value'),
  query('sortBy')
    .optional()
    .isIn(['title', 'department', 'location', 'createdAt', 'updatedAt', 'applicationDeadline'])
    .withMessage('Sort by must be one of: title, department, location, createdAt, updatedAt, applicationDeadline'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
];

// Routes
router.get('/', 
  authenticateToken, 
  requirePermission('careers', 'read'), 
  queryValidation, 
  getAllCareers
);

router.get('/stats', 
  authenticateToken, 
  requirePermission('careers', 'read'), 
  getCareerStats
);

router.get('/:id', 
  authenticateToken, 
  requirePermission('careers', 'read'), 
  idValidation, 
  getCareerById
);

router.post('/', 
  authenticateToken, 
  requirePermission('careers', 'create'), 
  createCareerValidation, 
  createCareer
);

router.put('/:id', 
  authenticateToken, 
  requirePermission('careers', 'update'), 
  idValidation, 
  updateCareerValidation, 
  updateCareer
);

router.delete('/:id', 
  authenticateToken, 
  requirePermission('careers', 'delete'), 
  idValidation, 
  deleteCareer
);

router.patch('/bulk-update', 
  authenticateToken, 
  requirePermission('careers', 'update'), 
  bulkUpdateValidation, 
  bulkUpdateStatus
);

module.exports = router;