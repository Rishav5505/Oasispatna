// Allocates Paid fees to FeePlan installments (oldest unpaid first). Never throws.
const FeePlan = require('../models/FeePlan');
const Fee = require('../models/Fee');
const { istDayRange } = require('./time');

const EPS = 0.005;

function baseStatus(inst, todayStart) {
  if ((inst.paidAmount || 0) + EPS >= inst.amount) return 'paid';
  return new Date(inst.dueDate) < todayStart ? 'overdue' : 'due';
}

// Apply `amount` of fee to the plan's installments in due-date order. Mutates plan (does not save).
function applyAmount(plan, fee, todayStart) {
  let remaining = Number(fee.amount) || 0;
  const ordered = [...plan.installments].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  for (const inst of ordered) {
    if (remaining <= EPS) break;
    const need = inst.amount - (inst.paidAmount || 0);
    if (need <= EPS) continue;
    const take = Math.min(need, remaining);
    inst.paidAmount = Math.round(((inst.paidAmount || 0) + take) * 100) / 100;
    remaining -= take;
    if (inst.paidAmount + EPS >= inst.amount) {
      inst.status = 'paid';
      inst.paidFeeId = fee._id;
      inst.paidOn = fee.reviewedAt || fee.date || new Date();
    }
  }
  plan.installments.forEach(i => { if (i.status !== 'paid') i.status = baseStatus(i, todayStart); });
  plan.allocatedFeeIds.push(fee._id);
}

/**
 * Hook: a Fee just became Paid. Allocates it to the student's plan (idempotent per fee).
 */
async function allocateFeeToPlan(fee) {
  try {
    if (!fee || fee.status !== 'Paid') return null;
    const plan = await FeePlan.findOne({ studentId: fee.studentId });
    if (!plan) return null;
    if (plan.allocatedFeeIds.some(id => String(id) === String(fee._id))) return plan;
    applyAmount(plan, fee, istDayRange().start);
    await plan.save();
    return plan;
  } catch (err) {
    console.error('allocateFeeToPlan error:', err.message);
    return null;
  }
}

/**
 * Recompute a plan from scratch using all of the student's Paid fees (oldest first). Mutates + saves.
 */
async function reallocatePlan(plan) {
  const todayStart = istDayRange().start;
  plan.allocatedFeeIds = [];
  plan.installments.forEach(i => {
    i.paidAmount = 0;
    i.paidFeeId = undefined;
    i.paidOn = undefined;
    i.status = baseStatus(i, todayStart);
  });
  const fees = await Fee.find({ studentId: plan.studentId, status: 'Paid' }).sort({ date: 1, createdAt: 1 });
  for (const f of fees) applyAmount(plan, f, todayStart);
  await plan.save();
  return plan;
}

module.exports = { allocateFeeToPlan, reallocatePlan };
