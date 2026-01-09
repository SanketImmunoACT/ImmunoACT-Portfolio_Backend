const JobReferral = require('../models/JobReferral');
const Career = require('../models/Career');
const { validationResult } = require('express-validator');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const multer = require('multer');
const path = require('path');

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// Create new job referral (Public endpoint)
const createReferral = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const referralData = {
      ...req.body,
      candidateResume: req.file ? req.file.path : null
    };

    const referral = await JobReferral.create(referralData);

    logger.info('Job referral created', {
      referralId: referral.id,
      referrerEmail: referral.referrerEmail,
      jobTitle: referral.jobTitle
    });

    res.status(201).json({
      success: true,
      message: 'Job referral submitted successfully',
      data: {
        id: referral.id,
        jobTitle: referral.jobTitle,
        status: referral.status
      }
    });

  } catch (error) {
    logger.error('Error creating job referral:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit job referral',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all referrals (Admin only)
const getAllReferrals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      department,
      urgency,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status) where.status = status;
    if (department) where.department = department;
    if (urgency) where.urgency = urgency;
    if (search) {
      where[Op.or] = [
        { jobTitle: { [Op.like]: `%${search}%` } },
        { referrerName: { [Op.like]: `%${search}%` } },
        { candidateName: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await JobReferral.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
    });

    // Get statistics
    const stats = await JobReferral.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Pending' THEN 1 ELSE 0 END")), 'pending'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END")), 'underReview'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Approved' THEN 1 ELSE 0 END")), 'approved'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Converted to Job' THEN 1 ELSE 0 END")), 'converted']
      ],
      raw: true
    });

    const responseData = {
      referrals: rows.map(row => row.toJSON ? row.toJSON() : row),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: page * limit < count,
        hasPrev: page > 1
      },
      stats: stats[0]
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Error fetching job referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job referrals',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get single referral (Admin only)
const getReferralById = async (req, res) => {
  try {
    const { id } = req.params;

    const referral = await JobReferral.findByPk(id, {
      include: [
        {
          model: Career,
          as: 'convertedJob',
          required: false
        }
      ]
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Job referral not found'
      });
    }

    res.json({
      success: true,
      data: referral
    });

  } catch (error) {
    logger.error('Error fetching job referral:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job referral',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update referral status (Admin only)
const updateReferralStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, hrNotes, priority } = req.body;

    const referral = await JobReferral.findByPk(id);
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Job referral not found'
      });
    }

    const updateData = {
      status,
      hrNotes,
      priority,
      reviewedBy: req.user.name,
      reviewedAt: new Date()
    };

    await referral.update(updateData);

    logger.info('Job referral updated', {
      referralId: id,
      newStatus: status,
      reviewedBy: req.user.name
    });

    res.json({
      success: true,
      message: 'Job referral updated successfully',
      data: referral
    });

  } catch (error) {
    logger.error('Error updating job referral:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job referral',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Convert referral to job posting (Admin only)
const convertToJob = async (req, res) => {
  try {
    const { id } = req.params;
    const jobData = req.body;

    const referral = await JobReferral.findByPk(id);
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Job referral not found'
      });
    }

    // Create new job posting based on referral
    const newJob = await Career.create({
      title: jobData.title || referral.jobTitle,
      description: jobData.description || referral.jobDescription,
      department: jobData.department || referral.department,
      location: jobData.location || referral.location,
      employmentType: jobData.employmentType || referral.employmentType,
      experienceLevel: jobData.experienceLevel || referral.experienceLevel,
      salaryRange: jobData.salaryRange || referral.salaryRange,
      requirements: jobData.requirements || [],
      responsibilities: jobData.responsibilities || [],
      benefits: jobData.benefits || [],
      status: 'Active',
      postedBy: req.user.id,
      source: 'Employee Referral'
    });

    // Update referral with conversion info
    await referral.update({
      status: 'Converted to Job',
      convertedToJobId: newJob.id,
      reviewedBy: req.user.name,
      reviewedAt: new Date()
    });

    logger.info('Job referral converted to job posting', {
      referralId: id,
      jobId: newJob.id,
      convertedBy: req.user.name
    });

    res.json({
      success: true,
      message: 'Job referral converted to job posting successfully',
      data: {
        referral,
        job: newJob
      }
    });

  } catch (error) {
    logger.error('Error converting referral to job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert referral to job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete referral (Admin only)
const deleteReferral = async (req, res) => {
  try {
    const { id } = req.params;

    const referral = await JobReferral.findByPk(id);
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Job referral not found'
      });
    }

    await referral.destroy();

    logger.info('Job referral deleted', {
      referralId: id,
      deletedBy: req.user.name
    });

    res.json({
      success: true,
      message: 'Job referral deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting job referral:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job referral',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  createReferral,
  getAllReferrals,
  getReferralById,
  updateReferralStatus,
  convertToJob,
  deleteReferral,
  upload
};