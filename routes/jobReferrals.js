const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createReferral,
  getAllReferrals,
  getReferralById,
  updateReferralStatus,
  deleteReferral,
  upload
} = require('../controllers/jobReferralController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Validation rules for creating referral
const createReferralValidation = [
  body('referrerName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Referrer name must be between 2 and 100 characters'),
  
  body('referrerEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid referrer email is required'),
  
  body('referrerEmployeeId')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Employee ID is required'),
  
  body('jobTitle')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Job title must be between 2 and 200 characters'),
  
  body('jobDescription')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters if provided'),
  
  body('department')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department is required'),
  
  body('employmentType')
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship'])
    .withMessage('Invalid employment type'),
  
  body('experienceLevel')
    .isIn(['Entry Level', 'Mid Level', 'Senior Level', 'Executive'])
    .withMessage('Invalid experience level'),
  
  body('candidateEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid candidate email is required if provided')
];

// Public Routes (No authentication required)

// POST /api/v1/job-referrals - Create new referral (Public)
router.post('/', 
  upload.single('candidateResume'),
  createReferralValidation,
  createReferral
);

// Admin Routes (Authentication required)

// GET /api/v1/job-referrals - Get all referrals (Admin only)
router.get('/', 
  authenticateToken,
  authorize('super_admin', 'hr_manager', 'office_executive'),
  getAllReferrals
);

// GET /api/v1/job-referrals/:id - Get single referral (Admin only)
router.get('/:id',
  authenticateToken,
  authorize('super_admin', 'hr_manager', 'office_executive'),
  getReferralById
);

// PUT /api/v1/job-referrals/:id/status - Update referral status (Admin only)
router.put('/:id/status',
  authenticateToken,
  authorize('super_admin', 'hr_manager', 'office_executive'),
  [
    body('status')
      .isIn(['Pending', 'Under Review', 'Approved', 'Rejected'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['Low', 'Medium', 'High'])
      .withMessage('Invalid priority')
  ],
  updateReferralStatus
);

// DELETE /api/v1/job-referrals/:id - Delete referral (Admin only)
router.delete('/:id',
  authenticateToken,
  authorize('super_admin'),
  deleteReferral
);

module.exports = router;