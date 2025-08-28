import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure transporter for development
    // In production, you would use real SMTP settings
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', // Test SMTP server
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'verysecret'
      }
    });
  }

  async sendIssueNotification(
    adminEmails: string[],
    issueTitle: string,
    issueDescription: string,
    issueCategory: string,
    createdBy: string
  ): Promise<boolean> {
    try {
      const emailOptions: EmailOptions = {
        to: adminEmails,
        subject: `New Issue Raised: ${issueTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background-color: #f4f4f4;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
              .header {
                background: #007bff;
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                margin: -20px -20px 20px -20px;
              }
              .badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
              }
              .badge-ibml { background: #e3f2fd; color: #1976d2; }
              .badge-softtrac { background: #e8f5e8; color: #388e3c; }
              .badge-omniscan { background: #fff3e0; color: #f57c00; }
              .content {
                margin: 20px 0;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>🚨 New Issue Raised - DisiSolves</h2>
              </div>
              
              <div class="content">
                <p><strong>A new issue has been raised and requires your attention:</strong></p>
                
                <h3>${issueTitle}</h3>
                
                <p><strong>Category:</strong> 
                  <span class="badge badge-${issueCategory}">
                    ${issueCategory === 'ibml' ? 'IBML Scanners' : 
                      issueCategory === 'softtrac' ? 'SoftTrac' : 
                      issueCategory === 'omniscan' ? 'OmniScan' : issueCategory}
                  </span>
                </p>
                
                <p><strong>Raised by:</strong> ${createdBy}</p>
                
                <p><strong>Description:</strong></p>
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
                  ${issueDescription.replace(/\n/g, '<br>')}
                </div>
                
                <p style="margin-top: 20px;">
                  <a href="${process.env.REPLIT_DOMAIN || 'http://localhost:5000'}" 
                     style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    View Issue in DisiSolves
                  </a>
                </p>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from DisiSolves. Please log in to the system to review and respond to this issue.</p>
                <p>System: DisiSolves Internal Troubleshooting Platform</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      // Send email to all admin recipients
      const results = await Promise.all(
        adminEmails.map(email => 
          this.transporter.sendMail({
            from: '"DisiSolves System" <noreply@disisolves.com>',
            to: email,
            subject: emailOptions.subject,
            html: emailOptions.html
          })
        )
      );

      console.log(`Email notifications sent to ${adminEmails.length} administrators`);
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  async sendAnswerApprovalNotification(
    adminEmails: string[],
    questionTitle: string,
    answerAuthor: string,
    answerPreview: string
  ): Promise<boolean> {
    try {
      const emailOptions: EmailOptions = {
        to: adminEmails,
        subject: `Answer Pending Approval: ${questionTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background-color: #f4f4f4;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
              .header {
                background: #ff9800;
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                margin: -20px -20px 20px -20px;
              }
              .content {
                margin: 20px 0;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>⏳ Answer Pending Approval - DisiSolves</h2>
              </div>
              
              <div class="content">
                <p><strong>A new answer has been submitted and requires approval:</strong></p>
                
                <h3>Question: ${questionTitle}</h3>
                
                <p><strong>Answer by:</strong> ${answerAuthor}</p>
                
                <p><strong>Answer Preview:</strong></p>
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #ff9800; margin: 10px 0;">
                  ${answerPreview.substring(0, 200)}${answerPreview.length > 200 ? '...' : ''}
                </div>
                
                <p style="margin-top: 20px;">
                  <a href="${process.env.REPLIT_DOMAIN || 'http://localhost:5000'}" 
                     style="background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Review Answer in DisiSolves
                  </a>
                </p>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from DisiSolves. Please log in to review and approve/reject this answer.</p>
                <p>System: DisiSolves Internal Troubleshooting Platform</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const results = await Promise.all(
        adminEmails.map(email => 
          this.transporter.sendMail({
            from: '"DisiSolves System" <noreply@disisolves.com>',
            to: email,
            subject: emailOptions.subject,
            html: emailOptions.html
          })
        )
      );

      console.log(`Answer approval notifications sent to ${adminEmails.length} administrators`);
      return true;
    } catch (error) {
      console.error('Failed to send answer approval notification:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();