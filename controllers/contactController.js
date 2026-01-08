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

  // Get contact form submissions (admin only)
  async getContactForms(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        partneringCategory,
        startDate,
        endDate,
        search
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

      // Decrypt data for admin view
      const decryptedForms = forms.map(form => form.getDecryptedData());

      // Filter by search term if provided (after decryption)
      let filteredForms = decryptedForms;
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredForms = decryptedForms.filter(form => 
          form.firstName?.toLowerCase().includes(searchTerm) ||
          form.lastName?.toLowerCase().includes(searchTerm) ||
          form.email?.toLowerCase().includes(searchTerm) ||
          form.institution?.toLowerCase().includes(searchTerm)
        );
      }

      logger.auditLog('ADMIN_VIEWED_SUBMISSIONS', req.user.username, {
        query: req.query,
        resultCount: filteredForms.length,
        page: parseInt(page)
      }, req);

      res.json({
        success: true,
        data: {
          contacts: filteredForms,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit),
            hasNext: (parseInt(page) * parseInt(limit)) < total,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve contact forms:', {
        error: error.message,
        stack: error.stack,
        user: req.user?.username
      });

      res.status(500).json({
        error: 'Failed to retrieve contact forms',
        message: 'Internal server error'
      });
    }
  }

  // Get single contact form by ID (admin only)
  async getContactFormById(req, res) {
    try {
      const { id } = req.params;

      const form = await ContactForm.findByPk(id);

      if (!form) {
        return res.status(404).json({
          error: 'Contact form not found',
          message: 'The requested contact form does not exist'
        });
      }

      // Decrypt data for admin view
      const decryptedForm = form.getDecryptedData();

      logger.auditLog('ADMIN_VIEWED_CONTACT_DETAIL', req.user.username, {
        contactId: id,
        status: form.status
      }, req);

      res.json({
        success: true,
        data: {
          contact: decryptedForm
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve contact form:', {
        error: error.message,
        contactId: req.params.id,
        user: req.user?.username
      });

      res.status(500).json({
        error: 'Failed to retrieve contact form',
        message: 'Internal server error'
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
          error: 'Invalid status',
          message: 'Status must be one of: ' + validStatuses.join(', ')
        });
      }

      const form = await ContactForm.findByPk(id);
      if (!form) {
        return res.status(404).json({
          error: 'Contact form not found',
          message: 'The requested contact form does not exist'
        });
      }

      const oldStatus = form.status;

      const [updatedRowsCount] = await ContactForm.update(
        { 
          status,
          modifiedBy: req.user.username,
          lastModified: new Date()
        },
        { 
          where: { id },
          userId: req.user.username,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      if (updatedRowsCount === 0) {
        return res.status(404).json({
          error: 'Contact form not found',
          message: 'The requested contact form does not exist'
        });
      }

      const updatedForm = await ContactForm.findByPk(id);

      logger.auditLog('CONTACT_FORM_STATUS_UPDATED', req.user.username, {
        submissionId: id,
        oldStatus,
        newStatus: status,
        notes
      }, req);

      res.json({
        success: true,
        message: 'Contact form status updated successfully',
        data: {
          id: updatedForm.id,
          status: updatedForm.status,
          lastModified: updatedForm.lastModified,
          modifiedBy: updatedForm.modifiedBy
        }
      });

    } catch (error) {
      logger.error('Failed to update contact form status:', {
        error: error.message,
        submissionId: req.params.id,
        user: req.user?.username
      });

      res.status(500).json({
        error: 'Failed to update contact form status',
        message: 'Internal server error'
      });
    }
  }

  // Delete contact form (super admin only)
  async deleteContactForm(req, res) {
    try {
      const { id } = req.params;

      const form = await ContactForm.findByPk(id);
      if (!form) {
        return res.status(404).json({
          error: 'Contact form not found',
          message: 'The requested contact form does not exist'
        });
      }

      // Store form data for audit log before deletion
      const formData = form.getDecryptedData();

      await form.destroy({
        userId: req.user.username,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.auditLog('CONTACT_FORM_DELETED', req.user.username, {
        submissionId: id,
        partneringCategory: formData.partneringCategory,
        submissionDate: formData.submissionDate,
        reason: 'Manual deletion by admin'
      }, req);

      res.json({
        success: true,
        message: 'Contact form deleted successfully'
      });

    } catch (error) {
      logger.error('Failed to delete contact form:', {
        error: error.message,
        submissionId: req.params.id,
        user: req.user?.username
      });

      res.status(500).json({
        error: 'Failed to delete contact form',
        message: 'Internal server error'
      });
    }
  }

  // Get contact form statistics (admin only)
  async getContactFormStats(req, res) {
    try {
      const { Op } = require('sequelize');
      
      // Total submissions
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

      // Last 30 days
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentSubmissions = await ContactForm.count({
        where: {
          submissionDate: {
            [Op.gte]: last30Days
          }
        }
      });

      // Category breakdown
      const categoryStats = await ContactForm.findAll({
        attributes: [
          'partneringCategory',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('MAX', sequelize.col('submissionDate')), 'latestSubmission']
        ],
        group: ['partneringCategory'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        raw: true
      });

      // Status breakdown
      const statusStats = await ContactForm.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Pending submissions count
      const pendingCount = await ContactForm.count({
        where: { status: 'pending' }
      });

      logger.auditLog('ADMIN_VIEWED_CONTACT_STATS', req.user.username, {
        totalSubmissions,
        thisMonth,
        pendingCount
      }, req);

      res.json({
        success: true,
        data: {
          totalSubmissions,
          thisMonth,
          recentSubmissions,
          pendingCount,
          categoryBreakdown: categoryStats.map(stat => ({
            category: stat.partneringCategory,
            count: parseInt(stat.count),
            latestSubmission: stat.latestSubmission
          })),
          statusBreakdown: statusStats.map(stat => ({
            status: stat.status,
            count: parseInt(stat.count)
          }))
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve contact form statistics:', {
        error: error.message,
        user: req.user?.username
      });

      res.status(500).json({
        error: 'Failed to retrieve statistics',
        message: 'Internal server error'
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