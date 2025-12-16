const jwt = require('jsonwebtoken');
const { User, Permission, RolePermission } = require('../models');
const logger = require('../config/logger');

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password', 'resetPasswordToken'] }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token - user not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Account is deactivated'
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({
        error: 'Account locked',
        message: 'Account is temporarily locked due to failed login attempts'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.auditLog('UNAUTHORIZED_ACCESS_ATTEMPT', req.user.username, {
        requiredRoles: allowedRoles,
        userRole: req.user.role,
        endpoint: req.originalUrl,
        method: req.method
      }, req);

      return res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'Authentication required'
        });
      }

      // Super admin has all permissions
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Check if user's role has the required permission
      const rolePermission = await RolePermission.findOne({
        include: [{
          model: Permission,
          as: 'permission',
          where: {
            resource: resource,
            action: action
          }
        }],
        where: { role: req.user.role }
      });

      if (!rolePermission) {
        logger.auditLog('PERMISSION_DENIED', req.user.username, {
          requiredPermission: `${resource}:${action}`,
          userRole: req.user.role,
          endpoint: req.originalUrl,
          method: req.method
        }, req);

        return res.status(403).json({
          error: 'Access denied',
          message: `Permission denied: ${resource}:${action}`
        });
      }

      next();

    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({
        error: 'Authorization failed',
        message: 'Internal server error'
      });
    }
  };
};

// Rate limiting for login attempts
const loginRateLimit = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    const identifier = username || email;

    if (!identifier) {
      return next();
    }

    const user = await User.findOne({
      where: username ? { username } : { email }
    });

    if (user && user.lockUntil && user.lockUntil > new Date()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - new Date()) / 1000 / 60);
      return res.status(423).json({
        error: 'Account locked',
        message: `Account is locked for ${lockTimeRemaining} more minutes`
      });
    }

    next();

  } catch (error) {
    logger.error('Login rate limit check error:', error);
    next();
  }
};

// Middleware to check if user is admin (super_admin or office_executive)
const requireAdmin = authorize('super_admin', 'office_executive');

// Middleware to check if user is HR
const requireHR = authorize('super_admin', 'hr_manager');

// Middleware to check if user is super admin
const requireSuperAdmin = authorize('super_admin');

module.exports = {
  authenticateToken,
  authorize,
  requirePermission,
  loginRateLimit,
  requireAdmin,
  requireHR,
  requireSuperAdmin
};