const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/coaching-institute';

mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Connected to DB');
        const users = await User.find({}, 'name email role profilePhoto');
        console.log('Users:', JSON.stringify(users, null, 2));
        mongoose.disconnect();
    })
    .catch(err => console.error(err));
