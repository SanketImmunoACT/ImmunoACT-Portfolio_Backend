const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createReferral,
  getAllReferrals,
  getReferralById,
  updateReferralStatus,
  convertToJob,
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
  
  body('jobTitle')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Job title must be between 2 and 200 characters'),
  
  body('jobDescription')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters'),
  
  body('department')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department is required'),
  
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location is required'),
  
  body('employmentType')
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship'])
    .withMessage('Invalid employment type'),
  
  body('experienceLevel')
    .isIn(['Entry Level', 'Mid Level', 'Senior Level', 'Executive'])
    .withMessage('Invalid experience level'),
  
  body('urgency')
    .isIn(['Low', 'Medium', 'High', 'Urgent'])
    .withMessage('Invalid urgency level'),
  
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
  authorize('super_admin', 'hr_manager'),
  getAllReferrals
);

// GET /api/v1/job-referrals/stats - Get referral statistics (Admin only)
router.get('/stats',
  authenticateToken,
  authorize('super_admin', 'hr_manager'),
  async (req, res) => {
    try {
      const JobReferral = require('../models/JobReferral');
      const { sequelize } = require('../config/database');
      
      const stats = await JobReferral.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalReferrals'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Pending' THEN 1 ELSE 0 END")), 'pendingReferrals'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END")), 'underReviewReferrals'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Approved' THEN 1 ELSE 0 END")), 'approvedReferrals'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Converted to Job' THEN 1 ELSE 0 END")), 'convertedReferrals'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN urgency = 'High' OR urgency = 'Urgent' THEN 1 ELSE 0 END")), 'urgentReferrals']
        ],
        raw: true
      });

      res.json({
        success: true,
        data: stats[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch referral statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// GET /api/v1/job-referrals/:id - Get single referral (Admin only)
router.get('/:id',
  authenticateToken,
  authorize('super_admin', 'hr_manager'),
  getReferralById
);

// PUT /api/v1/job-referrals/:id/status - Update referral status (Admin only)
router.put('/:id/status',
  authenticateToken,
  authorize('super_admin', 'hr_manager'),
  [
    body('status')
      .isIn(['Pending', 'Under Review', 'Approved', 'Rejected', 'Converted to Job'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['Low', 'Medium', 'High'])
      .withMessage('Invalid priority')
  ],
  updateReferralStatus
);

// POST /api/v1/job-referrals/:id/convert - Convert referral to job (Admin only)
router.post('/:id/convert',
  authenticateToken,
  authorize('super_admin', 'hr_manager'),
  convertToJob
);

// DELETE /api/v1/job-referrals/:id - Delete referral (Admin only)
router.delete('/:id',
  authenticateToken,
  authorize('super_admin'),
  deleteReferral
);

module.exports = router;