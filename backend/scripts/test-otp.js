const mongoose = require('mongoose');
const dotenv = require('dotenv');
const sendOtp = require('../utils/sendOtp');
const path = require('path');

// Load env from the backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/coaching-institute';

async function testOtp() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected.');

        // Import User model - adjust path as needed
        const User = require('../models/User');

        console.log('Searching for a user...');
        const user = await User.findOne({ email: { $exists: true, $ne: '' } });

        if (user) {
            console.log(`Found user: ${user.email}. Sending test OTP...`);
            await sendOtp(user.email, '123456');
            console.log('✅ OTP Sent Successfully!');
        } else {
            console.log('⚠️ No users found in DB. Trying to send to SENDER_EMAIL as fallback...');
            const fallbackEmail = process.env.SENDER_EMAIL;
            if (fallbackEmail) {
                await sendOtp(fallbackEmail, '123456');
                console.log('✅ OTP Sent Successfully to sender email!');
            } else {
                console.log('❌ No user found and SENDER_EMAIL not set.');
            }
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

testOtp();
