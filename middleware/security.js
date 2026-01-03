const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
// Note: Removed express-mongo-sanitize as we're using MySQL with Sequelize ORM
const xss = require('xss');
const hpp = require('hpp');
const logger = require('../config/logger');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.auditLog('RATE_LIMIT_EXCEEDED', 'anonymous', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method
      }, req);
      
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

const contactFormLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5, // limit each IP to 5 contact form submissions per hour
  'Too many contact form submissions from this IP, please try again later.'
);

const strictLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 requests per windowMs
  'Too many requests to sensitive endpoint, please try again later.'
);

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false, // Disable CSP in development
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false, // Disable in development
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false // Disable HSTS in development
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize against XSS (SQL injection protection handled by Sequelize ORM)
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  
  if (req.query) {
    for (let key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    }
  }
  
  next();
};

// Request logging middleware for audit trail
const auditMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.auditLog('REQUEST_RECEIVED', 'anonymous', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer')
  }, req);
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.auditLog('REQUEST_COMPLETED', 'anonymous', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length')
    }, req);
  });
  
  next();
};

// HIPAA compliance middleware
const hipaaCompliance = (req, res, next) => {
  // Add HIPAA-specific headers (less restrictive in development)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Be less restrictive with frame options in development
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('X-Frame-Options', 'DENY');
  } else {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }
  
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Less restrictive permissions policy in development
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
  
  // Ensure HTTPS in production
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
    logger.auditLog('INSECURE_REQUEST_BLOCKED', 'anonymous', {
      url: req.url,
      protocol: req.protocol
    }, req);
    
    return res.status(403).json({
      error: 'HTTPS required for healthcare data transmission'
    });
  }
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = {
  generalLimiter,
  contactFormLimiter,
  strictLimiter,
  securityHeaders,
  sanitizeInput,
  auditMiddleware,
  hipaaCompliance,
  errorHandler,
  hpp: hpp()
};