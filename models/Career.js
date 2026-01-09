const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Career extends Model {
  // Instance method to get safe object for API responses
  toSafeObject() {
    return {
      id: this.id,
      title: this.title,
      department: this.department,
      location: this.location,
      employmentType: this.employmentType,
      experienceLevel: this.experienceLevel,
      salaryRange: this.salaryRange,
      description: this.description,
      responsibilities: this.responsibilities,
      requirements: this.requirements,
      qualifications: this.qualifications,
      benefits: this.benefits,
      applicationDeadline: this.applicationDeadline,
      status: this.status,
      isRemote: this.isRemote,
      tags: this.tags,
      applicationEmail: this.applicationEmail,
      applicationUrl: this.applicationUrl,
      viewCount: this.viewCount,
      applicationCount: this.applicationCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      lastModifiedBy: this.lastModifiedBy
    };
  }

  // Instance method to get public object for public API responses (no sensitive data)
  toPublicObject() {
    return {
      id: this.id,
      title: this.title,
      department: this.department,
      location: this.location,
      employmentType: this.employmentType,
      experienceLevel: this.experienceLevel,
      salaryRange: this.salaryRange,
      description: this.description,
      responsibilities: this.responsibilities,
      requirements: this.requirements,
      qualifications: this.qualifications,
      benefits: this.benefits,
      applicationDeadline: this.applicationDeadline,
      isRemote: this.isRemote,
      tags: this.tags,
      applicationEmail: this.applicationEmail,
      applicationUrl: this.applicationUrl,
      urgency: this.urgency,
      workSchedule: this.workSchedule,
      travelRequired: this.travelRequired,
      publishedAt: this.publishedAt,
      // Convert arrays to proper format for frontend
      keyResponsibilities: this.responsibilities,
      desiredQualities: this.benefits
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
  
  location: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    },
    comment: 'Job location (city, state, country)'
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
  
  salaryRange: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Salary range (e.g., $50,000 - $70,000)'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Job description and overview'
  },
  
  responsibilities: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of job responsibilities'
  },
  
  requirements: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of job requirements'
  },
  
  qualifications: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of required qualifications'
  },
  
  benefits: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of job benefits'
  },
  
  applicationDeadline: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Application deadline'
  },
  
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'closed', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Job posting status'
  },
  
  isRemote: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the job allows remote work'
  },
  
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of tags for categorization'
  },
  
  applicationEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    },
    comment: 'Email for job applications'
  },
  
  applicationUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: true
    },
    comment: 'External URL for job applications'
  },
  
  // SEO and metadata
  metaTitle: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'SEO meta title'
  },
  
  metaDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'SEO meta description'
  },
  
  // Analytics
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times the job was viewed'
  },
  
  applicationCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of applications received'
  },
  
  // Additional fields
  urgency: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium',
    comment: 'Hiring urgency level'
  },
  
  workSchedule: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Work schedule details (e.g., 9 AM - 5 PM, Flexible)'
  },
  
  travelRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether travel is required for the job'
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
      fields: ['location'],
      name: 'idx_careers_location'
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
    },
    {
      fields: ['applicationDeadline'],
      name: 'idx_careers_application_deadline'
    },
    {
      fields: ['isRemote'],
      name: 'idx_careers_is_remote'
    },
    {
      fields: ['urgency'],
      name: 'idx_careers_urgency'
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