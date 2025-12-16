# ImmunoACT Backend API

A secure, HIPAA-compliant backend service for ImmunoACT - India's leading CAR-T cell therapy company. This Node.js/Express API provides healthcare-grade data management, contact form processing, content management, and user authentication with comprehensive audit logging and security features.

## 🏥 Overview

ImmunoACT is pioneering personalized cancer treatment through innovative CAR-T cell therapy. This backend service handles sensitive healthcare data with enterprise-grade security, encryption, and compliance features designed specifically for medical organizations.

## ✨ Key Features

### 🔒 Security & Compliance
- **HIPAA Compliance**: Healthcare-grade data protection and audit trails
- **End-to-End Encryption**: AES-256 encryption for sensitive personal data
- **Rate Limiting**: Configurable rate limits to prevent abuse
- **Input Sanitization**: XSS protection and SQL injection prevention
- **Audit Logging**: Comprehensive activity tracking for compliance
- **JWT Authentication**: Secure token-based authentication system

### 📊 Core Functionality
- **Contact Form Management**: Encrypted patient/partner inquiry handling
- **Content Management**: Publications, media, and career postings
- **User Management**: Role-based access control system
- **File Upload**: Secure media file handling with validation
- **Email Notifications**: Automated email alerts and notifications
- **Search & Analytics**: Advanced search and reporting capabilities

### 🛡️ Data Protection
- **Automatic Data Retention**: Configurable data lifecycle management
- **Encrypted Storage**: Personal data encrypted at rest
- **Secure Headers**: Comprehensive security headers implementation
- **CORS Protection**: Configurable cross-origin resource sharing
- **Request Validation**: Input validation using Joi and express-validator

## 🛠️ Tech Stack

- **Runtime**: Node.js 18.0.0+
- **Framework**: Express.js 4.18.2
- **Database**: MySQL 8.0+ with Sequelize ORM
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Encryption**: Node.js Crypto (AES-256-CBC)
- **Email**: Nodemailer 6.10.1
- **Logging**: Winston 3.11.0
- **Security**: Helmet, HPP, XSS protection
- **Validation**: Joi 17.11.0, express-validator 7.0.1
- **Testing**: Jest 29.7.0, Supertest 6.3.3

## 📋 Prerequisites

Before running this project, ensure you have:

- **Node.js**: Version 18.0.0 or higher
- **MySQL**: Version 8.0 or higher
- **npm**: Version 8.0.0 or higher
- **SSL Certificate**: For production HTTPS (required for HIPAA compliance)

## 🚀 Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd immunoact-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration values.

4. **Set up the database**
   ```bash
   # Create the database
   mysql -u root -p < create-db.sql
   
   # Run database migrations (development only)
   npm run dev
   ```

5. **Seed the database (optional)**
   ```bash
   npm run seed
   ```

### Development

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### Production

Start the production server:

```bash
npm start
```

## 📁 Project Structure

```
immunoact-backend/
├── config/                 # Configuration files
│   ├── database.js        # Database connection and settings
│   └── logger.js          # Winston logging configuration
├── controllers/           # Request handlers
│   ├── authController.js  # Authentication logic
│   ├── contactController.js # Contact form management
│   ├── userController.js  # User management
│   ├── mediaController.js # Media content management
│   ├── publicationController.js # Publications management
│   └── careerController.js # Career postings management
├── middleware/            # Express middleware
│   ├── auth.js           # JWT authentication middleware
│   ├── security.js       # Security and rate limiting
│   ├── upload.js         # File upload handling
│   └── validation.js     # Input validation schemas
├── models/               # Sequelize database models
│   ├── ContactForm.js    # Encrypted contact form model
│   ├── User.js          # User authentication model
│   ├── Media.js         # Media content model
│   ├── Publication.js   # Publications model
│   ├── Career.js        # Career postings model
│   └── index.js         # Model associations
├── routes/              # API route definitions
│   ├── auth.js         # Authentication routes
│   ├── contact.js      # Contact form routes
│   ├── users.js        # User management routes
│   ├── media.js        # Media content routes
│   ├── publications.js # Publications routes
│   ├── careers.js      # Career routes
│   ├── upload.js       # File upload routes
│   ├── search.js       # Search functionality
│   └── public.js       # Public API routes
├── services/            # Business logic services
│   ├── emailService.js  # Email notification service
│   └── emailTemplates.js # Email template management
├── scripts/             # Utility scripts
│   ├── seedDatabase.js  # Database seeding
│   └── testAuth.js      # Authentication testing
├── logs/               # Application logs
├── uploads/            # File upload directory
├── .env.example        # Environment variables template
├── server.js           # Main application entry point
└── package.json        # Dependencies and scripts
```

## 🔧 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/reset-password` - Request password reset

### Contact Forms
- `POST /api/v1/contact/submit` - Submit contact form
- `GET /api/v1/contact/forms` - Get contact forms (admin)
- `PUT /api/v1/contact/forms/:id` - Update form status (admin)
- `GET /api/v1/contact/stats` - Get form statistics (admin)
- `GET /api/v1/contact/health` - Health check endpoint

