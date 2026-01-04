/**
 * Add type column to hospitals table and populate it
 * Usage: node scripts/addTypeColumn.js
 */

// Load environment variables first
require('dotenv').config();

const { sequelize } = require('../config/database');

async function addTypeColumn() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check if type column already exists
    const [columns] = await sequelize.query("SHOW COLUMNS FROM hospitals LIKE 'type'");
    
    if (columns.length > 0) {
      console.log('✅ Type column already exists');
    } else {
      console.log('➕ Adding type column...');
      
      // Add the type column
      await sequelize.query(`
        ALTER TABLE hospitals 
        ADD COLUMN type ENUM('Private', 'Government') DEFAULT 'Private' 
        AFTER country
      `);
      
      console.log('✅ Type column added successfully');
    }
    
    // Update existing records based on name patterns (common government hospital indicators)
    console.log('🔄 Updating hospital types based on name patterns...');
    
    const governmentPatterns = [
      'Government',
      'Govt',
      'AIIMS',
      'PGIMER',
      'Medical College',
      'Civil Hospital',
      'District Hospital',
      'State Hospital',
      'Municipal',
      'Corporation',
      'ACTREC',
      'Tata Memorial',
      'Tata Medical Center',
      'Malabar Cancer Centre'
    ];
    
    for (const pattern of governmentPatterns) {
      const [result] = await sequelize.query(`
        UPDATE hospitals 
        SET type = 'Government' 
        WHERE name LIKE '%${pattern}%' AND type = 'Private'
      `);
      
      if (result.affectedRows > 0) {
        console.log(`✅ Updated ${result.affectedRows} hospitals containing "${pattern}" to Government`);
      }
    }
    
    // Get final counts
    const [counts] = await sequelize.query(`
      SELECT type, COUNT(*) as count 
      FROM hospitals 
      GROUP BY type
    `);
    
    console.log('\n📊 Final hospital type distribution:');
    counts.forEach(c => {
      console.log(`- ${c.type}: ${c.count}`);
    });
    
    console.log('\n🎉 Type column setup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

addTypeColumn();