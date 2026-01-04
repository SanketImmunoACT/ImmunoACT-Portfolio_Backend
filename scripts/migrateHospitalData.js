/**
 * Script to migrate existing hospital data from hospitalData.js to database
 * Usage: node scripts/migrateHospitalData.js
 */

// Load environment variables first
require('dotenv').config();

const { sequelize } = require('../config/database');
const Hospital = require('../models/Hospital');
const allHospitalData = require('./hospitalData');

async function migrateHospitalData() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Sync the Hospital model (create table if it doesn't exist)
    await Hospital.sync();
    console.log('Hospital table synced.');

    // Check if hospitals already exist
    const existingCount = await Hospital.count();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing hospitals in database.`);
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('Do you want to continue and add more hospitals? (y/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Migration cancelled.');
        return;
      }
    }

    console.log(`Starting migration of ${allHospitalData.length} hospitals...`);

    let successCount = 0;
    let errorCount = 0;

    for (const hospitalData of allHospitalData) {
      try {
        // Check if hospital already exists by name and city
        const existing = await Hospital.findOne({
          where: {
            name: hospitalData.name,
            city: hospitalData.city
          }
        });

        if (existing) {
          console.log(`Skipping existing hospital: ${hospitalData.name}`);
          continue;
        }

        // Convert the data format
        const dbHospitalData = {
          id: hospitalData.id,
          name: hospitalData.name,
          address: hospitalData.address,
          city: hospitalData.city,
          state: hospitalData.state,
          latitude: hospitalData.coordinates.lat,
          longitude: hospitalData.coordinates.lng,
          phone: hospitalData.phone || null,
          email: hospitalData.email || null,
          website: hospitalData.website || null,
          type: hospitalData.type || 'Private',
          isActive: true
        };

        await Hospital.create(dbHospitalData);
        successCount++;
        console.log(`✅ Added: ${hospitalData.name}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error adding ${hospitalData.name}:`, error.message);
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Successfully added: ${successCount} hospitals`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total hospitals in database: ${await Hospital.count()}`);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await sequelize.close();
  }
}

migrateHospitalData();