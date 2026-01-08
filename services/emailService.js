const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('Email service not configured - missing SMTP settings', {
        SMTP_HOST: !!process.env.SMTP_HOST,
        SMTP_USER: !!process.env.SMTP_USER,
        SMTP_PASS: !!process.env.SMTP_PASS
      });
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        // Add additional options for better compatibility
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email service configuration error:', {
            error: error.message,
            code: error.code,
            command: error.command
          });
        } else {
          logger.info('Email service ready', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER
          });
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.transporter) {
      logger.warn('Email service not configured - cannot send email');
      return { 
        success: false, 
        error: 'Email service not configured. Please check SMTP settings.' 
      };
    }

    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to,
        subject,
        html,
        text
      };

      logger.info('Attempting to send email', {
        to,
        subject,
        from: mailOptions.from
      });

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: info.messageId,
        response: info.response
      });

      return { success: true, messageId: info.messageId };

    } catch (error) {
      logger.error('Failed to send email:', {
        error: error.message,
        code: error.code,
        command: error.command,
        to,
        subject
      });
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.code === 'EAUTH') {
        errorMessage = 'Authentication failed. Please check SMTP username and password.';
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Connection failed. Please check SMTP host and port settings.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timed out. Please check network connectivity.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Send notification when content status changes
  async sendStatusChangeNotification(contentType, item, oldStatus, newStatus, changedBy) {
    const subject = `${contentType} Status Changed: ${item.title}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">ImmunoACT Admin Notification</h2>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">${contentType} Status Update</h3>
          
          <p><strong>Title:</strong> ${item.title}</p>
          <p><strong>Status Changed:</strong> ${oldStatus} → ${newStatus}</p>
          <p><strong>Changed By:</strong> ${changedBy}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          
          ${item.excerpt ? `<p><strong>Excerpt:</strong> ${item.excerpt}</p>` : ''}
          ${item.department ? `<p><strong>Department:</strong> ${item.department}</p>` : ''}
          ${item.authors ? `<p><strong>Authors:</strong> ${item.authors}</p>` : ''}
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          This is an automated notification from the ImmunoACT Admin Dashboard.
        </p>
      </div>
    `;

    const text = `
      ImmunoACT Admin Notification
      
      ${contentType} Status Update
      
      Title: ${item.title}
      Status Changed: ${oldStatus} → ${newStatus}
      Changed By: ${changedBy}
      Date: ${new Date().toLocaleString()}
      
      This is an automated notification from the ImmunoACT Admin Dashboard.
    `;

    // Send to admin email
    if (process.env.ADMIN_EMAIL) {
      return await this.sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject,
        html,
        text
      });
    }

    return { success: false, error: 'Admin email not configured' };
  }

  // Send notification for new user creation
  async sendNewUserNotification(user, createdBy) {
    const subject = `New User Account Created: ${user.firstName} ${user.lastName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">ImmunoACT Admin Notification</h2>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">New User Account Created</h3>
          
          <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
          <p><strong>Username:</strong> ${user.username}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Status:</strong> ${user.isActive ? 'Active' : 'Inactive'}</p>
          <p><strong>Created By:</strong> ${createdBy}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          This is an automated notification from the ImmunoACT Admin Dashboard.
        </p>
      </div>
    `;

    const text = `
      ImmunoACT Admin Notification
      
      New User Account Created
      
      Name: ${user.firstName} ${user.lastName}
      Username: ${user.username}
      Email: ${user.email}
      Role: ${user.role.replace('_', ' ').toUpperCase()}
      Status: ${user.isActive ? 'Active' : 'Inactive'}
      Created By: ${createdBy}
      Date: ${new Date().toLocaleString()}
      
      This is an automated notification from the ImmunoACT Admin Dashboard.
    `;

    // Send to admin email
    if (process.env.ADMIN_EMAIL) {
      return await this.sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject,
        html,
        text
      });
    }

    return { success: false, error: 'Admin email not configured' };
  }

  // Send welcome email to new user
  async sendWelcomeEmail(user, temporaryPassword) {
    const subject = 'Welcome to ImmunoACT Admin Dashboard';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Welcome to ImmunoACT</h2>
        
        <p>Hello ${user.firstName},</p>
        
        <p>Your admin account has been created for the ImmunoACT Admin Dashboard.</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Your Login Credentials</h3>
          
          <p><strong>Username:</strong> ${user.username}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role.replace('_', ' ').toUpperCase()}</p>
          
          ${temporaryPassword ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
              <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
                Please change this password after your first login.
              </p>
            </div>
          ` : ''}
        </div>
        
        <p>You can access the admin dashboard at: <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/login" style="color: #f97316;">Admin Login</a></p>
        
        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, please contact your administrator.
        </p>
      </div>
    `;

    const text = `
      Welcome to ImmunoACT
      
      Hello ${user.firstName},
      
      Your admin account has been created for the ImmunoACT Admin Dashboard.
      
      Your Login Credentials:
      Username: ${user.username}
      Email: ${user.email}
      Role: ${user.role.replace('_', ' ').toUpperCase()}
      
      ${temporaryPassword ? `Temporary Password: ${temporaryPassword}\nPlease change this password after your first login.\n` : ''}
      
      You can access the admin dashboard at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/login
      
      If you have any questions, please contact your administrator.
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html,
      text
    });
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;