### Content Management
- `GET /api/v1/media` - Get media content
- `POST /api/v1/media` - Create media content (admin)
- `PUT /api/v1/media/:id` - Update media content (admin)
- `DELETE /api/v1/media/:id` - Delete media content (admin)

- `GET /api/v1/publications` - Get publications
- `POST /api/v1/publications` - Create publication (admin)
- `PUT /api/v1/publications/:id` - Update publication (admin)
- `DELETE /api/v1/publications/:id` - Delete publication (admin)

- `GET /api/v1/careers` - Get career postings
- `POST /api/v1/careers` - Create career posting (admin)
- `PUT /api/v1/careers/:id` - Update career posting (admin)
- `DELETE /api/v1/careers/:id` - Delete career posting (admin)

### User Management
- `GET /api/v1/users` - Get users (admin)
- `POST /api/v1/users` - Create user (admin)
- `PUT /api/v1/users/:id` - Update user (admin)
- `DELETE /api/v1/users/:id` - Delete user (admin)

### File Upload
- `POST /api/v1/upload/image` - Upload image file
- `POST /api/v1/upload/document` - Upload document file

### Search
- `GET /api/v1/search` - Global search across content

### Public API
- `GET /api/v1/public/media` - Public media content
- `GET /api/v1/public/publications` - Public publications
- `GET /api/v1/public/careers` - Public career postings

## 🔒 Security Features

### Data Encryption
```javascript
// Personal data is encrypted using AES-256-CBC
const encryptedData = {
  firstName: encrypt(data.firstName),
  lastName: encrypt(data.lastName),
  email: encrypt(data.email),
  // ... other sensitive fields
};
```

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Contact Forms**: 5 submissions per hour per IP
- **Authentication**: 10 attempts per 15 minutes per IP

### Security Headers
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

### Audit Logging
All actions are logged with:
- User identification
- IP address and user agent
- Timestamp
- Action details
- Request/response data (sanitized)

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run Jest test suite |
| `npm run lint` | Run ESLint for code quality |
| `npm run security-audit` | Run npm security audit |
| `npm run seed` | Seed database with sample data |

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

Test specific endpoints:

```bash
# Test authentication
node scripts/testAuth.js

# Test contact form submission
curl -X POST http://localhost:5000/api/v1/contact/submit \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","message":"Test message","partneringCategory":"General Inquiry","consentGiven":true}'
```

## 🚀 Deployment

### Production Deployment

1. **Set up production environment**
   ```bash
   # Set NODE_ENV to production
   export NODE_ENV=production
   
   # Install production dependencies only
   npm ci --only=production
   ```

2. **Configure SSL/TLS**
   - Obtain SSL certificate for HTTPS
   - Configure reverse proxy (nginx/Apache)
   - Enable HSTS headers

3. **Database Setup**
   ```bash
   # Create production database
   mysql -u root -p < create-db.sql
   
   # Run migrations (if any)
   # Note: In production, use manual migration scripts
   ```

4. **Start the application**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment-Specific Configuration

- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

## 📊 Monitoring & Logging

### Log Files
- `logs/error.log` - Error messages and stack traces
- `logs/audit.log` - HIPAA compliance audit trail
- `logs/combined.log` - All application logs
- `logs/debug.log` - Debug information (development only)

### Health Monitoring
```bash
# Check API health
curl http://localhost:5000/api/v1/contact/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "healthy",
    "email": "healthy"
  },
  "version": "1.0.0"
}
```

## 🔐 HIPAA Compliance Features

### Data Protection
- **Encryption at Rest**: All PII encrypted using AES-256
- **Encryption in Transit**: HTTPS required in production
- **Access Controls**: Role-based permissions
- **Audit Trails**: Complete activity logging
- **Data Retention**: Automatic data lifecycle management

### Compliance Checklist
- ✅ Administrative Safeguards
- ✅ Physical Safeguards
- ✅ Technical Safeguards
- ✅ Audit Controls
- ✅ Integrity Controls
- ✅ Person or Entity Authentication
- ✅ Transmission Security

## 🤝 Contributing

We welcome contributions to improve the ImmunoACT backend:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Standards
- Follow Node.js best practices
- Use ESLint configuration provided
- Write comprehensive tests for new features
- Ensure HIPAA compliance for healthcare data
- Document API changes in this README

### Security Guidelines
- Never commit sensitive data or credentials
- Use environment variables for configuration
- Validate all inputs and sanitize outputs
- Follow principle of least privilege
- Implement proper error handling

## 🏥 About ImmunoACT

ImmunoACT is India's first indigenous CAR-T cell therapy company, dedicated to making advanced cancer treatments accessible and affordable. Our mission is to transform cancer care through innovative cellular therapies and personalized medicine.

**Website**: [www.immunoact.com](https://www.immunoact.com)

---

**Built with ❤️ by the ImmunoACT Software Developer**

*This backend service is designed to handle sensitive healthcare data with the highest standards of security and compliance. All development and deployment practices follow healthcare industry best practices and regulatory requirements.*#
