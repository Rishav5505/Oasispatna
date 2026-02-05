const express = require('express');
const Marks = require('../models/Marks');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

const router = express.Router();

// Upload marks (teacher only)
router.post('/', auth, roleAuth('teacher'), async (req, res) => {
  const { studentId, subjectId, marks, examId, remarks } = req.body;
  try {
    const mark = new Marks({
      studentId,
      subjectId,
      marks,
      maxMarks: marks > 100 ? marks : (req.body.maxMarks || 100), // Default to 100 or higher if marks exceed it
      examId,
      remarks,
      markedBy: req.user.id,
    });
    await mark.save();
    res.json(mark);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get marks for student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    let student = await Student.findById(req.params.studentId);
    if (!student) {
      student = await Student.findOne({ userId: req.params.studentId });
    }
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (req.user.role === 'student' && req.user.id !== student.userId.toString()) return res.status(403).json({ message: 'Access denied' });
    if (req.user.role === 'parent') {
      // Parents can only access their linked student's data via token
      if (!req.user.studentId || req.user.studentId !== student._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Can only view own child\'s data.' });
      }
    }

    const marks = await Marks.find({ studentId: student._id }).populate('subjectId', 'name').populate('examId', 'name type isPublished');

    // Filter for published exams if student or parent
    if (['student', 'parent'].includes(req.user.role)) {
      // Check if overall results are published for the student's class
      const classRecord = await Class.findById(student.classId);
      if (classRecord && classRecord.overallResultsPublished) {
        return res.json(marks); // Show all marks if overall is published
      }
      return res.json(marks.filter(m => m.examId && m.examId.isPublished));
    }

    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get marks by class, subject, exam (teacher/admin)
router.get('/class/:classId/subject/:subjectId/exam/:examId', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  const { classId, subjectId, examId } = req.params;
  try {
    // 1. Get all students in this class
    const students = await Student.find({ classId });
    const studentIds = students.map(s => s._id);

    // 2. Get marks for these students for specific subject/exam
    const marks = await Marks.find({
      studentId: { $in: studentIds },
      subjectId,
      examId
    }).populate('studentId', 'name');

    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get consolidated summary for a specific student (for Report Card)
router.get('/student-summary/:studentId', auth, async (req, res) => {
  try {
    let student = await Student.findById(req.params.studentId).populate('userId', 'email phone');
    if (!student) {
      student = await Student.findOne({ userId: req.params.studentId }).populate('userId', 'email phone');
    }
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Permissions
    if (req.user.role === 'student' && req.user.id !== student.userId?._id?.toString() && req.user.id !== student.userId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role === 'parent') {
      if (!req.user.studentId || req.user.studentId !== student._id.toString()) {
        return res.status(403).json({ message: 'Access denied. Can only view own child\'s summary.' });
      }
    }

    const classRecord = await Class.findById(student.classId);
    if (!classRecord) return res.status(404).json({ message: 'Class record not found' });

    // Check if published (unless admin/teacher)
    if (!['admin', 'teacher'].includes(req.user.role) && !classRecord.overallResultsPublished) {
      return res.status(403).json({ message: 'Overall results for this class have not been published yet.' });
    }

    const allMarks = await Marks.find({ studentId: student._id })
      .populate('subjectId', 'name')
      .populate('examId', 'type name classId');

    const allAttendance = await Attendance.find({ studentId: student._id });

    // Calculate Summary Logic (Simplified for one student)
    let totalObtained = 0;
    let totalMax = 0;
    const subjectsMap = {};
    const subjectResults = [];

    allMarks.forEach(m => {
      const subId = m.subjectId?._id?.toString() || m.subjectId?.toString();
      if (!subId) return;

      if (!subjectsMap[subId]) {
        subjectsMap[subId] = {
          subjectId: subId,
          subjectName: m.subjectId?.name || 'Subject',
          unit: 0,
          monthly: 0,
          final: 0,
          total: 0
        };
        subjectResults.push(subjectsMap[subId]);
      }

      let examType = m.examId?.type;
      const examName = (m.examId?.name || '').toLowerCase();
      if (!examType) {
        if (examName.includes('unit')) examType = 'unit';
        else if (examName.includes('monthly')) examType = 'monthly';
        else if (examName.includes('final')) examType = 'final';
      }

      if (examType === 'unit') subjectsMap[subId].unit += Number(m.marks || 0);
      else if (examType === 'monthly') subjectsMap[subId].monthly += Number(m.marks || 0);
      else if (examType === 'final') subjectsMap[subId].final += Number(m.marks || 0);

      subjectsMap[subId].total += Number(m.marks || 0);
      totalObtained += Number(m.marks || 0);
    });

    subjectResults.forEach(() => { totalMax += 100; });
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;

    const presentCount = allAttendance.filter(a => a.status === 'present').length;
    const attendPercent = allAttendance.length > 0 ? ((presentCount / allAttendance.length) * 100).toFixed(0) : 0;

    let conduct = 'GOOD';
    if (percentage >= 85) conduct = 'EXCELLENT';
    else if (percentage >= 60) conduct = 'VERY GOOD';
    else if (percentage >= 40) conduct = 'SATISFACTORY';
    else conduct = 'NEEDS IMPROVEMENT';

    res.json({
      studentId: student._id,
      name: student.name,
      rollNo: student.rollNo || student._id.toString().slice(-6).toUpperCase(),
      fatherName: student.fatherName,
      subjectResults,
      totalObtained,
      totalMax,
      percentage,
      attendancePercentage: attendPercent,
      conduct: conduct,
      isPublished: classRecord.overallResultsPublished,
      className: classRecord.name
    });
  } catch (err) {
    console.error('Student summary error:', err);
    res.status(500).json({ message: 'Server error fetching student summary' });
  }
});

// Get all marks (admin)
router.get('/', auth, roleAuth('admin'), async (req, res) => {
  try {
    const marks = await Marks.find().populate('studentId').populate('markedBy');
    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get consolidated marks for an entire class across ALL exams (Overall Academic Report)
router.get('/class-summary/:classId', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const classId = req.params.classId;
    const { type } = req.query; // Optional type filter (monthly, unit, etc.)
    // 2. Get all students in this class
    const students = await Student.find({ classId }).populate('userId', 'email phone');
    if (!students || students.length === 0) return res.json({ results: [] });
    const studentIds = students.map(s => s._id);

    // 3. Get ALL marks for these students (Manual Entries)
    // We fetch all marks for these students and then check the exam details
    const allMarks = await Marks.find({ studentId: { $in: studentIds } })
      .populate('subjectId', 'name')
      .populate('examId', 'type name classId');

    // 4. Get ALL attendance for these students
    const allAttendance = await Attendance.find({ studentId: { $in: studentIds } });

    console.log(`[ClassSummary] ClassId: ${classId}`);
    console.log(`[ClassSummary] Found ${students.length} students.`);
    console.log(`[ClassSummary] Found ${allMarks.length} total marks records for these students.`);
    if (allMarks.length > 0) {
      console.log('[ClassSummary] Sample mark:', JSON.stringify(allMarks[0], null, 2));
    }

    // 3. Map marks to students
    const summary = students.map(student => {
      const studentIdStr = student._id.toString();
      const studentMarks = allMarks.filter(m => m.studentId.toString() === studentIdStr);

      let totalObtained = 0;
      let totalMax = 0;

      // Group marks by subject across exams
      const subjectsMap = {};
      const subjectResults = [];

      studentMarks.forEach(m => {
        const subId = m.subjectId?._id?.toString() || m.subjectId?.toString();
        if (!subId) return;

        if (!subjectsMap[subId]) {
          subjectsMap[subId] = {
            subjectId: subId,
            subjectName: m.subjectId?.name || 'Subject',
            unit: 0,
            monthly: 0,
            final: 0,
            total: 0
          };
          subjectResults.push(subjectsMap[subId]);
        }

        // Robust type detection
        let examType = m.examId?.type;
        const examName = (m.examId?.name || '').toLowerCase();

        // Fallback to name if type is missing
        if (!examType) {
          if (examName.includes('unit')) examType = 'unit';
          else if (examName.includes('monthly')) examType = 'monthly';
          else if (examName.includes('final')) examType = 'final';
        }

        if (examType === 'unit') subjectsMap[subId].unit += Number(m.marks || 0);
        else if (examType === 'monthly') subjectsMap[subId].monthly += Number(m.marks || 0);
        else if (examType === 'final') subjectsMap[subId].final += Number(m.marks || 0);

        subjectsMap[subId].total += Number(m.marks || 0);
        totalObtained += Number(m.marks || 0);
      });

      console.log(`[ClassSummary] Student: ${student.name}, Marks Count: ${studentMarks.length}, Total Obtained: ${totalObtained}`);

      // Scale totalMax based on number of subjects (Assuming each subject is out of 100 total)
      subjectResults.forEach(() => {
        totalMax += 100;
      });

      const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;

      // Calculate Attendance
      const studentAttend = allAttendance.filter(a => a.studentId.toString() === studentIdStr);
      const presentCount = studentAttend.filter(a => a.status === 'present').length;
      const attendPercent = studentAttend.length > 0 ? ((presentCount / studentAttend.length) * 100).toFixed(0) : 0;

      // Conduct Logic
      let conduct = 'GOOD';
      if (percentage >= 85) conduct = 'EXCELLENT';
      else if (percentage >= 60) conduct = 'VERY GOOD';
      else if (percentage >= 40) conduct = 'SATISFACTORY';
      else conduct = 'NEEDS IMPROVEMENT';

      return {
        studentId: student._id,
        name: student.name,
        rollNo: student.rollNo || studentIdStr.slice(-6).toUpperCase(),
        fatherName: student.fatherName,
        email: student.userId?.email,
        subjectResults,
        totalObtained,
        totalMax,
        percentage,
        attendancePercentage: attendPercent,
        conduct: conduct
      };
    });

    // 4. Calculate Ranks
    const sortedByScore = [...summary].sort((a, b) => b.percentage - a.percentage);
    summary.forEach(item => {
      item.rank = sortedByScore.findIndex(s => s.studentId.toString() === item.studentId.toString()) + 1;
    });

    const classRecord = await Class.findById(classId);

    res.json({
      examName: type ? `${type.charAt(0).toUpperCase() + type.slice(1)} Performance Summary` : 'Overall Cumulative Performance',
      examType: type ? `${type.charAt(0).toUpperCase() + type.slice(1)} Consolidated` : 'Consolidated',
      isPublished: classRecord?.overallResultsPublished || false,
      classId,
      results: summary
    });
  } catch (err) {
    console.error('Class summary error:', err);
    res.status(500).json({ message: 'Server error fetching class summary' });
  }
});

// Get consolidated marks for an entire class for a specific exam (Report Card Data)
router.get('/exam-summary/:examId', auth, roleAuth('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId).populate('subjects');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // 1. Get all students in the class associated with this exam
    const students = await Student.find({ classId: exam.classId }).populate('userId', 'email phone');

    // 2. Get all marks for this exam
    const allMarks = await Marks.find({ examId: exam._id }).populate('subjectId', 'name');

    // 3. Map marks to students
    // 3. Map marks to students
    const summary = students.map(student => {
      const studentMarks = allMarks.filter(m => m.studentId.toString() === student._id.toString());

      let totalObtained = 0;
      let totalMax = 0;

      // Dynamic Subject List: Union of Exam Subjects and Actually Marked Subjects
      const examSubjectMap = new Map();
      exam.subjects.forEach(s => examSubjectMap.set(s._id.toString(), { _id: s._id, name: s.name }));

      studentMarks.forEach(m => {
        if (m.subjectId && !examSubjectMap.has(m.subjectId._id.toString())) {
          examSubjectMap.set(m.subjectId._id.toString(), { _id: m.subjectId._id, name: m.subjectId.name });
        }
      });

      const uniqueSubjects = Array.from(examSubjectMap.values());

      const subjectResults = uniqueSubjects.map(subject => {
        const markRecord = studentMarks.find(m => m.subjectId && m.subjectId._id.toString() === subject._id.toString());
        const obtained = markRecord ? markRecord.marks : 0;
        const maxMarks = markRecord ? (markRecord.maxMarks || 100) : 100;

        totalObtained += obtained;
        totalMax += maxMarks;

        return {
          subjectId: subject._id,
          subjectName: subject.name,
          obtained,
          maxMarks,
          remarks: markRecord ? markRecord.remarks : '',
          status: markRecord ? 'Marked' : 'Not Marked'
        };
      });

      return {
        studentId: student._id,
        name: student.name,
        rollNo: student.rollNo || student._id.toString().slice(-6).toUpperCase(),
        fatherName: student.fatherName,
        email: student.userId?.email,
        subjectResults,
        totalObtained,
        totalMax,
        percentage: totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0
      };
    });

    // 4. Calculate Ranks
    const sortedByScore = [...summary].sort((a, b) => b.percentage - a.percentage);
    summary.forEach(item => {
      item.rank = sortedByScore.findIndex(s => s.studentId.toString() === item.studentId.toString()) + 1;
    });

    res.json({
      examName: exam.name,
      examType: exam.type,
      isPublished: exam.isPublished,
      classId: exam.classId,
      results: summary
    });
  } catch (err) {
    console.error('Exam summary error:', err);
    res.status(500).json({ message: 'Server error fetching exam summary' });
  }
});


// Publish overall results for a class
router.post('/publish-overall/:classId', auth, roleAuth('admin'), async (req, res) => {
  try {
    const classRecord = await Class.findById(req.params.classId);
    if (!classRecord) return res.status(404).json({ message: 'Class not found' });

    classRecord.overallResultsPublished = true;
    await classRecord.save();

    // Notify all students in the class
    const students = await Student.find({ classId: req.params.classId }).populate('userId', 'email name');
    const Notification = require('../models/Notification');
    const User = require('../models/User');

    const notifications = students.map(student => ({
      recipient: student.userId,
      title: 'Final Results Published! 🏆',
      message: `The cumulative academic results for ${classRecord.name} have been published. View your final report card now!`,
      type: 'academic'
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      if (req.io) {
        students.forEach(student => {
          req.io.to(student.userId.toString()).emit('notification', {
            title: 'Final Results Published! 🏆',
            message: `Your final cumulative report for ${classRecord.name} is now available.`,
            type: 'academic'
          });
        });
      }
    }

    // Send Email Notifications using Brevo (proven method)
    const apiInstance = require('../utils/brevo');
    const SibApiV3Sdk = require('sib-api-v3-sdk');
    const senderEmail = process.env.SENDER_EMAIL || 'oasispatna5555@gmail.com';

    const headerHtml = `
    <div style="background: linear-gradient(90deg, #f37021 0%, #ff8c42 70%, #000000 70%, #000000 100%); padding: 30px; color: white; border-bottom: 4px solid #000; text-align: left; font-family: 'Arial Black', Gadget, sans-serif;">
        <div style="display: inline-block; vertical-align: middle;">
            <h1 style="margin:0; font-size: 36px; letter-spacing: -1px; text-transform: uppercase;">OASIS</h1>
            <p style="margin:0; font-size: 14px; letter-spacing: 4px; font-weight: bold;">JEE CLASSES</p>
        </div>
        <div style="float: right; text-align: right; padding-top: 10px;">
            <p style="margin:0; font-size: 18px; font-weight: bold;">JEE/NEET</p>
            <div style="height: 2px; background: #f37021; margin: 4px 0;"></div>
            <p style="margin:0; font-size: 18px; font-weight: bold;">XI/XII</p>
        </div>
        <div style="clear: both;"></div>
    </div>
    `;

    // Process emails for students and parents
    for (const student of students) {
      const recipientEmails = [];
      if (student.userId?.email) recipientEmails.push(student.userId.email);

      // Find parent email
      const parents = await User.find({ role: 'parent', studentId: student._id });
      parents.forEach(p => {
        if (p.email && !recipientEmails.includes(p.email)) recipientEmails.push(p.email);
      });

      if (recipientEmails.length > 0) {
        const studentName = student.name || student.userId?.name || 'Student';

        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
                .content { padding: 40px; color: #333; }
                .amount-card { background: #f37021; color: white; padding: 25px; border-radius: 6px; text-align: center; margin: 30px 0; box-shadow: 0 4px 15px rgba(243, 112, 33, 0.3); }
                .footer { background: #000; padding: 20px; text-align: center; color: #888; font-size: 12px; }
                .btn { display: inline-block; background: #000; color: #fff; padding: 12px 30px; border-radius: 30px; text-decoration: none; font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header-section">
                    ${headerHtml}
                </div>

                <div class="content">
                    <div style="text-align: right; margin-bottom: 15px;">
                        <span style="background: #e8f5e9; color: #2e7d32; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">RESULTS PUBLISHED</span>
                    </div>
                    
                    <h1 style="color: #000; font-size: 22px; font-weight: 900; margin: 0 0 5px 0; text-transform: uppercase;">Academic Report Card</h1>
                    <p style="color: #666; font-size: 14px; margin: 0 0 30px 0;">Official announcement of examination results</p>
                    
                    <p>Dear <strong>${studentName}</strong> and Parents,</p>
                    
                    <p style="line-height: 1.6;">We are pleased to inform you that the final cumulative academic results for <strong>${classRecord.name}</strong> have been officially published.</p>
                    
                    <div class="amount-card">
                        <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; opacity: 0.9;">SESSION 2024-25</div>
                        <div style="font-size: 24px; font-weight: 800; margin: 0;">FINAL REPORT CARD</div>
                    </div>

                    <p>The detailed report card includes:</p>
                    <ul style="color: #555; line-height: 1.6;">
                        <li>Subject-wise marks and grades</li>
                        <li>Overall percentage and class rank</li>
                        <li>Attendance and conduct analysis</li>
                    </ul>

                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="btn">VIEW REPORT CARD NOW</a>
                    </div>
                </div>

                <div class="footer">
                    <p>OASIS JEE CLASSES | B/61, P.C. Colony, Kankarbagh, Patna</p>
                    <p>Email: <a href="mailto:oasispatna5555@gmail.com">oasispatna5555@gmail.com</a> | Phone: +91 9155555244</p>
                </div>
            </div>
        </body>
        </html>
        `;

        let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = `🏆 Results Published: ${classRecord.name} - Oasis Classes`;
        sendSmtpEmail.htmlContent = emailHtml;
        sendSmtpEmail.sender = { "name": "Oasis Classes", "email": senderEmail };
        sendSmtpEmail.to = recipientEmails.map(email => ({ "email": email }));

        try {
          await apiInstance.sendTransacEmail(sendSmtpEmail);
          console.log(`Result email sent to: ${recipientEmails.join(', ')}`);
        } catch (emailErr) {
          console.error(`Failed to send result email to ${recipientEmails}:`, emailErr);
        }
      }
    }

    res.json({ message: 'Overall results published, notifications and emails sent!', classRecord });
  } catch (err) {
    console.error('Publish-overall error:', err);
    res.status(500).json({ message: 'Server error publishing overall results' });
  }
});

// Unpublish overall results for a class
router.post('/unpublish-overall/:classId', auth, roleAuth('admin'), async (req, res) => {
  try {
    const classRecord = await Class.findById(req.params.classId);
    if (!classRecord) return res.status(404).json({ message: 'Class not found' });
    classRecord.overallResultsPublished = false;
    await classRecord.save();
    res.json({ message: 'Overall results unpublished!', classRecord });
  } catch (err) {
    res.status(500).json({ message: 'Server error unpublishing overall results' });
  }
});

module.exports = router;