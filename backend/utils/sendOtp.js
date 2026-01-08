const apiInstance = require('./brevo');

/**
 * Send OTP via Brevo Transactional Email
 * @param {string} email - Recipient email
 * @param {string} otp - The OTP code
 * @returns {Promise<any>}
 */
const sendOtp = async (email, otp) => {
    const senderEmail = process.env.SENDER_EMAIL || 'oasispatna5555@gmail.com';

    // Spaced out OTP for better readability like in the image
    const spacedOtp = otp.split('').join(' ');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #0f172a; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #0f172a; padding: 40px 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); }
            
            .header { 
                background: linear-gradient(135deg, #ff8c00 0%, #ff4500 100%); 
                padding: 40px 20px; 
                text-align: center; 
                color: white; 
            }
            .brand-name { font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.025em; }
            .brand-tagline { font-size: 14px; opacity: 0.9; margin-top: 8px; font-weight: 500; }
            
            .content { padding: 40px 30px; color: #f8fafc; text-align: left; }
            .content-title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 16px; }
            .content-text { font-size: 15px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px; }
            
            .otp-container { 
                background: linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(255, 69, 0, 0.1) 100%);
                border: 1px solid rgba(255, 140, 0, 0.2);
                border-radius: 16px; 
                padding: 32px 20px; 
                text-align: center; 
                margin-bottom: 32px;
            }
            .otp-label { font-size: 12px; font-weight: 700; color: #fb923c; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; display: block; }
            .otp-code { 
                font-size: 42px; 
                font-family: 'Courier New', Courier, monospace; 
                font-weight: 800; 
                color: #ffffff; 
                letter-spacing: 12px; 
                margin: 0;
                text-shadow: 0 0 20px rgba(255, 140, 0, 0.3);
            }
            
            .expiry-notice { font-size: 13px; color: #64748b; text-align: center; font-style: italic; }
            
            .footer { padding: 30px; text-align: center; background-color: rgba(0,0,0,0.2); }
            .footer-text { font-size: 12px; color: #475569; margin: 4px 0; }
            .ignore-text { font-size: 11px; color: #334155; margin-top: 16px; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header">
                    <h1 class="brand-name">Oasis</h1>
                    <p class="brand-tagline">Your Gateway to Success</p>
                </div>
                <div class="content">
                    <h2 class="content-title">Verification Code</h2>
                    <p class="content-text">
                        Welcome to Oasis! To complete your registration and secure your account, please use the verification code provided below.
                    </p>
                    
                    <div class="otp-container">
                        <span class="otp-label">Your Security Code</span>
                        <div class="otp-code">${spacedOtp}</div>
                    </div>
                    
                    <p class="expiry-notice">
                        This code will expire in 5 minutes. Please do not share this code with anyone for your security.
                    </p>
                </div>
                <div class="footer">
                    <p class="footer-text">&copy; 2026 Oasis Jee Classes. All rights reserved.</p>
                    <p class="footer-text">Patna, Bihar, India</p>
                    <p class="ignore-text">If you didn't request this code, please ignore this email.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    const sendSmtpEmail = {
        to: [{ email: email }],
        htmlContent: htmlContent,
        sender: {
            email: senderEmail,
            name: "Oasis"
        },
        subject: "Your OTP Verification Code - Oasis"
    };

    try {
        console.log(`Sending premium orange OTP email to ${email}...`);
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Brevo Response:', JSON.stringify(data));
        return data;
    } catch (error) {
        const errorMessage = error.response?.body?.message || error.message;
        console.error('❌ Brevo API Error:', errorMessage);
        throw new Error(errorMessage);
    }
};

module.exports = sendOtp;
