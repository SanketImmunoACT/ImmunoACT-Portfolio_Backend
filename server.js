require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { connectDB } = require('./config/database');
const logger = require('./config/logger');
const {
  generalLimiter,
  securityHeaders,
  sanitizeInput,
  auditMiddleware,
  hipaaCompliance,
  errorHandler,
  hpp
} = require('./middleware/security');

// Import routes
const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const mediaRoutes = require('./routes/media');
const publicationRoutes = require('./routes/publications');
const careerRoutes = require('./routes/careers');
const publicRoutes = require('./routes/public');
const uploadRoutes = require('./routes/upload');
const searchRoutes = require('./routes/search');
const hospitalRoutes = require('./routes/hospitals');

// Initialize Express app
const app = express();

console.log('🚀 Starting ImmunoACT Backend Server...');

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Connect to database
console.log('📊 Connecting to database...');
connectDB().catch(error => {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
});

// Security middleware (order matters!)
app.use(securityHeaders);
app.use(hipaaCompliance);
app.use(hpp);

// CORS configuration - Allow specific origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Security and audit middleware
app.use(auditMiddleware);
app.use(sanitizeInput);
app.use(generalLimiter);

// API routes
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/publications', publicationRoutes);
app.use('/api/v1/careers', careerRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/hospitals', hospitalRoutes);

// Public routes (no authentication required)
app.use('/api/v1/public', publicRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ImmunoACT Backend API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      contact: '/api/v1/contact/submit',
      health: '/api/v1/contact/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      media: '/api/v1/media',
      publications: '/api/v1/publications',
      careers: '/api/v1/careers',
      upload: '/api/v1/upload',
      search: '/api/v1/search',
      hospitals: '/api/v1/hospitals',
      public: '/api/v1/public'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.auditLog('ENDPOINT_NOT_FOUND', 'anonymous', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  }, req);
  
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested resource does not exist'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connection
    const { sequelize } = require('./config/database');
    sequelize.close().then(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason.message || reason
  });
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 ImmunoACT Backend Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔒 HIPAA Compliance: ${process.env.HIPAA_COMPLIANT === 'true' ? 'Enabled' : 'Disabled'}`);
  logger.info(`📧 Email Service: ${process.env.SMTP_HOST ? 'Configured' : 'Not Configured'}`);
});

module.exports = app;

