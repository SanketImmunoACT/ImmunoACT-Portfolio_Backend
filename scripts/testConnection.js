/**
 * Test database connection
 * Usage: node scripts/testConnection.js
 */

// Load environment variables first
require('dotenv').config();

const { sequelize } = require('../config/database');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Database Config:');
    console.log('- Host:', process.env.DB_HOST);
    console.log('- Port:', process.env.DB_PORT);
    console.log('- Database:', process.env.DB_NAME);
    console.log('- User:', process.env.DB_USER);
    console.log('- Password:', process.env.DB_PASSWORD ? '***' : 'NOT SET');
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Test if hospitals table exists
    const [results] = await sequelize.query("SHOW TABLES LIKE 'hospitals'");
    if (results.length > 0) {
      console.log('✅ Hospitals table exists');
      
      // Check if there are any hospitals
      const count = await sequelize.query("SELECT COUNT(*) as count FROM hospitals");
      console.log(`📊 Current hospitals in database: ${count[0][0].count}`);
    } else {
      console.log('⚠️  Hospitals table does not exist - will be created on first migration');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔧 Troubleshooting:');
      console.error('1. Check if MySQL server is running');
      console.error('2. Verify database credentials in .env file');
      console.error('3. Make sure the database exists');
      console.error('4. Check if user has proper permissions');
    }
  } finally {
    await sequelize.close();
  }
}

testConnection();