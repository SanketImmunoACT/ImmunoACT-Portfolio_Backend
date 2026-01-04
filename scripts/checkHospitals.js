/**
 * Check hospitals in database
 * Usage: node scripts/checkHospitals.js
 */

// Load environment variables first
require('dotenv').config();

const { sequelize } = require('../config/database');

async function checkHospitals() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Get sample hospitals
    const [results] = await sequelize.query('SELECT id, name, city, state, type FROM hospitals LIMIT 10');
    
    console.log('\n📋 Sample hospitals in database:');
    console.log('ID\tName\t\t\t\tCity\t\tState\t\tType');
    console.log('─'.repeat(80));
    
    results.forEach(h => {
      const name = h.name.length > 25 ? h.name.substring(0, 25) + '...' : h.name;
      console.log(`${h.id}\t${name.padEnd(28)}\t${h.city.padEnd(12)}\t${h.state.padEnd(12)}\t${h.type || 'Private'}`);
    });
    
    // Get total count
    const [countResult] = await sequelize.query('SELECT COUNT(*) as total FROM hospitals');
    console.log(`\n📊 Total hospitals: ${countResult[0].total}`);
    
    // Get count by type
    const [typeResult] = await sequelize.query('SELECT type, COUNT(*) as count FROM hospitals GROUP BY type');
    console.log('\n📈 Hospitals by type:');
    typeResult.forEach(t => {
      console.log(`- ${t.type || 'Private'}: ${t.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkHospitals();