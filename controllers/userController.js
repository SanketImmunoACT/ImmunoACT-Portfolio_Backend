const { User } = require('../models');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }
    
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password', 'resetPasswordToken'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    logger.auditLog('USERS_VIEWED', req.user.username, {
      filters: { role, isActive, search },
      resultCount: users.length,
      ip: req.ip
    }, req);

    res.json({
      users: users.map(user => user.toSafeObject()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalUsers: count,
        hasNext: offset + users.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: 'Internal server error'
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'resetPasswordToken'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }

    logger.auditLog('USER_VIEWED', req.user.username, {
      viewedUserId: id,
      viewedUsername: user.username,
      ip: req.ip
    }, req);

    res.json({
      user: user.toSafeObject()
    });

  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: 'Internal server error'
    });
  }
};

// Create new user (super admin only)
const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password, firstName, lastName, role } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: existingUser.username === username 
          ? 'Username is already taken' 
          : 'Email is already registered'
      });
    }

    // Create user
    const newUser = await User.createUser({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'office_executive',
      createdBy: req.user.id
    });

    logger.auditLog('USER_CREATED', req.user.username, {
      newUserId: newUser.id,
      newUsername: newUser.username,
      newUserRole: newUser.role,
      ip: req.ip
    }, req);

    res.status(201).json({
      message: 'User created successfully',
      user: newUser.toSafeObject()
    });

  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: 'Internal server error'
    });
  }
};

// Update user (super admin only, or users can update their own profile)
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { firstName, lastName, email, role, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }

    // Check permissions - users can only update their own profile (except role and isActive)
    if (req.user.role !== 'super_admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own profile'
      });
    }

    // Only super admin can change role and isActive
    if (req.user.role !== 'super_admin' && (role !== undefined || isActive !== undefined)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only super admin can change role or account status'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          error: 'Email already exists',
          message: 'Email is already registered to another user'
        });
      }
    }

    // Update user
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined && req.user.role === 'super_admin') updateData.role = role;
    if (isActive !== undefined && req.user.role === 'super_admin') updateData.isActive = isActive;
    updateData.lastModifiedBy = req.user.id;

    await user.update(updateData);

    logger.auditLog('USER_UPDATED', req.user.username, {
      updatedUserId: id,
      updatedUsername: user.username,
      changes: Object.keys(updateData),
      ip: req.ip
    }, req);

    res.json({
      message: 'User updated successfully',
      user: user.toSafeObject()
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: 'Internal server error'
    });
  }
};

// Delete user (super admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      });
    }

    // Prevent deleting self
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: 'You cannot delete your own account'
      });
    }

    await user.destroy();

    logger.auditLog('USER_DELETED', req.user.username, {
      deletedUserId: id,
      deletedUsername: user.username,
      deletedUserRole: user.role,
      ip: req.ip
    }, req);

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: 'Internal server error'
    });
  }
};

// Get user statistics (admin only)
const getUserStats = async (req, res) => {
  try {
    const stats = await User.findAll({
      attributes: [
        'role',
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    const activeUsers = await User.count({ where: { isActive: true } });
    const totalUsers = await User.count();

    logger.auditLog('USER_STATS_VIEWED', req.user.username, {
      ip: req.ip
    }, req);

    res.json({
      roleDistribution: stats,
      activeUsers,
      totalUsers,
      inactiveUsers: totalUsers - activeUsers
    });

  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch user statistics',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
};