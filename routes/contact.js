const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { 
  contactFormValidation, 
  handleValidationErrors, 
  businessValidation,
  honeypotValidation 
} = require('../middleware/validation');
const { 
  contactFormLimiter, 
  strictLimiter 
} = require('../middleware/security');
const {
  authenticateToken,
  authorize
} = require('../middleware/auth');

// Public routes

// Submit contact form
router.post('/submit', 
  contactFormLimiter,
  honeypotValidation,
  contactFormValidation,
  handleValidationErrors,
  businessValidation,
  contactController.submitContactForm
);

// Health check
router.get('/health', contactController.healthCheck);

// Admin routes - Protected with authentication and role-based access

// Get all contact forms with filtering and pagination
router.get('/admin/forms', 
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  contactController.getContactForms
);

// Get single contact form by ID
router.get('/admin/forms/:id',
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  contactController.getContactFormById
);

// Update contact form status
router.patch('/admin/forms/:id/status',
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  contactController.updateContactFormStatus
);

// Delete contact form (super admin only)
router.delete('/admin/forms/:id',
  strictLimiter,
  authenticateToken,
  authorize('super_admin'),
  contactController.deleteContactForm
);

// Get contact form statistics
router.get('/admin/stats',
  strictLimiter,
  authenticateToken,
  authorize('super_admin', 'office_executive', 'hr_manager'),
  contactController.getContactFormStats
);

module.exports = router;