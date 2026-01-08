const express = require('express');
const router = express.Router();
const cookieService = require('../services/cookieService');
const logger = require('../config/logger');
const { body, validationResult } = require('express-validator');

/**
 * Cookie Management Routes
 * Provides endpoints for cookie operations and testing
 */

/**
 * @route   GET /api/v1/cookies/test
 * @desc    Test cookie functionality
 * @access  Public (for testing)
 */
router.get('/test', (req, res) => {
  try {
    // Set various types of cookies for testing
    res.setSecureCookie('test_cookie', {
      message: 'Hello from secure cookie!',
      timestamp: Date.now()
    });

    res.setSecureCookie('user_prefs', {
      theme: 'dark',
      language: 'en',
      notifications: true
    }, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: false // Allow client access for preferences
    });

    logger.auditLog('COOKIE_TEST_EXECUTED', 'anonymous', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Test cookies have been set',
      cookies: {
        test_cookie: 'Secure encrypted cookie with timestamp',
        user_prefs: 'User preferences cookie (client accessible)'
      }
    });
  } catch (error) {
    logger.error('Cookie test failed:', error);
    res.status(500).json({
      error: 'Cookie test failed',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/cookies/read
 * @desc    Read and validate cookies
 * @access  Public (for testing)
 */
router.get('/read', (req, res) => {
  try {
    const testCookie = req.getSecureCookie('test_cookie');
    const userPrefs = req.getSecureCookie('user_prefs');
    const sessionData = req.validateSession();

    logger.auditLog('COOKIE_READ_EXECUTED', req.user?.id || 'anonymous', {
      cookiesFound: {
        test_cookie: !!testCookie,
        user_prefs: !!userPrefs,
        session: !!sessionData
      }
    });

    res.json({
      success: true,
      cookies: {
        test_cookie: testCookie,
        user_prefs: userPrefs,
        session: sessionData ? {
          userId: sessionData.userId,
          sessionId: sessionData.sessionId,
          age: Date.now() - sessionData.timestamp
        } : null
      },
      allCookies: {
        regular: Object.keys(req.cookies || {}),
        signed: Object.keys(req.signedCookies || {})
      }
    });
  } catch (error) {
    logger.error('Cookie read failed:', error);
    res.status(500).json({
      error: 'Cookie read failed',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/v1/cookies/set-preference
 * @desc    Set user preference cookie
 * @access  Public
 */
router.post('/set-preference', [
  body('preferences').isObject().withMessage('Preferences must be an object'),
  body('preferences.theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme'),
  body('preferences.language').optional().isLength({ min: 2, max: 5 }).withMessage('Invalid language code'),
  body('preferences.notifications').optional().isBoolean().withMessage('Notifications must be boolean')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { preferences } = req.body;

    // Sanitize preferences
    const sanitizedPrefs = {
      theme: preferences.theme || 'light',
      language: preferences.language || 'en',
      notifications: preferences.notifications !== false,
      timezone: preferences.timezone || 'UTC',
      updatedAt: Date.now()
    };

    res.setSecureCookie('user_prefs', sanitizedPrefs, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: false, // Allow client access
      secure: false // Less strict for preferences
    });

    logger.auditLog('USER_PREFERENCES_SET', req.user?.id || 'anonymous', {
      preferences: sanitizedPrefs,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Preferences saved successfully',
      preferences: sanitizedPrefs
    });
  } catch (error) {
    logger.error('Set preference failed:', error);
    res.status(500).json({
      error: 'Failed to set preferences',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/v1/cookies/create-session
 * @desc    Create a user session (for testing)
 * @access  Public (in real app, this would be protected)
 */
router.post('/create-session', [
  body('userId').isInt({ min: 1 }).withMessage('Valid user ID required'),
  body('userData').optional().isObject().withMessage('User data must be an object')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, userData = {} } = req.body;

    // Create session cookie
    const sessionCookie = cookieService.createSessionCookie(userId, {
      ...userData,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.cookie(sessionCookie.name, sessionCookie.value, sessionCookie.options);

    // Also set in express session
    req.session.userId = userId;
    req.session.userData = userData;
    req.session.loginTime = Date.now();
    req.session.lastAccess = Date.now();

    logger.auditLog('SESSION_CREATED_VIA_API', userId, {
      sessionId: req.session.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Session created successfully',
      session: {
        userId,
        sessionId: req.session.id,
        expiresIn: sessionCookie.options.maxAge
      }
    });
  } catch (error) {
    logger.error('Session creation failed:', error);
    res.status(500).json({
      error: 'Session creation failed',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/v1/cookies/clear
 * @desc    Clear specific cookies
 * @access  Public
 */
router.post('/clear', [
  body('cookieNames').isArray().withMessage('Cookie names must be an array'),
  body('cookieNames.*').isString().withMessage('Cookie names must be strings')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { cookieNames } = req.body;
    const clearedCookies = [];

    cookieNames.forEach(cookieName => {
      res.clearSecureCookie(cookieName);
      clearedCookies.push(cookieName);
    });

    logger.auditLog('COOKIES_CLEARED', req.user?.id || 'anonymous', {
      clearedCookies,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Cookies cleared successfully',
      clearedCookies
    });
  } catch (error) {
    logger.error('Cookie clearing failed:', error);
    res.status(500).json({
      error: 'Cookie clearing failed',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/v1/cookies/session
 * @desc    Destroy current session
 * @access  Public
 */
router.delete('/session', (req, res) => {
  try {
    const sessionId = req.session?.id;
    const userId = req.session?.userId;

    // Destroy express session
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error:', err);
        return res.status(500).json({
          error: 'Session destruction failed',
          message: err.message
        });
      }

      // Clear session cookie
      res.clearSecureCookie('session');
      res.clearCookie('immunoact_session');

      logger.auditLog('SESSION_DESTROYED', userId || 'anonymous', {
        sessionId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Session destroyed successfully'
      });
    });
  } catch (error) {
    logger.error('Session destruction failed:', error);
    res.status(500).json({
      error: 'Session destruction failed',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/cookies/info
 * @desc    Get cookie and session information
 * @access  Public
 */
router.get('/info', (req, res) => {
  try {
    const sessionData = req.validateSession();
    
    res.json({
      success: true,
      info: {
        session: {
          exists: !!req.session,
          id: req.session?.id,
          userId: req.session?.userId,
          isValid: !!sessionData,
          age: sessionData ? Date.now() - sessionData.timestamp : null
        },
        cookies: {
          regular: Object.keys(req.cookies || {}),
          signed: Object.keys(req.signedCookies || {}),
          count: {
            regular: Object.keys(req.cookies || {}).length,
            signed: Object.keys(req.signedCookies || {}).length
          }
        },
        security: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict',
          signed: true
        }
      }
    });
  } catch (error) {
    logger.error('Cookie info retrieval failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve cookie info',
      message: error.message
    });
  }
});

module.exports = router;