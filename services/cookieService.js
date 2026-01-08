const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Secure Cookie Service for HIPAA-compliant applications
 * Handles cookie creation, validation, and management with security best practices
 */
class CookieService {
  constructor() {
    this.cookieSecret = process.env.COOKIE_SECRET || this.generateSecret();
    this.sessionSecret = process.env.SESSION_SECRET || this.generateSecret();
    
    // Default secure cookie options
    this.defaultOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      signed: true
    };

    // HIPAA compliance settings
    this.hipaaOptions = {
      httpOnly: true,
      secure: true, // Always secure for HIPAA
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000, // 30 minutes for sensitive data
      signed: true,
      domain: process.env.COOKIE_DOMAIN || undefined
    };
  }

  /**
   * Generate a cryptographically secure secret
   */
  generateSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Create a secure cookie with encryption
   */
  createSecureCookie(name, value, options = {}) {
    try {
      const cookieOptions = {
        ...this.defaultOptions,
        ...options
      };

      // Encrypt sensitive data
      const encryptedValue = this.encryptValue(value);
      
      logger.auditLog('COOKIE_CREATED', 'system', {
        cookieName: name,
        secure: cookieOptions.secure,
        httpOnly: cookieOptions.httpOnly,
        sameSite: cookieOptions.sameSite,
        maxAge: cookieOptions.maxAge
      });

      return {
        name,
        value: encryptedValue,
        options: cookieOptions
      };
    } catch (error) {
      logger.error('Failed to create secure cookie:', {
        error: error.message,
        cookieName: name
      });
      throw new Error('Cookie creation failed');
    }
  }

  /**
   * Create HIPAA-compliant cookie for healthcare data
   */
  createHipaaCookie(name, value, options = {}) {
    const hipaaOptions = {
      ...this.hipaaOptions,
      ...options
    };

    logger.auditLog('HIPAA_COOKIE_CREATED', 'system', {
      cookieName: name,
      timestamp: new Date().toISOString(),
      secure: hipaaOptions.secure,
      maxAge: hipaaOptions.maxAge
    });

    return this.createSecureCookie(name, value, hipaaOptions);
  }

  /**
   * Encrypt cookie value using AES-256-CBC
   */
  encryptValue(value) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.cookieSecret, 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('Cookie encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt cookie value
   */
  decryptValue(encryptedValue) {
    try {
      const [ivHex, encrypted] = encryptedValue.split(':');
      
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted format');
      }

      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.cookieSecret, 'salt', 32);
      const iv = Buffer.from(ivHex, 'hex');
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Cookie decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Validate cookie integrity and expiration
   */
  validateCookie(cookieValue, maxAge = null) {
    try {
      const decryptedValue = this.decryptValue(cookieValue);
      
      // Check if cookie has timestamp for expiration validation
      if (decryptedValue.timestamp && maxAge) {
        const cookieAge = Date.now() - decryptedValue.timestamp;
        if (cookieAge > maxAge) {
          logger.auditLog('COOKIE_EXPIRED', 'system', {
            cookieAge,
            maxAge
          });
          return { valid: false, reason: 'expired' };
        }
      }

      return { valid: true, data: decryptedValue };
    } catch (error) {
      logger.auditLog('COOKIE_VALIDATION_FAILED', 'system', {
        error: error.message
      });
      return { valid: false, reason: 'invalid' };
    }
  }

  /**
   * Create session cookie with user data
   */
  createSessionCookie(userId, userData = {}) {
    const sessionData = {
      userId,
      ...userData,
      timestamp: Date.now(),
      sessionId: crypto.randomUUID()
    };

    return this.createSecureCookie('session', sessionData, {
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });
  }

  /**
   * Create authentication token cookie
   */
  createAuthCookie(token, options = {}) {
    const authData = {
      token,
      timestamp: Date.now(),
      type: 'auth'
    };

    return this.createSecureCookie('auth_token', authData, {
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      ...options
    });
  }

  /**
   * Create preference cookie (non-sensitive data)
   */
  createPreferenceCookie(preferences) {
    return this.createSecureCookie('user_prefs', preferences, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: false, // Can be less strict for preferences
      httpOnly: false // Allow client-side access for UI preferences
    });
  }

  /**
   * Clear cookie by setting expiration to past
   */
  clearCookie(name, options = {}) {
    logger.auditLog('COOKIE_CLEARED', 'system', {
      cookieName: name,
      timestamp: new Date().toISOString()
    });

    return {
      name,
      value: '',
      options: {
        ...this.defaultOptions,
        ...options,
        expires: new Date(0),
        maxAge: 0
      }
    };
  }

  /**
   * Middleware to set cookies on response
   */
  setCookieMiddleware() {
    return (req, res, next) => {
      // Add helper method to response object
      res.setSecureCookie = (name, value, options = {}) => {
        const cookie = this.createSecureCookie(name, value, options);
        res.cookie(cookie.name, cookie.value, cookie.options);
        return res;
      };

      res.setHipaaCookie = (name, value, options = {}) => {
        const cookie = this.createHipaaCookie(name, value, options);
        res.cookie(cookie.name, cookie.value, cookie.options);
        return res;
      };

      res.clearSecureCookie = (name, options = {}) => {
        const clearCookie = this.clearCookie(name, options);
        res.cookie(clearCookie.name, clearCookie.value, clearCookie.options);
        return res;
      };

      next();
    };
  }

  /**
   * Middleware to parse and validate cookies
   */
  parseCookieMiddleware() {
    return (req, res, next) => {
      // Add helper method to request object
      req.getSecureCookie = (name) => {
        const cookieValue = req.signedCookies[name] || req.cookies[name];
        if (!cookieValue) return null;

        const validation = this.validateCookie(cookieValue);
        return validation.valid ? validation.data : null;
      };

      req.validateSession = () => {
        const sessionData = req.getSecureCookie('session');
        if (!sessionData) return null;

        // Additional session validation logic
        const sessionAge = Date.now() - sessionData.timestamp;
        const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours

        if (sessionAge > maxSessionAge) {
          logger.auditLog('SESSION_EXPIRED', sessionData.userId, {
            sessionAge,
            maxSessionAge
          });
          return null;
        }

        return sessionData;
      };

      next();
    };
  }

  /**
   * Get cookie configuration for express-session
   */
  getSessionConfig() {
    return {
      secret: this.sessionSecret,
      name: 'immunoact_session',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        sameSite: 'strict'
      },
      // Additional security for HIPAA compliance
      genid: () => {
        return crypto.randomUUID();
      }
    };
  }
}

module.exports = new CookieService();