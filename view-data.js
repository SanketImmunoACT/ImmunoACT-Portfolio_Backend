require('dotenv').config();
const mysql = require('mysql2/promise');

async function viewData() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('📊 Recent Contact Form Submissions:');
    console.log('=====================================');

    // Get recent submissions (non-sensitive data only)
    const [rows] = await connection.execute(`
      SELECT 
        id,
        partneringCategory,
        status,
        consentGiven,
        submissionDate,
        createdAt,
        ipAddress
      FROM contact_forms 
      ORDER BY id DESC 
      LIMIT 10
    `);

    rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Submission ID: ${row.id}`);
      console.log(`   Category: ${row.partneringCategory}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Consent: ${row.consentGiven ? 'Yes' : 'No'}`);
      console.log(`   Submitted: ${row.submissionDate}`);
      console.log(`   IP: ${row.ipAddress}`);
    });

    console.log(`\n📈 Total submissions: ${rows.length}`);

    // Check audit logs
    const [auditRows] = await connection.execute(`
      SELECT action, recordId, timestamp, details
      FROM audit_logs 
      WHERE tableName = 'contact_forms'
      ORDER BY timestamp DESC 
      LIMIT 5
    `);

    console.log('\n📋 Recent Audit Logs:');
    console.log('=====================');
    auditRows.forEach((audit, index) => {
      console.log(`${index + 1}. ${audit.action} - Record ${audit.recordId} at ${audit.timestamp}`);
    });

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

viewData();