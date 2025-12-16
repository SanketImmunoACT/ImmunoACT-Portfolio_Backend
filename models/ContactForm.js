const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

// Encryption helper functions
const algorithm = 'aes-256-gcm';
const secretKey = Buffer.from(process.env.DB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');

const encrypt = (text) => {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', secretKey.slice(0, 32), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex')
    });
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

const decrypt = (encryptedData) => {
  if (!encryptedData) return null;
  try {
    const data = JSON.parse(encryptedData);
    const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey.slice(0, 32), Buffer.from(data.iv, 'hex'));
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

class ContactForm extends Model {
  // Instance method to get decrypted data
  getDecryptedData() {
    return {
      id: this.id,
      firstName: decrypt(this.firstName),
      lastName: decrypt(this.lastName),
      email: decrypt(this.email),
      phone: decrypt(this.phone),
      institution: decrypt(this.institution),
      message: decrypt(this.message),
      partneringCategory: this.partneringCategory,
      status: this.status,
      submissionDate: this.submissionDate,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      consentGiven: this.consentGiven,
      dataRetentionDate: this.dataRetentionDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static method to create with encryption
  static async createEncrypted(data) {
    const encryptedData = {
      ...data,
      firstName: encrypt(data.firstName),
      lastName: encrypt(data.lastName),
      email: encrypt(data.email),
      phone: data.phone ? encrypt(data.phone) : null,
      institution: data.institution ? encrypt(data.institution) : null,
      message: encrypt(data.message)
    };
    
    return await this.create(encryptedData);
  }
}

ContactForm.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Encrypted personal information (stored as TEXT to hold JSON)
  firstName: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Encrypted first name'
  },
  
  lastName: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Encrypted last name'
  },
  
  email: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Encrypted email address'
  },
  
  phone: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Encrypted phone number'
  },
  
  institution: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Encrypted institution name'
  },
  
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Encrypted message content'
  },
  
  // Non-sensitive data (can be stored as plain text)
  partneringCategory: {
    type: DataTypes.ENUM(
      'Clinical Collaboration',
      'Research Partnership',
      'Technology Licensing',
      'Manufacturing Partnership',
      'Distribution Partnership',
      'Investment Opportunity',
      'Media Inquiry',
      'General Inquiry',
      'Other'
    ),
    allowNull: false,
    comment: 'Type of partnership inquiry'
  },
  
  // Metadata for compliance
  submissionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the form was submitted'
  },
  
  ipAddress: {
    type: DataTypes.STRING(45), // IPv6 support
    allowNull: false,
    comment: 'IP address of submitter'
  },
  
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Browser user agent string'
  },
  
  // Status tracking
  status: {
    type: DataTypes.ENUM('pending', 'reviewed', 'responded', 'archived'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Current status of the inquiry'
  },
  
  // Compliance fields
  consentGiven: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether user consented to data processing'
  },
  
  dataRetentionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => {
      const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS) || 2555; // ~7 years
      return new Date(Date.now() + (retentionDays * 24 * 60 * 60 * 1000));
    },
    comment: 'Date when this record should be automatically deleted'
  },
  
  // Audit trail
  lastModified: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Last modification timestamp'
  },
  
  modifiedBy: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'system',
    comment: 'Who last modified this record'
  }
}, {
  sequelize,
  modelName: 'ContactForm',
  tableName: 'contact_forms',
  timestamps: true, // Adds createdAt and updatedAt
  
  // Indexes for performance and compliance
  indexes: [
    {
      fields: ['submissionDate'],
      name: 'idx_submission_date'
    },
    {
      fields: ['status'],
      name: 'idx_status'
    },
    {
      fields: ['partneringCategory'],
      name: 'idx_partnering_category'
    },
    {
      fields: ['dataRetentionDate'],
      name: 'idx_data_retention_date'
    },
    {
      fields: ['createdAt'],
      name: 'idx_created_at'
    }
  ],
  
  // Hooks for automatic encryption and audit trail
  hooks: {
    beforeUpdate: (instance) => {
      instance.lastModified = new Date();
    }
  }
});

// Create audit log table for compliance
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Action performed (CREATE, READ, UPDATE, DELETE)'
  },
  
  tableName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Table that was affected'
  },
  
  recordId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the affected record'
  },
  
  userId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'anonymous',
    comment: 'User who performed the action'
  },
  
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address of the user'
  },
  
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Browser user agent'
  },
  
  details: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional details about the action'
  },
  
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the action occurred'
  }
}, {
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    {
      fields: ['timestamp'],
      name: 'idx_audit_timestamp'
    },
    {
      fields: ['action'],
      name: 'idx_audit_action'
    },
    {
      fields: ['userId'],
      name: 'idx_audit_user'
    },
    {
      fields: ['tableName', 'recordId'],
      name: 'idx_audit_table_record'
    }
  ]
});

// Add audit logging hooks to ContactForm
ContactForm.addHook('afterCreate', async (instance, options) => {
  await AuditLog.create({
    action: 'CREATE',
    tableName: 'contact_forms',
    recordId: instance.id,
    userId: options.userId || 'system',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    details: {
      partneringCategory: instance.partneringCategory,
      consentGiven: instance.consentGiven
    }
  });
});

ContactForm.addHook('afterUpdate', async (instance, options) => {
  await AuditLog.create({
    action: 'UPDATE',
    tableName: 'contact_forms',
    recordId: instance.id,
    userId: options.userId || 'system',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    details: {
      changes: instance.changed(),
      status: instance.status
    }
  });
});

ContactForm.addHook('afterDestroy', async (instance, options) => {
  await AuditLog.create({
    action: 'DELETE',
    tableName: 'contact_forms',
    recordId: instance.id,
    userId: options.userId || 'system',
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    details: {
      reason: 'Data retention policy or manual deletion'
    }
  });
});

module.exports = { ContactForm, AuditLog };