const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Login controller
const login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password } = req.body;
    const identifier = username || email;

    // Find user by username or email
    const user = await User.findOne({
      where: username ? { username } : { email }
    });

    if (!user) {
      logger.auditLog('LOGIN_FAILED', identifier, {
        reason: 'User not found',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, req);

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - new Date()) / 1000 / 60);
      
      logger.auditLog('LOGIN_BLOCKED', user.username, {
        reason: 'Account locked',
        lockTimeRemaining,
        ip: req.ip
      }, req);

      return res.status(423).json({
        error: 'Account locked',
        message: `Account is locked for ${lockTimeRemaining} more minutes`
      });
    }

    // Check if account is active
    if (!user.isActive) {
      logger.auditLog('LOGIN_FAILED', user.username, {
        reason: 'Account deactivated',
        ip: req.ip
      }, req);

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await user.checkPassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts += 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        logger.auditLog('ACCOUNT_LOCKED', user.username, {
          reason: 'Too many failed login attempts',
          attempts: user.loginAttempts,
          ip: req.ip
        }, req);
      }
      
      await user.save();

      logger.auditLog('LOGIN_FAILED', user.username, {
        reason: 'Invalid password',
        attempts: user.loginAttempts,
        ip: req.ip
      }, req);

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Successful login - reset login attempts and update last login
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user.id);

    logger.auditLog('LOGIN_SUCCESS', user.username, {
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, req);

    res.json({
      message: 'Login successful',
      token,
      user: user.toSafeObject()
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

// Logout controller (mainly for audit logging)
const logout = async (req, res) => {
  try {
    logger.auditLog('LOGOUT', req.user.username, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, req);

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      user: req.user.toSafeObject()
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'Internal server error'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    // Verify current password
    const isCurrentPasswordValid = await user.checkPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      logger.auditLog('PASSWORD_CHANGE_FAILED', user.username, {
        reason: 'Invalid current password',
        ip: req.ip
      }, req);

      return res.status(400).json({
        error: 'Password change failed',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by the beforeUpdate hook
    user.lastModifiedBy = user.id;
    await user.save();

    logger.auditLog('PASSWORD_CHANGED', user.username, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, req);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'Internal server error'
    });
  }
};

// Request password reset (for future implementation)
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    logger.auditLog('PASSWORD_RESET_REQUESTED', user.username, {
      email: user.email,
      ip: req.ip
    }, req);

    // TODO: Send email with reset link
    // For now, just log the token (remove in production)
    logger.info(`Password reset token for ${user.email}: ${resetToken}`);

    res.json({
      message: 'If the email exists, a password reset link has been sent'
    });

  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: 'Internal server error'
    });
  }
};

// Verify token (for checking if user is still authenticated)
const verifyToken = async (req, res) => {
  try {
    res.json({
      valid: true,
      user: req.user.toSafeObject()
    });

  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({
      error: 'Token verification failed',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  login,
  logout,
  getProfile,
  changePassword,
  requestPasswordReset,
  verifyToken
};