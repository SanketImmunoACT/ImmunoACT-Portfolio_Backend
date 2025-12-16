const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User extends Model {
  // Instance method to check password
  async checkPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Instance method to get user without sensitive data
  toSafeObject() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static method to create user with hashed password
  static async createUser(userData) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    return await this.create({
      ...userData,
      password: hashedPassword
    });
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      isAlphanumeric: true
    },
    comment: 'Unique username for login'
  },
  
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    },
    comment: 'User email address'
  },
  
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Hashed password'
  },
  
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    },
    comment: 'User first name'
  },
  
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    },
    comment: 'User last name'
  },
  
  role: {
    type: DataTypes.ENUM('super_admin', 'office_executive', 'hr_manager'),
    allowNull: false,
    defaultValue: 'office_executive',
    comment: 'User role for RBAC'
  },
  
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether user account is active'
  },
  
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last login timestamp'
  },
  
  loginAttempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Failed login attempts counter'
  },
  
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Account lock expiration time'
  },
  
  resetPasswordToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Password reset token'
  },
  
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Password reset token expiration'
  },
  
  // Audit fields
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of user who created this account'
  },
  
  lastModifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of user who last modified this account'
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  
  indexes: [
    {
      fields: ['username'],
      unique: true,
      name: 'idx_username'
    },
    {
      fields: ['email'],
      unique: true,
      name: 'idx_email'
    },
    {
      fields: ['role'],
      name: 'idx_role'
    },
    {
      fields: ['isActive'],
      name: 'idx_is_active'
    },
    {
      fields: ['lastLogin'],
      name: 'idx_last_login'
    }
  ],
  
  hooks: {
    beforeCreate: async (user) => {
      // Hash password before creating user
      if (user.password) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    },
    beforeUpdate: async (user) => {
      // Hash password if it's being changed
      if (user.changed('password')) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    }
  }
});

module.exports = User;