const Career = require('../models/Career');
const { User } = require('../models');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Get public careers (only active ones, no authentication required)
const getPublicCareers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      department, 
      employmentType,
      experienceLevel,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Build where clause - only show active careers for public
    const whereClause = {
      status: 'active'
    };
    
    if (department) {
      whereClause.department = { [Op.like]: `%${department}%` };
    }
    
    if (employmentType) {
      whereClause.employmentType = employmentType;
    }
    
    if (experienceLevel) {
      whereClause.experienceLevel = experienceLevel;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: careers } = await Career.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    res.json({
      careers: careers.map(item => item.toPublicObject()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: offset + careers.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get public careers error:', error);
    res.status(500).json({
      error: 'Failed to fetch careers',
      message: 'Internal server error'
    });
  }
};

const getAllCareers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      department, 
      employmentType,
      experienceLevel,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (department) {
      whereClause.department = { [Op.like]: `%${department}%` };
    }
    
    if (employmentType) {
      whereClause.employmentType = employmentType;
    }
    
    if (experienceLevel) {
      whereClause.experienceLevel = experienceLevel;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: careers } = await Career.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username']
        },
        {
          model: User,
          as: 'modifier',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    logger.auditLog('CAREERS_VIEWED', req.user.username, {
      filters: { status, department, employmentType, experienceLevel, search },
      resultCount: careers.length,
      ip: req.ip
    }, req);

    res.json({
      careers: careers.map(item => item.toSafeObject()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: offset + careers.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get all careers error:', error);
    res.status(500).json({
      error: 'Failed to fetch careers',
      message: 'Internal server error'
    });
  }
};

// Get career by ID
const getCareerById = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username']
        },
        {
          model: User,
          as: 'modifier',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    if (!career) {
      return res.status(404).json({
        error: 'Career not found',
        message: 'Career with the specified ID does not exist'
      });
    }

    logger.auditLog('CAREER_VIEWED', req.user.username, {
      careerId: id,
      careerTitle: career.title,
      ip: req.ip
    }, req);

    res.json({
      career: career.toSafeObject()
    });

  } catch (error) {
    logger.error('Get career by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch career',
      message: 'Internal server error'
    });
  }
};

// Create new career
const createCareer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      title,
      department,
      employmentType = 'full-time',
      experienceLevel = 'mid-level',
      responsibilities,
      requirements,
      qualifications,
      status = 'draft'
    } = req.body;

    const career = await Career.create({
      title,
      department,
      employmentType,
      experienceLevel,
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      desired_qualities: Array.isArray(requirements) ? requirements : [],
      qualifications: Array.isArray(qualifications) ? qualifications : [],
      status,
      createdBy: req.user.id,
      publishedBy: status === 'active' ? req.user.id : null,
      publishedAt: status === 'active' ? new Date() : null
    });

    logger.auditLog('CAREER_CREATED', req.user.username, {
      careerId: career.id,
      careerTitle: career.title,
      status: career.status,
      ip: req.ip
    }, req);

    res.status(201).json({
      message: 'Career created successfully',
      career: career.toSafeObject()
    });

  } catch (error) {
    logger.error('Create career error:', error);
    res.status(500).json({
      error: 'Failed to create career',
      message: 'Internal server error'
    });
  }
};

