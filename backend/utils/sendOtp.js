const apiInstance = require('./brevo');

/**
 * Send OTP via Brevo Transactional Email
 * @param {string} email - Recipient email
 * @param {string} otp - The OTP code
 * @returns {Promise<any>}
 */
const sendOtp = async (email, otp) => {
    const sendSmtpEmail = {
        to: [{
            email: email
        }],
        templateId: parseInt(process.env.BREVO_TEMPLATE_ID) || 1,
        params: {
            otp: otp,
        },
        textContent: `Your Oasis OTP is: ${otp}. It expires in 5 minutes.`,
        sender: {
            email: process.env.SENDER_EMAIL,
            name: "Oasis"
        },
        subject: "Your Login OTP - Oasis Premium"
    };

    try {
        console.log(`Sending OTP to ${email} using Brevo template ${process.env.BREVO_TEMPLATE_ID}...`);
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Brevo API called successfully. Returned data: ' + JSON.stringify(data));
        return data;
    } catch (error) {
        // Log the actual error message from Brevo to help debugging
        const errorMessage = error.response?.body?.message || error.message;
        console.error('Brevo API Error Details:', errorMessage);
        throw new Error(errorMessage);
    }
};

module.exports = sendOtp;
