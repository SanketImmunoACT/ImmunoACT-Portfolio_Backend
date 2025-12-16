require('dotenv').config();
const { User } = require('../models');
const bcrypt = require('bcryptjs');

const testAuth = async () => {
  try {
    // Find the admin user
    const user = await User.findOne({ where: { username: 'admin' } });
    
    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });

    // Test password
    const testPassword = 'Admin@123456';
    const isValid = await user.checkPassword(testPassword);
    
    console.log('🔑 Password test result:', isValid);
    
    // Also test bcrypt directly
    const directTest = await bcrypt.compare(testPassword, user.password);
    console.log('🔑 Direct bcrypt test:', directTest);
    
    // Show password hash
    console.log('🔐 Stored password hash:', user.password.substring(0, 20) + '...');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
};

testAuth();