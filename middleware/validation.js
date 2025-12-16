const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

// Contact form validation rules
const contactFormValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters'),
    
  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
    
  body('institution')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Institution name must not exceed 200 characters')
    .matches(/^[a-zA-Z0-9\s\-.,&()]+$/)
    .withMessage('Institution name contains invalid characters'),
    
  body('partneringCategory')
    .trim()
    .isIn([
      'Clinical Collaboration',
      'Research Partnership',
      'Technology Licensing',
      'Manufacturing Partnership',
      'Distribution Partnership',
      'Investment Opportunity',
      'Media Inquiry',
      'General Inquiry',
      'Other'
    ])
    .withMessage('Please select a valid partnering category'),
    
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
    .matches(/^[a-zA-Z0-9\s\-.,!?()'"@#$%&*+=\n\r]+$/)
    .withMessage('Message contains invalid characters'),
    
  body('consentGiven')
    .isBoolean()
    .withMessage('Consent must be explicitly given')
    .custom((value) => {
      if (value !== true) {
        throw new Error('You must consent to data processing to submit this form');
      }
      return true;
    })
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    logger.auditLog('VALIDATION_FAILED', 'anonymous', {
      errors: errorDetails,
      ip: req.ip,
      endpoint: req.path
    }, req);
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errorDetails
    });
  }
  
  next();
};

// Additional business logic validation
const businessValidation = (req, res, next) => {
  const { email, phone, institution, partneringCategory } = req.body;
  
  // Healthcare-specific validation rules
  const healthcareInstitutions = [
    'hospital', 'clinic', 'medical', 'health', 'pharma', 'biotech', 
    'research', 'university', 'institute', 'center', 'foundation'
  ];
  
  // If partnering category suggests healthcare context, validate institution
  const healthcareCategories = [
    'Clinical Collaboration',
    'Research Partnership',
    'Technology Licensing',
    'Manufacturing Partnership'
  ];
  
  if (healthcareCategories.includes(partneringCategory)) {
    if (!institution || institution.trim().length === 0) {
      return res.status(400).json({
        error: 'Institution is required for healthcare-related inquiries'
      });
    }
    
    // Check if institution name suggests healthcare context
    const institutionLower = institution.toLowerCase();
    const isHealthcareRelated = healthcareInstitutions.some(keyword => 
      institutionLower.includes(keyword)
    );
    
    if (!isHealthcareRelated) {
      logger.auditLog('SUSPICIOUS_INSTITUTION', 'anonymous', {
        institution,
        partneringCategory,
        email,
        ip: req.ip
      }, req);
    }
  }
  
  // Email domain validation for certain categories
  if (partneringCategory === 'Media Inquiry') {
    const emailDomain = email.split('@')[1];
    const mediaDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'
    ];
    
    if (mediaDomains.includes(emailDomain)) {
      logger.auditLog('MEDIA_INQUIRY_PERSONAL_EMAIL', 'anonymous', {
        email: emailDomain,
        ip: req.ip
      }, req);
    }
  }
  
  next();
};

// Honeypot validation (anti-bot measure)
const honeypotValidation = (req, res, next) => {
  // Check for honeypot field (should be empty)
  if (req.body.website && req.body.website.trim() !== '') {
    logger.auditLog('BOT_DETECTED_HONEYPOT', 'anonymous', {
      honeypotValue: req.body.website,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, req);
    
    // Return success to not alert bots, but don't process
    return res.status(200).json({
      success: true,
      message: 'Thank you for your submission'
    });
  }
  
  // Remove honeypot field from request body
  delete req.body.website;
  next();
};

module.exports = {
  contactFormValidation,
  handleValidationErrors,
  businessValidation,
  honeypotValidation
};