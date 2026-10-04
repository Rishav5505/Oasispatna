const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const router = express.Router();

const Admission = require('../models/Admission');
const Lead = require('../models/Lead');
const Class = require('../models/Class');
const Student = require('../models/Student');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const sendEmail = require('../utils/sendEmail');
const { upload, fileUrl, removeUpload, MAX_SIZE } = require('../utils/upload');
const { rateLimit } = require('../utils/rateLimit');
const { isObjectId } = require('../utils/access');
const { notifyMany } = require('../utils/notify');
const { HttpError, createStudentAccount, createOrLinkParent, normEmail } = require('../utils/studentAccounts');

// Same storage + file filter as utils/upload, but allowing the three document fields
const docUpload = multer({ storage: upload.storage, fileFilter: upload.fileFilter, limits: { fileSize: MAX_SIZE, files: 3 } });
const DOC_FIELDS = ['photo', 'marksheet', 'id_proof'];
const uploadDocs = (req, res, next) => {
  docUpload.fields(DOC_FIELDS.map(name => ({ name, maxCount: 1 })))(req, res, (err) => {
    if (!err) return next();
    let message = err.message || 'File upload failed';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large. Maximum size is 10 MB';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Unexpected file field. Use photo, marksheet or id_proof';
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files';
    return res.status(400).json({ message });
  });
};

const submitLimiter = rateLimit({ name: 'admission', windowMs: 60 * 60 * 1000, max: 5, message: 'Too many applications from this network. Please try again later.' });
const statusLimiter = rateLimit({ name: 'admission-status', windowMs: 15 * 60 * 1000, max: 30 });

const STAFF = ['admin', 'staff'];
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : (v == null ? '' : String(v).trim().slice(0, max)));
const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function newApplicationNo() {
  const year = new Date().getFullYear();
  for (let i = 0; i < 6; i++) {
    const no = `OAS-${year}-${crypto.randomInt(100000, 1000000)}`;
    if (!(await Admission.exists({ applicationNo: no }))) return no;
  }
  return `OAS-${year}-${Date.now().toString().slice(-8)}`;
}

// Leads that look like the same person (by phone last-10 digits or email)
function leadMatchFilter(phones, emails) {
  const or = [];
  phones.map(last10).filter(p => p.length === 10).forEach(p => or.push({ phone: { $regex: `${p}$` } }));
  emails.map(normEmail).filter(Boolean).forEach(e => or.push({ email: { $regex: `^${escapeRegex(e)}$`, $options: 'i' } }));
  return or.length ? { $or: or } : null;
}

// ---------- Public ----------

