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

// Admin routes (would need authentication middleware in production)
// Note: These should be protected with proper authentication

// Get all contact forms with filtering and pagination
router.get('/admin/forms', 
  strictLimiter,
  // authMiddleware, // Add authentication middleware
  // adminMiddleware, // Add admin role middleware
  contactController.getContactForms
);

// Update contact form status
router.patch('/admin/forms/:id/status',
  strictLimiter,
  // authMiddleware,
  // adminMiddleware,
  contactController.updateContactFormStatus
);

// Get contact form statistics
router.get('/admin/stats',
  strictLimiter,
  // authMiddleware,
  // adminMiddleware,
  contactController.getContactFormStats
);

module.exports = router;