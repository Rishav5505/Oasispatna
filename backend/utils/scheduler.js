// Daily background jobs (fee installments). Started from server.js; disable with DISABLE_SCHEDULER=true.
// Checks every 30 minutes; each job runs at most once per IST day after RUN_HOUR_IST, guarded by a
// unique JobRun{key, date} row so restarts / multiple instances never double-send. Never throws.
const mongoose = require('mongoose');
const JobRun = require('../models/JobRun');
const FeePlan = require('../models/FeePlan');
const Student = require('../models/Student');
const { notifyUser } = require('./notify');
const { getParentUsers } = require('./access');
const sendEmail = require('./sendEmail');
const sendSMS = require('./sendSMS');
const { istDateString, istDayRange, addDays } = require('./time');

const RUN_HOUR_IST = 9;
const CHECK_EVERY_MS = 30 * 60 * 1000;
const STALE_RUN_MS = 2 * 60 * 60 * 1000; // a 'running' row older than this is considered crashed
const MAX_ATTEMPTS = 3;

let timer = null;
let busy = false;

const formatINR = (n) => Number(n || 0).toLocaleString('en-IN');
const istHour = (d = new Date()) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(d)) % 24;

/**
 * Try to claim (key, date). Returns the JobRun doc if this process should run the job, else null.
 */
async function claim(key, date) {
  try {
    return await JobRun.create({ key, date, status: 'running', startedAt: new Date(), result: { attempts: 1 } });
  } catch (e) {
    if (e.code !== 11000) throw e;
  }
  // Already exists: retake only if it failed (limited retries) or a previous run crashed mid-way
  const staleBefore = new Date(Date.now() - STALE_RUN_MS);
  return JobRun.findOneAndUpdate(
    {
      key,
      date,
      'result.attempts': { $lt: MAX_ATTEMPTS },
      $or: [{ status: 'failed' }, { status: 'running', startedAt: { $lt: staleBefore } }],
    },
    { $set: { status: 'running', startedAt: new Date(), error: null }, $inc: { 'result.attempts': 1 } },
    { new: true }
  );
}

async function runOnce(key, date, fn) {
  let run;
  try {
    run = await claim(key, date);
  } catch (e) {
    console.error(`[scheduler] could not claim ${key}:`, e.message);
    return;
  }
  if (!run) return;
  try {
    const result = await fn();
    await JobRun.updateOne({ _id: run._id }, { $set: { status: 'done', finishedAt: new Date(), result: { ...(run.result || {}), ...result } } });
    console.log(`[scheduler] ${key} (${date}) done:`, JSON.stringify(result));
  } catch (e) {
    console.error(`[scheduler] ${key} (${date}) failed:`, e.message);
    await JobRun.updateOne({ _id: run._id }, { $set: { status: 'failed', finishedAt: new Date(), error: String(e.message).slice(0, 500) } }).catch(() => {});
  }
}

// (a) installments past their due date and unpaid -> 'overdue'
async function markOverdue() {
  const { start } = istDayRange();
  const r = await FeePlan.updateMany(
    { installments: { $elemMatch: { status: 'due', dueDate: { $lt: start } } } },
    { $set: { 'installments.$[i].status': 'overdue' } },
    { arrayFilters: [{ 'i.status': 'due', 'i.dueDate': { $lt: start } }] }
  );
  return { plansUpdated: r.modifiedCount || 0 };
}

// (b) reminders 3 days before and on the due date
async function sendDueReminders(io) {
  const today = istDateString();
  const windows = [
    { offset: 0, label: 'today' },
    { offset: 3, label: 'in 3 days' },
  ].map(w => {
    const day = addDays(today, w.offset);
    return { ...w, start: new Date(`${day}T00:00:00+05:30`), end: new Date(`${addDays(day, 1)}T00:00:00+05:30`) };
  });

  let reminders = 0;
  for (const w of windows) {
    const plans = await FeePlan.find({ installments: { $elemMatch: { status: { $ne: 'paid' }, dueDate: { $gte: w.start, $lt: w.end } } } });
    for (const plan of plans) {
      try {
        const student = await Student.findById(plan.studentId).populate('userId', 'name email phone');
        if (!student) continue;
        const parents = await getParentUsers(student);
        const due = plan.installments.filter(i => i.status !== 'paid' && i.dueDate >= w.start && i.dueDate < w.end);
        for (const inst of due) {
          const amount = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
          if (amount <= 0) continue;
          const dateText = new Date(inst.dueDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
          const line = `${inst.label} of ₹${formatINR(amount)} for ${student.name} is due ${w.label} (${dateText}).`;

          if (student.userId) {
            await notifyUser(io, student.userId._id, { title: 'Fee Installment Due', message: `Your ${line}`, type: 'fee' });
          }
          for (const p of parents) {
            await notifyUser(io, p._id, { title: 'Fee Installment Due', message: line, type: 'fee' });
          }

          const emails = [...new Set([student.userId && student.userId.email, ...parents.map(p => p.email)].filter(Boolean))];
          for (const to of emails) {
            sendEmail(to, 'Fee Installment Reminder - Oasis JEE Classes',
              `Dear Parent/Student,\n\nThis is a reminder that the ${line}\n\nYou can pay online from the Parent Portal or at the institute office.\n\nThank you,\nOasis JEE Classes`)
              .catch(e => console.error('[scheduler] reminder email failed:', e.message));
          }
          const phones = [...new Set(parents.map(p => p.phone).filter(Boolean).concat(parents.length ? [] : [student.userId && student.userId.phone].filter(Boolean)))];
          for (const ph of phones) {
            sendSMS(ph, `Oasis JEE Classes: ${line} Please pay via the Parent Portal.`).catch(() => {});
          }
          reminders += 1;
        }
      } catch (e) {
        console.error('[scheduler] reminder for plan failed:', e.message);
      }
    }
  }
  return { reminders };
}

async function tick(io) {
  if (busy) return;
  if (mongoose.connection.readyState !== 1) return; // not connected yet
  if (istHour() < RUN_HOUR_IST) return;
  busy = true;
  try {
    await JobRun.init(); // ensure the unique index exists before claiming
    const date = istDateString();
    await runOnce('fee-overdue', date, markOverdue);
    await runOnce('fee-reminders', date, () => sendDueReminders(io));
  } catch (e) {
    console.error('[scheduler] tick error:', e.message);
  } finally {
    busy = false;
  }
}

function startScheduler({ io } = {}) {
  if (String(process.env.DISABLE_SCHEDULER || '').toLowerCase() === 'true') {
    console.log('[scheduler] disabled (DISABLE_SCHEDULER=true)');
    return;
  }
  if (timer) return;
  const safeTick = () => { tick(io).catch(e => console.error('[scheduler] error:', e.message)); };
  setTimeout(safeTick, 60 * 1000).unref();
  timer = setInterval(safeTick, CHECK_EVERY_MS);
  timer.unref();
  console.log(`[scheduler] started (daily fee jobs after ${RUN_HOUR_IST}:00 IST, checked every 30 min)`);
}

module.exports = { startScheduler, tick, markOverdue, sendDueReminders };
