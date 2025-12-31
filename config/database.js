const { Sequelize } = require('sequelize');
const logger = require('./logger');

// Create Sequelize instance with MySQL
const sequelize = new Sequelize(
  process.env.DB_NAME || 'immunoact_prod',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    
    // Connection pool configuration
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    
    // Security and performance settings
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false,
      // Enable MySQL encryption at rest if supported
      ...(process.env.DB_SSL_CA && {
        ssl: {
          ca: process.env.DB_SSL_CA,
          cert: process.env.DB_SSL_CERT,
          key: process.env.DB_SSL_KEY
        }
      })
    },
    
    // Logging configuration - disable in production for performance
    logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
    
    // Timezone configuration
    timezone: '+00:00',
    
    // Define charset and collation
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  }
);

const connectDB = async () => {
  try {
    // Test the connection
    await sequelize.authenticate();
    logger.info(`MySQL Connected: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    
    // Sync database (create tables if they don't exist)
    if (process.env.NODE_ENV !== 'production') {
      // Use force: false and alter: false to avoid modifying existing tables
      await sequelize.sync({ force: false, alter: false });
      logger.info('Database synchronized');
    }
    
    return sequelize;
    
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await sequelize.close();
    logger.info('MySQL connection closed through app termination');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = { connectDB, sequelize };