// Submit an application (multipart: fields + optional files photo, marksheet, id_proof)
router.post('/', submitLimiter, uploadDocs, async (req, res) => {
  const files = req.files || {};
  const uploaded = DOC_FIELDS.flatMap(f => (files[f] || []).map(fileUrl));
  const fail = (status, message) => {
    uploaded.forEach(removeUpload);
    return res.status(status).json({ message });
  };
  try {
    const b = req.body || {};
    const studentName = str(b.studentName, 120);
    const email = normEmail(b.email);
    const phone = str(b.phone, 20);
    if (!studentName || !email || !phone) return fail(400, 'Student name, email and phone are required');
    if (!EMAIL_RE.test(email)) return fail(400, 'Invalid email');
    if (last10(phone).length < 10) return fail(400, 'Invalid phone number');

    const parentEmail = normEmail(b.parentEmail);
    if (parentEmail && !EMAIL_RE.test(parentEmail)) return fail(400, 'Invalid parent email');

    let classApplying;
    if (b.classApplying) {
      if (!isObjectId(String(b.classApplying))) return fail(400, 'Invalid class');
      if (!(await Class.exists({ _id: b.classApplying }))) return fail(400, 'Class not found');
      classApplying = b.classApplying;
    } else if (b.classApplyingName) {
      // Form fallback sends a label like "Class 10" when no class ids were available
      const digits = String(b.classApplyingName).replace(/\D+/g, '');
      const all = await Class.find().select('name').lean();
      const match = all.find(c => c.name.trim().toLowerCase() === String(b.classApplyingName).trim().toLowerCase())
        || (digits && all.find(c => String(c.name).replace(/\D+/g, '') === digits));
      if (match) classApplying = match._id;
    }

    let dob;
    if (b.dob) {
      dob = new Date(b.dob);
      if (Number.isNaN(dob.getTime())) return fail(400, 'Invalid date of birth');
    }
    const gender = ['male', 'female', 'other'].includes(str(b.gender).toLowerCase()) ? str(b.gender).toLowerCase() : '';
    let previousMarksPct;
    if (b.previousMarksPct !== undefined && b.previousMarksPct !== '') {
      previousMarksPct = Number(b.previousMarksPct);
      if (!Number.isFinite(previousMarksPct) || previousMarksPct < 0 || previousMarksPct > 100) return fail(400, 'previousMarksPct must be between 0 and 100');
    }

    // One open application per email
    const open = await Admission.findOne({ email, status: { $in: ['submitted', 'under_review'] } }).select('applicationNo');
    if (open) return fail(409, `An application (${open.applicationNo}) is already in progress for this email`);

    const documents = DOC_FIELDS.flatMap(kind => (files[kind] || []).map(f => ({ kind, url: fileUrl(f) })));

    const filter = leadMatchFilter([phone, b.parentPhone], [email, parentEmail]);
    const lead = filter ? await Lead.findOne(filter).sort({ createdAt: -1 }).select('_id') : null;

    const admission = await Admission.create({
      applicationNo: await newApplicationNo(),
      studentName,
      email,
      phone,
      dob,
      gender,
      fatherName: str(b.fatherName, 120),
      motherName: str(b.motherName, 120),
      parentPhone: str(b.parentPhone, 20),
      parentEmail: parentEmail || undefined,
      address: str(b.address, 500),
      schoolName: str(b.schoolName, 200),
      classApplying,
      courseInterest: str(b.courseInterest, 120),
      previousMarksPct,
      documents,
      leadId: lead ? lead._id : undefined,
    });

    const msg = `Dear ${studentName},\n\nThank you for applying to Oasis JEE Classes.\n\n` +
      `Your application number is ${admission.applicationNo}. Keep it safe: you can check your application status ` +
      `on our website using this number and your phone number.\n\nOur team will review your application and contact you soon.\n\nOasis JEE Classes`;
    [email, parentEmail].filter((e, i, arr) => e && arr.indexOf(e) === i).forEach(to =>
      sendEmail(to, `Application Received - ${admission.applicationNo}`, msg).catch(e => console.error('Admission confirmation email failed:', e.message)));

    // Real-time alert + notification for admins / front office
    try {
      const staff = await User.find({ role: { $in: STAFF } }).select('_id');
      const payload = { _id: admission._id, applicationNo: admission.applicationNo, studentName, phone, status: admission.status, createdAt: admission.createdAt };
      if (req.io) staff.forEach(u => req.io.to(String(u._id)).emit('new-admission', payload));
      notifyMany(req.io, staff.map(u => ({
        recipient: u._id,
        title: 'New Admission Application',
        message: `${studentName} applied online (${admission.applicationNo}).`,
        type: 'general',
      })));
    } catch (e) {
      console.error('new-admission notify failed:', e.message);
    }

    res.status(201).json({ applicationNo: admission.applicationNo, message: 'Application submitted successfully. A confirmation has been sent to your email.' });
  } catch (err) {
    console.error('Error submitting admission:', err);
    if (err.name === 'ValidationError') return fail(400, err.message);
    return fail(500, 'Server error');
  }
});

