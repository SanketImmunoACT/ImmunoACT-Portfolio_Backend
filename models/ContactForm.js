const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ContactForm extends Model {
  // No encryption - store data in plain text for MySQL Workbench visibility
  // This matches the exact 11 required columns
}

ContactForm.init({
  // Required 11 columns exactly as they exist in the database
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  firstName: {
    type: DataTypes.TEXT, // Keep as TEXT to match current database
    allowNull: false,
    field: 'first_name'
  },
  
  lastName: {
    type: DataTypes.TEXT, // Keep as TEXT to match current database
    allowNull: false,
    field: 'last_name'
  },
  
  email: {
    type: DataTypes.TEXT, // Keep as TEXT to match current database
    allowNull: false
    // Remove index since TEXT fields can't have regular indexes
  },
  
  phone: {
    type: DataTypes.TEXT, // Keep as TEXT to match current database
    allowNull: true
  },
  
  institution: {
    type: DataTypes.TEXT, // Keep as TEXT to match current database
    allowNull: true
  },
  
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
    field: 'partnership_category'
  },
  
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  status: {
    type: DataTypes.ENUM('pending', 'reviewed', 'responded', 'archived'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  consentGiven: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'consent_given'
  },
  
  submissionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'submission_date'
  }
}, {
  sequelize,
  modelName: 'ContactForm',
  tableName: 'contact_forms',
  timestamps: true, // Enable createdAt and updatedAt
  
  // Only indexes that work with current column types
  indexes: [
    {
      fields: ['submission_date'],
      name: 'idx_submission_date'
    },
    {
      fields: ['status'],
      name: 'idx_status'
    },
    {
      fields: ['partnership_category'],
      name: 'idx_partnership_category'
    },
    {
      fields: ['createdAt'],
      name: 'idx_created_at'
    },
    {
      fields: ['updatedAt'],
      name: 'idx_updated_at'
    }
  ]
});

// Create audit log table for compliance (simplified)
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
    details: {
      reason: 'Manual deletion'
    }
  });
});

module.exports = { ContactForm, AuditLog };