const express = require('express');
const router = express.Router();

const FeePlan = require('../models/FeePlan');
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const SalaryRecord = require('../models/SalaryRecord');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { getAccessibleStudent, resolveStudent, isObjectId, canAccessStudent } = require('../utils/access');
const { reallocatePlan } = require('../utils/feeAllocation');
const { uploadSingle, fileUrl, removeUpload } = require('../utils/upload');
const { TZ, istDayRange, istDateString, lastNMonthsIST } = require('../utils/time');

const EXPENSE_CATEGORIES = ['rent', 'utilities', 'marketing', 'supplies', 'salary', 'other'];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v, def = 0) => (v === undefined || v === null || v === '' ? def : Number(v));

const institute = () => ({
  name: process.env.INSTITUTE_NAME || 'Oasis JEE Classes',
  address: process.env.INSTITUTE_ADDRESS || 'Union Bank Building, Danapur, Patna - 801503',
  gstin: process.env.INSTITUTE_GSTIN || '',
});

// Student lookup for admin/staff (any student) or student/parent (own only). Teachers are not allowed.
async function loadStudent(req, res, id) {
  const role = req.user.role;
  if (role === 'admin' || role === 'staff') {
    if (!id || !isObjectId(String(id))) {
      res.status(400).json({ message: 'Invalid student id' });
      return null;
    }
    const s = await resolveStudent(id);
    if (!s) res.status(404).json({ message: 'Student not found' });
    return s;
  }
  if (role !== 'student' && role !== 'parent') {
    res.status(403).json({ message: 'Access denied' });
    return null;
  }
  return getAccessibleStudent(req, res, id);
}

// ---------- Fee plans ----------

function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

