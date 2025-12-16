const { ContactForm, AuditLog } = require('../models/ContactForm');
const { sequelize } = require('../config/database');
const emailService = require('../services/emailService');
const logger = require('../config/logger');
const crypto = require('crypto');

class ContactController {
  // Submit contact form
  async submitContactForm(req, res) {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        institution,
        partneringCategory,
        message,
        consentGiven
      } = req.body;

      // Generate unique submission ID
      const submissionId = crypto.randomBytes(16).toString('hex');

      // Create contact form entry with encryption
      const savedForm = await ContactForm.createEncrypted({
        firstName,
        lastName,
        email,
        phone: phone || null,
        institution: institution || null,
        partneringCategory,
        message,
        consentGiven,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown'
      }, {
        userId: 'anonymous',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown'
      });

      // Log successful submission
      logger.auditLog('CONTACT_FORM_SUBMITTED', 'anonymous', {
        submissionId: savedForm._id,
        partneringCategory,
        hasPhone: !!phone,
        hasInstitution: !!institution,
        messageLength: message.length,
        consentGiven
      }, req);

      // Send notification emails
      try {
        const decryptedData = savedForm.getDecryptedData();
        await emailService.sendContactFormNotification(decryptedData, savedForm.id, {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent') || 'Unknown'
        });
        
        logger.auditLog('EMAIL_NOTIFICATIONS_SENT', 'system', {
          submissionId: savedForm.id,
          recipientEmail: decryptedData.email
        }, req);
      } catch (emailError) {
        // Log email error but don't fail the submission
        logger.error('Email notification failed:', {
          submissionId: savedForm.id,
          error: emailError.message
        });
      }

      // Return success response (don't expose internal IDs)
      res.status(201).json({
        success: true,
        message: 'Thank you for your submission. We will contact you within 2-3 business days.',
        submissionId: savedForm.id,
        estimatedResponseTime: '2-3 business days'
      });

    } catch (error) {
      logger.error('Contact form submission failed:', {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Return generic error message
      res.status(500).json({
        error: 'We apologize, but there was an issue processing your submission. Please try again later or contact us directly.',
        supportEmail: 'helpdesk@immunoact.com'
      });
    }
  }

  // Get contact form submissions (admin only - would need authentication)
  async getContactForms(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        partneringCategory,
        startDate,
        endDate
      } = req.query;

      // Build Sequelize where clause
      const whereClause = {};
      
      if (status) {
        whereClause.status = status;
      }
      
      if (partneringCategory) {
        whereClause.partneringCategory = partneringCategory;
      }
      
      if (startDate || endDate) {
        const { Op } = require('sequelize');
        whereClause.submissionDate = {};
        if (startDate) {
          whereClause.submissionDate[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.submissionDate[Op.lte] = new Date(endDate);
        }
      }

      // Execute query with pagination
      const options = {
        where: whereClause,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['submissionDate', 'DESC']]
      };

      const { count: total, rows: forms } = await ContactForm.findAndCountAll(options);

      // Decrypt data for admin view (be careful with this)
      const decryptedForms = forms.map(form => form.getDecryptedData());

      logger.auditLog('ADMIN_VIEWED_SUBMISSIONS', 'admin', {
        query,
        resultCount: forms.length,
        page: options.page
      }, req);

      res.json({
        success: true,
        data: decryptedForms,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve contact forms:', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        error: 'Failed to retrieve contact forms'
      });
    }
  }

  // Update contact form status (admin only)
  async updateContactFormStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ['pending', 'reviewed', 'responded', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }

      const [updatedRowsCount] = await ContactForm.update(
        { 
          status,
          modifiedBy: 'admin', // In real app, get from JWT token
          lastModified: new Date()
        },
        { 
          where: { id },
          userId: 'admin',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      if (updatedRowsCount === 0) {
        return res.status(404).json({
          error: 'Contact form not found'
        });
      }

      const updatedForm = await ContactForm.findByPk(id);

      logger.auditLog('CONTACT_FORM_STATUS_UPDATED', 'admin', {
        submissionId: id,
        oldStatus: updatedForm.status,
        newStatus: status,
        notes
      }, req);

      res.json({
        success: true,
        message: 'Contact form status updated successfully',
        data: {
          id: updatedForm.id,
          status: updatedForm.status,
          lastModified: updatedForm.lastModified
        }
      });

    } catch (error) {
      logger.error('Failed to update contact form status:', {
        error: error.message,
        submissionId: req.params.id
      });

      res.status(500).json({
        error: 'Failed to update contact form status'
      });
    }
  }

  // Get contact form statistics (admin only)
  async getContactFormStats(req, res) {
    try {
      const { Op } = require('sequelize');
      
      // Category breakdown
      const categoryStats = await ContactForm.findAll({
        attributes: [
          'partneringCategory',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('MAX', sequelize.col('submissionDate')), 'latestSubmission']
        ],
        group: ['partneringCategory'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
      });

      // Status breakdown
      const statusStats = await ContactForm.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      const totalSubmissions = await ContactForm.count();
      
      // This month's submissions
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const thisMonth = await ContactForm.count({
        where: {
          submissionDate: {
            [Op.gte]: startOfMonth
          }
        }
      });

      logger.auditLog('ADMIN_VIEWED_STATS', 'admin', {
        totalSubmissions,
        thisMonth
      }, req);

      res.json({
        success: true,
        data: {
          totalSubmissions,
          thisMonth,
          categoryBreakdown: categoryStats.map(stat => ({
            _id: stat.partneringCategory,
            count: parseInt(stat.dataValues.count),
            latestSubmission: stat.dataValues.latestSubmission
          })),
          statusBreakdown: statusStats.map(stat => ({
            _id: stat.status,
            count: parseInt(stat.dataValues.count)
          }))
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve contact form statistics:', {
        error: error.message
      });

      res.status(500).json({
        error: 'Failed to retrieve statistics'
      });
    }
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      // Check database connection
      const dbCheck = await ContactForm.count({ limit: 1 });
      
      // Check email service
      let emailCheck = false;
      try {
        await emailService.transporter.verify();
        emailCheck = true;
      } catch (emailError) {
        logger.warn('Email service health check failed:', emailError.message);
      }

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbCheck !== undefined ? 'healthy' : 'unhealthy',
          email: emailCheck ? 'healthy' : 'unhealthy'
        },
        version: process.env.npm_package_version || '1.0.0'
      };

      res.json(health);

    } catch (error) {
      logger.error('Health check failed:', error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service health check failed'
      });
    }
  }
}

module.exports = new ContactController();