const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobReferral = sequelize.define('JobReferral', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Referrer Information (Employee)
  referrerName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  referrerEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  referrerPhone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  referrerDepartment: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  referrerEmployeeId: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  // Job Information
  jobTitle: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200]
    }
  },
  jobDescription: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  employmentType: {
    type: DataTypes.ENUM('Full-time', 'Part-time', 'Contract', 'Internship'),
    allowNull: false,
    defaultValue: 'Full-time'
  },
  experienceLevel: {
    type: DataTypes.ENUM('Entry Level', 'Mid Level', 'Senior Level', 'Executive'),
    allowNull: false,
    defaultValue: 'Mid Level'
  },
  salaryRange: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  urgency: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Urgent'),
    allowNull: false,
    defaultValue: 'Medium'
  },

  // Candidate Information (if referring specific person)
  candidateName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  candidateEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  candidatePhone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  candidateResume: {
    type: DataTypes.STRING(500), // File path
    allowNull: true
  },
  candidateNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // Status and Processing
  status: {
    type: DataTypes.ENUM('Pending', 'Under Review', 'Approved', 'Rejected', 'Converted to Job'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High'),
    allowNull: false,
    defaultValue: 'Medium'
  },
  hrNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reviewedBy: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Conversion tracking
  convertedToJobId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'careers',
      key: 'id'
    }
  },

  // Additional metadata
  source: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Employee Referral'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  }
}, {
  tableName: 'job_referrals',
  timestamps: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['referrerEmail']
    },
    {
      fields: ['department']
    },
    {
      fields: ['urgency']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = JobReferral;