// Parse a 'YYYY-MM-DD' (as IST midnight) or any date string
function parseDate(v) {
  if (!v) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? new Date(`${v}T00:00:00+05:30`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Build installments from body. Returns { installments } or { error }.
 * Accepts installments: [{label, amount, dueDate}] or a generator {count, firstDueDate, intervalMonths}
 * either as `installments` or at the top level of the body.
 */
function buildInstallments(body, net) {
  let inst = body.installments;
  if (Array.isArray(inst)) {
    if (inst.length === 0) return { error: 'At least one installment is required' };
    if (inst.length > 60) return { error: 'Too many installments' };
    const out = [];
    for (let i = 0; i < inst.length; i++) {
      const it = inst[i] || {};
      const amount = Number(it.amount);
      const dueDate = parseDate(it.dueDate);
      if (!Number.isFinite(amount) || amount < 0) return { error: `Installment ${i + 1}: invalid amount` };
      if (!dueDate) return { error: `Installment ${i + 1}: invalid dueDate` };
      out.push({ label: String(it.label || `Installment ${i + 1}`).trim().slice(0, 100), amount: round2(amount), dueDate });
    }
    return { installments: out };
  }
  const gen = inst && typeof inst === 'object' ? inst : body;
  const count = parseInt(gen.count, 10);
  const first = parseDate(gen.firstDueDate);
  const interval = gen.intervalMonths === undefined ? 1 : parseInt(gen.intervalMonths, 10);
  if (!Number.isInteger(count) || count < 1 || count > 60) return { error: 'installments array or count (1-60) is required' };
  if (!first) return { error: 'firstDueDate is required' };
  if (!Number.isInteger(interval) || interval < 0 || interval > 24) return { error: 'intervalMonths must be 0-24' };
  const each = Math.floor((net / count) * 100) / 100;
  const out = [];
  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? round2(net - each * (count - 1)) : each;
    out.push({ label: `Installment ${i + 1}`, amount, dueDate: addMonths(first, i * interval) });
  }
  return { installments: out };
}

async function planResponse(plan) {
  const p = plan.toObject ? plan.toObject() : plan;
  p.installments = [...(p.installments || [])].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const netFee = round2((p.totalFee || 0) - (p.discount || 0));
  const paidAgg = await Fee.aggregate([{ $match: { studentId: plan.studentId, status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  const paid = paidAgg.length ? round2(paidAgg[0].total) : 0;
  delete p.allocatedFeeIds;
  return { ...p, netFee, paid, pending: Math.max(0, round2(netFee - paid)) };
}

async function savePlan(req, res, student, existing) {
  const b = req.body || {};
  const totalFee = num(b.totalFee, existing ? existing.totalFee : NaN);
  const discount = num(b.discount, existing ? existing.discount : 0);
  const gstPercent = num(b.gstPercent, existing ? existing.gstPercent : 0);
  if (!Number.isFinite(totalFee) || totalFee < 0) return res.status(400).json({ message: 'totalFee is required and must be >= 0' });
  if (!Number.isFinite(discount) || discount < 0 || discount > totalFee) return res.status(400).json({ message: 'discount must be between 0 and totalFee' });
  if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) return res.status(400).json({ message: 'gstPercent must be 0-100' });
  const net = round2(totalFee - discount);

  let installments;
  const hasNew = b.installments !== undefined || b.count !== undefined;
  if (hasNew || !existing) {
    const built = buildInstallments(b, net);
    if (built.error) return res.status(400).json({ message: built.error });
    installments = built.installments;
  } else {
    installments = existing.installments.map(i => ({ label: i.label, amount: i.amount, dueDate: i.dueDate }));
  }
  const sum = round2(installments.reduce((s, i) => s + i.amount, 0));
  if (Math.abs(sum - net) > 0.01) {
    return res.status(400).json({ message: `Installments total ₹${sum} must equal totalFee - discount (₹${net})` });
  }

  const plan = existing || new FeePlan({ studentId: student._id, createdBy: req.user.id });
  plan.totalFee = totalFee;
  plan.discount = discount;
  plan.gstPercent = gstPercent;
  plan.installments = installments;
  await reallocatePlan(plan); // saves

  // Keep the student's headline fee in sync with the plan (used by defaulters / dashboards)
  await Student.updateOne({ _id: student._id }, { $set: { totalFee: net } });

  res.status(existing ? 200 : 201).json(await planResponse(plan));
}

router.get('/plans/:studentId', auth, roleAuth('admin', 'staff', 'student', 'parent'), async (req, res) => {
  try {
    const student = await loadStudent(req, res, req.params.studentId);
    if (!student) return;
    const plan = await FeePlan.findOne({ studentId: student._id });
    if (!plan) return res.status(404).json({ message: 'No fee plan for this student' });
    res.json(await planResponse(plan));
  } catch (err) {
    console.error('Error fetching fee plan:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create (or replace, if one exists) a student's plan
router.post('/plans/:studentId', auth, roleAuth('admin'), async (req, res) => {
  try {
    const student = await loadStudent(req, res, req.params.studentId);
    if (!student) return;
    const existing = await FeePlan.findOne({ studentId: student._id });
    await savePlan(req, res, student, existing);
  } catch (err) {
    console.error('Error creating fee plan:', err);
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/plans/:studentId', auth, roleAuth('admin'), async (req, res) => {
  try {
    const student = await loadStudent(req, res, req.params.studentId);
    if (!student) return;
    const existing = await FeePlan.findOne({ studentId: student._id });
    if (!existing) return res.status(404).json({ message: 'No fee plan for this student' });
    await savePlan(req, res, student, existing);
  } catch (err) {
    console.error('Error updating fee plan:', err);
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// Unpaid installments due within `days` (overdue ones included with negative daysLeft)
router.get('/upcoming-dues', auth, roleAuth('admin', 'staff'), async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 0), 365);
    const { start: todayStart } = istDayRange();
    const until = new Date(todayStart.getTime() + (days + 1) * DAY_MS);
    const plans = await FeePlan.find({ installments: { $elemMatch: { status: { $ne: 'paid' }, dueDate: { $lt: until } } } })
      .populate({ path: 'studentId', select: 'name classId userId', populate: { path: 'classId', select: 'name' } });
    const rows = [];
    for (const p of plans) {
      if (!p.studentId) continue;
      for (const i of p.installments) {
        if (i.status === 'paid' || new Date(i.dueDate) >= until) continue;
        const dueDayStart = istDayRange(new Date(i.dueDate)).start;
        rows.push({
          studentId: p.studentId._id,
          studentName: p.studentId.name,
          className: p.studentId.classId ? p.studentId.classId.name : null,
          installmentId: i._id,
          installmentLabel: i.label,
          amount: round2(i.amount - (i.paidAmount || 0)),
          dueDate: i.dueDate,
          daysLeft: Math.round((dueDayStart - todayStart) / DAY_MS),
          status: i.status,
        });
      }
    }
    rows.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    res.json(rows);
  } catch (err) {
    console.error('Error fetching upcoming dues:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Invoice data for a Paid fee (amount treated as GST-inclusive)
router.get('/invoice/:feeId', auth, roleAuth('admin', 'staff', 'student', 'parent'), async (req, res) => {
  try {
    if (!isObjectId(req.params.feeId)) return res.status(400).json({ message: 'Invalid fee id' });
    const fee = await Fee.findById(req.params.feeId);
    if (!fee) return res.status(404).json({ message: 'Payment not found' });
    const student = await Student.findById(fee.studentId)
      .populate('classId', 'name').populate('batchId', 'name').populate('userId', 'email phone');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!['admin', 'staff'].includes(req.user.role) && !(await canAccessStudent(req.user, student))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (fee.status !== 'Paid') return res.status(400).json({ message: 'Invoice is available only for paid fees' });

    const plan = await FeePlan.findOne({ studentId: student._id }).select('gstPercent installments');
    const gstPercent = plan ? Number(plan.gstPercent) || 0 : 0;
    const total = round2(fee.amount);
    const subtotal = round2(total / (1 + gstPercent / 100));
    const gstAmount = round2(total - subtotal);
    const date = fee.reviewedAt || fee.date || fee.createdAt;
    const covered = plan ? plan.installments.filter(i => String(i.paidFeeId) === String(fee._id)).map(i => i.label) : [];
    const desc = [fee.type || 'Tuition Fee', covered.length ? `(${covered.join(', ')})` : '', fee.remarks ? `- ${fee.remarks}` : '']
      .filter(Boolean).join(' ').slice(0, 300);

    res.json({
      invoiceNo: `INV-${istDateString(new Date(date)).slice(0, 7).replace('-', '')}-${String(fee._id).slice(-6).toUpperCase()}`,
      date,
      student: {
        _id: student._id,
        name: student.name,
        fatherName: student.fatherName || '',
        className: student.classId ? student.classId.name : '',
        batchName: student.batchId ? student.batchId.name : '',
        email: student.userId ? student.userId.email : '',
        phone: student.userId ? student.userId.phone : '',
      },
      items: [{ description: desc, amount: subtotal }],
      subtotal,
      gstPercent,
      gstAmount,
      total,
      payment: { mode: fee.mode, transactionId: fee.transactionId || String(fee._id), feeId: fee._id },
      institute: institute(),
    });
  } catch (err) {
    console.error('Error building invoice:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Salaries (admin) ----------

// Accept a teacher User id or a Teacher profile id; returns the teacher User or null
async function resolveTeacherUser(id) {
  if (!id || !isObjectId(String(id))) return null;
  let user = await User.findOne({ _id: id, role: 'teacher' }).select('name email');
  if (!user) {
    const t = await Teacher.findById(id).select('userId');
    if (t) user = await User.findOne({ _id: t.userId, role: 'teacher' }).select('name email');
  }
  return user;
}

const salaryPopulate = (q) => q.populate('teacherId', 'name email phone');

router.get('/salaries', auth, roleAuth('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) {
      if (!MONTH_RE.test(req.query.month)) return res.status(400).json({ message: 'month must be YYYY-MM' });
      filter.month = req.query.month;
    }
    if (req.query.status) filter.status = req.query.status;
    const rows = await salaryPopulate(SalaryRecord.find(filter)).sort({ month: -1, createdAt: 1 });
    res.json(rows);
  } catch (err) {
    console.error('Error listing salaries:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

function applySalaryFields(rec, b) {
  for (const f of ['baseAmount', 'bonus', 'deductions']) {
    if (b[f] !== undefined) {
      const v = Number(b[f]);
      if (!Number.isFinite(v) || v < 0) return `${f} must be a non-negative number`;
      rec[f] = v;
    }
  }
  if (b.note !== undefined) rec.note = String(b.note).slice(0, 500);
  if (b.mode !== undefined) rec.mode = String(b.mode).slice(0, 50);
  return null;
}

// Create or update the record for (teacherId, month)
router.post('/salaries', auth, roleAuth('admin'), async (req, res) => {
  try {
    const b = req.body || {};
    if (!MONTH_RE.test(b.month || '')) return res.status(400).json({ message: 'month must be YYYY-MM' });
    const teacher = await resolveTeacherUser(b.teacherId);
    if (!teacher) return res.status(400).json({ message: 'Teacher not found' });
    let rec = await SalaryRecord.findOne({ teacherId: teacher._id, month: b.month });
    const isNew = !rec;
    if (!rec) {
      rec = new SalaryRecord({ teacherId: teacher._id, month: b.month });
      if (b.baseAmount === undefined) {
        const prof = await Teacher.findOne({ userId: teacher._id }).select('monthlySalary');
        rec.baseAmount = prof ? prof.monthlySalary || 0 : 0;
      }
    }
    const error = applySalaryFields(rec, b);
    if (error) return res.status(400).json({ message: error });
    await rec.save();
    res.status(isNew ? 201 : 200).json(await salaryPopulate(SalaryRecord.findById(rec._id)));
  } catch (err) {
    console.error('Error saving salary:', err);
    if (err.code === 11000) return res.status(409).json({ message: 'Salary record already exists for this month' });
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// Create pending rows for every teacher that has none for the month -> { created, skipped, records }
router.post('/salaries/generate', auth, roleAuth('admin'), async (req, res) => {
  try {
    const { month } = req.body || {};
    if (!MONTH_RE.test(month || '')) return res.status(400).json({ message: 'month must be YYYY-MM' });
    const defaultAmount = num(req.body.defaultAmount, 0);
    if (!Number.isFinite(defaultAmount) || defaultAmount < 0) return res.status(400).json({ message: 'defaultAmount must be >= 0' });

    const teacherUsers = await User.find({ role: 'teacher' }).select('_id');
    const profiles = await Teacher.find({ userId: { $in: teacherUsers.map(u => u._id) } }).select('userId monthlySalary');
    const salaryOf = new Map(profiles.map(p => [String(p.userId), p.monthlySalary || 0]));
    const existing = new Set((await SalaryRecord.find({ month }).select('teacherId')).map(r => String(r.teacherId)));

    let created = 0;
    let skipped = 0;
    for (const u of teacherUsers) {
      if (existing.has(String(u._id))) { skipped += 1; continue; }
      const base = salaryOf.get(String(u._id)) || defaultAmount;
      try {
        await new SalaryRecord({ teacherId: u._id, month, baseAmount: base }).save();
        created += 1;
      } catch (e) {
        if (e.code === 11000) skipped += 1; else throw e;
      }
    }
    const records = await salaryPopulate(SalaryRecord.find({ month })).sort({ createdAt: 1 });
    res.json({ created, skipped, records });
  } catch (err) {
    console.error('Error generating salaries:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/salaries/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid salary id' });
    const rec = await SalaryRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Salary record not found' });
    const error = applySalaryFields(rec, req.body || {});
    if (error) return res.status(400).json({ message: error });
    if (req.body.status !== undefined) {
      if (!['pending', 'paid'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
      rec.status = req.body.status;
      if (rec.status === 'pending') rec.paidOn = undefined;
      else if (!rec.paidOn) rec.paidOn = new Date();
    }
    await rec.save();
    res.json(await salaryPopulate(SalaryRecord.findById(rec._id)));
  } catch (err) {
    console.error('Error updating salary:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/salaries/:id/pay', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid salary id' });
    const rec = await SalaryRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Salary record not found' });
    if (rec.status === 'paid') return res.status(409).json({ message: 'Salary already paid' });
    const paidOn = req.body && req.body.paidOn ? parseDate(req.body.paidOn) : new Date();
    if (!paidOn) return res.status(400).json({ message: 'Invalid paidOn' });
    rec.status = 'paid';
    rec.paidOn = paidOn;
    rec.mode = String((req.body && req.body.mode) || rec.mode || 'Bank Transfer').slice(0, 50);
    if (req.body && req.body.note !== undefined) rec.note = String(req.body.note).slice(0, 500);
    await rec.save();
    res.json(await salaryPopulate(SalaryRecord.findById(rec._id)));
  } catch (err) {
    console.error('Error paying salary:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Expenses (admin) ----------

router.get('/expenses', auth, roleAuth('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lt = new Date(to.getTime() + DAY_MS);
    }
    if (req.query.month && MONTH_RE.test(req.query.month)) {
      const start = new Date(`${req.query.month}-01T00:00:00+05:30`);
      const [y, m] = req.query.month.split('-').map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      filter.date = { $gte: start, $lt: new Date(`${next}-01T00:00:00+05:30`) };
    }
    const rows = await Expense.find(filter).sort({ date: -1 }).limit(1000);
    res.json(rows);
  } catch (err) {
    console.error('Error listing expenses:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

function readExpense(body, doc) {
  if (body.category !== undefined) {
    if (!EXPENSE_CATEGORIES.includes(body.category)) return 'Invalid category';
    doc.category = body.category;
  }
  if (body.amount !== undefined) {
    const a = Number(body.amount);
    if (!Number.isFinite(a) || a < 0) return 'amount must be a non-negative number';
    doc.amount = a;
  }
  if (body.date !== undefined && body.date !== '') {
    const d = parseDate(body.date);
    if (!d) return 'Invalid date';
    doc.date = d;
  }
  if (body.note !== undefined) doc.note = String(body.note).slice(0, 1000);
  return null;
}

router.post('/expenses', auth, roleAuth('admin'), uploadSingle('receipt'), async (req, res) => {
  try {
    const b = req.body || {};
    if (b.amount === undefined || b.amount === '') {
      if (req.file) removeUpload(fileUrl(req.file));
      return res.status(400).json({ message: 'amount is required' });
    }
    const exp = new Expense({ createdBy: req.user.id });
    const error = readExpense(b, exp);
    if (error) {
      if (req.file) removeUpload(fileUrl(req.file));
      return res.status(400).json({ message: error });
    }
    if (req.file) exp.receiptUrl = fileUrl(req.file);
    await exp.save();
    res.status(201).json(exp);
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/expenses/:id', auth, roleAuth('admin'), uploadSingle('receipt'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      if (req.file) removeUpload(fileUrl(req.file));
      return res.status(400).json({ message: 'Invalid expense id' });
    }
    const exp = await Expense.findById(req.params.id);
    if (!exp) {
      if (req.file) removeUpload(fileUrl(req.file));
      return res.status(404).json({ message: 'Expense not found' });
    }
    const error = readExpense(req.body || {}, exp);
    if (error) {
      if (req.file) removeUpload(fileUrl(req.file));
      return res.status(400).json({ message: error });
    }
    if (req.file) {
      if (exp.receiptUrl) removeUpload(exp.receiptUrl);
      exp.receiptUrl = fileUrl(req.file);
    }
    await exp.save();
    res.json(exp);
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/expenses/:id', auth, roleAuth('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid expense id' });
    const exp = await Expense.findByIdAndDelete(req.params.id);
    if (!exp) return res.status(404).json({ message: 'Expense not found' });
    if (exp.receiptUrl) removeUpload(exp.receiptUrl);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Profit & loss ----------

router.get('/pnl', auth, roleAuth('admin'), async (req, res) => {
  try {
    const n = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 24);
    const months = lastNMonthsIST(n);
    const keys = months.map(m => m.key);
    const since = months[0].start;
    const byMonth = (field) => ({ $dateToString: { format: '%Y-%m', date: field, timezone: TZ } });

    const [income, expenses, salaries] = await Promise.all([
      Fee.aggregate([
        { $match: { status: 'Paid', date: { $gte: since } } },
        { $group: { _id: byMonth('$date'), total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: since } } },
        { $group: { _id: byMonth('$date'), total: { $sum: '$amount' } } },
      ]),
      SalaryRecord.aggregate([
        { $match: { status: 'paid', month: { $in: keys } } },
        { $group: { _id: '$month', total: { $sum: '$netAmount' } } },
      ]),
    ]);
    const map = (rows) => new Map(rows.map(r => [r._id, r.total]));
    const inc = map(income);
    const exp = map(expenses);
    const sal = map(salaries);
    res.json(months.map(m => {
      const i = round2(inc.get(m.key) || 0);
      const s = round2(sal.get(m.key) || 0);
      const e = round2(exp.get(m.key) || 0);
      return { month: m.key, label: m.label, income: i, salaries: s, expenses: e, profit: round2(i - s - e) };
    }));
  } catch (err) {
    console.error('Error computing P&L:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
