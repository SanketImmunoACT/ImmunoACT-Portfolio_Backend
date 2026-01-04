/**
 * Check hospital table structure
 * Usage: node scripts/checkTableStructure.js
 */

// Load environment variables first
require('dotenv').config();

const { sequelize } = require('../config/database');

async function checkTableStructure() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check table structure
    const [columns] = await sequelize.query('DESCRIBE hospitals');
    
    console.log('\n📋 Hospital table structure:');
    console.log('Field\t\t\tType\t\t\tNull\tKey\tDefault');
    console.log('─'.repeat(70));
    
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(20)}\t${col.Type.padEnd(20)}\t${col.Null}\t${col.Key}\t${col.Default || ''}`);
    });
    
    // Get sample data
    const [results] = await sequelize.query('SELECT * FROM hospitals LIMIT 3');
    
    console.log('\n📊 Sample data:');
    if (results.length > 0) {
      console.log('Available fields:', Object.keys(results[0]).join(', '));
      console.log('\nFirst hospital:');
      console.log(JSON.stringify(results[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTableStructure();