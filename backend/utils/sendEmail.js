const apiInstance = require('./brevo');

/**
 * Send an email using Brevo
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body text (or simple HTML)
 * @returns {Promise<any>}
 */
const sendEmail = async (to, subject, text) => {
  const senderEmail = process.env.SENDER_EMAIL || 'oasispatna5555@gmail.com';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff8c00 0%, #ff4500 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background: #fff; }
        .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0; font-size: 24px;">Oasis</h1>
        </div>
        <div class="content">
          <h2 style="margin-top:0; color: #1e293b;">${subject}</h2>
          <div style="font-size: 16px; color: #475569;">
            ${text.replace(/\n/g, '<br>')}
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2026 Oasis Jee Classes. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const sendSmtpEmail = {
    to: [{ email: to }],
    htmlContent: htmlContent,
    sender: {
      email: senderEmail,
      name: "Oasis"
    },
    subject: subject
  };

  try {
    console.log(`Sending email to ${to}: ${subject}`);
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent successfully:', JSON.stringify(data));
    return data;
  } catch (error) {
    const errorMessage = error.response?.body?.message || error.message;
    console.error('❌ Error sending email:', errorMessage);
    throw new Error(errorMessage);
  }
};

module.exports = sendEmail;