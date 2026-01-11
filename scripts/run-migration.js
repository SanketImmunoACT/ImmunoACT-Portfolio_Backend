const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'immunoact_db',
      multipleStatements: true
    });

    console.log('🔗 Connected to database');

    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, 'career-migration.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Reading migration script...');

    // Execute the entire SQL content at once to handle dynamic SQL
    try {
      console.log('⚡ Executing migration script...');
      await connection.query(sqlContent);
      console.log('✅ Migration completed successfully!');
    } catch (error) {
      console.error('❌ Migration error:', error.message);
      
      // If the full script fails, try executing key parts manually
      console.log('🔄 Attempting manual migration steps...');
      await executeManualMigration(connection);
    }

    console.log('📊 Checking final table structures...');

    // Verify the careers table structure
    const [careersStructure] = await connection.execute('DESCRIBE careers');
    console.log('\n📋 Careers table structure:');
    console.table(careersStructure);

    // Check if job_applications table exists
    try {
      const [applicationsStructure] = await connection.execute('DESCRIBE job_applications');
      console.log('\n📋 Job Applications table structure:');
      console.table(applicationsStructure);
    } catch (error) {
      console.log('⚠️  Job Applications table not found - creating it now...');
      await createJobApplicationsTable(connection);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

async function executeManualMigration(connection) {
  console.log('🔧 Executing manual migration steps...');
  
  // Step 1: Create job_applications table
  try {
    console.log('📝 Creating job_applications table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id int NOT NULL AUTO_INCREMENT,
        jobId int NOT NULL,
        name varchar(200) NOT NULL COMMENT 'Applicant full name',
        email varchar(255) NOT NULL COMMENT 'Applicant email address',
        phone varchar(20) NOT NULL COMMENT 'Applicant phone number',
        currentLocation varchar(200) NOT NULL COMMENT 'Applicant current location',
        currentDesignation varchar(200) NOT NULL COMMENT 'Applicant current job designation',
        currentLastOrganisation varchar(200) NOT NULL COMMENT 'Applicant current or last organization',
        highestEducation varchar(200) NOT NULL COMMENT 'Applicant highest education qualification',
        noticePeriod varchar(100) NOT NULL COMMENT 'Applicant notice period',
        comfortableToRelocate tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether applicant is comfortable to relocate',
        totalExperience varchar(100) NOT NULL COMMENT 'Applicant total work experience',
        reasonForJobChange text COMMENT 'Reason for job change',
        resumeUrl varchar(500) DEFAULT NULL COMMENT 'URL/path to uploaded resume file',
        coverLetter text COMMENT 'Cover letter content',
        status enum('New','Reviewing','Shortlisted','Interviewed','Rejected','Hired','Withdrawn') NOT NULL DEFAULT 'New' COMMENT 'Application status',
        appliedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when application was submitted',
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_job_applications_job_id (jobId),
        KEY idx_job_applications_status (status),
        KEY idx_job_applications_email (email),
        KEY idx_job_applications_applied_at (appliedAt),
        KEY idx_job_applications_created_at (createdAt),
        CONSTRAINT job_applications_ibfk_1 FOREIGN KEY (jobId) REFERENCES careers (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    console.log('✅ Job applications table created');
  } catch (error) {
    console.log('⚠️  Job applications table already exists or error:', error.message);
  }

  // Step 2: Remove unwanted columns from careers table
  const columnsToRemove = [
    'isRemote', 'salaryRange', 'description', 'benefits', 
    'applicationEmail', 'applicationUrl', 'applicationDeadline',
    'metaTitle', 'metaDescription', 'tags', 'urgency', 
    'workSchedule', 'travelRequired', 'viewCount'
  ];

  for (const column of columnsToRemove) {
    try {
      console.log(`🗑️  Removing column: ${column}`);
      await connection.execute(`ALTER TABLE careers DROP COLUMN ${column}`);
      console.log(`✅ Removed column: ${column}`);
    } catch (error) {
      console.log(`⚠️  Column ${column} doesn't exist or already removed`);
    }
  }

  // Step 3: Rename requirements to desired_qualities
  try {
    console.log('🔄 Renaming requirements column to desired_qualities...');
    await connection.execute(`ALTER TABLE careers CHANGE COLUMN requirements desired_qualities JSON COMMENT 'Array of desired qualities'`);
    console.log('✅ Column renamed successfully');
  } catch (error) {
    console.log('⚠️  Column rename failed or already done:', error.message);
  }

  // Step 4: Remove unwanted indexes
  const indexesToRemove = [
    'idx_careers_is_remote', 'idx_careers_application_deadline', 'idx_careers_urgency'
  ];

  for (const index of indexesToRemove) {
    try {
      console.log(`🗑️  Removing index: ${index}`);
      await connection.execute(`DROP INDEX ${index} ON careers`);
      console.log(`✅ Removed index: ${index}`);
    } catch (error) {
      console.log(`⚠️  Index ${index} doesn't exist or already removed`);
    }
  }

  console.log('✅ Manual migration steps completed');
}

async function createJobApplicationsTable(connection) {
  try {
    await connection.execute(`
      CREATE TABLE job_applications (
        id int NOT NULL AUTO_INCREMENT,
        jobId int NOT NULL,
        name varchar(200) NOT NULL COMMENT 'Applicant full name',
        email varchar(255) NOT NULL COMMENT 'Applicant email address',
        phone varchar(20) NOT NULL COMMENT 'Applicant phone number',
        currentLocation varchar(200) NOT NULL COMMENT 'Applicant current location',
        currentDesignation varchar(200) NOT NULL COMMENT 'Applicant current job designation',
        currentLastOrganisation varchar(200) NOT NULL COMMENT 'Applicant current or last organization',
        highestEducation varchar(200) NOT NULL COMMENT 'Applicant highest education qualification',
        noticePeriod varchar(100) NOT NULL COMMENT 'Applicant notice period',
        comfortableToRelocate tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether applicant is comfortable to relocate',
        totalExperience varchar(100) NOT NULL COMMENT 'Applicant total work experience',
        reasonForJobChange text COMMENT 'Reason for job change',
        resumeUrl varchar(500) DEFAULT NULL COMMENT 'URL/path to uploaded resume file',
        coverLetter text COMMENT 'Cover letter content',
        status enum('New','Reviewing','Shortlisted','Interviewed','Rejected','Hired','Withdrawn') NOT NULL DEFAULT 'New' COMMENT 'Application status',
        appliedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when application was submitted',
        createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_job_applications_job_id (jobId),
        KEY idx_job_applications_status (status),
        KEY idx_job_applications_email (email),
        KEY idx_job_applications_applied_at (appliedAt),
        KEY idx_job_applications_created_at (createdAt),
        CONSTRAINT job_applications_ibfk_1 FOREIGN KEY (jobId) REFERENCES careers (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    console.log('✅ Job applications table created successfully');
  } catch (error) {
    console.error('❌ Failed to create job applications table:', error.message);
  }
}

// Run the migration
console.log('🚀 Starting Career Management Database Migration...');
runMigration();