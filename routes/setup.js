const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const allHospitalData = require('../scripts/hospitalData');

// Create initial admin user (DISABLED - already created)
// Uncomment only if you need to recreate admin user
/*
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
*/

// Create all initial users (admin + office executive + hr manager)
router.post('/create-all-users', async (req, res) => {
  try {
    const users = [
      {
        username: 'admin',
        email: 'admin@immunoact.com',
        password: 'Admin@123456',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin'
      },
      {
        username: 'officeexec',
        email: 'office@immunoact.com',
        password: 'Office@123456',
        firstName: 'Office',
        lastName: 'Executive',
        role: 'office_executive'
      },
      {
        username: 'hrmanager',
        email: 'hr@immunoact.com',
        password: 'HR@123456',
        firstName: 'HR',
        lastName: 'Manager',
        role: 'hr_manager'
      }
    ];

    const createdUsers = [];
    const skippedUsers = [];

    for (const userData of users) {
      // Check if user already exists
      const [existing] = await sequelize.query(
        'SELECT id FROM users WHERE username = ? LIMIT 1',
        { replacements: [userData.username] }
      );

      if (existing.length > 0) {
        skippedUsers.push(userData.username);
        continue;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      await sequelize.query(`
        INSERT INTO users (
          username, email, password, firstName, lastName, role, isActive, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [
          userData.username,
          userData.email,
          hashedPassword,
          userData.firstName,
          userData.lastName,
          userData.role,
          1
        ]
      });
      
      createdUsers.push({
        username: userData.username,
        password: userData.password,
        role: userData.role
      });
    }
    
    console.log('✅ Users created:', createdUsers.map(u => u.username).join(', '));
    
    res.json({
      success: true,
      message: 'Users setup completed',
      created: createdUsers,
      skipped: skippedUsers,
      note: 'Please change all default passwords after first login'
    });
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// PUBLIC: Seed hospitals data (use only once for initial setup)
router.post('/seed-hospitals-public', async (req, res) => {
  try {
    console.log('🏥 Starting hospital data seeding...');
    
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const hospital of allHospitalData) {
      try {
        // Check if hospital already exists
        const [existing] = await sequelize.query(
          'SELECT id FROM hospitals WHERE name = ? AND city = ? LIMIT 1',
          { replacements: [hospital.name, hospital.city] }
        );
        
        if (existing.length > 0) {
          skippedCount++;
          continue;
        }
        
        // Insert hospital
        await sequelize.query(`
          INSERT INTO hospitals (
            name, address, city, state, zipCode, country,
            latitude, longitude, phone, email, website, type,
            isActive, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            hospital.name,
            hospital.address,
            hospital.city,
            hospital.state,
            null,
            'India',
            hospital.coordinates?.lat || null,
            hospital.coordinates?.lng || null,
            hospital.phone || null,
            hospital.email || null,
            hospital.website || null,
            hospital.type || 'Private',
            true
          ]
        });
        
        insertedCount++;
      } catch (err) {
        errors.push({ hospital: hospital.name, error: err.message });
      }
    }
    
    console.log(`✅ Hospital seeding completed: ${insertedCount} inserted, ${skippedCount} skipped`);
    
    // Get total count
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM hospitals WHERE deletedAt IS NULL');
    
    res.json({
      success: true,
      message: 'Hospital data seeded successfully',
      data: {
        inserted: insertedCount,
        skipped: skippedCount,
        total: results[0].count,
        errors: errors.length > 0 ? errors : undefined
      }
    });
    
  } catch (error) {
    console.error('❌ Error seeding hospitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed hospital data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Seed hospitals data (Super Admin only)
router.post('/seed-hospitals', 
  authenticateToken,
  authorize('super_admin'),
  async (req, res) => {
    try {
      console.log('🏥 Starting hospital data seeding...');
      
      let insertedCount = 0;
      let skippedCount = 0;
      
      for (const hospital of allHospitalData) {
        // Check if hospital already exists
        const [existing] = await sequelize.query(
          'SELECT id FROM hospitals WHERE name = ? AND city = ? LIMIT 1',
          { replacements: [hospital.name, hospital.city] }
        );
        
        if (existing.length > 0) {
          skippedCount++;
          continue;
        }
        
        // Insert hospital
        await sequelize.query(`
          INSERT INTO hospitals (
            name, address, city, state, zipCode, country,
            latitude, longitude, phone, email, website, type,
            isActive, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            hospital.name,
            hospital.address,
            hospital.city,
            hospital.state,
            null, // zipCode
            'India',
            hospital.coordinates?.lat || null,
            hospital.coordinates?.lng || null,
            hospital.phone || null,
            hospital.email || null,
            hospital.website || null,
            hospital.type || 'Private',
            true
          ]
        });
        
        insertedCount++;
      }
      
      console.log(`✅ Hospital seeding completed: ${insertedCount} inserted, ${skippedCount} skipped`);
      
      // Get total count
      const [results] = await sequelize.query('SELECT COUNT(*) as count FROM hospitals WHERE deletedAt IS NULL');
      
      res.json({
        success: true,
        message: 'Hospital data seeded successfully',
        data: {
          inserted: insertedCount,
          skipped: skippedCount,
          total: results[0].count
        }
      });
      
    } catch (error) {
      console.error('❌ Error seeding hospitals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to seed hospital data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

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