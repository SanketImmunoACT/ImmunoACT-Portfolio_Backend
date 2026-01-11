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

// Import cookie middleware
const {
  cookieParserMiddleware,
  sessionMiddleware,
  hipaaSessionMiddleware,
  cookieSecurityMiddleware,
  cookieCleanupMiddleware,
  cookieRateLimitMiddleware,
  cookieDebugMiddleware
} = require('./middleware/cookies');

const cookieService = require('./services/cookieService');

// Import routes
const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const mediaRoutes = require('./routes/media');
const publicationRoutes = require('./routes/publications');
const careerRoutes = require('./routes/careers');
const jobApplicationRoutes = require('./routes/jobApplications');
const publicRoutes = require('./routes/public');
const searchRoutes = require('./routes/search');
const hospitalRoutes = require('./routes/hospitals');
const cookieRoutes = require('./routes/cookies');
const adminRoutes = require('./routes/admin');
const jobReferralRoutes = require('./routes/jobReferrals');
const setupRoutes = require('./routes/setup');

// Initialize Express app
const app = express();

console.log('🚀 Starting ImmunoACT Backend Server...');

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// CORS configuration - Apply FIRST before any other middleware
const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS Origin:', origin); // Debug log
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, be more permissive
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      // Allow localhost on any port for development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        console.log('CORS: Allowing localhost origin:', origin);
        return callback(null, true);
      }
    }
    
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];
    
    console.log('CORS: Checking against allowed origins:', allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('CORS: Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      // In development, allow it anyway to prevent blocking
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('CORS: Allowing in development mode');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Cache-Control',
    'Pragma',
    'Expires',
    'Origin',
    'X-HTTP-Method-Override'
  ],
  exposedHeaders: ['Cache-Control', 'Pragma', 'Expires'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Apply CORS FIRST - before any other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Add CORS debugging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  }
  next();
});

// Add explicit CORS headers as additional fallback
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow specific origins in development
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173', 
    'http://localhost:5174'
  ];
  
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Pragma, Expires, Origin, X-HTTP-Method-Override');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

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

// Cookie and session middleware
app.use(cookieParserMiddleware);
app.use(sessionMiddleware);
app.use(cookieService.setCookieMiddleware());
app.use(cookieService.parseCookieMiddleware());
app.use(cookieSecurityMiddleware);
app.use(cookieCleanupMiddleware);
app.use(cookieRateLimitMiddleware);
app.use(cookieDebugMiddleware);

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
app.use(hipaaSessionMiddleware); // HIPAA session validation
// Apply rate limiting only in production
if (process.env.NODE_ENV === 'production') {
  app.use(generalLimiter);
}

// API routes
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/publications', publicationRoutes);
app.use('/api/v1/careers', careerRoutes);
app.use('/api/v1/job-applications', jobApplicationRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/hospitals', hospitalRoutes);
app.use('/api/v1/cookies', cookieRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/job-referrals', jobReferralRoutes);
app.use('/api/v1/setup', setupRoutes);

// Public routes (no authentication required)
app.use('/api/v1/public', publicRoutes);

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
      search: '/api/v1/search',
      hospitals: '/api/v1/hospitals',
      cookies: '/api/v1/cookies',
      public: '/api/v1/public'
    }
  });
});

// Development endpoint to clear rate limits
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.get('/dev/clear-rate-limits', (req, res) => {
    // Clear cookie rate limits
    if (global.cookieRateLimit) {
      global.cookieRateLimit.clear();
    }
    
    res.json({
      message: 'Rate limits cleared',
      timestamp: new Date().toISOString()
    });
  });
}

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

