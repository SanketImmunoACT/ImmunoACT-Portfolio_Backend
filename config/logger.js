const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';

// Only create logs directory if we're not in a read-only environment
let useFileLogging = true;
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
} catch (error) {
  console.warn('Warning: Cannot create logs directory, using console logging only');
  useFileLogging = false;
}

// Custom format for healthcare compliance logging
const healthcareFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      sessionId: meta.sessionId || 'anonymous',
      userId: meta.userId || 'anonymous',
      ip: meta.ip || 'unknown',
      userAgent: meta.userAgent || 'unknown',
      action: meta.action || 'unknown',
      ...meta
    });
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: healthcareFormat,
  defaultMeta: { service: 'immunoact-backend' },
  transports: [
    // Always add console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Add file transports only if file logging is available
    ...(useFileLogging ? [
      // Error logs
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      }),
      
      // Audit logs for compliance
      new winston.transports.File({
        filename: path.join(logDir, 'audit.log'),
        level: 'info',
        maxsize: 5242880, // 5MB
        maxFiles: 50, // Keep more audit logs
      }),
      
      // Combined logs
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      }),
      
      // Debug logs (only in development)
      ...(process.env.NODE_ENV === 'development' ? [
        new winston.transports.File({
          filename: path.join(logDir, 'debug.log'),
          level: 'debug',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      ] : [])
    ] : [])
  ],
});

// Remove the separate console transport addition since it's now included above

// Healthcare-specific audit logging function
logger.auditLog = (action, userId, details, req) => {
  logger.info('AUDIT_EVENT', {
    action,
    userId,
    ip: req?.ip || req?.connection?.remoteAddress,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString(),
    details,
    sessionId: req?.sessionID
  });
};

module.exports = logger;