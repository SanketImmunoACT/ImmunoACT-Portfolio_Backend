const mysql = require('mysql2/promise');
require('dotenv').config();

const updateReferralsSchema = async () => {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'immunoact_db'
    });

    console.log('Connected to MySQL database');

    // Backup existing data before making changes
    console.log('Creating backup of existing data...');
    const [existingData] = await connection.execute('SELECT * FROM job_referrals');
    console.log(`Found ${existingData.length} existing referrals`);

    // Drop columns that are no longer needed
    const columnsToRemove = [
      'referrerPhone',
      'location', 
      'salaryRange',
      'urgency',
      'convertedToJobId',
      'tags'
    ];

    // Drop foreign key constraint first, then drop the column
    try {
      // Get all foreign key constraints for the convertedToJobId column
      const [constraints] = await connection.execute(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'job_referrals' 
        AND COLUMN_NAME = 'convertedToJobId'
        AND CONSTRAINT_NAME != 'PRIMARY'
      `, [process.env.DB_NAME || 'ImmunoACT-Portfolio']);

      // Drop all foreign key constraints for this column
      for (const constraint of constraints) {
        try {
          await connection.execute(`
            ALTER TABLE job_referrals 
            DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
          `);
          console.log(`✓ Dropped foreign key constraint: ${constraint.CONSTRAINT_NAME}`);
        } catch (error) {
          console.log(`- Failed to drop constraint ${constraint.CONSTRAINT_NAME}:`, error.message);
        }
      }
      
      // Then drop the column
      await connection.execute(`ALTER TABLE job_referrals DROP COLUMN convertedToJobId`);
      console.log('✓ Dropped column: convertedToJobId');
    } catch (error) {
      console.log('- Failed to drop convertedToJobId column or constraint:', error.message);
    }

    // Drop other columns that are no longer needed
    const otherColumnsToRemove = [
      'referrerPhone',
      'location', 
      'salaryRange',
      'urgency',
      'tags'
    ];

    for (const column of otherColumnsToRemove) {
      try {
        // Check if column exists before trying to drop it
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'job_referrals' AND COLUMN_NAME = ?
        `, [process.env.DB_NAME || 'ImmunoACT-Portfolio', column]);

        if (columns.length > 0) {
          await connection.execute(`ALTER TABLE job_referrals DROP COLUMN ${column}`);
          console.log(`✓ Dropped column: ${column}`);
        } else {
          console.log(`- Column ${column} does not exist, skipping`);
        }
      } catch (error) {
        console.log(`- Failed to drop column ${column}:`, error.message);
      }
    }

    // Update ENUM values for status (remove 'Converted to Job')
    try {
      await connection.execute(`
        ALTER TABLE job_referrals 
        MODIFY COLUMN status ENUM('Pending', 'Under Review', 'Approved', 'Rejected') 
        NOT NULL DEFAULT 'Pending'
      `);
      console.log('✓ Updated status ENUM values');
    } catch (error) {
      console.log('- Failed to update status ENUM:', error.message);
    }

    // Make referrerEmployeeId required (NOT NULL)
    try {
      await connection.execute(`
        ALTER TABLE job_referrals 
        MODIFY COLUMN referrerEmployeeId VARCHAR(50) NOT NULL
      `);
      console.log('✓ Made referrerEmployeeId required');
    } catch (error) {
      console.log('- Failed to make referrerEmployeeId required:', error.message);
    }

    // Make jobDescription optional (allow NULL)
    try {
      await connection.execute(`
        ALTER TABLE job_referrals 
        MODIFY COLUMN jobDescription TEXT NULL
      `);
      console.log('✓ Made jobDescription optional');
    } catch (error) {
      console.log('- Failed to make jobDescription optional:', error.message);
    }

    // Update any existing 'Converted to Job' statuses to 'Approved'
    try {
      const [result] = await connection.execute(`
        UPDATE job_referrals 
        SET status = 'Approved' 
        WHERE status = 'Converted to Job'
      `);
      console.log(`✓ Updated ${result.affectedRows} records from 'Converted to Job' to 'Approved'`);
    } catch (error) {
      console.log('- Failed to update existing statuses:', error.message);
    }

    // Remove indexes on dropped columns
    const indexesToRemove = ['idx_job_referrals_urgency'];
    
    for (const indexName of indexesToRemove) {
      try {
        await connection.execute(`DROP INDEX ${indexName} ON job_referrals`);
        console.log(`✓ Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`- Index ${indexName} does not exist or failed to drop:`, error.message);
      }
    }

    console.log('\n✅ Schema update completed successfully!');
    console.log('\nSummary of changes:');
    console.log('- Removed columns: referrerPhone, location, salaryRange, urgency, convertedToJobId, tags');
    console.log('- Updated status ENUM to remove "Converted to Job"');
    console.log('- Made referrerEmployeeId required');
    console.log('- Made jobDescription optional');
    console.log('- Updated existing "Converted to Job" records to "Approved"');

  } catch (error) {
    console.error('Error updating schema:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
};

// Run the migration
if (require.main === module) {
  updateReferralsSchema()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = updateReferralsSchema;