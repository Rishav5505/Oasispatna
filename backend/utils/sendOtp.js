const apiInstance = require('./brevo');

/**
 * Send OTP via Brevo Transactional Email
 * @param {string} email - Recipient email
 * @param {string} otp - The OTP code
 * @returns {Promise<any>}
 */
const sendOtp = async (email, otp) => {
    // Debugging: Check if env vars are missing
    const apiKey = process.env.BREVO_API_KEY;
    const templateId = process.env.BREVO_TEMPLATE_ID || 1;
    const senderEmail = process.env.SENDER_EMAIL || 'oasispatna5555@gmail.com';

    if (!apiKey) {
        console.error('❌ CRITICAL: BREVO_API_KEY is missing in environment variables!');
    }

    const sendSmtpEmail = {
        to: [{ email: email }],
        // If templateId is provided, Brevo tries to use it. 
        // If it's invalid, we use htmlContent as a solid fallback.
        htmlContent: `<html><body><h1>Your OTP is: ${otp}</h1><p>This code expires in 5 minutes.</p><p>Regards,<br>Oasis Team</p></body></html>`,
        params: { otp: otp },
        sender: {
            email: senderEmail,
            name: "Oasis"
        },
        subject: "Your OTP Verification Code - Oasis"
    };

    // Only add templateId if it's explicitly set (numeric)
    if (process.env.BREVO_TEMPLATE_ID) {
        sendSmtpEmail.templateId = parseInt(process.env.BREVO_TEMPLATE_ID);
    }

    try {
        console.log(`Attempting to send OTP to ${email} using Sender: ${senderEmail}...`);
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
