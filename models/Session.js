const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Session Model for storing user sessions
 * HIPAA-compliant session management with audit trail
 */
const Session = sequelize.define('Session', {
  sid: {
    type: DataTypes.STRING(128),
    primaryKey: true,
    allowNull: false,
    comment: 'Session identifier'
  },
  
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Associated user ID'
  },
  
  sess: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Session data (JSON)'
  },
  
  expire: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Session expiration time'
  },
  
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'Client IP address'
  },
  
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Client user agent'
  },
  
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Session active status'
  },
  
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Last activity timestamp'
  },
  
  loginTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Initial login timestamp'
  },
  
  logoutTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Logout timestamp'
  },
  
  deviceFingerprint: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Device fingerprint for security'
  },
  
  riskScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Security risk score (0-100)'
  },
  
  hipaaCompliant: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'HIPAA compliance flag'
  }
}, {
  tableName: 'Sessions',
  timestamps: true,
  paranoid: true, // Soft delete for audit trail
  
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['expire']
    },
    {
      fields: ['ipAddress']
    },
    {
      fields: ['lastActivity']
    },
    {
      fields: ['isActive']
    }
  ],
  
  hooks: {
    beforeCreate: (session, options) => {
      // Set initial timestamps
      session.loginTime = new Date();
      session.lastActivity = new Date();
      
      // Calculate risk score based on various factors
      session.riskScore = calculateRiskScore(session);
    },
    
    beforeUpdate: (session, options) => {
      // Update last activity
      session.lastActivity = new Date();
      
      // Recalculate risk score
      session.riskScore = calculateRiskScore(session);
    },
    
    beforeDestroy: (session, options) => {
      // Set logout time when session is destroyed
      session.logoutTime = new Date();
    }
  }
});

/**
 * Calculate security risk score for session
 */
function calculateRiskScore(session) {
  let riskScore = 0;
  
  // Check for suspicious IP patterns
  if (session.ipAddress) {
    // Add risk for non-standard IP ranges (simplified)
    if (session.ipAddress.startsWith('10.') || 
        session.ipAddress.startsWith('192.168.') ||
        session.ipAddress.startsWith('172.')) {
      riskScore += 10; // Private IP ranges
    }
  }
  
  // Check user agent for suspicious patterns
  if (session.userAgent) {
    const suspiciousPatterns = ['bot', 'crawler', 'spider', 'scraper'];
    const userAgentLower = session.userAgent.toLowerCase();
    
    if (suspiciousPatterns.some(pattern => userAgentLower.includes(pattern))) {
      riskScore += 30;
    }
    
    // Very short or very long user agents are suspicious
    if (session.userAgent.length < 20 || session.userAgent.length > 500) {
      riskScore += 20;
    }
  }
  
  // Check session duration
  if (session.loginTime) {
    const sessionDuration = Date.now() - session.loginTime.getTime();
    const maxNormalDuration = 8 * 60 * 60 * 1000; // 8 hours
    
    if (sessionDuration > maxNormalDuration) {
      riskScore += 15;
    }
  }
  
  return Math.min(riskScore, 100); // Cap at 100
}

/**
 * Instance methods
 */
Session.prototype.isExpired = function() {
  return new Date() > this.expire;
};

Session.prototype.isHighRisk = function() {
  return this.riskScore > 50;
};

Session.prototype.extendExpiration = function(minutes = 30) {
  this.expire = new Date(Date.now() + (minutes * 60 * 1000));
  return this.save();
};

Session.prototype.markAsLoggedOut = function() {
  this.isActive = false;
  this.logoutTime = new Date();
  return this.save();
};

/**
 * Class methods
 */
Session.findActiveByUserId = function(userId) {
  return this.findAll({
    where: {
      userId,
      isActive: true,
      expire: {
        [sequelize.Sequelize.Op.gt]: new Date()
      }
    },
    order: [['lastActivity', 'DESC']]
  });
};

Session.cleanupExpired = function() {
  return this.destroy({
    where: {
      expire: {
        [sequelize.Sequelize.Op.lt]: new Date()
      }
    },
    force: true // Hard delete expired sessions
  });
};

Session.findHighRiskSessions = function() {
  return this.findAll({
    where: {
      riskScore: {
        [sequelize.Sequelize.Op.gt]: 50
      },
      isActive: true
    },
    order: [['riskScore', 'DESC']]
  });
};

Session.getSessionStats = function() {
  return sequelize.query(`
    SELECT 
      COUNT(*) as totalSessions,
      COUNT(CASE WHEN isActive = 1 THEN 1 END) as activeSessions,
      COUNT(CASE WHEN riskScore > 50 THEN 1 END) as highRiskSessions,
      AVG(riskScore) as averageRiskScore,
      COUNT(DISTINCT userId) as uniqueUsers
    FROM Sessions 
    WHERE deletedAt IS NULL
  `, {
    type: sequelize.QueryTypes.SELECT
  });
};

module.exports = Session;