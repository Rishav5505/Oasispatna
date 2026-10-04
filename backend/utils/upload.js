const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// mimetype -> allowed extensions
const ALLOWED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!(ALLOWED[file.mimetype] || []).includes(ext)) ext = ALLOWED[file.mimetype][0];
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExts = ALLOWED[file.mimetype];
  if (!allowedExts || (ext && !allowedExts.includes(ext))) {
    return cb(new Error('Only images (jpg, png, webp, gif) and PDF files are allowed'));
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE, files: 1 } });

// Wraps upload.single so multer errors become 400 { message }
const uploadSingle = (field) => (req, res, next) => {
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    let message = err.message || 'File upload failed';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large. Maximum size is 10 MB';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = `Unexpected file field. Use "${field}"`;
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Only one file can be uploaded';
    return res.status(400).json({ message });
  });
};

// Public web path for a stored file
const fileUrl = (file) => (file ? `/uploads/${file.filename}` : undefined);

// Best-effort removal of a stored upload given its web path (ignores anything outside uploads/)
const removeUpload = (webPath) => {
  try {
    if (!webPath) return;
    const name = path.basename(String(webPath).split('\\').join('/'));
    const full = path.join(UPLOAD_DIR, name);
    if (full.startsWith(UPLOAD_DIR) && fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) {
    console.error('Failed to remove upload:', e.message);
  }
};

module.exports = { upload, uploadSingle, fileUrl, removeUpload, UPLOAD_DIR, MAX_SIZE };
