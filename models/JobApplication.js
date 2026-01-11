const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class JobApplication extends Model {
  // Instance method to get safe object for API responses
  toSafeObject() {
    const {
      id,
      jobId,
      name,
      email,
      phone,
      currentLocation,
      currentDesignation,
      currentLastOrganisation,
      highestEducation,
      noticePeriod,
      comfortableToRelocate,
      totalExperience,
      reasonForJobChange,
      resumeUrl,
      coverLetter,
      status,
      appliedAt,
      createdAt,
      updatedAt
    } = this;

    const result = {
      id,
      jobId,
      name,
      email,
      phone,
      currentLocation,
      currentDesignation,
      currentLastOrganisation,
      highestEducation,
      noticePeriod,
      comfortableToRelocate,
      totalExperience,
      reasonForJobChange,
      resumeUrl,
      coverLetter,
      status,
      appliedAt,
      createdAt,
      updatedAt
    };

    // Include job relationship if it exists
    if (this.job) {
      result.job = {
        id: this.job.id,
        title: this.job.title,
        department: this.job.department
      };
    }

    return result;
  }

  // Instance method to get public object (limited fields)
  toPublicObject() {
    const {
      id,
      name,
      appliedAt,
      status
    } = this;

    return {
      id,
      name,
      appliedAt,
      status
    };
  }
}

JobApplication.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'careers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Foreign key to careers table'
  },
  
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    },
    comment: 'Applicant full name'
  },
  
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true,
      len: [1, 255]
    },
    comment: 'Applicant email address'
  },
  
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      len: [1, 20]
    },
    comment: 'Applicant phone number'
  },
  
  currentLocation: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    },
    comment: 'Applicant current location'
  },
  
  currentDesignation: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    },
    comment: 'Applicant current job designation'
  },
  
  currentLastOrganisation: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    },
    comment: 'Applicant current or last organization'
  },
  
  highestEducation: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    },
    comment: 'Applicant highest education qualification'
  },
  
  noticePeriod: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    },
    comment: 'Applicant notice period'
  },
  
  comfortableToRelocate: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether applicant is comfortable to relocate'
  },
  
  totalExperience: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    },
    comment: 'Applicant total work experience'
  },
  
  reasonForJobChange: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for job change'
  },
  
  resumeUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL/path to uploaded resume file'
  },
  
  coverLetter: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Cover letter content'
  },
  
  status: {
    type: DataTypes.ENUM('New', 'Reviewing', 'Shortlisted', 'Interviewed', 'Rejected', 'Hired', 'Withdrawn'),
    allowNull: false,
    defaultValue: 'New',
    comment: 'Application status'
  },
  
  appliedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when application was submitted'
  }
}, {
  sequelize,
  modelName: 'JobApplication',
  tableName: 'job_applications',
  
  timestamps: true,
  
  indexes: [
    {
      fields: ['jobId'],
      name: 'idx_job_applications_job_id'
    },
    {
      fields: ['status'],
      name: 'idx_job_applications_status'
    },
    {
      fields: ['email'],
      name: 'idx_job_applications_email'
    },
    {
      fields: ['appliedAt'],
      name: 'idx_job_applications_applied_at'
    },
    {
      fields: ['createdAt'],
      name: 'idx_job_applications_created_at'
    }
  ],
  
  hooks: {
    beforeCreate: (application) => {
      // Set appliedAt timestamp if not provided
      if (!application.appliedAt) {
        application.appliedAt = new Date();
      }
    }
  }
});

module.exports = JobApplication;