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

      // Create contact form entry using raw SQL (no encryption - plain text storage)
      const insertResult = await sequelize.query(`
        INSERT INTO contact_forms (
          first_name, last_name, email, phone, institution, 
          partnership_category, message, consent_given, 
          submission_date, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [
          firstName,
          lastName,
          email,
          phone || null,
          institution || null,
          partneringCategory,
          message,
          consentGiven,
          new Date()
        ],
        type: sequelize.QueryTypes.INSERT
      });

      const savedFormId = insertResult[0];

      // Log successful submission
      logger.auditLog('CONTACT_FORM_SUBMITTED', 'anonymous', {
        submissionId: savedFormId,
        partneringCategory,
        hasPhone: !!phone,
        hasInstitution: !!institution,
        messageLength: message.length,
        consentGiven
      }, req);

      // Send notification emails
      try {
        // Get the saved form data for email notification
        const savedFormsResult = await sequelize.query(
          'SELECT * FROM contact_forms WHERE id = ?',
          { 
            replacements: [savedFormId],
            type: sequelize.QueryTypes.SELECT
          }
        );
        const savedForm = savedFormsResult[0];

        await emailService.sendContactFormNotification({
          firstName: savedForm.first_name,
          lastName: savedForm.last_name,
          email: savedForm.email,
          phone: savedForm.phone,
          institution: savedForm.institution,
          partneringCategory: savedForm.partnership_category,
          message: savedForm.message
        }, savedFormId, {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent') || 'Unknown'
        });
        
        logger.auditLog('EMAIL_NOTIFICATIONS_SENT', 'system', {
          submissionId: savedFormId,
          recipientEmail: savedForm.email
        }, req);
      } catch (emailError) {
        // Log email error but don't fail the submission
        logger.error('Email notification failed:', {
          submissionId: savedFormId,
          error: emailError.message
        });
      }

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Thank you for your submission. We will contact you within 2-3 business days.',
        submissionId: savedFormId,
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

      // Build SQL WHERE clause manually to avoid field mapping issues
      let whereConditions = [];
      let replacements = [];
      
      if (status) {
        whereConditions.push('status = ?');
        replacements.push(status);
      }
      
      if (partneringCategory) {
        whereConditions.push('partnership_category = ?');
        replacements.push(partneringCategory);
      }
      
      if (startDate) {
        whereConditions.push('submission_date >= ?');
        replacements.push(new Date(startDate));
      }
      
      if (endDate) {
        whereConditions.push('submission_date <= ?');
        replacements.push(new Date(endDate));
      }

      if (search) {
        whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR institution LIKE ?)');
        const searchTerm = `%${search}%`;
        replacements.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Get total count
      const [countResult] = await sequelize.query(
        `SELECT COUNT(*) as total FROM contact_forms ${whereClause}`,
        { replacements }
      );
      const total = countResult[0].total;

      // Get paginated results
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const [forms] = await sequelize.query(`
        SELECT id, first_name, last_name, email, phone, institution, 
               partnership_category, message, status, consent_given, 
               submission_date, createdAt, updatedAt
        FROM contact_forms 
        ${whereClause}
        ORDER BY submission_date DESC 
        LIMIT ? OFFSET ?
      `, { 
        replacements: [...replacements, parseInt(limit), offset]
      });

      // Map the results to match the expected format
      const contactsData = forms.map(form => ({
        id: form.id,
        firstName: form.first_name,
        lastName: form.last_name,
        email: form.email,
        phone: form.phone,
        institution: form.institution,
        partneringCategory: form.partnership_category,
        message: form.message,
        status: form.status,
        consentGiven: form.consent_given,
        submissionDate: form.submission_date,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt
      }));

      logger.auditLog('ADMIN_VIEWED_SUBMISSIONS', req.user?.username || 'anonymous', {
        query: req.query,
        resultCount: contactsData.length,
        page: parseInt(page)
      }, req);

      res.json({
        success: true,
        data: {
          contacts: contactsData,
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
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get single contact form by ID (admin only)
  async getContactFormById(req, res) {
    try {
      const { id } = req.params;

      // Use raw SQL to avoid field mapping issues
      const [forms] = await sequelize.query(`
        SELECT id, first_name, last_name, email, phone, institution, 
               partnership_category, message, status, consent_given, 
               submission_date, createdAt, updatedAt
        FROM contact_forms 
        WHERE id = ?
      `, { 
        replacements: [id]
      });

      if (forms.length === 0) {
        return res.status(404).json({
          error: 'Contact form not found',
          message: 'The requested contact form does not exist'
        });
      }

      const form = forms[0];

      // Map the result to match the expected format
      const contactData = {
        id: form.id,
        firstName: form.first_name,
        lastName: form.last_name,
        email: form.email,
        phone: form.phone,
        institution: form.institution,
        partneringCategory: form.partnership_category,
        message: form.message,
        status: form.status,
        consentGiven: form.consent_given,
        submissionDate: form.submission_date,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt
      };

      logger.auditLog('ADMIN_VIEWED_CONTACT_DETAIL', req.user?.username || 'anonymous', {
        contactId: id,
        status: form.status
      }, req);

      res.json({
        success: true,
        data: {
          contact: contactData
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
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

      // Check if contact exists using raw SQL
      const [existingForms] = await sequelize.query(
        'SELECT id, status FROM contact_forms WHERE id = ?',
        { replacements: [id] }
      );

      if (existingForms.length === 0) {
        return res.status(404).json({
          error: 'Contact form not found',
          message: 'The requested contact form does not exist'
        });
      }

      const oldStatus = existingForms[0].status;

      // Update status using raw SQL
      const [updateResult] = await sequelize.query(
        'UPDATE contact_forms SET status = ?, updatedAt = NOW() WHERE id = ?',
        { replacements: [status, id] }
      );

      // Get updated form
      const [updatedForms] = await sequelize.query(
        'SELECT id, status, updatedAt FROM contact_forms WHERE id = ?',
        { replacements: [id] }
      );

      const updatedForm = updatedForms[0];

      logger.auditLog('CONTACT_FORM_STATUS_UPDATED', req.user?.username || 'anonymous', {
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
          updatedAt: updatedForm.updatedAt
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
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete contact form (super admin only)
  async deleteContactForm(req, res) {
    try {
      const { id } = req.params;

      // Check if contact exists and get data for audit log using raw SQL
      const [existingForms] = await sequelize.query(`
        SELECT id, first_name, last_name, email, partnership_category, submission_date
        FROM contact_forms 
        WHERE id = ?
      `, { 
        replacements: [id] 
      });

      if (existingForms.length === 0) {
        return res.status(404).json({
          error: 'Contact form not found',
          message: 'The requested contact form does not exist'
        });
      }

      const form = existingForms[0];

      // Store form data for audit log before deletion
      const formData = {
        id: form.id,
        firstName: form.first_name,
        lastName: form.last_name,
        email: form.email,
        partneringCategory: form.partnership_category,
        submissionDate: form.submission_date
      };

      // Delete the contact using raw SQL
      const [deleteResult] = await sequelize.query(
        'DELETE FROM contact_forms WHERE id = ?',
        { replacements: [id] }
      );

      logger.auditLog('CONTACT_FORM_DELETED', req.user?.username || 'anonymous', {
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
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get contact form statistics (admin only)
  async getContactFormStats(req, res) {
    try {
      const { Op } = require('sequelize');
      
      // Use raw queries to avoid field mapping issues
      const [totalResult] = await sequelize.query('SELECT COUNT(*) as count FROM contact_forms');
      const totalSubmissions = totalResult[0].count;
      
      // This month's submissions
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const [thisMonthResult] = await sequelize.query(
        'SELECT COUNT(*) as count FROM contact_forms WHERE submission_date >= ?',
        { replacements: [startOfMonth] }
      );
      const thisMonth = thisMonthResult[0].count;

      // Last 30 days
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [recentResult] = await sequelize.query(
        'SELECT COUNT(*) as count FROM contact_forms WHERE submission_date >= ?',
        { replacements: [last30Days] }
      );
      const recentSubmissions = recentResult[0].count;

      // Category breakdown
      const [categoryStats] = await sequelize.query(`
        SELECT partnership_category as partneringCategory, 
               COUNT(*) as count, 
               MAX(submission_date) as latestSubmission
        FROM contact_forms 
        GROUP BY partnership_category 
        ORDER BY COUNT(*) DESC
      `);

      // Status breakdown
      const [statusStats] = await sequelize.query(`
        SELECT status, COUNT(*) as count 
        FROM contact_forms 
        GROUP BY status
      `);

      // Individual status counts
      const [pendingResult] = await sequelize.query('SELECT COUNT(*) as count FROM contact_forms WHERE status = "pending"');
      const pendingCount = pendingResult[0].count;

      const [reviewedResult] = await sequelize.query('SELECT COUNT(*) as count FROM contact_forms WHERE status = "reviewed"');
      const reviewedCount = reviewedResult[0].count;

      const [respondedResult] = await sequelize.query('SELECT COUNT(*) as count FROM contact_forms WHERE status = "responded"');
      const respondedCount = respondedResult[0].count;

      const [archivedResult] = await sequelize.query('SELECT COUNT(*) as count FROM contact_forms WHERE status = "archived"');
      const archivedCount = archivedResult[0].count;

      logger.auditLog('ADMIN_VIEWED_CONTACT_STATS', req.user?.username || 'anonymous', {
        totalSubmissions,
        thisMonth,
        pendingCount,
        reviewedCount,
        respondedCount,
        archivedCount
      }, req);

      res.json({
        success: true,
        data: {
          totalSubmissions,
          thisMonth,
          recentSubmissions,
          pendingCount,
          reviewedCount,
          respondedCount,
          archivedCount,
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
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      // Check database connection using raw SQL
      const [dbResult] = await sequelize.query('SELECT COUNT(*) as count FROM contact_forms LIMIT 1');
      const dbCheck = dbResult[0].count !== undefined;
      
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
          database: dbCheck ? 'healthy' : 'unhealthy',
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