const SibApiV3Sdk = require('sib-api-v3-sdk');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Testing Brevo Configuration:');
console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'EXISTS' : 'MISSING');
console.log('BREVO_TEMPLATE_ID:', process.env.BREVO_TEMPLATE_ID);
console.log('SENDER_EMAIL:', process.env.SENDER_EMAIL);

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendSmtpEmail = {
    to: [{ email: process.env.SENDER_EMAIL }],
    templateId: parseInt(process.env.BREVO_TEMPLATE_ID),
    params: { otp: '123456' },
    sender: { email: process.env.SENDER_EMAIL, name: "Oasis Test" },
    subject: "Test OTP"
};

apiInstance.sendTransacEmail(sendSmtpEmail)
    .then(data => {
        console.log('✅ API Call Success:', JSON.stringify(data));
    })
    .catch(error => {
        console.error('❌ API Call Failed:');
        if (error.response && error.response.body) {
            console.error(JSON.stringify(error.response.body, null, 2));
        } else {
            console.error(error.message);
        }
    });
