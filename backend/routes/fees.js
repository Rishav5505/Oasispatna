const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Fee = require('../models/Fee');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const User = require('../models/User'); // Import User model to be safe
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

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

// Create Razorpay Order
router.post('/razorpay/create-order', auth, roleAuth('parent'), async (req, res) => {
    const { amount, studentId } = req.body;
    try {
        if (!razorpay) {
            return res.status(503).json({ message: 'Online payment system is currently unavailable' });
        }
        const options = {
            amount: amount * 100, // amount in paise
            currency: 'INR',
            receipt: 'receipt_' + Date.now(),
            notes: { studentId }
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
        if (!razorpay) {
            return res.status(503).json({ message: 'Online payment system is currently unavailable' });
        }
        // Verify Signature
        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET')
            .update(orderId + "|" + paymentId)
            .digest('hex');

        if (generated_signature === signature) {
            // Payment Success
            const fee = new Fee({
                studentId,
                amount: Number(amount),
                mode: 'Razorpay',
                transactionId: paymentId,
                type: 'Online Payment',
                status: 'Paid'
            });

            await fee.save();

            // Find Student Profile for notifications & emails
            const studentProfile = await Student.findById(studentId).populate('userId').populate('parentId');
            if (studentProfile) {
                // Send Receipt Email
                const recipientEmails = [];
                if (studentProfile.userId && studentProfile.userId.email) recipientEmails.push(studentProfile.userId.email);
                if (studentProfile.parentId && studentProfile.parentId.email) recipientEmails.push(studentProfile.parentId.email);

                if (recipientEmails.length > 0) {
                    const sendFeeReceipt = require('../utils/sendFeeReceipt');
                    try {
                        await sendFeeReceipt(recipientEmails, {
                            studentName: studentProfile.name,
                            fatherName: studentProfile.fatherName,
                            amount: amount,
                            transactionId: paymentId,
                            date: new Date(),
                            mode: 'Online (Razorpay)',
                            type: 'Online Payment',
                            remarks: 'Auto-receipt for Razorpay transaction'
                        });
                        console.log('Razorpay receipt email sent to:', recipientEmails);
                    } catch (emailErr) {
                        console.error('Failed to send Razorpay receipt email:', emailErr);
                    }
                }

                await new Notification({
                    recipient: studentProfile.userId?._id || studentProfile.userId,
                    title: 'Fee Payment Received',
                    message: `Payment of ₹${amount} received via Razorpay. Transaction ID: ${paymentId}.`,
                    type: 'fee'
                }).save();

                if (studentProfile.parentId) {
                    await new Notification({
                        recipient: studentProfile.parentId?._id || studentProfile.parentId,
                        title: 'Fee Payment Confirmation',
                        message: `Payment of ₹${amount} confirmed for child ${studentProfile.name}.`,
                        type: 'fee'
                    }).save();
                }
            }

            res.json({ message: 'Payment verified and recorded', fee });
        } else {
            res.status(400).json({ message: 'Invalid payment signature' });
        }
    } catch (err) {
        console.error('Razorpay Verification Error:', err);
        res.status(500).json({ message: 'Payment verification failed' });
    }
});

// Add new fee payment (Admin or Parent for Manual Pay)
router.post('/pay', auth, roleAuth('admin', 'parent'), async (req, res) => {
    try {
        const { studentId, amount, type, transactionId, remarks, mode } = req.body;

        const isAdmin = req.user.role === 'admin';
        const status = isAdmin ? 'Paid' : 'Pending';

        const fee = new Fee({
            studentId, // Ensure this is the STUDENT Schema ID, not User ID, based on frontend
            amount,
            type: type || 'Direct Payment',
            transactionId,
            remarks,
            mode: mode || 'Cash',
            status: status
        });

        await fee.save();

        // Find Student Profile to get User ID and Parent ID
        const studentProfile = await Student.findById(studentId).populate('userId').populate('parentId');

        if (studentProfile) {
            console.log(`Recording payment for student: ${studentProfile.name}`);

            // Prepare emails list & send receipt
            const recipientEmails = [];
            if (studentProfile.userId && studentProfile.userId.email) recipientEmails.push(studentProfile.userId.email);
            if (studentProfile.parentId && studentProfile.parentId.email) recipientEmails.push(studentProfile.parentId.email);

            if (status === 'Paid' && recipientEmails.length > 0) {
                const sendFeeReceipt = require('../utils/sendFeeReceipt');
                try {
                    await sendFeeReceipt(recipientEmails, {
                        studentName: studentProfile.name,
                        fatherName: studentProfile.fatherName,
                        amount: amount,
                        transactionId: transactionId || fee._id.toString(),
                        date: new Date(),
                        mode: mode || 'Cash',
                        type: type || 'Direct Payment',
                        remarks: remarks
                    });
                    console.log('Fee receipt emails sent to:', recipientEmails);
                } catch (emailErr) {
                    console.error('Failed to send fee receipt email:', emailErr);
                }
            }

            // Create Notification for Student
            const studentUserId = (studentProfile.userId && studentProfile.userId._id) ? studentProfile.userId._id : studentProfile.userId;
            if (studentUserId) {
                try {
                    const studentNotif = new Notification({
                        recipient: studentUserId,
                        title: status === 'Paid' ? 'Fee Payment Received' : 'Payment Submitted',
                        message: status === 'Paid'
                            ? `We have received a payment of ₹${amount} for ${type || 'fees'}.`
                            : `Payment proof of ₹${amount} submitted for verification.`,
                        type: 'fee'
                    });
                    await studentNotif.save();
                } catch (notifErr) {
                    console.error('Error sending student notification:', notifErr);
                }
            }

            // Create Notification for Parent (if linked)
            if (studentProfile.parentId) {
                try {
                    const recipientId = studentProfile.parentId._id || studentProfile.parentId;
                    const parentNotif = new Notification({
                        recipient: recipientId,
                        title: status === 'Paid' ? 'Fee Payment Confirmation' : 'Payment Submitted',
                        message: status === 'Paid'
                            ? `Payment of ₹${amount} received for ${studentProfile.name}.`
                            : `Payment proof of ₹${amount} submitted for verification for ${studentProfile.name}.`,
                        type: 'fee'
                    });
                    await parentNotif.save();
                    console.log('Notification sent to parent:', studentProfile.parentId);
                } catch (notifErr) {
                    console.error('Error sending parent notification:', notifErr);
                }
            } else {
                console.log('No parentId linked for student:', studentProfile.name);
            }
        } else {
            console.warn('Student profile not found for ID:', studentId);
        }

        res.json(fee);
    } catch (err) {
        console.error('Error adding fee:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all fee records (Admin)
router.get('/all', auth, roleAuth('admin'), async (req, res) => {
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

// Get fees for a specific student (Admin or Student/Parent)
router.get('/student/:id', auth, async (req, res) => {
    try {
        const idParam = req.params.id;

        let student = null;
        if (idParam.match(/^[0-9a-fA-F]{24}$/)) {
            try {
                student = await Student.findById(idParam);
            } catch (e) { }
        }

        if (!student && idParam.match(/^[0-9a-fA-F]{24}$/)) {
            student = await Student.findOne({ userId: idParam });
        }

        if (!student) {
            return res.status(404).json({ message: 'Student record not found' });
        }

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
router.get('/stats', auth, roleAuth('admin'), async (req, res) => {
    try {
        const fees = await Fee.find({ status: 'Paid' });
        const totalCollection = fees.reduce((acc, curr) => acc + curr.amount, 0);
        res.json({ totalCollection });
    } catch (err) {
        console.error('Error fetching fee stats:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send Fee Reminder (Admin)
router.post('/remind/:studentId', auth, roleAuth('admin'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const notification = new Notification({
            recipient: student.userId,
            title: 'Fee Payment Reminder',
            message: `Friendly reminder: Your fees are due. Please clear them as soon as possible.`,
            type: 'fee'
        });
        await notification.save();

        if (req.io) {
            req.io.to(student.userId.toString()).emit('notification', notification);
        }

        if (student.parentId) {
            const parentNotif = new Notification({
                recipient: student.parentId,
                title: 'Fee Payment Reminder for Child',
                message: `Reminder for ${student.name}'s fee payment.`,
                type: 'fee'
            });
            await parentNotif.save();
            if (req.io) {
                req.io.to(student.parentId.toString()).emit('notification', parentNotif);
            }
        }

        res.json({ message: 'Reminders sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
