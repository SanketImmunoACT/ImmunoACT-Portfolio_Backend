require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

console.log('🚀 Starting ImmunoACT Working Server...');

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(express.json());

// Database connection
let dbConnection;

async function initDatabase() {
  try {
    dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Simple encryption function
function simpleEncrypt(text) {
  if (!text) return null;
  return Buffer.from(text).toString('base64');
}

// Contact form submission endpoint
app.post('/api/v1/contact/submit', async (req, res) => {
  try {
    console.log('📝 Contact form submission received:', req.body);
    
    const {
      firstName,
      lastName,
      email,
      phone,
      institution,
      partneringCategory,
      message,
      consentGiven,
      website
    } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !message || !partneringCategory) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        message: 'Consent is required'
      });
    }

    // Insert into database
    const query = `
      INSERT INTO contact_forms (
        firstName, lastName, email, phone, institution, 
        message, partneringCategory, submissionDate, 
        ipAddress, userAgent, status, consentGiven, 
        dataRetentionDate, lastModified, modifiedBy,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'pending', ?, 
        DATE_ADD(NOW(), INTERVAL 2555 DAY), NOW(), 'system',
        NOW(), NOW())
    `;

    const values = [
      simpleEncrypt(firstName),
      simpleEncrypt(lastName),
      simpleEncrypt(email),
      phone ? simpleEncrypt(phone) : null,
      institution ? simpleEncrypt(institution) : null,
      simpleEncrypt(message),
      partneringCategory,
      req.ip || req.connection?.remoteAddress || 'unknown',
      req.get('User-Agent') || 'unknown',
      consentGiven
    ];

    const [result] = await dbConnection.execute(query, values);
    
    console.log('✅ Contact form saved to database with ID:', result.insertId);

    // Log to audit table
    const auditQuery = `
      INSERT INTO audit_logs (
        action, tableName, recordId, userId, ipAddress, 
        userAgent, details, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const auditValues = [
      'CREATE',
      'contact_forms',
      result.insertId,
      'anonymous',
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown',
      JSON.stringify({
        partneringCategory,
        consentGiven,
        hasPhone: !!phone,
        hasInstitution: !!institution
      })
    ];

    await dbConnection.execute(auditQuery, auditValues);

    res.json({
      success: true,
      message: 'Contact form submitted successfully',
      data: {
        id: result.insertId,
        timestamp: new Date().toISOString(),
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ Error saving contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/api/v1/contact/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbConnection ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ImmunoACT Backend API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Initialize and start server
async function startServer() {
  await initDatabase();
  
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`🔒 CORS enabled for all origins`);
  });
}

startServer().catch(console.error);