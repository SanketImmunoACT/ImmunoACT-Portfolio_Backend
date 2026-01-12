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
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status) where.status = status;
    if (department) where.department = department;
    if (search) {
      const searchTerm = search.toLowerCase();
      where[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('jobTitle')), 'LIKE', `%${searchTerm}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('referrerName')), 'LIKE', `%${searchTerm}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('candidateName')), 'LIKE', `%${searchTerm}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('referrerEmail')), 'LIKE', `%${searchTerm}%`),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('department')), 'LIKE', `%${searchTerm}%`)
      ];
    }

    const { count, rows } = await JobReferral.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: []
    });

    // Get statistics
    const stats = await JobReferral.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalReferrals'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Pending' THEN 1 ELSE 0 END")), 'pendingReferrals'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END")), 'underReviewReferrals'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'Approved' THEN 1 ELSE 0 END")), 'approvedReferrals']
      ],
      raw: true
    });

    // Ensure all values are numbers
    const statsData = {
      totalReferrals: parseInt(stats[0].totalReferrals) || 0,
      pendingReferrals: parseInt(stats[0].pendingReferrals) || 0,
      underReviewReferrals: parseInt(stats[0].underReviewReferrals) || 0,
      approvedReferrals: parseInt(stats[0].approvedReferrals) || 0
    };

    const responseData = {
      referrals: rows.map(row => row.toJSON ? row.toJSON() : row),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: page * limit < count,
        hasPrev: page > 1
      },
      stats: statsData
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
      include: []
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
  deleteReferral,
  upload
};