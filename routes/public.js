const express = require('express');
const Media = require('../models/Media');
const Publication = require('../models/Publication');
const Career = require('../models/Career');
const logger = require('../config/logger');

const router = express.Router();

// Get published media articles for public website
router.get('/media', async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: media } = await Media.findAndCountAll({
      where: { status: 'published' },
      attributes: [
        'id', 'title', 'link', 'publishedDate', 'sourceName', 
        'excerpt', 'imageUrl', 'tags', 'publishedAt'
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['publishedDate', 'DESC']]
    });

    res.json({
      media: media.map(item => ({
        id: item.id,
        title: item.title,
        link: item.link,
        publishedDate: item.publishedDate,
        sourceName: item.sourceName,
        excerpt: item.excerpt,
        imageUrl: item.imageUrl,
        tags: item.tags,
        publishedAt: item.publishedAt
      })),
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
});

// Get published publications for public website
router.get('/publications', async (req, res) => {
  try {
    const { limit = 10, page = 1, category } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { status: 'published' };
    if (category) {
      whereClause.category = category;
    }

    const { count, rows: publications } = await Publication.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'title', 'authors', 'journal', 'url', 'publishedDate', 
        'category', 'buttonText', 'abstract', 'doi', 'pmid', 
        'tags', 'imageUrl', 'publishedAt'
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['publishedDate', 'DESC']]
    });

    res.json({
      publications: publications.map(item => ({
        id: item.id,
        title: item.title,
        authors: item.authors,
        journal: item.journal,
        url: item.url,
        publishedDate: item.publishedDate,
        category: item.category,
        buttonText: item.buttonText,
        abstract: item.abstract,
        doi: item.doi,
        pmid: item.pmid,
        tags: item.tags,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt
      })),
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
});

// Get active job postings for public website
router.get('/careers', async (req, res) => {
  try {
    const { limit = 10, page = 1, department, location, employmentType, isRemote } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { status: 'active' };
    
    if (department) {
      whereClause.department = department;
    }
    if (location) {
      whereClause.location = { [require('sequelize').Op.like]: `%${location}%` };
    }
    if (employmentType) {
      whereClause.employmentType = employmentType;
    }
    if (isRemote !== undefined) {
      whereClause.isRemote = isRemote === 'true';
    }

    const { count, rows: careers } = await Career.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'title', 'department', 'location', 'employmentType', 
        'experienceLevel', 'salaryRange', 'description', 'responsibilities',
        'requirements', 'qualifications', 'benefits', 'applicationDeadline',
        'isRemote', 'tags', 'applicationEmail', 'applicationUrl',
        'urgency', 'workSchedule', 'travelRequired', 'publishedAt'
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['publishedAt', 'DESC']]
    });

    res.json({
      careers: careers.map(item => ({
        id: item.id,
        title: item.title,
        department: item.department,
        location: item.location,
        employmentType: item.employmentType,
        experienceLevel: item.experienceLevel,
        salaryRange: item.salaryRange,
        description: item.description,
        responsibilities: item.responsibilities,
        requirements: item.requirements,
        qualifications: item.qualifications,
        benefits: item.benefits,
        applicationDeadline: item.applicationDeadline,
        isRemote: item.isRemote,
        tags: item.tags,
        applicationEmail: item.applicationEmail,
        applicationUrl: item.applicationUrl,
        urgency: item.urgency,
        workSchedule: item.workSchedule,
        travelRequired: item.travelRequired,
        publishedAt: item.publishedAt
      })),
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
      error: 'Failed to fetch job postings',
      message: 'Internal server error'
    });
  }
});

// Get single media article by ID
router.get('/media/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findOne({
      where: { id, status: 'published' },
      attributes: [
        'id', 'title', 'link', 'publishedDate', 'sourceName', 
        'excerpt', 'imageUrl', 'tags', 'publishedAt'
      ]
    });

    if (!media) {
      return res.status(404).json({
        error: 'Media article not found',
        message: 'The requested media article does not exist or is not published'
      });
    }

    // Increment view count
    await Media.increment('viewCount', { where: { id } });

    res.json({ media: media.toSafeObject() });

  } catch (error) {
    logger.error('Get public media by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch media article',
      message: 'Internal server error'
    });
  }
});

// Get single publication by ID
router.get('/publications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const publication = await Publication.findOne({
      where: { id, status: 'published' },
      attributes: [
        'id', 'title', 'authors', 'journal', 'url', 'publishedDate', 
        'category', 'buttonText', 'abstract', 'doi', 'pmid', 
        'tags', 'imageUrl', 'publishedAt'
      ]
    });

    if (!publication) {
      return res.status(404).json({
        error: 'Publication not found',
        message: 'The requested publication does not exist or is not published'
      });
    }

    // Increment view count
    await Publication.increment('viewCount', { where: { id } });

    res.json({ publication: publication.toSafeObject() });

  } catch (error) {
    logger.error('Get public publication by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch publication',
      message: 'Internal server error'
    });
  }
});

// Get single career by ID
router.get('/careers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findOne({
      where: { id, status: 'active' },
      attributes: [
        'id', 'title', 'department', 'location', 'employmentType', 
        'experienceLevel', 'salaryRange', 'description', 'responsibilities',
        'requirements', 'qualifications', 'benefits', 'applicationDeadline',
        'isRemote', 'tags', 'applicationEmail', 'applicationUrl',
        'urgency', 'workSchedule', 'travelRequired', 'publishedAt'
      ]
    });

    if (!career) {
      return res.status(404).json({
        error: 'Job posting not found',
        message: 'The requested job posting does not exist or is not active'
      });
    }

    // Increment view count
    await Career.increment('viewCount', { where: { id } });

    res.json({ career: career.toSafeObject() });

  } catch (error) {
    logger.error('Get public career by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch job posting',
      message: 'Internal server error'
    });
  }
});

module.exports = router;