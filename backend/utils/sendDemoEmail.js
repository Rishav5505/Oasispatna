const apiInstance = require('./brevo');

/**
 * Send Demo Booking Confirmation Email via Brevo
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} course - Interested course
 * @returns {Promise<any>}
 */
const sendDemoEmail = async (email, name, course) => {
    const senderEmail = process.env.SENDER_EMAIL || 'oasispatna5555@gmail.com';

    // High-end CSS header instead of image
    const headerHtml = `
    <div style="background: linear-gradient(90deg, #f37021 0%, #ff8c42 70%, #000000 70%, #000000 100%); padding: 30px; color: white; border-bottom: 4px solid #000; text-align: left; font-family: 'Arial Black', Gadget, sans-serif;">
        <div style="display: inline-block; vertical-align: middle;">
            <h1 style="margin:0; font-size: 36px; letter-spacing: -1px; text-transform: uppercase;">OASIS</h1>
            <p style="margin:0; font-size: 14px; letter-spacing: 4px; font-weight: bold;">JEE CLASSES</p>
        </div>
        <div style="float: right; text-align: right; padding-top: 10px;">
            <p style="margin:0; font-size: 18px; font-weight: bold;">JEE/NEET</p>
            <div style="height: 2px; background: #f37021; margin: 4px 0;"></div>
            <p style="margin:0; font-size: 18px; font-weight: bold;">XI/XII</p>
        </div>
        <div style="clear: both;"></div>
    </div>
    `;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
            .wrapper { width: 100%; padding: 40px 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
            
            .content { padding: 40px; color: #333; }
            .content-title { font-size: 24px; font-weight: 800; color: #000; margin-bottom: 16px; text-transform: uppercase; }
            .content-text { font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 30px; }
            
            .info-card { 
                background: #fff8f4;
                border-left: 4px solid #f37021;
                border-radius: 4px; 
                padding: 24px; 
                margin-bottom: 30px;
            }
            .info-item { margin-bottom: 15px; }
            .info-label { font-size: 12px; font-weight: 700; color: #f37021; text-transform: uppercase; letter-spacing: 0.1em; display: block; }
            .info-value { font-size: 18px; font-weight: 600; color: #000; }
            
            .cta-button {
                display: inline-block;
                background: #f37021;
                color: white !important;
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 16px;
                text-align: center;
                box-shadow: 0 4px 15px rgba(243, 112, 33, 0.3);
            }
            
            .footer { padding: 30px; text-align: center; background-color: #000; color: #888; }
            .footer-text { font-size: 12px; margin: 4px 0; }
            .footer-text a { color: #f37021; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header-section">
                    ${headerHtml}
                </div>
                <div class="content">
                    <h2 class="content-title">Demo Class Confirmed!</h2>
                    <p class="content-text">
                        Hello <strong>${name}</strong>,<br><br>
                        Exciting news! Your request for a free demo class at <strong>Oasis JEE Classes</strong> has been received. You've taken the first step towards a successful career in JEE/NEET.
                    </p>
                    
                    <div class="info-card">
                        <div class="info-item">
                            <span class="info-label">Candidate Name</span>
                            <div class="info-value">${name}</div>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Selected Course</span>
                            <div class="info-value">${course}</div>
                        </div>
                    </div>
                    
                    <p class="content-text">
                        Our academic counselor will call you within 24 hours to schedule the demo session and answer any questions you may have.
                    </p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="https://oasisjeeclasses.com" class="cta-button">Explore Courses</a>
                    </div>
                </div>
                <div class="footer">
                    <p class="footer-text">OASIS JEE CLASSES | B/61, P.C. Colony, Kankarbagh, Patna</p>
                    <p class="footer-text">Email: <a href="mailto:oasispatna5555@gmail.com">oasispatna5555@gmail.com</a></p>
                    <p class="footer-text">Phone: +91 9155555244</p>
                    <p style="margin-top: 15px; font-size: 10px;">&copy; 2026 Oasis Jee Classes. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    const sendSmtpEmail = {
        to: [{ email: email }],
        htmlContent: htmlContent,
        attachment: attachments.length > 0 ? attachments : undefined,
        sender: {
            email: senderEmail,
            name: "Oasis JEE Classes"
        },
        subject: "Success! Your Demo Class is Booked - Oasis JEE Classes"
    };

    try {
        console.log(`Sending premium demo confirmation email to ${email}...`);
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Brevo Response:', JSON.stringify(data));
        return data;
    } catch (error) {
        const errorMessage = error.response?.body?.message || error.message;
        console.error('❌ Brevo API Error:', errorMessage);
        throw new Error(errorMessage);
    }
};

module.exports = sendDemoEmail;

