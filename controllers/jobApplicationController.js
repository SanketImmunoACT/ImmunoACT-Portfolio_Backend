const { JobApplication, Career } = require('../models');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/resumes';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only PDF, DOC, DOCX files
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Submit job application (public endpoint)
const submitApplication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      jobId,
      name,
      email,
      phone,
      currentLocation,
      currentDesignation,
      currentLastOrganisation,
      highestEducation,
      noticePeriod,
      comfortableToRelocate,
      totalExperience,
      reasonForJobChange,
      coverLetter
    } = req.body;

    // Check if job exists and is active
    const job = await Career.findByPk(jobId);
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'The specified job posting does not exist'
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        error: 'Job not available',
        message: 'This job posting is not currently accepting applications'
      });
    }

    // Check if user already applied for this job
    const existingApplication = await JobApplication.findOne({
      where: {
        jobId,
        email
      }
    });

    if (existingApplication) {
      return res.status(400).json({
        error: 'Already applied',
        message: 'You have already submitted an application for this position'
      });
    }

    // Handle resume file upload
    let resumeUrl = null;
    if (req.file) {
      resumeUrl = req.file.path;
    }

    const application = await JobApplication.create({
      jobId,
      name,
      email,
      phone,
      currentLocation,
      currentDesignation,
      currentLastOrganisation,
      highestEducation,
      noticePeriod,
      comfortableToRelocate: comfortableToRelocate === 'true' || comfortableToRelocate === true,
      totalExperience,
      reasonForJobChange,
      resumeUrl,
      coverLetter,
      status: 'New'
    });

    logger.info('Job application submitted', {
      applicationId: application.id,
      jobId,
      applicantEmail: email,
      applicantName: name
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: application.toPublicObject()
    });

  } catch (error) {
    logger.error('Submit application error:', error);
    res.status(500).json({
      error: 'Failed to submit application',
      message: 'Internal server error'
    });
  }
};

// Get all job applications (admin only)
const getAllApplications = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      jobId,
      search,
      sortBy = 'appliedAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (jobId) {
      whereClause.jobId = jobId;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { currentDesignation: { [Op.like]: `%${search}%` } },
        { currentLastOrganisation: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: applications } = await JobApplication.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Career,
          as: 'job',
          attributes: ['id', 'title', 'department']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    logger.auditLog('JOB_APPLICATIONS_VIEWED', req.user.username, {
      filters: { status, jobId, search },
      resultCount: applications.length,
      ip: req.ip
    }, req);

    res.json({
      success: true,
      applications: applications.map(item => item.toSafeObject()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: offset + applications.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get all applications error:', error);
    res.status(500).json({
      error: 'Failed to fetch applications',
      message: 'Internal server error'
    });
  }
};

// Get application by ID (admin only)
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await JobApplication.findByPk(id, {
      include: [
        {
          model: Career,
          as: 'job',
          attributes: ['id', 'title', 'department']
        }
      ]
    });

    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: 'Application with the specified ID does not exist'
      });
    }

    logger.auditLog('JOB_APPLICATION_VIEWED', req.user.username, {
      applicationId: id,
      applicantName: application.name,
      ip: req.ip
    }, req);

    res.json({
      success: true,
      application: application.toSafeObject()
    });

  } catch (error) {
    logger.error('Get application by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch application',
      message: 'Internal server error'
    });
  }
};

// Update application status (admin only)
const updateApplicationStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const application = await JobApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: 'Application with the specified ID does not exist'
      });
    }

    const oldStatus = application.status;
    await application.update({ status });

    logger.auditLog('JOB_APPLICATION_STATUS_UPDATED', req.user.username, {
      applicationId: id,
      applicantName: application.name,
      oldStatus,
      newStatus: status,
      ip: req.ip
    }, req);

    res.json({
      success: true,
      message: 'Application status updated successfully',
      application: application.toSafeObject()
    });

  } catch (error) {
    logger.error('Update application status error:', error);
    res.status(500).json({
      error: 'Failed to update application status',
      message: 'Internal server error'
    });
  }
};

// Delete application (admin only)
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await JobApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: 'Application with the specified ID does not exist'
      });
    }

    // Delete resume file if exists
    if (application.resumeUrl && fs.existsSync(application.resumeUrl)) {
      fs.unlinkSync(application.resumeUrl);
    }

    await application.destroy();

    logger.auditLog('JOB_APPLICATION_DELETED', req.user.username, {
      applicationId: id,
      applicantName: application.name,
      ip: req.ip
    }, req);

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });

  } catch (error) {
    logger.error('Delete application error:', error);
    res.status(500).json({
      error: 'Failed to delete application',
      message: 'Internal server error'
    });
  }
};

// Get application statistics (admin only)
const getApplicationStats = async (req, res) => {
  try {
    const statusStats = await JobApplication.findAll({
      attributes: [
        'status',
        [JobApplication.sequelize.fn('COUNT', JobApplication.sequelize.col('JobApplication.id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const jobStats = await JobApplication.findAll({
      attributes: [
        'jobId',
        [JobApplication.sequelize.fn('COUNT', JobApplication.sequelize.col('JobApplication.id')), 'count']
      ],
      include: [
        {
          model: Career,
          as: 'job',
          attributes: ['title']
        }
      ],
      group: ['jobId', 'job.id'],
      raw: true
    });

    const totalApplications = await JobApplication.count();
    const newApplications = await JobApplication.count({ where: { status: 'New' } });
    const shortlistedApplications = await JobApplication.count({ where: { status: 'Shortlisted' } });
    const hiredApplications = await JobApplication.count({ where: { status: 'Hired' } });

    logger.auditLog('JOB_APPLICATIONS_STATS_VIEWED', req.user.username, {
      ip: req.ip
    }, req);

    res.json({
      success: true,
      statusDistribution: statusStats,
      jobDistribution: jobStats,
      totalApplications,
      newApplications,
      shortlistedApplications,
      hiredApplications
    });

  } catch (error) {
    logger.error('Get application stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch application statistics',
      message: 'Internal server error'
    });
  }
};

// Download resume file (admin only)
const downloadResume = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await JobApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: 'Application with the specified ID does not exist'
      });
    }

    if (!application.resumeUrl || !fs.existsSync(application.resumeUrl)) {
      return res.status(404).json({
        error: 'Resume not found',
        message: 'Resume file does not exist'
      });
    }

    logger.auditLog('RESUME_DOWNLOADED', req.user.username, {
      applicationId: id,
      applicantName: application.name,
      ip: req.ip
    }, req);

    res.download(application.resumeUrl, `${application.name}_resume${path.extname(application.resumeUrl)}`);

  } catch (error) {
    logger.error('Download resume error:', error);
    res.status(500).json({
      error: 'Failed to download resume',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStats,
  downloadResume,
  upload
};