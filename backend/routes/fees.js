const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const sendFeeReceipt = require('../utils/sendFeeReceipt');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');
const { notifyUser } = require('../utils/notify');
const { getAccessibleStudent, getParentUsers, isObjectId, resolveStudent } = require('../utils/access');
const { allocateFeeToPlan } = require('../utils/feeAllocation');

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        console.log('Razorpay initialized successfully');
    } catch (err) {
        console.error('Razorpay initialization failed:', err);
    }
} else {
    console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in environment. Online payments will be disabled.');
}

const formatINR = (n) => Number(n || 0).toLocaleString('en-IN');

// Staff (front office) may act on any student's fees; everyone else goes through the normal ownership check.
async function loadStudentFor(req, res, id) {
    if (req.user && req.user.role === 'staff') {
        if (!id || !isObjectId(String(id))) {
            res.status(400).json({ message: 'Invalid student id' });
            return null;
        }
        const student = await resolveStudent(id);
        if (!student) res.status(404).json({ message: 'Student not found' });
        return student;
    }
    return getAccessibleStudent(req, res, id);
}

// Collect student + parent emails / user ids / phones for a Student doc
async function getFeeContacts(student) {
    const populated = student.populated && student.populated('userId') ? student : await Student.findById(student._id).populate('userId', 'name email phone');
    const parents = await getParentUsers(populated);
    const emails = [];
    if (populated.userId && populated.userId.email) emails.push(populated.userId.email);
    parents.forEach(p => { if (p.email && !emails.includes(p.email)) emails.push(p.email); });
    return {
        student: populated,
        studentUserId: populated.userId ? (populated.userId._id || populated.userId) : null,
        parents,
        emails,
    };
}