// Public status check: ?applicationNo=&phone= (phone must match student or parent phone)
router.get('/status', statusLimiter, async (req, res) => {
  try {
    const applicationNo = str(req.query.applicationNo, 40).toUpperCase();
    const phone = last10(req.query.phone);
    if (!applicationNo || phone.length < 10) return res.status(400).json({ message: 'applicationNo and phone are required' });
    const a = await Admission.findOne({ applicationNo }).select('status studentName reviewNote phone parentPhone');
    if (!a || (last10(a.phone) !== phone && last10(a.parentPhone) !== phone)) {
      return res.status(404).json({ message: 'No application found with these details' });
    }
    res.json({ status: a.status, studentName: a.studentName, reviewNote: a.reviewNote || '' });
  } catch (err) {
    console.error('Error checking admission status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Admin / staff ----------

// Funnel (last 90 days)
router.get('/funnel', auth, roleAuth(...STAFF), async (req, res) => {
  try {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const created = { createdAt: { $gte: since } };
    const [leads, contacted, interested, applications, approved] = await Promise.all([
      Lead.countDocuments(created),
      Lead.countDocuments({ ...created, status: { $ne: 'new' } }),
      Lead.countDocuments({ ...created, status: { $in: ['interested', 'admitted'] } }),
      Admission.countDocuments(created),
      Admission.countDocuments({ ...created, status: 'approved' }),
    ]);
    res.json({ leads, contacted, interested, applications, approved });
  } catch (err) {
    console.error('Error computing admission funnel:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List: ?status=&q=
router.get('/', auth, roleAuth(...STAFF), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!['submitted', 'under_review', 'approved', 'rejected'].includes(req.query.status)) return res.status(400).json({ message: 'Invalid status' });
      filter.status = req.query.status;
    }
    const q = str(req.query.q, 100);
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: 'i' };
      filter.$or = [{ studentName: rx }, { email: rx }, { phone: rx }, { applicationNo: rx }, { parentPhone: rx }, { fatherName: rx }];
    }
    const list = await Admission.find(filter)
      .populate('classApplying', 'name')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(list);
  } catch (err) {
    console.error('Error listing admissions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, roleAuth(...STAFF), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid admission id' });
    const a = await Admission.findById(req.params.id)
      .populate('classApplying', 'name')
      .populate('reviewedBy', 'name')
      .populate('leadId', 'name status phone email')
      .populate({ path: 'createdStudentId', select: 'name classId batchId userId', populate: { path: 'classId', select: 'name' } });
    if (!a) return res.status(404).json({ message: 'Application not found' });
    res.json(a);
  } catch (err) {
    console.error('Error fetching admission:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Review: { status: 'under_review'|'rejected', reviewNote }
router.put('/:id/review', auth, roleAuth(...STAFF), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid admission id' });
    const { status } = req.body;
    if (!['under_review', 'rejected'].includes(status)) return res.status(400).json({ message: "status must be 'under_review' or 'rejected'" });
    const a = await Admission.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Application not found' });
    if (a.status === 'approved') return res.status(409).json({ message: 'Application is already approved' });

    const prev = a.status;
    a.status = status;
    if (req.body.reviewNote !== undefined) a.reviewNote = str(req.body.reviewNote, 1000);
    a.reviewedBy = req.user.id;
    a.reviewedAt = new Date();
    await a.save();

    if (status === 'rejected' && prev !== 'rejected') {
      const note = a.reviewNote ? `\n\nNote from the institute: ${a.reviewNote}` : '';
      sendEmail(a.email, `Application Update - ${a.applicationNo}`,
        `Dear ${a.studentName},\n\nWe regret to inform you that your application ${a.applicationNo} could not be accepted at this time.${note}\n\nFor any queries please contact the institute office.\n\nOasis JEE Classes`)
        .catch(e => console.error('Admission rejection email failed:', e.message));
    }
    const populated = await Admission.findById(a._id).populate('classApplying', 'name');
    res.json(populated);
  } catch (err) {
    console.error('Error reviewing admission:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve: { classId, batchId?, totalFee?, createParent } -> { student, parent? }  (admin only)
router.post('/:id/approve', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid admission id' });
    const a = await Admission.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Application not found' });
    if (a.status === 'approved') return res.status(409).json({ message: 'Application is already approved' });

    const classId = req.body.classId || a.classApplying;
    if (!classId) return res.status(400).json({ message: 'classId is required' });
    const batchId = req.body.batchId || undefined;
    const createParent = req.body.createParent === true || req.body.createParent === 'true';

    let created;
    try {
      created = await createStudentAccount({
        name: a.studentName,
        email: a.email,
        phone: a.phone,
        classId,
        batchId,
        fatherName: a.fatherName,
        motherName: a.motherName,
        dob: a.dob,
        totalFee: req.body.totalFee,
      });
    } catch (e) {
      if (e instanceof HttpError) {
        const status = e.message === 'User already exists' ? 409 : e.status;
        return res.status(status).json({ message: e.message === 'User already exists' ? 'An account with this email already exists' : e.message });
      }
      throw e;
    }
    const { student } = created;

    let parentDoc = null;
    if (createParent && a.parentEmail && a.parentEmail !== a.email) {
      try {
        const linked = await createOrLinkParent({
          name: a.fatherName || a.motherName,
          email: a.parentEmail,
          phone: a.parentPhone || a.phone,
          student,
        });
        if (linked) parentDoc = linked.parent;
      } catch (e) {
        console.error('Admission approve: parent creation failed:', e.message);
      }
    }

    a.status = 'approved';
    a.createdStudentId = student._id;
    a.reviewedBy = req.user.id;
    a.reviewedAt = new Date();
    if (req.body.reviewNote !== undefined) a.reviewNote = str(req.body.reviewNote, 1000);

    // Mark matching lead(s) admitted
    try {
      const filter = leadMatchFilter([a.phone, a.parentPhone], [a.email, a.parentEmail]);
      const or = filter ? filter.$or : [];
      if (a.leadId) or.push({ _id: a.leadId });
      if (or.length) {
        await Lead.updateMany({ $or: or }, { $set: { status: 'admitted' } });
        if (!a.leadId) {
          const l = await Lead.findOne({ $or: or }).sort({ createdAt: -1 }).select('_id');
          if (l) a.leadId = l._id;
        }
      }
    } catch (e) {
      console.error('Admission approve: lead update failed:', e.message);
    }
    await a.save();

    const populated = await Student.findById(student._id).populate('classId', 'name').populate('batchId', 'name').populate('userId', 'name email phone');
    const out = { student: populated };
    if (parentDoc) out.parent = { _id: parentDoc._id, name: parentDoc.name, email: parentDoc.email, phone: parentDoc.phone, role: parentDoc.role };
    res.status(201).json(out);
  } catch (err) {
    console.error('Error approving admission:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