// Update career
const updateCareer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const {
      title,
      department,
      employmentType,
      experienceLevel,
      responsibilities,
      requirements,
      qualifications,
      status
    } = req.body;

    const career = await Career.findByPk(id);
    if (!career) {
      return res.status(404).json({
        error: 'Career not found',
        message: 'Career with the specified ID does not exist'
      });
    }

    // Track status change for audit
    const statusChanged = status && status !== career.status;
    const oldStatus = career.status;

    // Update career
    const updateData = {
      lastModifiedBy: req.user.id
    };
    
    if (title !== undefined) updateData.title = title;
    if (department !== undefined) updateData.department = department;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (experienceLevel !== undefined) updateData.experienceLevel = experienceLevel;
    if (responsibilities !== undefined) updateData.responsibilities = Array.isArray(responsibilities) ? responsibilities : [];
    if (requirements !== undefined) updateData.desired_qualities = Array.isArray(requirements) ? requirements : [];
    if (qualifications !== undefined) updateData.qualifications = Array.isArray(qualifications) ? qualifications : [];
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'active' && oldStatus !== 'active') {
        updateData.publishedBy = req.user.id;
        updateData.publishedAt = new Date();
      }
      if (status === 'closed' && oldStatus !== 'closed') {
        updateData.closedAt = new Date();
      }
    }

    await career.update(updateData);

    logger.auditLog('CAREER_UPDATED', req.user.username, {
      careerId: id,
      careerTitle: career.title,
      changes: Object.keys(updateData),
      statusChanged,
      oldStatus,
      newStatus: status,
      ip: req.ip
    }, req);

    res.json({
      message: 'Career updated successfully',
      career: career.toSafeObject()
    });

  } catch (error) {
    logger.error('Update career error:', error);
    res.status(500).json({
      error: 'Failed to update career',
      message: 'Internal server error'
    });
  }
};

// Delete career
const deleteCareer = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findByPk(id);
    if (!career) {
      return res.status(404).json({
        error: 'Career not found',
        message: 'Career with the specified ID does not exist'
      });
    }

    await career.destroy();

    logger.auditLog('CAREER_DELETED', req.user.username, {
      careerId: id,
      careerTitle: career.title,
      ip: req.ip
    }, req);

    res.json({
      message: 'Career deleted successfully'
    });

  } catch (error) {
    logger.error('Delete career error:', error);
    res.status(500).json({
      error: 'Failed to delete career',
      message: 'Internal server error'
    });
  }
};

// Bulk update status
const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'IDs array is required and cannot be empty'
      });
    }

    if (!['draft', 'active', 'paused', 'closed', 'archived'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: draft, active, paused, closed, archived'
      });
    }

    const updateData = {
      status,
      lastModifiedBy: req.user.id
    };

    if (status === 'active') {
      updateData.publishedBy = req.user.id;
      updateData.publishedAt = new Date();
    }

    if (status === 'closed') {
      updateData.closedAt = new Date();
    }

    const [updatedCount] = await Career.update(updateData, {
      where: {
        id: { [Op.in]: ids }
      }
    });

    logger.auditLog('CAREERS_BULK_UPDATE', req.user.username, {
      ids,
      status,
      updatedCount,
      ip: req.ip
    }, req);

    res.json({
      message: `${updatedCount} careers updated successfully`,
      updatedCount
    });

  } catch (error) {
    logger.error('Bulk update careers error:', error);
    res.status(500).json({
      error: 'Failed to update careers',
      message: 'Internal server error'
    });
  }
};

// Get career statistics
const getCareerStats = async (req, res) => {
  try {
    const stats = await Career.findAll({
      attributes: [
        'status',
        [Career.sequelize.fn('COUNT', Career.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const departmentStats = await Career.findAll({
      attributes: [
        'department',
        [Career.sequelize.fn('COUNT', Career.sequelize.col('id')), 'count']
      ],
      group: ['department'],
      raw: true
    });

    const employmentTypeStats = await Career.findAll({
      attributes: [
        'employmentType',
        [Career.sequelize.fn('COUNT', Career.sequelize.col('id')), 'count']
      ],
      group: ['employmentType'],
      raw: true
    });

    const totalCareers = await Career.count();
    const activeCareers = await Career.count({ where: { status: 'active' } });
    const draftCareers = await Career.count({ where: { status: 'draft' } });

    logger.auditLog('CAREERS_STATS_VIEWED', req.user.username, {
      ip: req.ip
    }, req);

    res.json({
      statusDistribution: stats,
      departmentDistribution: departmentStats,
      employmentTypeDistribution: employmentTypeStats,
      totalCareers,
      activeCareers,
      draftCareers,
      closedCareers: await Career.count({ where: { status: 'closed' } })
    });

  } catch (error) {
    logger.error('Get career stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch career statistics',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getAllCareers,
  getCareerById,
  createCareer,
  updateCareer,
  deleteCareer,
  bulkUpdateStatus,
  getCareerStats,
  getPublicCareers
};