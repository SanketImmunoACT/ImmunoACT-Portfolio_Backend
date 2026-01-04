/**
 * Script to add a new hospital to the database
 * Usage: node scripts/addHospital.js
 */

// Load environment variables first
require('dotenv').config();

const { sequelize } = require('../config/database');
const Hospital = require('../models/Hospital');
const geocodingService = require('../services/geocodingService');
const logger = require('../config/logger');

async function addHospital() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Example hospital data - modify as needed
    const hospitalData = {
      name: "Example New Hospital",
      address: "123 Medical Street, Health District, Mumbai, Maharashtra 400001, India",
      city: "Mumbai",
      state: "Maharashtra",
      phone: "+91-22-12345678",
      email: "info@examplehospital.com",
      website: "https://www.examplehospital.com",
      type: "Private"
    };

    // Geocode the address to get coordinates
    console.log('Geocoding address...');
    const coords = await geocodingService.geocodeAddress(hospitalData.address);
    
    hospitalData.latitude = coords.latitude;
    hospitalData.longitude = coords.longitude;

    console.log('Coordinates found:', coords);

    // Create the hospital
    const hospital = await Hospital.create(hospitalData);
    
    console.log('Hospital added successfully!');
    console.log('Hospital ID:', hospital.id);
    console.log('Hospital Name:', hospital.name);
    console.log('Location:', hospital.city, hospital.state);
    console.log('Coordinates:', hospital.latitude, hospital.longitude);

  } catch (error) {
    console.error('Error adding hospital:', error);
  } finally {
    await sequelize.close();
  }
}

// Interactive mode - ask for hospital details
async function addHospitalInteractive() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.\n');

    console.log('=== Add New Hospital ===\n');

    const name = await question('Hospital Name: ');
    const address = await question('Full Address: ');
    const city = await question('City: ');
    const state = await question('State: ');
    const phone = await question('Phone (optional): ');
    const email = await question('Email (optional): ');
    const website = await question('Website (optional): ');
    const type = await question('Type (Private/Government) [Private]: ') || 'Private';

    const hospitalData = {
      name,
      address,
      city,
      state,
      phone: phone || null,
      email: email || null,
      website: website || null,
      type
    };

    console.log('\nGeocoding address...');
    const coords = await geocodingService.geocodeAddress(address);
    
    hospitalData.latitude = coords.latitude;
    hospitalData.longitude = coords.longitude;

    console.log('Coordinates found:', coords.latitude, coords.longitude);

    const hospital = await Hospital.create(hospitalData);
    
    console.log('\n✅ Hospital added successfully!');
    console.log('Hospital ID:', hospital.id);
    console.log('Hospital Name:', hospital.name);
    console.log('Location:', hospital.city, hospital.state);

  } catch (error) {
    console.error('Error adding hospital:', error);
  } finally {
    rl.close();
    await sequelize.close();
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--interactive') || args.includes('-i')) {
  addHospitalInteractive();
} else {
  addHospital();
}