const cookieParser = require('cookie-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const cookieService = require('../services/cookieService');
const { sequelize } = require('../config/database');
const logger = require('../config/logger');

/**
 * Cookie and Session Middleware Configuration
 * HIPAA-compliant cookie handling with secure defaults
 */

// Create session store using Sequelize
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'Sessions',
  checkExpirationInterval: 15 * 60 * 1000, // Clean up expired sessions every 15 minutes
  expiration: 8 * 60 * 60 * 1000 // 8 hours
});

// Sync session store
sessionStore.sync();

/**
 * Cookie parser middleware with signed cookies
 */
const cookieParserMiddleware = cookieParser(
  process.env.COOKIE_SECRET || cookieService.cookieSecret,
  {
    decode: (value) => {
      try {
        return decodeURIComponent(value);
      } catch (error) {
        logger.error('Cookie decode error:', error);
        return value;
      }
    }
  }
);

/**
 * Session middleware configuration
 */
const sessionMiddleware = session({
  ...cookieService.getSessionConfig(),
  store: sessionStore,
  
  // Custom session ID generation for HIPAA compliance
  genid: (req) => {
    const sessionId = cookieService.generateSecret();
    
    logger.auditLog('SESSION_CREATED', req.user?.id || 'anonymous', {
      sessionId: sessionId.substring(0, 8) + '...', // Log partial ID for audit
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return sessionId;
  }
});

/**
 * HIPAA compliance middleware for sensitive operations
 */
const hipaaSessionMiddleware = (req, res, next) => {
  // For HIPAA-sensitive routes, use stricter session settings
  if (req.path.includes('/api/v1/contact') || 
      req.path.includes('/api/v1/users') ||
      req.path.includes('/api/v1/auth')) {
    
    // Check if session exists and is valid
    if (req.session && req.session.userId) {
      const sessionAge = Date.now() - (req.session.lastAccess || 0);
      const maxHipaaSessionAge = 30 * 60 * 1000; // 30 minutes for HIPAA
      
      if (sessionAge > maxHipaaSessionAge) {
        logger.auditLog('HIPAA_SESSION_EXPIRED', req.session.userId, {
          sessionAge,
          maxAge: maxHipaaSessionAge,
          path: req.path
        });
        
        req.session.destroy((err) => {
          if (err) {
            logger.error('Session destruction error:', err);
          }
        });
        
        return res.status(401).json({
          error: 'Session expired',
          message: 'Please log in again for security compliance'
        });
      }
      
      // Update last access time
      req.session.lastAccess = Date.now();
    }
  }
  
  next();
};

/**
 * Cookie security validation middleware
 */
const cookieSecurityMiddleware = (req, res, next) => {
  // Validate cookie integrity
  const cookies = Object.keys(req.cookies || {});
  const signedCookies = Object.keys(req.signedCookies || {});
  
  // Log suspicious cookie activity
  if (cookies.length > 10 || signedCookies.length > 5) {
    logger.auditLog('SUSPICIOUS_COOKIE_ACTIVITY', req.user?.id || 'anonymous', {
      cookieCount: cookies.length,
      signedCookieCount: signedCookies.length,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  
  // Check for tampered cookies
  cookies.forEach(cookieName => {
    if (cookieName.startsWith('immunoact_') && !req.signedCookies[cookieName]) {
      logger.auditLog('COOKIE_TAMPERING_DETECTED', req.user?.id || 'anonymous', {
        cookieName,
        ip: req.ip
      });
      
      // Clear potentially tampered cookie
      res.clearCookie(cookieName);
    }
  });
  
  next();
};

/**
 * Automatic cookie cleanup middleware
 */
const cookieCleanupMiddleware = (req, res, next) => {
  // Clean up expired or invalid cookies
  const cookiesToCheck = ['auth_token', 'session', 'user_prefs'];
  
  cookiesToCheck.forEach(cookieName => {
    const cookieValue = req.signedCookies[cookieName];
    if (cookieValue) {
      const validation = cookieService.validateCookie(cookieValue);
      if (!validation.valid) {
        logger.auditLog('INVALID_COOKIE_REMOVED', req.user?.id || 'anonymous', {
          cookieName,
          reason: validation.reason
        });
        res.clearCookie(cookieName);
      }
    }
  });
  
  next();
};

/**
 * Rate limiting for cookie operations
 */
const cookieRateLimitMiddleware = (req, res, next) => {
  const clientId = req.ip + (req.get('User-Agent') || '');
  const key = `cookie_ops_${Buffer.from(clientId).toString('base64')}`;
  
  // Simple in-memory rate limiting (in production, use Redis)
  if (!global.cookieRateLimit) {
    global.cookieRateLimit = new Map();
  }
  
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxOps = 100; // Max 100 cookie operations per window
  
  const clientData = global.cookieRateLimit.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + windowMs;
  }
  
  clientData.count++;
  global.cookieRateLimit.set(key, clientData);
  
  if (clientData.count > maxOps) {
    logger.auditLog('COOKIE_RATE_LIMIT_EXCEEDED', req.user?.id || 'anonymous', {
      ip: req.ip,
      count: clientData.count,
      maxOps
    });
    
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Cookie operation rate limit exceeded'
    });
  }
  
  next();
};

/**
 * Development cookie debugging middleware
 */
const cookieDebugMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_COOKIES === 'true') {
    console.log('🍪 Cookie Debug Info:', {
      cookies: Object.keys(req.cookies || {}),
      signedCookies: Object.keys(req.signedCookies || {}),
      session: req.session ? {
        id: req.session.id,
        userId: req.session.userId,
        lastAccess: req.session.lastAccess
      } : null
    });
  }
  next();
};

module.exports = {
  cookieParserMiddleware,
  sessionMiddleware,
  hipaaSessionMiddleware,
  cookieSecurityMiddleware,
  cookieCleanupMiddleware,
  cookieRateLimitMiddleware,
  cookieDebugMiddleware,
  sessionStore
};