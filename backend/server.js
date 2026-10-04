const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const jwt = require('jsonwebtoken');
const JWT_SECRET = require('./utils/jwtSecret');

// Register all models to avoid populate errors
require('./models/User');
require('./models/Student');
require('./models/Teacher');
require('./models/Class');
require('./models/Batch');
require('./models/Subject');
require('./models/Attendance');
require('./models/Marks');
require('./models/Exam');
require('./models/Fee');
require('./models/Notice');
require('./models/StudyMaterial');
require('./models/Otp');
require('./models/Lead');
require('./models/Notification');
require('./models/Schedule');
// New Models
require('./models/LiveClass');
require('./models/Video');
require('./models/VideoProgress');
require('./models/OnlineTest');
require('./models/TestResult');
require('./models/Doubt');
require('./models/SignupVerification');

const app = express();

// Behind a reverse proxy req.ip must be the real client IP, otherwise per-IP rate limits are shared by everyone.
// Render sets RENDER=true and always sits behind one proxy hop; TRUST_PROXY overrides.
const trustProxy = process.env.TRUST_PROXY || (process.env.RENDER ? '1' : '');
if (trustProxy) app.set('trust proxy', Number(trustProxy) || trustProxy);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Inject Socket.io into request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/coaching-institute';
const host = dbUri.includes('@') ? dbUri.split('@')[1].split('/')[0] : 'localhost';

mongoose.connect(dbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log(`✅ MongoDB connected to: ${host}`))
  .catch(err => {
    console.log(`❌ MongoDB Connection Error (${host}):`, err.message);
  });

// Socket.io Logic
// Clients must authenticate with their JWT: either io(url, { auth: { token } })
// or socket.emit('join', token). The socket joins the room named after decoded.user.id.
// A raw userId is rejected.
const verifySocketToken = (token) => {
  try {
    if (typeof token !== 'string' || !token) return null;
    const decoded = jwt.verify(token.replace(/^Bearer /, ''), JWT_SECRET);
    return decoded && decoded.user && decoded.user.id ? decoded.user : null;
  } catch (e) {
    return null;
  }
};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  const handshakeUser = verifySocketToken(socket.handshake.auth && socket.handshake.auth.token);
  if (handshakeUser) {
    socket.join(String(handshakeUser.id));
    socket.data.user = handshakeUser;
  }

  socket.on('join', (token) => {
    const user = verifySocketToken(token);
    if (!user) {
      socket.emit('join_error', { message: 'Invalid or expired token' });
      return;
    }
    socket.join(String(user.id));
    socket.data.user = user;
    console.log(`User ${user.id} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/marks', require('./routes/marks'));
app.use('/api/study-material', require('./routes/studyMaterial'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attendance/teacher', require('./routes/teacherAttendance'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/public', require('./routes/public'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/academics', require('./routes/academics'));

// New Routes
app.use('/api/live-classes', require('./routes/liveClassRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/doubts', require('./routes/doubtRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/ai-buddy', require('./routes/aiRoutes'));
app.use('/api/practice', require('./routes/practice'));
app.use('/api/question-bank', require('./routes/questionBank'));
app.use('/api/homework', require('./routes/homework'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/push', require('./routes/push'));

// Fallback error handler (e.g. malformed JSON bodies)
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body' });
  if (err && err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Daily background jobs (fee installment overdue marking + reminders). DISABLE_SCHEDULER=true turns it off.
try {
  require('./utils/scheduler').startScheduler({ io });
} catch (err) {
  console.error('Failed to start scheduler:', err.message);
}