async function paidTotal(studentId) {
    const agg = await Fee.aggregate([
        { $match: { studentId, status: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    return agg.length ? agg[0].total : 0;
}

// Create Razorpay Order
router.post('/razorpay/create-order', auth, roleAuth('parent'), async (req, res) => {
    const { amount, studentId } = req.body;
    try {
        if (!razorpay) {
            return res.status(503).json({ message: 'Online payment system is currently unavailable' });
        }
        const student = await getAccessibleStudent(req, res, studentId);
        if (!student) return;

        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });

        const options = {
            amount: Math.round(amt * 100), // amount in paise
            currency: 'INR',
            receipt: 'receipt_' + Date.now(),
            notes: { studentId: String(student._id) }
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        console.error('Razorpay Order Error:', err);
        res.status(500).json({ message: 'Error creating Razorpay order' });
    }
});

// Verify Razorpay Payment
router.post('/razorpay/verify', auth, roleAuth('parent'), async (req, res) => {
    const { orderId, paymentId, signature, studentId, amount } = req.body;

    try {
        // Never fall back to a placeholder secret
        if (!razorpay || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(503).json({ message: 'Online payment system is currently unavailable' });
        }
        if (!orderId || !paymentId || !signature) {
            return res.status(400).json({ message: 'Missing payment details' });
        }

        const student = await getAccessibleStudent(req, res, studentId);
        if (!student) return;

        // Verify Signature (constant-time compare)
        const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(orderId + '|' + paymentId)
            .digest('hex');
        const a = Buffer.from(expected);
        const b = Buffer.from(String(signature));
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        // Idempotency: don't record the same payment twice
        const already = await Fee.findOne({ transactionId: paymentId, mode: 'Razorpay' });
        if (already) return res.json({ message: 'Payment verified and recorded', fee: already });

        // Trust the order amount from Razorpay rather than the client-supplied amount
        let paidAmount = Number(amount);
        try {
            const order = await razorpay.orders.fetch(orderId);
            if (order && order.amount) paidAmount = Number(order.amount) / 100;
        } catch (e) {
            console.warn('Could not fetch Razorpay order to confirm amount, using client amount:', e.message);
        }

        const fee = new Fee({
            studentId: student._id,
            amount: paidAmount,
            mode: 'Razorpay',
            transactionId: paymentId,
            type: 'Online Payment',
            status: 'Paid',
            submittedBy: req.user.id
        });
        await fee.save();
        await allocateFeeToPlan(fee);

        const { studentUserId, parents, emails } = await getFeeContacts(student);
        if (emails.length > 0) {
            sendFeeReceipt(emails, {
                studentName: student.name,
                fatherName: student.fatherName,
                amount: paidAmount,
                transactionId: paymentId,
                date: new Date(),
                mode: 'Online (Razorpay)',
                type: 'Online Payment',
                remarks: 'Auto-receipt for Razorpay transaction'
            }).catch(e => console.error('Failed to send Razorpay receipt email:', e.message));
        }

        await notifyUser(req.io, studentUserId, {
            title: 'Fee Payment Received',
            message: `Payment of ₹${formatINR(paidAmount)} received via Razorpay. Transaction ID: ${paymentId}.`,
            type: 'fee'
        });
        for (const p of parents) {
            await notifyUser(req.io, p._id, {
                title: 'Fee Payment Confirmation',
                message: `Payment of ₹${formatINR(paidAmount)} confirmed for child ${student.name}.`,
                type: 'fee'
            });
        }

        res.json({ message: 'Payment verified and recorded', fee });
    } catch (err) {
        console.error('Razorpay Verification Error:', err);
        res.status(500).json({ message: 'Payment verification failed' });
    }
});

// Add new fee payment (Admin records as Paid; Parent manual payment => Pending until approved)
router.post('/pay', auth, roleAuth('admin', 'staff', 'parent'), async (req, res) => {
    try {
        const { studentId, amount, type, transactionId, remarks, mode } = req.body;

        const studentProfile = await loadStudentFor(req, res, studentId);
        if (!studentProfile) return;

        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });

        const isAdmin = req.user.role === 'admin' || req.user.role === 'staff';
        const status = isAdmin ? 'Paid' : 'Pending';

        // Guard against double submits recording the same payment twice
        const duplicate = await Fee.findOne({
            studentId: studentProfile._id,
            amount: amt,
            mode: mode || 'Cash',
            ...(transactionId ? { transactionId } : {}),
            createdAt: { $gte: new Date(Date.now() - 15 * 1000) }
        }).select('_id').lean();
        if (duplicate) return res.status(409).json({ message: 'This payment was just recorded. Please refresh before adding it again.' });

        const fee = new Fee({
            studentId: studentProfile._id,
            amount: amt,
            type: type || 'Direct Payment',
            transactionId,
            remarks,
            mode: mode || 'Cash',
            status,
            submittedBy: req.user.id,
            reviewedBy: isAdmin ? req.user.id : undefined,
            reviewedAt: isAdmin ? new Date() : undefined
        });
        await fee.save();
        if (status === 'Paid') await allocateFeeToPlan(fee);

        const { studentUserId, parents, emails } = await getFeeContacts(studentProfile);

        if (status === 'Paid' && emails.length > 0) {
            sendFeeReceipt(emails, {
                studentName: studentProfile.name,
                fatherName: studentProfile.fatherName,
                amount: amt,
                transactionId: transactionId || fee._id.toString(),
                date: new Date(),
                mode: mode || 'Cash',
                type: type || 'Direct Payment',
                remarks
            }).catch(e => console.error('Failed to send fee receipt email:', e.message));
        }

        await notifyUser(req.io, studentUserId, {
            title: status === 'Paid' ? 'Fee Payment Received' : 'Payment Submitted',
            message: status === 'Paid'
                ? `We have received a payment of ₹${formatINR(amt)} for ${type || 'fees'}.`
                : `Payment proof of ₹${formatINR(amt)} submitted for verification.`,
            type: 'fee'
        });
        for (const p of parents) {
            await notifyUser(req.io, p._id, {
                title: status === 'Paid' ? 'Fee Payment Confirmation' : 'Payment Submitted',
                message: status === 'Paid'
                    ? `Payment of ₹${formatINR(amt)} received for ${studentProfile.name}.`
                    : `Payment proof of ₹${formatINR(amt)} submitted for verification for ${studentProfile.name}.`,
                type: 'fee'
            });
        }

        res.json(fee);
    } catch (err) {
        console.error('Error adding fee:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all fee records (Admin)
router.get('/all', auth, roleAuth('admin', 'staff'), async (req, res) => {
    try {
        const fees = await Fee.find()
            .populate('studentId', 'name fatherName totalFee')
            .sort({ date: -1 });
        res.json(fees);
    } catch (err) {
        console.error('Error fetching fees:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Pending manual payments awaiting approval (Admin)
router.get('/pending', auth, roleAuth('admin', 'staff'), async (req, res) => {
    try {
        const fees = await Fee.find({ status: 'Pending' })
            .populate({ path: 'studentId', select: 'name classId', populate: { path: 'classId', select: 'name' } })
            .sort({ createdAt: -1 });

        res.json(fees.map(f => ({
            _id: f._id,
            amount: f.amount,
            mode: f.mode,
            type: f.type,
            remarks: f.remarks,
            transactionId: f.transactionId,
            createdAt: f.createdAt || f.date,
            student: f.studentId ? {
                _id: f.studentId._id,
                name: f.studentId.name,
                className: f.studentId.classId ? f.studentId.classId.name : null
            } : null
        })));
    } catch (err) {
        console.error('Error fetching pending fees:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Students with outstanding fees (Admin)
router.get('/defaulters', auth, roleAuth('admin', 'staff'), async (req, res) => {
    try {
        const students = await Student.find({ totalFee: { $gt: 0 } })
            .populate('userId', 'phone')
            .populate('parentId', 'phone')
            .populate('classId', 'name');

        const paidAgg = await Fee.aggregate([
            { $match: { status: 'Paid' } },
            { $group: { _id: '$studentId', total: { $sum: '$amount' } } }
        ]);
        const paidMap = new Map(paidAgg.map(p => [String(p._id), p.total]));

        const rows = students.map(s => {
            const paid = paidMap.get(String(s._id)) || 0;
            const totalFee = s.totalFee || 0;
            return {
                studentId: s._id,
                userId: s.userId ? s.userId._id : null,
                name: s.name,
                className: s.classId ? s.classId.name : null,
                phone: (s.userId && s.userId.phone) || (s.parentId && s.parentId.phone) || null,
                totalFee,
                paid,
                pending: totalFee - paid
            };
        }).filter(r => r.pending > 0).sort((a, b) => b.pending - a.pending);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching defaulters:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Approve a pending manual payment (Admin)
router.post('/:id/approve', auth, roleAuth('admin', 'staff'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid fee id' });
        const fee = await Fee.findById(req.params.id);
        if (!fee) return res.status(404).json({ message: 'Payment not found' });
        if (fee.status !== 'Pending') return res.status(400).json({ message: `Payment is already ${fee.status}` });

        fee.status = 'Paid';
        fee.reviewedBy = req.user.id;
        fee.reviewedAt = new Date();
        await fee.save();
        await allocateFeeToPlan(fee);

        const student = await Student.findById(fee.studentId);
        if (student) {
            const { studentUserId, parents, emails } = await getFeeContacts(student);
            if (emails.length > 0) {
                sendFeeReceipt(emails, {
                    studentName: student.name,
                    fatherName: student.fatherName,
                    amount: fee.amount,
                    transactionId: fee.transactionId || fee._id.toString(),
                    date: new Date(),
                    mode: fee.mode || 'Cash',
                    type: fee.type || 'Direct Payment',
                    remarks: fee.remarks
                }).catch(e => console.error('Failed to send approval receipt:', e.message));
            }
            await notifyUser(req.io, studentUserId, {
                title: 'Payment Approved',
                message: `Your payment of ₹${formatINR(fee.amount)} has been verified and approved.`,
                type: 'fee'
            });
            for (const p of parents) {
                await notifyUser(req.io, p._id, {
                    title: 'Payment Approved',
                    message: `Payment of ₹${formatINR(fee.amount)} for ${student.name} has been verified and approved.`,
                    type: 'fee'
                });
            }
        }

        res.json({ message: 'Payment approved', fee });
    } catch (err) {
        console.error('Error approving fee:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reject a pending manual payment (Admin)
router.post('/:id/reject', auth, roleAuth('admin', 'staff'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid fee id' });
        const fee = await Fee.findById(req.params.id);
        if (!fee) return res.status(404).json({ message: 'Payment not found' });
        if (fee.status !== 'Pending') return res.status(400).json({ message: `Payment is already ${fee.status}` });

        const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
        fee.status = 'Rejected';
        fee.rejectionReason = reason || undefined;
        fee.reviewedBy = req.user.id;
        fee.reviewedAt = new Date();
        await fee.save();

        const student = await Student.findById(fee.studentId);
        if (student) {
            const { studentUserId, parents } = await getFeeContacts(student);
            const why = reason ? ` Reason: ${reason}` : '';
            await notifyUser(req.io, studentUserId, {
                title: 'Payment Rejected',
                message: `Your payment submission of ₹${formatINR(fee.amount)} could not be verified.${why}`,
                type: 'fee'
            });
            for (const p of parents) {
                await notifyUser(req.io, p._id, {
                    title: 'Payment Rejected',
                    message: `Payment submission of ₹${formatINR(fee.amount)} for ${student.name} could not be verified.${why}`,
                    type: 'fee'
                });
            }
        }

        res.json({ message: 'Payment rejected', fee });
    } catch (err) {
        console.error('Error rejecting fee:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get fees for a specific student (Admin/Teacher, the student, or a linked parent)
router.get('/student/:id', auth, async (req, res) => {
    try {
        const student = await loadStudentFor(req, res, req.params.id);
        if (!student) return;

        const fees = await Fee.find({ studentId: student._id }).sort({ date: -1 });

        const totalFees = student.totalFee || 0;
        const paidFees = fees.reduce((acc, curr) => (curr.status === 'Paid' ? acc + curr.amount : acc), 0);
        const pendingFees = totalFees - paidFees;

        res.json({
            totalFees,
            paidFees,
            pendingFees: pendingFees > 0 ? pendingFees : 0,
            payments: fees,
            dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        });
    } catch (err) {
        console.error('Error fetching student fees:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Fee Stats (Total Collection)
router.get('/stats', auth, roleAuth('admin', 'staff'), async (req, res) => {
    try {
        const fees = await Fee.find({ status: 'Paid' });
        const totalCollection = fees.reduce((acc, curr) => acc + curr.amount, 0);
        res.json({ totalCollection });
    } catch (err) {
        console.error('Error fetching fee stats:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send Fee Reminder (Admin) - DB notification + socket to student & parent(s), email + SMS to parent(s)
router.post('/remind/:studentId', auth, roleAuth('admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.studentId)) return res.status(400).json({ message: 'Invalid student id' });
        const student = await Student.findById(req.params.studentId).populate('userId', 'name email phone');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const paid = await paidTotal(student._id);
        const pending = Math.max(0, (student.totalFee || 0) - paid);
        const pendingText = pending > 0 ? ` Outstanding amount: ₹${formatINR(pending)}.` : '';

        const { studentUserId, parents } = await getFeeContacts(student);

        await notifyUser(req.io, studentUserId, {
            title: 'Fee Payment Reminder',
            message: `Friendly reminder: Your fees are due. Please clear them as soon as possible.${pendingText}`,
            type: 'fee'
        });

        for (const p of parents) {
            await notifyUser(req.io, p._id, {
                title: 'Fee Payment Reminder for Child',
                message: `Reminder for ${student.name}'s fee payment.${pendingText}`,
                type: 'fee'
            });
            if (p.email) {
                sendEmail(
                    p.email,
                    'Fee Payment Reminder - Oasis JEE Classes',
                    `Dear ${p.name || 'Parent'},\n\nThis is a friendly reminder that fees for ${student.name} are due.${pendingText}\n\nYou can pay online from the Parent Portal or contact the institute office.\n\nThank you,\nOasis JEE Classes`
                ).catch(e => console.error('Failed to send fee reminder email:', e.message));
            }
            if (p.phone) {
                sendSMS(p.phone, `Oasis JEE Classes: Fee reminder for ${student.name}.${pendingText} Please pay via the Parent Portal.`);
            }
        }

        res.json({ message: 'Reminders sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
