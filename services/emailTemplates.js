// Email Templates for Different Form Types
// This module provides templates for various forms: contact, careers, collaborate, etc.

class EmailTemplates {
  constructor() {
    this.companyName = process.env.COMPANY_NAME || 'ImmunoACT';
    this.companyWebsite = process.env.COMPANY_WEBSITE || 'https://immunoact.com';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'helpdesk@immunoact.com';
  }

  // Base template wrapper
  getBaseTemplate(title, content, footerNote = '') {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #ff6b35, #f7931e); border-radius: 10px; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .header .logo { color: white; font-size: 14px; margin-top: 5px; }
            .content { background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; display: block; margin-bottom: 5px; }
            .value { padding: 10px; background-color: white; border-radius: 5px; border-left: 4px solid #ff6b35; }
            .message-box { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center; }
            .urgent { color: #dc3545; font-weight: bold; }
            .highlight { color: #ff6b35; font-weight: bold; }
            .contact-info { background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin-top: 20px; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #ff6b35; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${this.companyName}</h1>
                <div class="logo">Advanced CAR-T Cell Therapy</div>
            </div>
            
            ${content}
            
            <div class="footer">
                <p><strong>⚠️ CONFIDENTIAL HEALTHCARE COMMUNICATION</strong></p>
                <p>This email contains potentially sensitive healthcare-related information. Please handle according to HIPAA and data protection guidelines.</p>
                ${footerNote}
                <p>© ${new Date().getFullYear()} ${this.companyName}. All rights reserved.</p>
                <p><strong>Support:</strong> ${this.supportEmail} | <strong>Website:</strong> ${this.companyWebsite}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // CONTACT FORM TEMPLATES
  getContactFormAdminTemplate(data) {
    const content = `
      <div class="content">
          <h2>🏥 New Contact Form Submission</h2>
          <p><strong>Submission ID:</strong> ${data.submissionId}</p>
          <p><strong>Date:</strong> ${data.submissionDate}</p>
          <p><strong>Category:</strong> <span class="urgent">${data.partneringCategory}</span></p>
          
          <div class="field">
              <div class="label">👤 Contact Information</div>
              <div class="value">
                  <strong>Name:</strong> ${data.firstName} ${data.lastName}<br>
                  <strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a><br>
                  ${data.phone ? `<strong>Phone:</strong> ${data.phone}<br>` : ''}
                  ${data.institution ? `<strong>Institution:</strong> ${data.institution}` : ''}
              </div>
          </div>
          
          <div class="field">
              <div class="label">💬 Message</div>
              <div class="message-box">
                  ${data.message ? data.message.replace(/\n/g, '<br>') : 'No message provided'}
              </div>
          </div>
          
          <div class="field">
              <div class="label">📊 Submission Details</div>
              <div class="value">
                  <strong>IP Address:</strong> ${data.ipAddress}<br>
                  <strong>User Agent:</strong> ${data.userAgent}<br>
                  <strong>Consent Given:</strong> ${data.consentGiven ? '✅ Yes' : '❌ No'}
              </div>
          </div>
      </div>
    `;
    
    return this.getBaseTemplate(
      'New Contact Form Submission',
      content,
      '<p>Submission processed by ImmunoACT Contact System</p>'
    );
  }

  getContactFormUserTemplate(data) {
    const content = `
      <div class="content">
          <h2>Thank you for contacting ${this.companyName}</h2>
          
          <p>Dear ${data.firstName} ${data.lastName},</p>
          
          <p>Thank you for your interest in <strong>${this.companyName}</strong> and for reaching out to us regarding <span class="highlight">${data.partneringCategory}</span>.</p>
          
          <p>We have successfully received your inquiry and our team will review it carefully. Given the nature of healthcare partnerships and the importance of your request, we aim to respond within <strong>2-3 business days</strong>.</p>
          
          <p><strong>Your submission reference:</strong> ${data.submissionId}</p>
          
          <div class="contact-info">
              <h3>📞 For urgent inquiries, you can reach us at:</h3>
              <p>
                  <strong>Email:</strong> ${this.supportEmail}<br>
                  <strong>Address:</strong> 1st Floor, Plot R-977,TTC Industrial Area, MIDC Rabale, Navi Mumbai 400701 India
              </p>
          </div>
          
          <p>We appreciate your interest in advancing CAR-T cell therapy and look forward to exploring potential collaboration opportunities with you.</p>
          
          <p>Best regards,<br>
          <strong>The ${this.companyName} Team</strong></p>
      </div>
    `;
    
    return this.getBaseTemplate(
      `Thank you for contacting ${this.companyName}`,
      content,
      '<p>This is an automated confirmation email. Please do not reply to this message.</p>'
    );
  }

  // CAREERS FORM TEMPLATES (for future use)
  getCareersFormAdminTemplate(data) {
    const content = `
      <div class="content">
          <h2>💼 New Career Application</h2>
          <p><strong>Application ID:</strong> ${data.applicationId}</p>
          <p><strong>Position:</strong> <span class="urgent">${data.position}</span></p>
          <p><strong>Date:</strong> ${data.submissionDate}</p>
          
          <div class="field">
              <div class="label">👤 Candidate Information</div>
              <div class="value">
                  <strong>Name:</strong> ${data.firstName} ${data.lastName}<br>
                  <strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a><br>
                  <strong>Phone:</strong> ${data.phone}<br>
                  <strong>Experience:</strong> ${data.experience} years<br>
                  ${data.currentCompany ? `<strong>Current Company:</strong> ${data.currentCompany}<br>` : ''}
                  ${data.linkedIn ? `<strong>LinkedIn:</strong> <a href="${data.linkedIn}">${data.linkedIn}</a>` : ''}
              </div>
          </div>
          
          <div class="field">
              <div class="label">📄 Cover Letter</div>
              <div class="message-box">
                  ${data.coverLetter ? data.coverLetter.replace(/\n/g, '<br>') : 'No cover letter provided'}
              </div>
          </div>
          
          ${data.resumeAttached ? '<p><strong>📎 Resume:</strong> Attached to this email</p>' : ''}
      </div>
    `;
    
    return this.getBaseTemplate(
      'New Career Application',
      content,
      '<p>Application processed by ImmunoACT Careers System</p>'
    );
  }

  getCareersFormUserTemplate(data) {
    const content = `
      <div class="content">
          <h2>Thank you for your application!</h2>
          
          <p>Dear ${data.firstName} ${data.lastName},</p>
          
          <p>Thank you for your interest in joining the <strong>${this.companyName}</strong> team and for applying for the <span class="highlight">${data.position}</span> position.</p>
          
          <p>We have successfully received your application and our HR team will review it carefully. We typically respond to applications within <strong>1-2 weeks</strong>.</p>
          
          <p><strong>Your application reference:</strong> ${data.applicationId}</p>
          
          <div class="contact-info">
              <h3>📞 For questions about your application:</h3>
              <p>
                  <strong>HR Email:</strong> careers@immunoact.com<br>
                  <strong>Phone:</strong> +91-22-XXXX-XXXX
              </p>
          </div>
          
          <p>We appreciate your interest in advancing CAR-T cell therapy and potentially joining our mission to transform cancer treatment.</p>
          
          <p>Best regards,<br>
          <strong>The ${this.companyName} HR Team</strong></p>
      </div>
    `;
    
    return this.getBaseTemplate(
      `Application Received - ${data.position}`,
      content,
      '<p>This is an automated confirmation email. Please do not reply to this message.</p>'
    );
  }

  // COLLABORATION FORM TEMPLATES (for future use)
  getCollaborationFormAdminTemplate(data) {
    const content = `
      <div class="content">
          <h2>🤝 New Collaboration Inquiry</h2>
          <p><strong>Inquiry ID:</strong> ${data.inquiryId}</p>
          <p><strong>Collaboration Type:</strong> <span class="urgent">${data.collaborationType}</span></p>
          <p><strong>Date:</strong> ${data.submissionDate}</p>
          
          <div class="field">
              <div class="label">🏢 Organization Information</div>
              <div class="value">
                  <strong>Organization:</strong> ${data.organizationName}<br>
                  <strong>Contact Person:</strong> ${data.contactPerson}<br>
                  <strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a><br>
                  <strong>Phone:</strong> ${data.phone}<br>
                  <strong>Website:</strong> ${data.website ? `<a href="${data.website}">${data.website}</a>` : 'Not provided'}
              </div>
          </div>
          
          <div class="field">
              <div class="label">💡 Collaboration Proposal</div>
              <div class="message-box">
                  ${data.proposal ? data.proposal.replace(/\n/g, '<br>') : 'No proposal provided'}
              </div>
          </div>
          
          <div class="field">
              <div class="label">📊 Additional Details</div>
              <div class="value">
                  <strong>Budget Range:</strong> ${data.budgetRange || 'Not specified'}<br>
                  <strong>Timeline:</strong> ${data.timeline || 'Not specified'}<br>
                  <strong>Previous Experience:</strong> ${data.previousExperience ? 'Yes' : 'No'}
              </div>
          </div>
      </div>
    `;
    
    return this.getBaseTemplate(
      'New Collaboration Inquiry',
      content,
      '<p>Inquiry processed by ImmunoACT Collaboration System</p>'
    );
  }

  getCollaborationFormUserTemplate(data) {
    const content = `
      <div class="content">
          <h2>Thank you for your collaboration inquiry!</h2>
          
          <p>Dear ${data.contactPerson},</p>
          
          <p>Thank you for your interest in collaborating with <strong>${this.companyName}</strong> regarding <span class="highlight">${data.collaborationType}</span>.</p>
          
          <p>We have successfully received your collaboration proposal and our partnerships team will review it carefully. We typically respond to collaboration inquiries within <strong>3-5 business days</strong>.</p>
          
          <p><strong>Your inquiry reference:</strong> ${data.inquiryId}</p>
          
          <div class="contact-info">
              <h3>📞 For questions about your collaboration inquiry:</h3>
              <p>
                  <strong>Partnerships Email:</strong> partnerships@immunoact.com<br>
                  <strong>Phone:</strong> +91-22-XXXX-XXXX
              </p>
          </div>
          
          <p>We appreciate your interest in advancing CAR-T cell therapy through collaboration and look forward to exploring potential partnership opportunities.</p>
          
          <p>Best regards,<br>
          <strong>The ${this.companyName} Partnerships Team</strong></p>
      </div>
    `;
    
    return this.getBaseTemplate(
      `Collaboration Inquiry Received - ${data.collaborationType}`,
      content,
      '<p>This is an automated confirmation email. Please do not reply to this message.</p>'
    );
  }

  // Generic template for any form type
  getGenericFormTemplate(formType, data, isAdmin = false) {
    const templates = {
      contact: isAdmin ? this.getContactFormAdminTemplate(data) : this.getContactFormUserTemplate(data),
      careers: isAdmin ? this.getCareersFormAdminTemplate(data) : this.getCareersFormUserTemplate(data),
      collaboration: isAdmin ? this.getCollaborationFormAdminTemplate(data) : this.getCollaborationFormUserTemplate(data)
    };

    return templates[formType] || this.getDefaultTemplate(formType, data, isAdmin);
  }

  getDefaultTemplate(formType, data, isAdmin) {
    const content = `
      <div class="content">
          <h2>${isAdmin ? '📋 New Form Submission' : '✅ Form Submitted Successfully'}</h2>
          <p><strong>Form Type:</strong> ${formType}</p>
          <p><strong>Submission ID:</strong> ${data.submissionId || 'N/A'}</p>
          <p><strong>Date:</strong> ${data.submissionDate || new Date().toLocaleString()}</p>
          
          ${isAdmin ? 
            '<p>A new form submission has been received. Please check the admin dashboard for details.</p>' :
            '<p>Thank you for your submission. We will review it and get back to you soon.</p>'
          }
      </div>
    `;
    
    return this.getBaseTemplate(
      `${formType} Form ${isAdmin ? 'Submission' : 'Confirmation'}`,
      content
    );
  }
}

module.exports = new EmailTemplates();