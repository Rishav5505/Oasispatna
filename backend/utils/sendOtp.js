const apiInstance = require('./brevo');

/**
 * Send OTP via Brevo Transactional Email
 * @param {string} email - Recipient email
 * @param {string} otp - The OTP code
 * @returns {Promise<any>}
 */
const sendOtp = async (email, otp) => {
    const senderEmail = process.env.SENDER_EMAIL || 'oasispatna5555@gmail.com';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; }
            .content { padding: 30px; text-align: center; }
            .otp-code { font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 5px; padding: 15px; background: #f3f4f6; border-radius: 8px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #6b7280; padding-top: 20px; border-top: 1px solid #e0e0e0; }
            .premium-text { color: #f59e0b; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0; color: #1f2937;">Oasis <span class="premium-text">Premium</span></h1>
            </div>
            <div class="content">
                <h2 style="color: #374151;">Verify Your Email</h2>
                <p style="color: #4b5563; font-size: 16px;">Use the verification code below to complete your registration:</p>
                <div class="otp-code">${otp}</div>
                <p style="color: #6b7280; font-size: 14px;">This code is valid for 5 minutes. Do not share this code with anyone.</p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Oasis Jee Classes. All rights reserved.</p>
                <p>Patna, Bihar, India</p>
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
        subject: "Your OTP Verification Code - Oasis Premium"
    };

    try {
        console.log(`Sending professional OTP email to ${email}...`);
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
