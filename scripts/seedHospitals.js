require('dotenv').config();
const { connectDB } = require('../config/database');
const Hospital = require('../models/Hospital');
const logger = require('../config/logger');

const sampleHospitals = [
  {
    name: "Kokilaben Dhirubhai Ambani Hospital",
    address: "Rao Saheb Achutrao Patwardhan Marg, Four Bunglows, Andheri West",
    city: "Mumbai",
    state: "Maharashtra",
    zipCode: "400053",
    latitude: 19.1197,
    longitude: 72.8267,
    phone: "+91 22 4269 6969",
    email: "info@kokilabenhospital.com",
    website: "https://www.kokilabenhospital.com",
    description: "Multi-specialty hospital with advanced cancer treatment facilities",
    services: ["Oncology", "Cardiology", "Neurology", "Orthopedics", "Emergency Care"],
    operatingHours: {
      "monday": "24/7",
      "tuesday": "24/7",
      "wednesday": "24/7",
      "thursday": "24/7",
      "friday": "24/7",
      "saturday": "24/7",
      "sunday": "24/7"
    },
    rating: 4.5,
    totalReviews: 1250
  },
  {
    name: "Tata Memorial Hospital",
    address: "Dr Ernest Borges Marg, Parel",
    city: "Mumbai",
    state: "Maharashtra",
    zipCode: "400012",
    latitude: 19.0176,
    longitude: 72.8562,
    phone: "+91 22 2417 7000",
    email: "info@tmc.gov.in",
    website: "https://tmc.gov.in",
    description: "Premier cancer treatment and research center",
    services: ["Oncology", "Radiation Therapy", "Surgical Oncology", "Medical Oncology"],
    operatingHours: {
      "monday": "8:00 AM - 6:00 PM",
      "tuesday": "8:00 AM - 6:00 PM",
      "wednesday": "8:00 AM - 6:00 PM",
      "thursday": "8:00 AM - 6:00 PM",
      "friday": "8:00 AM - 6:00 PM",
      "saturday": "8:00 AM - 2:00 PM",
      "sunday": "Emergency Only"
    },
    rating: 4.8,
    totalReviews: 2100
  },
  {
    name: "Fortis Hospital Mulund",
    address: "Mulund Goregaon Link Road, Mulund West",
    city: "Mumbai",
    state: "Maharashtra",
    zipCode: "400080",
    latitude: 19.1728,
    longitude: 72.9569,
    phone: "+91 22 6754 4444",
    email: "enquiry.mulund@fortishealthcare.com",
    website: "https://www.fortishealthcare.com",
    description: "Multi-specialty hospital with comprehensive healthcare services",
    services: ["Cardiology", "Oncology", "Neurology", "Orthopedics", "Gastroenterology"],
    operatingHours: {
      "monday": "24/7",
      "tuesday": "24/7",
      "wednesday": "24/7",
      "thursday": "24/7",
      "friday": "24/7",
      "saturday": "24/7",
      "sunday": "24/7"
    },
    rating: 4.3,
    totalReviews: 890
  },
  {
    name: "Jupiter Hospital Thane",
    address: "Eastern Express Highway, Thane West",
    city: "Thane",
    state: "Maharashtra",
    zipCode: "400601",
    latitude: 19.2183,
    longitude: 72.9781,
    phone: "+91 22 6969 6969",
    email: "info@jupiterhospital.com",
    website: "https://www.jupiterhospital.com",
    description: "Advanced multi-specialty hospital with state-of-the-art facilities",
    services: ["Oncology", "Cardiology", "Neurosurgery", "Transplant", "Emergency Care"],
    operatingHours: {
      "monday": "24/7",
      "tuesday": "24/7",
      "wednesday": "24/7",
      "thursday": "24/7",
      "friday": "24/7",
      "saturday": "24/7",
      "sunday": "24/7"
    },
    rating: 4.6,
    totalReviews: 1560
  },
  {
    name: "Hiranandani Hospital Vashi",
    address: "Plot No 23, Sector 10A, Vashi",
    city: "Navi Mumbai",
    state: "Maharashtra",
    zipCode: "400703",
    latitude: 19.0785,
    longitude: 73.0169,
    phone: "+91 22 3982 3982",
    email: "info@hiranandanihospital.org",
    website: "https://www.hiranandanihospital.org",
    description: "Tertiary care hospital with comprehensive medical services",
    services: ["Oncology", "Cardiology", "Neurology", "Orthopedics", "Kidney Transplant"],
    operatingHours: {
      "monday": "24/7",
      "tuesday": "24/7",
      "wednesday": "24/7",
      "thursday": "24/7",
      "friday": "24/7",
      "saturday": "24/7",
      "sunday": "24/7"
    },
    rating: 4.4,
    totalReviews: 1120
  },
  {
    name: "Breach Candy Hospital",
    address: "60A, Bhulabhai Desai Road, Breach Candy",
    city: "Mumbai",
    state: "Maharashtra",
    zipCode: "400026",
    latitude: 18.9735,
    longitude: 72.8112,
    phone: "+91 22 2367 8888",
    email: "info@breachcandyhospital.org",
    website: "https://www.breachcandyhospital.org",
    description: "Premium healthcare facility with personalized medical care",
    services: ["Oncology", "Cardiology", "Neurology", "Orthopedics", "Maternity"],
    operatingHours: {
      "monday": "24/7",
      "tuesday": "24/7",
      "wednesday": "24/7",
      "thursday": "24/7",
      "friday": "24/7",
      "saturday": "24/7",
      "sunday": "24/7"
    },
    rating: 4.7,
    totalReviews: 980
  }
];

async function seedHospitals() {
  try {
    console.log('🏥 Starting hospital data seeding...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing hospitals (optional - remove this line if you want to keep existing data)
    await Hospital.destroy({ where: {} });
    console.log('🗑️  Cleared existing hospital data');
    
    // Insert sample hospitals
    const createdHospitals = await Hospital.bulkCreate(sampleHospitals, {
      validate: true,
      returning: true
    });
    
    console.log(`✅ Successfully seeded ${createdHospitals.length} hospitals:`);
    createdHospitals.forEach(hospital => {
      console.log(`   - ${hospital.name} (${hospital.city})`);
    });
    
    console.log('🎉 Hospital seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding hospitals:', error);
    logger.error('Hospital seeding error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seeding function
if (require.main === module) {
  seedHospitals();
}

module.exports = { seedHospitals, sampleHospitals };