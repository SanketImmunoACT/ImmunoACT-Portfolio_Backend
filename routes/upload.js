const express = require('express');
const path = require('path');
const { upload, handleUploadError } = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Upload single image
router.post('/image', authenticateToken, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res);
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select an image file to upload'
      });
    }
    
    // Generate URL for the uploaded file
    const fileUrl = `/uploads/${path.basename(path.dirname(req.file.path))}/${req.file.filename}`;
    
    logger.auditLog('FILE_UPLOADED', req.user.username, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl,
      ip: req.ip
    }, req);
    
    res.json({
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      }
    });
  });
});

// Upload media image
router.post('/media-image', authenticateToken, (req, res) => {
  upload.single('mediaImage')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res);
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select an image file to upload'
      });
    }
    
    const fileUrl = `/uploads/media/${req.file.filename}`;
    
    logger.auditLog('MEDIA_IMAGE_UPLOADED', req.user.username, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      ip: req.ip
    }, req);
    
    res.json({
      message: 'Media image uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      }
    });
  });
});

// Upload publication image
router.post('/publication-image', authenticateToken, (req, res) => {
  upload.single('publicationImage')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res);
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select an image file to upload'
      });
    }
    
    const fileUrl = `/uploads/publications/${req.file.filename}`;
    
    logger.auditLog('PUBLICATION_IMAGE_UPLOADED', req.user.username, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      ip: req.ip
    }, req);
    
    res.json({
      message: 'Publication image uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      }
    });
  });
});

// Upload career image
router.post('/career-image', authenticateToken, (req, res) => {
  upload.single('careerImage')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res);
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select an image file to upload'
      });
    }
    
    const fileUrl = `/uploads/careers/${req.file.filename}`;
    
    logger.auditLog('CAREER_IMAGE_UPLOADED', req.user.username, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      ip: req.ip
    }, req);
    
    res.json({
      message: 'Career image uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      }
    });
  });
});

module.exports = router;