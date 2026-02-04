const apiInstance = require('./brevo');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const sendFeeReceipt = async (emails, paymentData) => {
    const { studentName, fatherName, amount, transactionId, date, mode, type, remarks } = paymentData;
    const senderEmail = process.env.SENDER_EMAIL || 'oasispatna5555@gmail.com';

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

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

    // 1. Construct the Premium Receipt HTML
    const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
            
            .content { padding: 40px; color: #333; }
            
            .receipt-header { border-bottom: 2px solid #f37021; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .receipt-title { color: #000; font-size: 24px; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 1px; }
            .receipt-number { color: #666; font-size: 14px; font-weight: bold; }
            
            .details-section { margin-bottom: 30px; }
            .detail-row { display: table; width: 100%; padding: 10px 0; border-bottom: 1px solid #f9f9f9; }
            .detail-label { display: table-cell; width: 150px; color: #888; font-size: 13px; text-transform: uppercase; font-weight: bold; }
            .detail-value { display: table-cell; color: #000; font-size: 16px; font-weight: 600; }
            
            .amount-card { background: #f37021; color: white; padding: 25px; border-radius: 6px; text-align: center; margin: 30px 0; box-shadow: 0 4px 15px rgba(243, 112, 33, 0.3); }
            .amount-label { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; opacity: 0.9; }
            .amount-value { font-size: 36px; font-weight: 800; margin: 0; }
            
            .payment-methods { background: #fdfdfd; padding: 15px; border: 1px dashed #ccc; border-radius: 4px; font-size: 14px; color: #555; }
            
            .footer { background: #000; padding: 20px; text-align: center; color: #888; font-size: 12px; }
            .footer p { margin: 5px 0; }
            .footer a { color: #f37021; text-decoration: none; }
            
            .stamp { width: 100px; opacity: 0.1; position: absolute; right: 40px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-section">
                ${headerHtml}
            </div>

            <div class="content">
                <div style="text-align: right; margin-bottom: 15px;">
                    <span style="background: #e8f5e9; color: #2e7d32; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">PAYMENT SUCCESSFUL</span>
                </div>
                
                <h1 style="color: #000; font-size: 22px; font-weight: 900; margin: 0 0 5px 0; text-transform: uppercase;">Payment Receipt</h1>
                <p style="color: #666; font-size: 14px; margin: 0 0 30px 0;">Official confirmation of fee receipt</p>
                
                <div class="details-section">
                    <div class="detail-row">
                        <span class="detail-label">Receipt No</span>
                        <span class="detail-value">#${transactionId?.toString().substring(0, 12).toUpperCase()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date</span>
                        <span class="detail-value">${new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Student</span>
                        <span class="detail-value">${studentName}</span>
                    </div>
                    ${fatherName ? `
                    <div class="detail-row">
                        <span class="detail-label">Father's Name</span>
                        <span class="detail-value">${fatherName}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Payment Type</span>
                        <span class="detail-value">${type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Mode</span>
                        <span class="detail-value">${mode}</span>
                    </div>
                </div>
                
                <div class="amount-card">
                    <div class="amount-label">Total Amount Paid</div>
                    <div class="amount-value">₹${Number(amount).toLocaleString('en-IN')}</div>
                </div>

                ${remarks ? `
                <div style="margin-top: 20px; font-size: 14px; font-style: italic; color: #666; border-left: 3px solid #f37021; padding-left: 15px;">
                    Note: ${remarks}
                </div>
                ` : ''}

                <div style="margin-top: 40px; text-align: center;">
                    <p style="font-size: 13px; color: #888;">Thank you for choosing Oasis JEE Classes for your bright future.</p>
                </div>
            </div>

            <div class="footer">
                <p>OASIS JEE CLASSES | B/61, P.C. Colony, Kankarbagh, Patna</p>
                <p>Email: <a href="mailto:oasispatna5555@gmail.com">oasispatna5555@gmail.com</a> | Phone: +91 9155555244</p>
                <p style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px; font-size: 10px;">This is a computer-generated receipt and does not require a physical signature.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    sendSmtpEmail.subject = `🎉 Payment Successful: ₹${amount} - Oasis Classes`;
    sendSmtpEmail.htmlContent = receiptHtml;

    sendSmtpEmail.sender = { "name": "Oasis Classes", "email": senderEmail };
    sendSmtpEmail.to = emails.map(email => ({ "email": email }));

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Premium payment confirmation email sent. ID: ${data.messageId}`);
        return data;
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        throw error;
    }
};

module.exports = sendFeeReceipt;

