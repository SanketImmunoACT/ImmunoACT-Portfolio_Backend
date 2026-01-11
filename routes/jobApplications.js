const express = require('express');
const { body, param, query } = require('express-validator');
const {
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStats,
  downloadResume,
  upload
} = require('../controllers/jobApplicationController');
const {
  authenticateToken,
  authorize
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const submitApplicationValidation = [
  body('jobId')
    .isInt({ min: 1 })
    .withMessage('Job ID must be a positive integer'),
  body('name')
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1 and 200 characters')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .isLength({ min: 1, max: 20 })
    .withMessage('Phone number must be between 1 and 20 characters')
    .trim(),
  body('currentLocation')
    .isLength({ min: 1, max: 200 })
    .withMessage('Current location must be between 1 and 200 characters')
    .trim(),
  body('currentDesignation')
    .isLength({ min: 1, max: 200 })
    .withMessage('Current designation must be between 1 and 200 characters')
    .trim(),
  body('currentLastOrganisation')
    .isLength({ min: 1, max: 200 })
    .withMessage('Current/Last organisation must be between 1 and 200 characters')
    .trim(),
  body('highestEducation')
    .isLength({ min: 1, max: 200 })
    .withMessage('Highest education must be between 1 and 200 characters')
    .trim(),
  body('noticePeriod')
    .isLength({ min: 1, max: 100 })
    .withMessage('Notice period must be between 1 and 100 characters')
    .trim(),
  body('comfortableToRelocate')
    .isBoolean()
    .withMessage('Comfortable to relocate must be a boolean value'),
  body('totalExperience')
    .isLength({ min: 1, max: 100 })
    .withMessage('Total experience must be between 1 and 100 characters')
    .trim(),
  body('reasonForJobChange')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Reason for job change must not exceed 1000 characters')
    .trim(),
  body('coverLetter')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Cover letter must not exceed 2000 characters')
    .trim()
];

const updateStatusValidation = [
  body('status')
    .isIn(['New', 'Reviewing', 'Shortlisted', 'Interviewed', 'Rejected', 'Hired', 'Withdrawn'])
    .withMessage('Status must be one of: New, Reviewing, Shortlisted, Interviewed, Rejected, Hired, Withdrawn')
];

const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Application ID must be a positive integer')
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
    .isIn(['New', 'Reviewing', 'Shortlisted', 'Interviewed', 'Rejected', 'Hired', 'Withdrawn'])
    .withMessage('Status must be one of: New, Reviewing, Shortlisted, Interviewed, Rejected, Hired, Withdrawn'),
  query('jobId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Job ID must be a positive integer'),
  query('sortBy')
    .optional()
    .isIn(['name', 'email', 'appliedAt', 'status', 'currentDesignation'])
    .withMessage('Sort by must be one of: name, email, appliedAt, status, currentDesignation'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
];

// Routes

// Public route for submitting applications (no authentication required)
router.post('/submit', 
  upload.single('resume'),
  submitApplicationValidation, 
  submitApplication
);

// Admin routes (authentication required)
router.get('/', 
  authenticateToken, 
  authorize('super_admin', 'hr_manager'), 
  queryValidation, 
  getAllApplications
);

router.get('/stats', 
  authenticateToken, 
  authorize('super_admin', 'hr_manager'), 
  getApplicationStats
);

router.get('/:id', 
  authenticateToken, 
  authorize('super_admin', 'hr_manager'), 
  idValidation, 
  getApplicationById
);

router.put('/:id/status', 
  authenticateToken, 
  authorize('super_admin', 'hr_manager'), 
  idValidation, 
  updateStatusValidation, 
  updateApplicationStatus
);

router.delete('/:id', 
  authenticateToken, 
  authorize('super_admin'), 
  idValidation, 
  deleteApplication
);

router.get('/:id/resume', 
  authenticateToken, 
  authorize('super_admin', 'hr_manager'), 
  idValidation, 
  downloadResume
);

module.exports = router;