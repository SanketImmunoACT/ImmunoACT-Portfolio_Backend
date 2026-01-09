const Media = require('../models/Media');
const { User } = require('../models');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Get public media articles (only published ones, no authentication required)
const getPublicMedia = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      sourceName, 
      search,
      sortBy = 'publishedDate',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Build where clause - only show published media for public
    const whereClause = {
      status: 'published'
    };
    
    if (sourceName) {
      whereClause.sourceName = { [Op.like]: `%${sourceName}%` };
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { excerpt: { [Op.like]: `%${search}%` } },
        { sourceName: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: media } = await Media.findAndCountAll({
      where: whereClause,
      // Don't include user information for public API
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    res.json({
      media: media.map(item => item.toPublicObject()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: offset + media.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get public media error:', error);
    res.status(500).json({
      error: 'Failed to fetch media articles',
      message: 'Internal server error'
    });
  }
};

// Get all media articles with filtering and pagination
const getAllMedia = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sourceName, 
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
    
    if (sourceName) {
      whereClause.sourceName = { [Op.like]: `%${sourceName}%` };
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { excerpt: { [Op.like]: `%${search}%` } },
        { sourceName: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: media } = await Media.findAndCountAll({
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

    logger.auditLog('MEDIA_VIEWED', req.user.username, {
      filters: { status, sourceName, search },
      resultCount: media.length,
      ip: req.ip
    }, req);

    res.json({
      media: media.map(item => item.toSafeObject()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        hasNext: offset + media.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get all media error:', error);
    res.status(500).json({
      error: 'Failed to fetch media articles',
      message: 'Internal server error'
    });
  }
};

// Get media article by ID
const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findByPk(id, {
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

    if (!media) {
      return res.status(404).json({
        error: 'Media article not found',
        message: 'Media article with the specified ID does not exist'
      });
    }

    logger.auditLog('MEDIA_ITEM_VIEWED', req.user.username, {
      mediaId: id,
      mediaTitle: media.title,
      ip: req.ip
    }, req);

    res.json({
      media: media.toSafeObject()
    });

  } catch (error) {
    logger.error('Get media by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch media article',
      message: 'Internal server error'
    });
  }
};

// Create new media article
const createMedia = async (req, res) => {
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
      link,
      publishedDate,
      sourceName,
      status = 'draft',
      excerpt,
      imageUrl,
      tags,
      metaTitle,
      metaDescription
    } = req.body;

    const media = await Media.create({
      title,
      link,
      publishedDate: new Date(publishedDate),
      sourceName,
      status,
      excerpt,
      imageUrl,
      tags: Array.isArray(tags) ? tags : [],
      metaTitle,
      metaDescription,
      createdBy: req.user.id,
      publishedBy: status === 'published' ? req.user.id : null,
      publishedAt: status === 'published' ? new Date() : null
    });

    logger.auditLog('MEDIA_CREATED', req.user.username, {
      mediaId: media.id,
      mediaTitle: media.title,
      status: media.status,
      ip: req.ip
    }, req);

    res.status(201).json({
      message: 'Media article created successfully',
      media: media.toSafeObject()
    });

  } catch (error) {
    logger.error('Create media error:', error);
    res.status(500).json({
      error: 'Failed to create media article',
      message: 'Internal server error'
    });
  }
};

// Update media article
const updateMedia = async (req, res) => {
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
      link,
      publishedDate,
      sourceName,
      status,
      excerpt,
      imageUrl,
      tags,
      metaTitle,
      metaDescription
    } = req.body;

    const media = await Media.findByPk(id);
    if (!media) {
      return res.status(404).json({
        error: 'Media article not found',
        message: 'Media article with the specified ID does not exist'
      });
    }

    // Track status change for audit
    const statusChanged = status && status !== media.status;
    const oldStatus = media.status;

    // Update media article
    const updateData = {
      lastModifiedBy: req.user.id
    };
    
    if (title !== undefined) updateData.title = title;
    if (link !== undefined) updateData.link = link;
    if (publishedDate !== undefined) updateData.publishedDate = new Date(publishedDate);
    if (sourceName !== undefined) updateData.sourceName = sourceName;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'published' && oldStatus !== 'published') {
        updateData.publishedBy = req.user.id;
        updateData.publishedAt = new Date();
      }
    }
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;

    await media.update(updateData);

    logger.auditLog('MEDIA_UPDATED', req.user.username, {
      mediaId: id,
      mediaTitle: media.title,
      changes: Object.keys(updateData),
      statusChanged,
      oldStatus,
      newStatus: status,
      ip: req.ip
    }, req);

    res.json({
      message: 'Media article updated successfully',
      media: media.toSafeObject()
    });

  } catch (error) {
    logger.error('Update media error:', error);
    res.status(500).json({
      error: 'Failed to update media article',
      message: 'Internal server error'
    });
  }
};

// Delete media article
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findByPk(id);
    if (!media) {
      return res.status(404).json({
        error: 'Media article not found',
        message: 'Media article with the specified ID does not exist'
      });
    }

    await media.destroy();

    logger.auditLog('MEDIA_DELETED', req.user.username, {
      mediaId: id,
      mediaTitle: media.title,
      ip: req.ip
    }, req);

    res.json({
      message: 'Media article deleted successfully'
    });

  } catch (error) {
    logger.error('Delete media error:', error);
    res.status(500).json({
      error: 'Failed to delete media article',
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

    const [updatedCount] = await Media.update(updateData, {
      where: {
        id: { [Op.in]: ids }
      }
    });

    logger.auditLog('MEDIA_BULK_UPDATE', req.user.username, {
      ids,
      status,
      updatedCount,
      ip: req.ip
    }, req);

    res.json({
      message: `${updatedCount} media articles updated successfully`,
      updatedCount
    });

  } catch (error) {
    logger.error('Bulk update media error:', error);
    res.status(500).json({
      error: 'Failed to update media articles',
      message: 'Internal server error'
    });
  }
};

// Get media statistics
const getMediaStats = async (req, res) => {
  try {
    const stats = await Media.findAll({
      attributes: [
        'status',
        [Media.sequelize.fn('COUNT', Media.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const totalMedia = await Media.count();
    const publishedMedia = await Media.count({ where: { status: 'published' } });
    const draftMedia = await Media.count({ where: { status: 'draft' } });

    logger.auditLog('MEDIA_STATS_VIEWED', req.user.username, {
      ip: req.ip
    }, req);

    res.json({
      statusDistribution: stats,
      totalMedia,
      publishedMedia,
      draftMedia,
      archivedMedia: totalMedia - publishedMedia - draftMedia
    });

  } catch (error) {
    logger.error('Get media stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch media statistics',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getAllMedia,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
  bulkUpdateStatus,
  getMediaStats,
  getPublicMedia
};