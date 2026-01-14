const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Create initial admin user (PUBLIC - use only once, then disable)
router.post('/create-admin', async (req, res) => {
  try {
    // Check if admin already exists
    const [existingAdmin] = await sequelize.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      { replacements: ['admin'] }
    );

    if (existingAdmin.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists. Please use login.'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);
    
    // Create admin user
    await sequelize.query(`
      INSERT INTO users (
        username, email, password, firstName, lastName, role, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, {
      replacements: ['admin', 'admin@immunoact.com', hashedPassword, 'Super', 'Admin', 'super_admin', 1]
    });
    
    console.log('✅ Admin user created successfully!');
    
    res.json({
      success: true,
      message: 'Admin user created successfully',
      credentials: {
        username: 'admin',
        password: 'Admin@123456',
        note: 'Please change the password after first login'
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Setup referrals table (Super Admin only)
router.post('/referrals-table', 
  authenticateToken,
  authorize('super_admin'),
  async (req, res) => {
    try {
      console.log('🔧 Creating job_referrals table...');
      
      // Create the table manually using SQL
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS job_referrals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          referrerName VARCHAR(100) NOT NULL,
          referrerEmail VARCHAR(255) NOT NULL,
          referrerPhone VARCHAR(20),
          referrerDepartment VARCHAR(100),
          referrerEmployeeId VARCHAR(50),
          jobTitle VARCHAR(200) NOT NULL,
          jobDescription TEXT NOT NULL,
          department VARCHAR(100) NOT NULL,
          location VARCHAR(100) NOT NULL,
          employmentType ENUM('Full-time', 'Part-time', 'Contract', 'Internship') DEFAULT 'Full-time',
          experienceLevel ENUM('Entry Level', 'Mid Level', 'Senior Level', 'Executive') DEFAULT 'Mid Level',
          salaryRange VARCHAR(100),
          urgency ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
          candidateName VARCHAR(100),
          candidateEmail VARCHAR(255),
          candidatePhone VARCHAR(20),
          candidateResume VARCHAR(500),
          candidateNotes TEXT,
          status ENUM('Pending', 'Under Review', 'Approved', 'Rejected', 'Converted to Job') DEFAULT 'Pending',
          priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
          hrNotes TEXT,
          reviewedBy VARCHAR(100),
          reviewedAt DATETIME,
          convertedToJobId INT,
          source VARCHAR(50) DEFAULT 'Employee Referral',
          tags JSON,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_status (status),
          INDEX idx_referrerEmail (referrerEmail),
          INDEX idx_department (department),
          INDEX idx_urgency (urgency),
          INDEX idx_createdAt (createdAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      console.log('✅ job_referrals table created successfully');
      
      // Add some test data
      await sequelize.query(`
        INSERT IGNORE INTO job_referrals (
          referrerName, referrerEmail, referrerPhone, referrerDepartment, referrerEmployeeId,
          jobTitle, jobDescription, department, location, employmentType, experienceLevel,
          salaryRange, urgency, candidateName, candidateEmail, candidatePhone, candidateNotes,
          status, priority
        ) VALUES 
        (
          'Rajesh Kumar', 'rajesh.kumar@immunoact.com', '+91 98765 43210', 'Research & Development', 'EMP001',
          'Senior Software Engineer - CAR-T Platform', 
          'We are looking for an experienced software engineer to join our CAR-T platform development team. The role involves developing scalable web applications for clinical trial management, patient data analysis, and regulatory compliance systems.',
          'IT', 'Mumbai, Maharashtra', 'Full-time', 'Senior Level',
          '₹15-25 LPA', 'High', 'Priya Sharma', 'priya.sharma@techcompany.com', '+91 87654 32109',
          'Priya is an excellent full-stack developer with 6 years of experience in healthcare applications.',
          'Pending', 'High'
        ),
        (
          'Anita Desai', 'anita.desai@immunoact.com', '+91 98765 43211', 'Clinical Affairs', 'EMP002',
          'Clinical Research Associate',
          'We need a Clinical Research Associate to support our ongoing CAR-T clinical trials. The role involves patient recruitment, data collection, and regulatory compliance.',
          'Clinical Affairs', 'Delhi, NCR', 'Full-time', 'Mid Level',
          '₹8-12 LPA', 'Medium', 'Dr. Amit Singh', 'amit.singh@hospital.com', '+91 87654 32108',
          'Dr. Singh has 4 years of clinical research experience and is looking for opportunities in cell therapy.',
          'Under Review', 'Medium'
        ),
        (
          'Vikram Patel', 'vikram.patel@immunoact.com', '+91 98765 43212', 'Manufacturing', 'EMP003',
          'Manufacturing Specialist - Cell Therapy',
          'Looking for a manufacturing specialist with experience in cell therapy production and GMP compliance.',
          'Manufacturing', 'Bangalore, Karnataka', 'Full-time', 'Senior Level',
          '₹12-18 LPA', 'Urgent', NULL, NULL, NULL, NULL,
          'Approved', 'High'
        )
      `);
      
      console.log('✅ Test data added successfully');
      
      // Show current data
      const [results] = await sequelize.query('SELECT COUNT(*) as count FROM job_referrals');
      console.log(`📊 Total referrals in database: ${results[0].count}`);
      
      res.json({
        success: true,
        message: 'Referrals table created and test data added successfully',
        data: {
          totalReferrals: results[0].count
        }
      });
      
    } catch (error) {
      console.error('❌ Error setting up referrals table:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to setup referrals table',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;