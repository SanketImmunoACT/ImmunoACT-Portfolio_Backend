const Publication = require('../models/Publication');
const { User } = require('../models');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Get public publications (only published ones, no authentication required)
const getPublicPublications = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      category, 
      journal,
      search,
      sortBy = 'publishedDate',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Build where clause - only show published publications for public
    const whereClause = {
      status: 'published'
    };
    
    if (category) {
      whereClause.category = { [Op.like]: `%${category}%` };
    }
    
    if (journal) {
      whereClause.journal = { [Op.like]: `%${journal}%` };
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { authors: { [Op.like]: `%${search}%` } },
        { journal: { [Op.like]: `%${search}%` } },
        { abstract: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: publications } = await Publication.findAndCountAll({
      where: whereClause,
      // Don't include user information for public API
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    res.json({
      publications: publications.map(item => item.toPublicObject()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: offset + publications.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get public publications error:', error);
    res.status(500).json({
      error: 'Failed to fetch publications',
      message: 'Internal server error'
    });
  }
};

// Get all publications with filtering and pagination
const getAllPublications = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      journal,
      search,
      sortBy = 'publishedDate',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (category) {
      whereClause.category = { [Op.like]: `%${category}%` };
    }
    
    if (journal) {
      whereClause.journal = { [Op.like]: `%${journal}%` };
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { authors: { [Op.like]: `%${search}%` } },
        { journal: { [Op.like]: `%${search}%` } },
        { abstract: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: publications } = await Publication.findAndCountAll({
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

    logger.auditLog('PUBLICATIONS_VIEWED', req.user.username, {
      filters: { status, category, journal, search },
      resultCount: publications.length,
      ip: req.ip
    }, req);

    res.json({
      publications: publications.map(item => item.toSafeObject()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: offset + publications.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get all publications error:', error);
    res.status(500).json({
      error: 'Failed to fetch publications',
      message: 'Internal server error'
    });
  }
};

// Get publication by ID
const getPublicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const publication = await Publication.findByPk(id, {
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

    if (!publication) {
      return res.status(404).json({
        error: 'Publication not found',
        message: 'Publication with the specified ID does not exist'
      });
    }

    logger.auditLog('PUBLICATION_VIEWED', req.user.username, {
      publicationId: id,
      publicationTitle: publication.title,
      ip: req.ip
    }, req);

    res.json({
      publication: publication.toSafeObject()
    });

  } catch (error) {
    logger.error('Get publication by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch publication',
      message: 'Internal server error'
    });
  }
};

// Create new publication
const createPublication = async (req, res) => {
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
      authors,
      journal,
      url,
      publishedDate,
      category,
      buttonText = 'View Publication',
      status = 'draft',
      abstract,
      doi,
      pmid,
      tags,
      imageUrl,
      metaTitle,
      metaDescription,
      impactFactor
    } = req.body;

    const publication = await Publication.create({
      title,
      authors,
      journal,
      url,
      publishedDate: new Date(publishedDate),
      category,
      buttonText,
      status,
      abstract,
      doi,
      pmid,
      tags: Array.isArray(tags) ? tags : [],
      imageUrl,
      metaTitle,
      metaDescription,
      impactFactor,
      createdBy: req.user.id,
      publishedBy: status === 'published' ? req.user.id : null,
      publishedAt: status === 'published' ? new Date() : null
    });

    logger.auditLog('PUBLICATION_CREATED', req.user.username, {
      publicationId: publication.id,
      publicationTitle: publication.title,
      status: publication.status,
      ip: req.ip
    }, req);

    res.status(201).json({
      message: 'Publication created successfully',
      publication: publication.toSafeObject()
    });

  } catch (error) {
    logger.error('Create publication error:', error);
    res.status(500).json({
      error: 'Failed to create publication',
      message: 'Internal server error'
    });
  }
};

// Update publication
const updatePublication = async (req, res) => {
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
      authors,
      journal,
      url,
      publishedDate,
      category,
      buttonText,
      status,
      abstract,
      doi,
      pmid,
      tags,
      imageUrl,
      metaTitle,
      metaDescription,
      impactFactor
    } = req.body;

    const publication = await Publication.findByPk(id);
    if (!publication) {
      return res.status(404).json({
        error: 'Publication not found',
        message: 'Publication with the specified ID does not exist'
      });
    }

    // Track status change for audit
    const statusChanged = status && status !== publication.status;
    const oldStatus = publication.status;

    // Update publication
    const updateData = {
      lastModifiedBy: req.user.id
    };
    
    if (title !== undefined) updateData.title = title;
    if (authors !== undefined) updateData.authors = authors;
    if (journal !== undefined) updateData.journal = journal;
    if (url !== undefined) updateData.url = url;
    if (publishedDate !== undefined) updateData.publishedDate = new Date(publishedDate);
    if (category !== undefined) updateData.category = category;
    if (buttonText !== undefined) updateData.buttonText = buttonText;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'published' && oldStatus !== 'published') {
        updateData.publishedBy = req.user.id;
        updateData.publishedAt = new Date();
      }
    }
    if (abstract !== undefined) updateData.abstract = abstract;
    if (doi !== undefined) updateData.doi = doi;
    if (pmid !== undefined) updateData.pmid = pmid;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (impactFactor !== undefined) updateData.impactFactor = impactFactor;

    await publication.update(updateData);

    logger.auditLog('PUBLICATION_UPDATED', req.user.username, {
      publicationId: id,
      publicationTitle: publication.title,
      changes: Object.keys(updateData),
      statusChanged,
      oldStatus,
      newStatus: status,
      ip: req.ip
    }, req);

    res.json({
      message: 'Publication updated successfully',
      publication: publication.toSafeObject()
    });

  } catch (error) {
    logger.error('Update publication error:', error);
    res.status(500).json({
      error: 'Failed to update publication',
      message: 'Internal server error'
    });
  }
};

// Delete publication
const deletePublication = async (req, res) => {
  try {
    const { id } = req.params;

    const publication = await Publication.findByPk(id);
    if (!publication) {
      return res.status(404).json({
        error: 'Publication not found',
        message: 'Publication with the specified ID does not exist'
      });
    }

    await publication.destroy();

    logger.auditLog('PUBLICATION_DELETED', req.user.username, {
      publicationId: id,
      publicationTitle: publication.title,
      ip: req.ip
    }, req);

    res.json({
      message: 'Publication deleted successfully'
    });

  } catch (error) {
    logger.error('Delete publication error:', error);
    res.status(500).json({
      error: 'Failed to delete publication',
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

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: draft, published, archived'
      });
    }

    const updateData = {
      status,
      lastModifiedBy: req.user.id
    };

    if (status === 'published') {
      updateData.publishedBy = req.user.id;
      updateData.publishedAt = new Date();
    }

    const [updatedCount] = await Publication.update(updateData, {
      where: {
        id: { [Op.in]: ids }
      }
    });

    logger.auditLog('PUBLICATIONS_BULK_UPDATE', req.user.username, {
      ids,
      status,
      updatedCount,
      ip: req.ip
    }, req);

    res.json({
      message: `${updatedCount} publications updated successfully`,
      updatedCount
    });

  } catch (error) {
    logger.error('Bulk update publications error:', error);
    res.status(500).json({
      error: 'Failed to update publications',
      message: 'Internal server error'
    });
  }
};

// Get publication statistics
const getPublicationStats = async (req, res) => {
  try {
    const stats = await Publication.findAll({
      attributes: [
        'status',
        [Publication.sequelize.fn('COUNT', Publication.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const categoryStats = await Publication.findAll({
      attributes: [
        'category',
        [Publication.sequelize.fn('COUNT', Publication.sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });

    const totalPublications = await Publication.count();
    const publishedPublications = await Publication.count({ where: { status: 'published' } });
    const draftPublications = await Publication.count({ where: { status: 'draft' } });

    logger.auditLog('PUBLICATIONS_STATS_VIEWED', req.user.username, {
      ip: req.ip
    }, req);

    res.json({
      statusDistribution: stats,
      categoryDistribution: categoryStats,
      totalPublications,
      publishedPublications,
      draftPublications,
      archivedPublications: totalPublications - publishedPublications - draftPublications
    });

  } catch (error) {
    logger.error('Get publication stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch publication statistics',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getAllPublications,
  getPublicationById,
  createPublication,
  updatePublication,
  deletePublication,
  bulkUpdateStatus,
  getPublicationStats,
  getPublicPublications
};