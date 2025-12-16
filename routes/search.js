const express = require('express');
const { Op } = require('sequelize');
const Media = require('../models/Media');
const Publication = require('../models/Publication');
const Career = require('../models/Career');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Global search across all content types
router.get('/global', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchTerm = `%${query.trim()}%`;
    const searchLimit = parseInt(limit);

    // Search in parallel across all content types
    const [mediaResults, publicationResults, careerResults] = await Promise.all([
      // Media search
      Media.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.like]: searchTerm } },
            { excerpt: { [Op.like]: searchTerm } },
            { sourceName: { [Op.like]: searchTerm } }
          ]
        },
        attributes: ['id', 'title', 'excerpt', 'sourceName', 'status', 'publishedDate'],
        limit: searchLimit,
        order: [['publishedDate', 'DESC']]
      }),

      // Publications search
      Publication.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.like]: searchTerm } },
            { authors: { [Op.like]: searchTerm } },
            { journal: { [Op.like]: searchTerm } },
            { abstract: { [Op.like]: searchTerm } }
          ]
        },
        attributes: ['id', 'title', 'authors', 'journal', 'status', 'publishedDate', 'category'],
        limit: searchLimit,
        order: [['publishedDate', 'DESC']]
      }),

      // Careers search
      Career.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.like]: searchTerm } },
            { description: { [Op.like]: searchTerm } },
            { department: { [Op.like]: searchTerm } },
            { location: { [Op.like]: searchTerm } }
          ]
        },
        attributes: ['id', 'title', 'department', 'location', 'status', 'employmentType', 'experienceLevel'],
        limit: searchLimit,
        order: [['publishedAt', 'DESC']]
      })
    ]);

    // Format results with type information
    const results = {
      media: mediaResults.map(item => ({
        ...item.toJSON(),
        type: 'media',
        url: `/admin/media/${item.id}`
      })),
      publications: publicationResults.map(item => ({
        ...item.toJSON(),
        type: 'publication',
        url: `/admin/publications/${item.id}`
      })),
      careers: careerResults.map(item => ({
        ...item.toJSON(),
        type: 'career',
        url: `/admin/careers/${item.id}`
      }))
    };

    const totalResults = mediaResults.length + publicationResults.length + careerResults.length;

    logger.auditLog('GLOBAL_SEARCH', req.user.username, {
      query: query.trim(),
      totalResults,
      mediaCount: mediaResults.length,
      publicationCount: publicationResults.length,
      careerCount: careerResults.length,
      ip: req.ip
    }, req);

    res.json({
      query: query.trim(),
      totalResults,
      results,
      counts: {
        media: mediaResults.length,
        publications: publicationResults.length,
        careers: careerResults.length
      }
    });

  } catch (error) {
    logger.error('Global search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'Internal server error'
    });
  }
});

// Search within specific content type
router.get('/media', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 20, status } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchTerm = `%${query.trim()}%`;
    const whereClause = {
      [Op.or]: [
        { title: { [Op.like]: searchTerm } },
        { excerpt: { [Op.like]: searchTerm } },
        { sourceName: { [Op.like]: searchTerm } }
      ]
    };

    if (status) {
      whereClause.status = status;
    }

    const results = await Media.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      limit: parseInt(limit),
      order: [['publishedDate', 'DESC']]
    });

    res.json({
      query: query.trim(),
      totalResults: results.length,
      results: results.map(item => item.toSafeObject())
    });

  } catch (error) {
    logger.error('Media search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'Internal server error'
    });
  }
});

// Search publications
router.get('/publications', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 20, status, category } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchTerm = `%${query.trim()}%`;
    const whereClause = {
      [Op.or]: [
        { title: { [Op.like]: searchTerm } },
        { authors: { [Op.like]: searchTerm } },
        { journal: { [Op.like]: searchTerm } },
        { abstract: { [Op.like]: searchTerm } }
      ]
    };

    if (status) {
      whereClause.status = status;
    }

    if (category) {
      whereClause.category = { [Op.like]: `%${category}%` };
    }

    const results = await Publication.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      limit: parseInt(limit),
      order: [['publishedDate', 'DESC']]
    });

    res.json({
      query: query.trim(),
      totalResults: results.length,
      results: results.map(item => item.toSafeObject())
    });

  } catch (error) {
    logger.error('Publications search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'Internal server error'
    });
  }
});

// Search careers
router.get('/careers', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 20, status, department } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchTerm = `%${query.trim()}%`;
    const whereClause = {
      [Op.or]: [
        { title: { [Op.like]: searchTerm } },
        { description: { [Op.like]: searchTerm } },
        { department: { [Op.like]: searchTerm } },
        { location: { [Op.like]: searchTerm } }
      ]
    };

    if (status) {
      whereClause.status = status;
    }

    if (department) {
      whereClause.department = { [Op.like]: `%${department}%` };
    }

    const results = await Career.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      limit: parseInt(limit),
      order: [['publishedAt', 'DESC']]
    });

    res.json({
      query: query.trim(),
      totalResults: results.length,
      results: results.map(item => item.toSafeObject())
    });

  } catch (error) {
    logger.error('Careers search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'Internal server error'
    });
  }
});

// Get search suggestions/autocomplete
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { q: query, type = 'all' } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const searchTerm = `%${query.trim()}%`;
    const suggestions = [];

    if (type === 'all' || type === 'media') {
      const mediaTitles = await Media.findAll({
        where: { title: { [Op.like]: searchTerm } },
        attributes: ['title'],
        limit: 5,
        order: [['publishedDate', 'DESC']]
      });
      suggestions.push(...mediaTitles.map(m => ({ text: m.title, type: 'media' })));
    }

    if (type === 'all' || type === 'publications') {
      const publicationTitles = await Publication.findAll({
        where: { title: { [Op.like]: searchTerm } },
        attributes: ['title'],
        limit: 5,
        order: [['publishedDate', 'DESC']]
      });
      suggestions.push(...publicationTitles.map(p => ({ text: p.title, type: 'publication' })));
    }

    if (type === 'all' || type === 'careers') {
      const careerTitles = await Career.findAll({
        where: { title: { [Op.like]: searchTerm } },
        attributes: ['title'],
        limit: 5,
        order: [['publishedAt', 'DESC']]
      });
      suggestions.push(...careerTitles.map(c => ({ text: c.title, type: 'career' })));
    }

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions
      .filter((item, index, self) => 
        index === self.findIndex(t => t.text === item.text)
      )
      .slice(0, 10);

    res.json({
      query: query.trim(),
      suggestions: uniqueSuggestions
    });

  } catch (error) {
    logger.error('Search suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: 'Internal server error'
    });
  }
});

module.exports = router;