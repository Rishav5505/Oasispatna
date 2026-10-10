// Class-wise fee structures → per-student FeePlans, and fee summaries for receipts.
const mongoose = require('mongoose');
const ClassFeeStructure = require('../models/ClassFeeStructure');
const FeePlan = require('../models/FeePlan');
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const { reallocatePlan } = require('./feeAllocation');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Copy the class installments, taking any student discount off the last installments first.
function installmentsWithDiscount(structure, discount) {
  const list = structure.installments
    .map(i => ({ label: i.label, amount: round2(i.amount), dueDate: i.dueDate }))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  let left = round2(discount);
  for (let i = list.length - 1; i >= 0 && left > 0; i--) {
    const cut = Math.min(list[i].amount, left);
    list[i].amount = round2(list[i].amount - cut);
    left = round2(left - cut);
  }
  return list.filter(i => i.amount > 0);
}

/**
 * Create or replace a student's FeePlan from the class structure. Existing discount is kept,
 * and payments already made are re-allocated to the new installments.
 * @returns {Promise<'created'|'replaced'|'skipped'>}
 */
async function applyStructureToStudent(structure, student, { overwrite = false, createdBy } = {}) {
  let plan = await FeePlan.findOne({ studentId: student._id });
  if (plan && !overwrite) return 'skipped';
  const existed = !!plan;
  const discount = plan ? Math.min(plan.discount || 0, structure.totalFee) : 0;

  if (!plan) plan = new FeePlan({ studentId: student._id, createdBy });
  plan.totalFee = structure.totalFee;
  plan.discount = discount;
  plan.gstPercent = structure.gstPercent || 0;
  plan.installments = installmentsWithDiscount(structure, discount);
  await reallocatePlan(plan); // saves
  await Student.updateOne({ _id: student._id }, { $set: { totalFee: round2(structure.totalFee - discount) } });
  return existed ? 'replaced' : 'created';
}

// Used when a new student is created without an explicit fee: give them their class's standard plan.
async function applyClassStructureIfAny(student, createdBy) {
  try {
    if (!student || !student.classId) return null;
    const structure = await ClassFeeStructure.findOne({ classId: student.classId });
    if (!structure || !structure.installments.length) return null;
    return await applyStructureToStudent(structure, student, { createdBy });
  } catch (err) {
    console.error('applyClassStructureIfAny error:', err.message);
    return null;
  }
}

/**
 * Where a student stands on fees right now. `fee` (optional) = the payment just made,
 * so the receipt can say which installments it covered.
 */
async function feeSummary(rawStudentId, fee) {
  const studentId = new mongoose.Types.ObjectId(String(rawStudentId));
  const [student, plan, paidAgg] = await Promise.all([
    Student.findById(studentId).select('totalFee').lean(),
    FeePlan.findOne({ studentId }).lean(),
    Fee.aggregate([{ $match: { studentId, status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  const totalFee = plan ? round2(plan.totalFee - (plan.discount || 0)) : round2(student ? student.totalFee : 0);
  const totalPaid = paidAgg.length ? round2(paidAgg[0].total) : 0;
  const summary = { totalFee, totalPaid, balance: Math.max(0, round2(totalFee - totalPaid)), hasPlan: !!plan };

  if (plan) {
    const ordered = [...plan.installments].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    summary.installmentsTotal = ordered.length;
    summary.installmentsPaid = ordered.filter(i => i.status === 'paid').length;
    const next = ordered.find(i => i.status !== 'paid');
    if (next) {
      summary.next = { label: next.label, amount: round2(next.amount - (next.paidAmount || 0)), dueDate: next.dueDate, status: next.status };
    }
    if (fee) {
      summary.coveredLabels = ordered.filter(i => i.paidFeeId && String(i.paidFeeId) === String(fee._id)).map(i => i.label);
    }
  }
  return summary;
}

module.exports = { applyStructureToStudent, applyClassStructureIfAny, feeSummary, round2 };
