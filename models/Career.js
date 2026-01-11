const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Career extends Model {
  // Instance method to get safe object for API responses
  toSafeObject() {
    return {
      id: this.id,
      title: this.title,
      department: this.department,
      employmentType: this.employmentType,
      experienceLevel: this.experienceLevel,
      responsibilities: this.responsibilities,
      requirements: this.desired_qualities, // Map to the renamed column
      qualifications: this.qualifications,
      status: this.status,
      applicationCount: this.applicationCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      lastModifiedBy: this.lastModifiedBy,
      publishedBy: this.publishedBy,
      publishedAt: this.publishedAt,
      closedAt: this.closedAt
    };
  }

  // Instance method to get public object for public API responses (no sensitive data)
  toPublicObject() {
    return {
      id: this.id,
      title: this.title,
      department: this.department,
      employmentType: this.employmentType,
      experienceLevel: this.experienceLevel,
      responsibilities: this.responsibilities,
      requirements: this.desired_qualities, // Map to the renamed column
      qualifications: this.qualifications,
      publishedAt: this.publishedAt
    };
  }
}

Career.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    },
    comment: 'Job title'
  },
  
  department: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    },
    comment: 'Department or team'
  },
  
  employmentType: {
    type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'internship', 'temporary'),
    allowNull: false,
    defaultValue: 'full-time',
    comment: 'Type of employment'
  },
  
  experienceLevel: {
    type: DataTypes.ENUM('entry-level', 'mid-level', 'senior-level', 'executive', 'internship'),
    allowNull: false,
    defaultValue: 'mid-level',
    comment: 'Required experience level'
  },
  
  responsibilities: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of job responsibilities'
  },
  
  desired_qualities: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of desired qualities (renamed from requirements)'
  },
  
  qualifications: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of required qualifications'
  },
  
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'closed', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Job posting status'
  },
  
  applicationCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of applications received'
  },
  
  // Audit fields
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of user who created this job posting'
  },
  
  lastModifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of user who last modified this job posting'
  },
  
  publishedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID of user who published this job posting'
  },
  
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when the job was published'
  },
  
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when the job was closed'
  }
}, {
  sequelize,
  modelName: 'Career',
  tableName: 'careers',
  timestamps: true,
  
  indexes: [
    {
      fields: ['status'],
      name: 'idx_careers_status'
    },
    {
      fields: ['department'],
      name: 'idx_careers_department'
    },
    {
      fields: ['employmentType'],
      name: 'idx_careers_employment_type'
    },
    {
      fields: ['experienceLevel'],
      name: 'idx_careers_experience_level'
    },
    {
      fields: ['createdBy'],
      name: 'idx_careers_created_by'
    },
    {
      fields: ['publishedAt'],
      name: 'idx_careers_published_at'
    }
  ],
  
  hooks: {
    beforeUpdate: (career) => {
      // Set publishedAt timestamp when status changes to active
      if (career.changed('status') && career.status === 'active' && !career.publishedAt) {
        career.publishedAt = new Date();
      }
      
      // Set closedAt timestamp when status changes to closed
      if (career.changed('status') && career.status === 'closed' && !career.closedAt) {
        career.closedAt = new Date();
      }
    }
  }
});

module.exports = Career;