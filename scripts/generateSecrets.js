#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate secure secrets for cookies, sessions, and JWT
 * This script helps create cryptographically secure secrets for production use
 */

console.log('🔐 Generating secure secrets for ImmunoACT Backend...\n');

// Generate secrets
const secrets = {
  JWT_SECRET: crypto.randomBytes(64).toString('hex'),
  COOKIE_SECRET: crypto.randomBytes(64).toString('hex'),
  SESSION_SECRET: crypto.randomBytes(64).toString('hex'),
  DB_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex')
};

// Display generated secrets
console.log('Generated Secrets:');
console.log('==================');
Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n📋 Copy these to your .env file');
console.log('⚠️  Keep these secrets secure and never commit them to version control');

// Optionally write to a file
const secretsFile = path.join(__dirname, '..', 'generated-secrets.txt');
const secretsContent = Object.entries(secrets)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

try {
  fs.writeFileSync(secretsFile, secretsContent + '\n');
  console.log(`\n💾 Secrets also saved to: ${secretsFile}`);
  console.log('🗑️  Remember to delete this file after copying the secrets');
} catch (error) {
  console.log('\n❌ Could not write secrets file:', error.message);
}

// Security recommendations
console.log('\n🛡️  Security Recommendations:');
console.log('   • Use different secrets for development and production');
console.log('   • Store production secrets in environment variables or secure vaults');
console.log('   • Rotate secrets regularly (every 90 days recommended)');
console.log('   • Never log or expose these secrets in your application');
console.log('   • Use HTTPS in production to protect cookie transmission');

// Generate additional security tokens
console.log('\n🔑 Additional Security Tokens:');
console.log('==============================');
console.log(`API_KEY=${crypto.randomBytes(32).toString('hex')}`);
console.log(`WEBHOOK_SECRET=${crypto.randomBytes(32).toString('hex')}`);
console.log(`ENCRYPTION_SALT=${crypto.randomBytes(16).toString('hex')}`);

console.log('\n✅ Secret generation complete!');