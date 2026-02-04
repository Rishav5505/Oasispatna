const apiInstance = require('./brevo');

/**
 * Send Absence Alert Email to Student and Parent
 * @param {string[]} emails - Array of recipient emails
 * @param {Object} data - Absence data (studentName, subjectName, date)
 */
const sendAbsenceEmail = async (emails, data) => {
    const { studentName, subjectName, date } = data;
    const senderEmail = process.env.SENDER_EMAIL || 'oasispatna5555@gmail.com';

    const headerHtml = `
    <div style="background: linear-gradient(90deg, #f37021 0%, #ff8c42 70% , #000000 70%, #000000 100%); padding: 30px; color: white; border-bottom: 4px solid #000; text-align: left; font-family: 'Arial Black', Gadget, sans-serif;">
        <div style="display: inline-block; vertical-align: middle;">
            <h1 style="margin:0; font-size: 36px; letter-spacing: -1px; text-transform: uppercase;">OASIS</h1>
            <p style="margin:0; font-size: 14px; letter-spacing: 4px; font-weight: bold;">JEE CLASSES</p>
        </div>
        <div style="float: right; text-align: right; padding-top: 10px;">
            <p style="margin:0; font-size: 18px; font-weight: bold;">ATTENDANCE</p>
            <div style="height: 2px; background: #f37021; margin: 4px 0;"></div>
            <p style="margin:0; font-size: 18px; font-weight: bold;">ALERT</p>
        </div>
        <div style="clear: both;"></div>
    </div>
    `;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8f8f8; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #eee; }
            .content { padding: 40px; color: #444; }
            .alert-box { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 20px; margin: 25px 0; border-radius: 4px; }
            .alert-title { color: #c53030; font-weight: 800; font-size: 18px; margin-bottom: 10px; display: block; }
            .details { margin: 20px 0; font-size: 15px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
            .label { font-weight: bold; color: #666; width: 120px; }
            .value { color: #000; flex: 1; }
            .footer { background: #000; padding: 25px; text-align: center; color: #888; font-size: 11px; }
            .footer a { color: #f37021; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            ${headerHtml}
            <div class="content">
                <h2 style="color: #000; font-size: 22px; font-weight: 900; margin-top: 0;">Absence Notification</h2>
                <p>Scheduled class attendance record for today has been updated.</p>
                
                <div class="alert-box">
                    <span class="alert-title">Student Marked Absent</span>
                    <p style="margin: 0; font-size: 14px; color: #742a2a;">Please note that the following student was not present during the class session.</p>
                </div>

                <div class="details">
                    <div class="detail-row">
                        <span class="label">Student:</span>
                        <span class="value">${studentName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Subject:</span>
                        <span class="value">${subjectName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Date:</span>
                        <span class="value">${new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>

                <p style="margin-top: 30px; font-size: 14px; line-height: 1.6;">
                    Regular attendance is crucial for JEE/NEET preparation. If this was a mistake or for a valid reason, please contact the institute office immediately.
                </p>
                
                <div style="text-align: center; margin-top: 40px;">
                    <a href="https://oasisjeeclasses.com" style="background: #000; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Visit Portal</a>
                </div>
            </div>
            <div class="footer">
                <p>OASIS JEE CLASSES | B/61, P.C. Colony, Kankarbagh, Patna</p>
                <p>Email: <a href="mailto:oasispatna5555@gmail.com">oasispatna5555@gmail.com</a> | Phone: +91 9155555244</p>
                <p style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">This is an automated attendance alert.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const sendSmtpEmail = {
        to: emails.map(email => ({ email })),
        htmlContent: htmlContent,
        sender: {
            email: senderEmail,
            name: "Oasis Attendance System"
        },
        subject: `Absence Alert: ${studentName} - ${subjectName}`
    };

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Absence alert email sent to ${emails.join(', ')}. ID: ${data.messageId}`);
        return data;
    } catch (error) {
        console.error('Error sending absence alert email:', error);
        // Don't throw, just log. We don't want to break the attendance marking if email fails.
    }
};

module.exports = sendAbsenceEmail;
