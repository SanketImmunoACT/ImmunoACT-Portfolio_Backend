require('dotenv').config();
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const createAdminUser = async () => {
  try {
    console.log('🔧 Creating admin user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);
    
    // Create admin user directly with SQL
    await sequelize.query(`
      INSERT INTO users (
        username, email, password, firstName, lastName, role, isActive, createdAt, updatedAt
      ) VALUES (
        'admin', 
        'admin@immunoact.com', 
        '${hashedPassword}', 
        'Super', 
        'Admin', 
        'super_admin', 
        1,
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE 
        password = '${hashedPassword}',
        updatedAt = NOW();
    `);
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Username: admin');
    console.log('🔑 Password: Admin@123456');
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

createAdminUser();
