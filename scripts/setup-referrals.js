require('dotenv').config();
const { sequelize } = require('../config/database');

async function setupReferrals() {
  try {
    console.log('🔧 Setting up job referrals system...');
    
    // Create the table manually using SQL with updated schema
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS job_referrals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referrerName VARCHAR(100) NOT NULL,
        referrerEmail VARCHAR(255) NOT NULL,
        referrerDepartment VARCHAR(100),
        referrerEmployeeId VARCHAR(50) NOT NULL,
        jobTitle VARCHAR(200) NOT NULL,
        jobDescription TEXT,
        department VARCHAR(100) NOT NULL,
        employmentType ENUM('Full-time', 'Part-time', 'Contract', 'Internship') DEFAULT 'Full-time',
        experienceLevel ENUM('Entry Level', 'Mid Level', 'Senior Level', 'Executive') DEFAULT 'Mid Level',
        candidateName VARCHAR(100),
        candidateEmail VARCHAR(255),
        candidatePhone VARCHAR(20),
        candidateResume VARCHAR(500),
        candidateNotes TEXT,
        status ENUM('Pending', 'Under Review', 'Approved', 'Rejected') DEFAULT 'Pending',
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        hrNotes TEXT,
        reviewedBy VARCHAR(100),
        reviewedAt DATETIME,
        source VARCHAR(50) DEFAULT 'Employee Referral',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_referrerEmail (referrerEmail),
        INDEX idx_department (department),
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('✅ job_referrals table created successfully');
    
    // Add some test data with updated schema
    await sequelize.query(`
      INSERT IGNORE INTO job_referrals (
        referrerName, referrerEmail, referrerDepartment, referrerEmployeeId,
        jobTitle, jobDescription, department, employmentType, experienceLevel,
        candidateName, candidateEmail, candidatePhone, candidateNotes,
        status, priority
      ) VALUES 
      (
        'Rajesh Kumar', 'rajesh.kumar@immunoact.com', 'Research & Development', 'EMP001',
        'Senior Software Engineer - CAR-T Platform', 
        'We are looking for an experienced software engineer to join our CAR-T platform development team. The role involves developing scalable web applications for clinical trial management, patient data analysis, and regulatory compliance systems.',
        'IT', 'Full-time', 'Senior Level',
        'Priya Sharma', 'priya.sharma@techcompany.com', '+91 87654 32109',
        'Priya is an excellent full-stack developer with 6 years of experience in healthcare applications.',
        'Pending', 'High'
      ),
      (
        'Anita Desai', 'anita.desai@immunoact.com', 'Clinical Affairs', 'EMP002',
        'Clinical Research Associate',
        'We need a Clinical Research Associate to support our ongoing CAR-T clinical trials. The role involves patient recruitment, data collection, and regulatory compliance.',
        'Clinical Affairs', 'Full-time', 'Mid Level',
        'Dr. Amit Singh', 'amit.singh@hospital.com', '+91 87654 32108',
        'Dr. Singh has 4 years of clinical research experience and is looking for opportunities in cell therapy.',
        'Under Review', 'Medium'
      ),
      (
        'Vikram Patel', 'vikram.patel@immunoact.com', 'Manufacturing', 'EMP003',
        'Manufacturing Specialist - Cell Therapy',
        'Looking for a manufacturing specialist with experience in cell therapy production and GMP compliance.',
        'Manufacturing', 'Full-time', 'Senior Level',
        NULL, NULL, NULL, NULL,
        'Approved', 'High'
      )
    `);
    
    console.log('✅ Test data added successfully');
    
    // Show current data
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM job_referrals');
    console.log(`📊 Total referrals in database: ${results[0].count}`);
    
    // Show stats with updated schema
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(*) as totalReferrals,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingReferrals,
        SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END) as underReviewReferrals,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approvedReferrals,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejectedReferrals
      FROM job_referrals
    `);
    
    console.log('📈 Referral statistics:', stats[0]);
    
  } catch (error) {
    console.error('❌ Error setting up referrals:', error.message);
  } finally {
    await sequelize.close();
  }
}

setupReferrals();