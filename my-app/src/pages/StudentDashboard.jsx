import React, { useState, useEffect, useContext, lazy, Suspense } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import {
  FiActivity, FiBarChart2, FiCreditCard, FiZap, FiPieChart, FiClock, FiTarget, FiBookOpen, FiLayers,
  FiCamera, FiCheck, FiX, FiEdit2, FiBell, FiLogOut, FiBookmark, FiEdit,
} from 'react-icons/fi';
import receiptBanner from '../assets/receipt_banner.png';
import config from '../config';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { io } from 'socket.io-client';
import { notify, toast } from '../utils/notify';
import Timetable, { TodayClasses } from '../components/student/Timetable';
import PerformanceAnalysis from '../components/student/PerformanceAnalysis';
import StreakBadge from '../components/student/StreakBadge';
import NoticesList from '../components/student/NoticesList';
import StudentShell from '../components/student/StudentShell';
import { ProgressRing, BannerChip, CountdownTiles, TipOfTheDay, AchievementBadges, CardHeader, TabPanel } from '../components/student/Widgets';
import { ProfileCard, AttendanceCard, AcademicReports, MarksChart, FeesCard, AnnouncementsCard, MaterialsCard, DigitalIdCard } from '../components/student/OverviewParts';
import { SelectionModal, NotificationDrawer, NoticeModal, ReportCardModal } from '../components/student/StudentModals';
import { errorMessage, todayName, findCurrentAndNext, formatTime12 } from '../components/student/helpers';
import { StatCard, GradientBanner } from '../components/ui/Motion';
import { greeting } from '../components/ui/motionUtils';
import Leaderboard, { XpChip, XpProgressCard } from '../components/student/XpLeaderboard';
import { useStudentStats } from '../components/student/useStudentStats';
import UpcomingEventsCard from '../components/common/UpcomingEventsCard';
import { useI18n } from '../i18n/useI18n';

// Tabs are code-split so the dashboard shell loads fast
const StudentLiveClass = lazy(() => import('../components/live/StudentLiveClass'));
const StudentVideo = lazy(() => import('../components/video/StudentVideo'));
const StudentTest = lazy(() => import('../components/test/StudentTest'));
const StudentDoubt = lazy(() => import('../components/doubt/StudentDoubt'));
const AIStudyBuddy = lazy(() => import('../components/ai/AIStudyBuddy'));
const QRScanner = lazy(() => import('../components/attendance/QRScanner'));
const DailyPractice = lazy(() => import('../components/student/DailyPractice'));
const MistakeNotebook = lazy(() => import('../components/student/MistakeNotebook'));
const SyllabusTracker = lazy(() => import('../components/student/SyllabusTracker'));
const StudyTimer = lazy(() => import('../components/student/StudyTimer'));
const Bookmarks = lazy(() => import('../components/student/Bookmarks'));
const Homework = lazy(() => import('../components/student/Homework'));
const EventCalendar = lazy(() => import('../components/common/EventCalendar'));
const LeaveRequests = lazy(() => import('../components/common/LeaveRequests'));

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StudentDashboard = () => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const [profile, setProfile] = useState({});
  const [student, setStudent] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [fees, setFees] = useState({});
  const [materials, setMaterials] = useState([]);
  const [notices, setNotices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [viewingReportCard, setViewingReportCard] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [exams, setExams] = useState([]);
  const [cumulativeSummary, setCumulativeSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    dob: '',
    phone: '',
    email: '',
    admissionDate: ''
  });

  // Countdown Timer Logic
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [nextExam, setNextExam] = useState(null);

  // Timetable
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [testBest, setTestBest] = useState(0);

  // XP / level (refetched after DPP, tests and study sessions)
  const { t } = useI18n();
  const [statsVersion, setStatsVersion] = useState(0);
  const { stats: xpStats } = useStudentStats(statsVersion);
  const bumpXp = () => setStatsVersion(v => v + 1);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (exams.length > 0) {
      const upcoming = exams
        .filter(e => new Date(e.date) > new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (upcoming.length > 0) {
        setNextExam(upcoming[0]);
      }
    }
  }, [exams]);

  useEffect(() => {
    if (!nextExam) return;

    const timer = setInterval(() => {
      const now = new Date();
      const examDate = new Date(nextExam.date);
      const difference = examDate - now;

      if (difference <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextExam]);

  useEffect(() => {
    if (user?.id) {
      fetchAllData();

      // Socket.io for Real-time Notifications
      // Server verifies the JWT (handshake auth or 'join' event) and joins room = our user id
      const token = sessionStorage.getItem('token');
      const socket = io(config.API_URL.replace('/api', ''), { auth: { token } });
      socket.on('connect', () => socket.emit('join', token));

      socket.on('notification', (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);
        // Trigger a native notification if possible
        if (Notification.permission === "granted") {
          new Notification(newNotif.title, { body: newNotif.message });
        }
      });

      return () => {
        socket.off('notification');
        socket.disconnect();
      };
    }
  }, [user]);

  const fetchSchedule = async (studentDocId) => {
    if (!studentDocId) {
      setSchedule([]);
      setScheduleLoading(false);
      return;
    }
    setScheduleLoading(true);
    setScheduleError('');
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/schedule/student/${studentDocId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSchedule(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 404) {
        // No batch assigned / no timetable yet - show the empty state, not an error
        setSchedule([]);
      } else {
        console.error('Error fetching schedule:', err);
        setScheduleError(errorMessage(err, 'Failed to load timetable'));
      }
    } finally {
      setScheduleLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Get token from localStorage
      const token = sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      // Fetch user profile first (always duplicates existing behavior but safer separate blocks)
      let profileData = {};
      try {
        const profileRes = await axios.get(`${config.API_URL}/auth/me`, { headers });
        profileData = profileRes.data;
        setProfile(profileData);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        // If auth fails (401) or user not found (404 - e.g. deleted), logout
        if (err.response?.status === 401 || err.response?.status === 404) {
          notify('Session expired or user not found. Please login again.');
          sessionStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
      }

      // Fetch student data
      let studentData = {};
      try {
        const studentRes = await axios.get(`${config.API_URL}/users/students/${user.id}`, { headers });
        studentData = studentRes.data || {};
        setStudent(studentData);
      } catch (err) {
        if (err.response?.status === 404) {
          console.log('Student record not found, using profile data only');
          // No student record yet, which is fine
        } else {
          console.error('Error fetching student details:', err);
        }
      }

      // Now fetch other data that depends on student info
      // We use Promise.allSettled or just individual try-catches to prevent one failure from breaking all
      const requests = [
        axios.get(`${config.API_URL}/attendance/student/${user.id}`, { headers }),
        axios.get(`${config.API_URL}/marks/student/${user.id}`, { headers }),
        axios.get(`${config.API_URL}/fees/student/${user.id}`, { headers }),
        axios.get(`${config.API_URL}/study-material`, { headers }),
        axios.get(`${config.API_URL}/notices`, { headers }),
        axios.get(`${config.API_URL}/notifications`, { headers }),
        axios.get(`${config.API_URL}/marks/student-summary/${user.id}`, { headers }),
      ];

      if (studentData?.classId) {
        requests.push(axios.get(`${config.API_URL}/exams/class/${studentData.classId._id}`, { headers }));
      }

      fetchSchedule(studentData?._id);

      const results = await Promise.allSettled(requests);

      // Surface failures (ignore 404s, which just mean "no data yet")
      const sectionNames = ['attendance', 'marks', 'fees', 'study material', 'notices', 'notifications', 'report summary', 'exams'];
      const failed = results
        .map((r, i) => (r.status === 'rejected' && r.reason?.response?.status !== 404 ? sectionNames[i] : null))
        .filter(Boolean);
      if (failed.length > 0) {
        toast.error(`Couldn't load ${failed.join(', ')}. Please refresh to try again.`, { id: 'dashboard-load-error' });
      }

      // Helper to get data or empty
      const getData = (index, defaultVal = []) => results[index].status === 'fulfilled' ? results[index].value.data : defaultVal;

      setAttendance(getData(0, []));
      setMarks(getData(1, []));
      setFees(getData(2, {}));
      setMaterials(getData(3, []));
      setNotices(getData(4, []));
      setNotifications(getData(5, []));
      setCumulativeSummary(results[6].status === 'fulfilled' ? results[6].value.data : null);

      if (studentData?.classId && results[7]) {
        setExams(results[7].status === 'fulfilled' ? results[7].value.data : []);
      } else {
        setExams([]);
      }

      // Set edit form data
      setEditForm({
        name: studentData?.name || profileData.name || '',
        fatherName: studentData?.fatherName || '',
        motherName: studentData?.motherName || '',
        dob: studentData?.dob ? new Date(studentData.dob).toISOString().split('T')[0] : '',
        phone: profileData.phone || '', // Check valid profileData
        email: profileData.email || '',
        admissionDate: studentData?.admissionDate ? new Date(studentData.admissionDate).toISOString().split('T')[0] : ''
      });

      // Fetch available metadata
      const [classesRes, batchesRes] = await Promise.all([
        axios.get(`${config.API_URL}/users/classes`, { headers }),
        axios.get(`${config.API_URL}/users/batches`, { headers })
      ]);
      setAvailableClasses(classesRes.data);
      setAvailableBatches(batchesRes.data);

      // Check if class or batch selection is needed
      if (!studentData?.classId) {
        setShowClassModal(true);
      } else if (!studentData?.batchId) {
        setShowBatchModal(true);
      }
    } catch (err) {
      console.error('Error in fetchAllData:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleQuickPhotoUpload = async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    try {
      const token = sessionStorage.getItem('token');
      const formData = new FormData();
      formData.append('profilePhoto', photoFile);
      formData.append('name', editForm.name);

      const response = await axios.put(`${config.API_URL}/auth/me`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      setPhotoFile(null);
      setPhotoPreview(null);
      if (response.data.user) {
        updateUser({
          profilePhoto: response.data.user.profilePhoto,
          name: response.data.user.name
        });
      }
      fetchAllData();
      notify('Profile photo updated successfully!');
    } catch (err) {
      console.error('Error uploading photo:', err);
      notify('Failed to upload photo: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleSaveProfile = async () => {
    try {
      console.log('Saving profile data:', editForm);
      console.log('Photo file:', photoFile);

      // Get token from sessionStorage
      const token = sessionStorage.getItem('token');
      console.log('Token from sessionStorage:', token);

      if (!token) {
        notify('You are not logged in. Please login again.');
        return;
      }

      // Create FormData for user update (supports file upload)
      const userFormData = new FormData();
      userFormData.append('name', editForm.name);
      userFormData.append('phone', editForm.phone);
      userFormData.append('email', editForm.email);
      if (photoFile) {
        userFormData.append('profilePhoto', photoFile);
      }

      // Update user data first
      console.log('Updating user data...');
      const userResponse = await axios.put(`${config.API_URL}/auth/me`, userFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('User update response:', userResponse.data);

      // Update student data
      const studentData = {
        name: editForm.name,
        fatherName: editForm.fatherName,
        motherName: editForm.motherName,
        dob: editForm.dob,
        admissionDate: editForm.admissionDate
      };
      console.log('Updating student data:', studentData);

      const studentResponse = await axios.put(`${config.API_URL}/users/students/${user.id}`, studentData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Student update response:', studentResponse.data);

      setEditMode(false);
      setPhotoFile(null);
      if (userResponse.data.user) {
        updateUser({
          profilePhoto: userResponse.data.user.profilePhoto,
          name: userResponse.data.user.name
        });
      }
      fetchAllData(); // Refresh data
      notify('Profile updated successfully! All data saved to MongoDB.');
    } catch (err) {
      console.error('Error updating profile:', err);
      notify('Failed to update profile: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClassSelection = async (classId) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`${config.API_URL}/users/students/${user.id}`, { classId }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setShowClassModal(false);

      // If batch is also missing, show batch modal next
      if (!student.batchId) {
        setShowBatchModal(true);
      }

      fetchAllData();
      notify('Class selected successfully!');
    } catch {
      notify('Failed to select class');
    }
  };

  const handleBatchSelection = async (batchId) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`${config.API_URL}/users/students/${user.id}`, { batchId }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setShowBatchModal(false);
      fetchAllData();
      notify('Batch selected successfully!');
    } catch {
      notify('Failed to select batch');
    }
  };

  const calculateAttendancePercentage = () => {
    if (attendance.length === 0) return 0;
    // Get unique dates
    const uniqueDates = [...new Set(attendance.map(a => new Date(a.date).toDateString()))];
    const presentDates = [...new Set(attendance.filter(a => a.status === 'present').map(a => new Date(a.date).toDateString()))];

    if (uniqueDates.length === 0) return 0;
    return Math.round((presentDates.length / uniqueDates.length) * 100);
  };

  // Filtered Attendance for Overview
  const filteredAttendance = selectedSubject === 'All'
    ? attendance
    : attendance.filter(a => a.subjectId?.name === selectedSubject);

  const filteredPresent = filteredAttendance.filter(a => a.status === 'present').length;
  const filteredTotal = filteredAttendance.length;
  const filteredPercentage = filteredTotal > 0 ? Math.round((filteredPresent / filteredTotal) * 100) : 0;
  const subjects = ['All', ...new Set(attendance.map(a => a.subjectId?.name).filter(Boolean))];

  const getCompletionDeadline = () => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7); // 7 days from now
    return deadline.toLocaleDateString();
  };

  const handleDownloadReceipt = (payment) => {
    const receiptContent = `
        <html>
        <head>
            <title>Fee Receipt - ${payment.transactionId || 'N/A'}</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 40px; }
                .receipt-box { border: 2px dashed #333; padding: 20px; max-width: 600px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .details { margin-bottom: 20px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="receipt-box">
                <div class="header">
                    <img src="${window.location.origin}${receiptBanner}" alt="Oasis Header" style="width: 100%; max-height: 150px; object-fit: contain; margin-bottom: 20px;" />
                    <h2>OASIS JEE CLASSES</h2>
                    <p>Official Payment Receipt</p>
                </div>
                <div class="details">
                    <div class="row"><span>Date:</span> <span>${new Date(payment.date).toLocaleDateString()}</span></div>
                    <div class="row"><span>Receipt No:</span> <span>${payment.transactionId || payment._id.slice(-8).toUpperCase()}</span></div>
                    <div class="row"><span>Student Name:</span> <span>${student.name || profile.name}</span></div>
                    <div class="row"><span>Class:</span> <span>${student.classId?.name || 'N/A'}</span></div>
                    <hr/>
                    <div class="row"><span>Payment Type:</span> <span>${payment.type}</span></div>
                    <div class="row"><span>Amount Paid:</span> <span>₹${payment.amount}</span></div>
                    <div class="row"><span>Payment Mode:</span> <span>Online/Cash</span></div>
                    <hr/>
                    <div class="row" style="font-weight: bold; font-size: 18px;"><span>TOTAL:</span> <span>₹${payment.amount}</span></div>
                </div>
                <div class="footer">
                    <p>This is a computer-generated receipt.</p>
                    <button onclick="window.print()">PRINT RECEIPT</button>
                </div>
            </div>
        </body>
        </html>
    `;
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(receiptContent);
    win.document.close();
  };

  // Average of per-subject percentages (marks / maxMarks * 100)
  const averageMarksPercentage = marks.length > 0
    ? Math.round(marks.reduce((sum, m) => sum + ((Number(m.marks) || 0) / (Number(m.maxMarks) || 100)) * 100, 0) / marks.length)
    : 0;

  const sortedNotices = [...notices].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const getProfileCompletion = () => {
    const fields = [editForm.name, editForm.fatherName, editForm.motherName, editForm.dob, editForm.phone, editForm.email, editForm.admissionDate];
    const completed = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  const firstName = (user?.name || profile?.name || 'Student').split(' ')[0];
  const photoPath = user?.profilePhoto || profile?.profilePhoto;
  const photoUrl = photoPath ? `${config.API_URL.replace('/api', '')}${photoPath}` : '';
  const hasUnread = notifications.some(n => !n.read) || notices.some(n => new Date(n.createdAt) > new Date(Date.now() - 86400000));
  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink-950 bg-brand-mesh" aria-busy="true">
        <div className="hidden lg:block fixed inset-y-0 left-0 w-72 bg-ink-950" />
        <div className="lg:pl-72">
          <div className="h-16 ui-glass border-b border-gray-100 dark:border-white/5" />
          <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1400px] mx-auto space-y-6">
            <div className="ui-skeleton h-44 md:h-48 !rounded-3xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="ui-skeleton h-28 !rounded-3xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <div key={i} className="ui-skeleton h-72 !rounded-3xl" />)}
            </div>
            <p className="text-center text-sm text-gray-400 font-medium">Loading your dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- derived, presentational values ----
  const attendancePct = calculateAttendancePercentage();
  const profileCompletion = getProfileCompletion();
  const streak = profile?.streak;
  const streakCurrent = Number(streak?.current) || 0;
  const streakBest = Math.max(Number(streak?.best) || 0, streakCurrent);
  const totalFees = Number(fees.totalFees) || 0;
  const pendingFees = Number(fees.pendingFees) || 0;
  const feesPaidPct = totalFees > 0 ? Math.round(((Number(fees.paidFees) || 0) / totalFees) * 100) : 0;
  const marksTop = marks.reduce((max, m) => Math.max(max, ((Number(m.marks) || 0) / (Number(m.maxMarks) || 100)) * 100), 0);
  const topScore = Math.max(marksTop, testBest, Number(cumulativeSummary?.isPublished ? cumulativeSummary.percentage : 0) || 0);

  const now = new Date();
  const todaySlots = schedule.filter(s => s.day === todayName(now));
  const { currentId, nextId } = findCurrentAndNext(todaySlots, now);
  const currentSlot = todaySlots.find(s => s._id === currentId);
  const nextSlot = todaySlots.find(s => s._id === nextId);

  const examIsToday = nextExam && new Date(nextExam.date).toDateString() === now.toDateString();
  const examEvents = examIsToday ? [{
    key: 'exam',
    time: new Date(nextExam.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    title: nextExam.name,
    subtitle: 'Exam today — all the best!',
  }] : [];

  const handlePrintId = () => {
    const printContent = document.getElementById('digital-id-card').innerHTML;
    const win = window.open('', '', 'width=400,height=600');
    win.document.write('<html><head><title>Student ID Card</title></head><body style="padding: 20px; display: flex; justify-content: center;">' + printContent + '</body></html>');
    win.document.close();
    win.print();
  };

  const extraCommands = [
    { id: 'cmd-profile', label: 'Edit my profile', icon: FiEdit2, run: () => { setActiveView('overview'); setEditMode(true); } },
    { id: 'cmd-notif', label: 'Open notifications', icon: FiBell, run: () => setShowNotifications(true) },
    { id: 'cmd-class', label: 'Change class', icon: FiBookOpen, run: () => setShowClassModal(true) },
    { id: 'cmd-batch', label: 'Change batch', icon: FiLayers, run: () => setShowBatchModal(true) },
    { id: 'cmd-logout', label: 'Log out', icon: FiLogOut, run: handleLogout },
  ];

  const studentId = student._id || user.id;

  const overview = (
    <div className="space-y-6">
      {/* Greeting banner */}
      <GradientBanner
        title={`${greeting()}, ${firstName} 🚀`}
        subtitle={`${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · Ready to level up today?`}
        right={(
          <div className="relative group mx-auto md:mx-0 w-fit">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-1 bg-white/25 backdrop-blur-md shadow-2xl">
              <div className="w-full h-full rounded-full overflow-hidden bg-white/10 flex items-center justify-center border-2 border-white/60">
                {uploadingPhoto ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
                ) : photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Student')}&background=f37021&color=fff&bold=true`;
                    }}
                  />
                ) : (
                  <span className="text-4xl font-extrabold">{firstName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            {photoFile ? (
              <button
                onClick={handleQuickPhotoUpload}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-110"
                aria-label="Save photo"
                title="Save photo"
              >
                <FiCheck className="text-lg" />
              </button>
            ) : (
              <button
                onClick={() => document.getElementById('profile-photo-upload').click()}
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white text-brand-600 flex items-center justify-center shadow-lg border-2 border-brand-50 transition-transform hover:scale-110 hover:rotate-6"
                aria-label="Change profile photo"
                title="Change profile photo"
              >
                <FiCamera className="text-lg" />
              </button>
            )}
            {photoFile && !uploadingPhoto && (
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-ink-900 text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-red-600 transition-colors"
                aria-label="Discard photo"
              >
                <FiX />
              </button>
            )}
            <input type="file" id="profile-photo-upload" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {xpStats && <XpChip stats={xpStats} variant="glass" onClick={() => setActiveView('leaderboard')} />}
          {streak && <StreakBadge streak={streak} />}
          {(currentSlot || nextSlot) && (
            <BannerChip icon={<FiClock />} onClick={() => setActiveView('timetable')}>
              {currentSlot
                ? <>Now: {currentSlot.subject?.name || 'Class'}</>
                : <>Next: {nextSlot.subject?.name || 'Class'} · {formatTime12(nextSlot.startTime)}</>}
            </BannerChip>
          )}
          {nextExam && (
            <BannerChip icon={<FiTarget />} tone={timeLeft.days < 3 ? 'solid' : 'glass'} title={new Date(nextExam.date).toLocaleString()}>
              {nextExam.name} in {timeLeft.days > 0 ? `${timeLeft.days}d ${timeLeft.hours}h` : `${timeLeft.hours}h ${timeLeft.minutes}m`}
            </BannerChip>
          )}
          <BannerChip icon={<FiBookOpen />} tone={!student.classId ? 'warn' : 'glass'} onClick={() => setShowClassModal(true)}>
            Class: {student.classId?.name || 'Select'}
          </BannerChip>
          <BannerChip icon={<FiLayers />} tone={!student.batchId ? 'warn' : 'glass'} onClick={() => setShowBatchModal(true)}>
            Batch: {student.batchId?.name || 'Select'}
          </BannerChip>
        </div>
      </GradientBanner>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 ui-stagger">
        <StatCard icon={FiActivity} label="Attendance" value={attendancePct} suffix="%" tone="green" hint={`${attendance.filter(a => a.status === 'present').length} sessions present`} />
        <StatCard icon={FiBarChart2} label="Average Marks" value={averageMarksPercentage} suffix="%" tone="brand" hint={`${marks.length} subjects evaluated`} />
        <StatCard
          icon={FiCreditCard}
          label="Fees Pending"
          value={pendingFees}
          prefix={'₹'}
          tone={pendingFees > 0 ? 'red' : 'green'}
          hint={fees.dueDate ? `Due ${new Date(fees.dueDate).toLocaleDateString()}` : 'All clear'}
        />
        <StatCard icon={FiZap} label="Day Streak" value={streakCurrent} tone="dark" hint={`Best: ${streakBest} day${streakBest === 1 ? '' : 's'}`} />
      </div>

      {/* Practice hub · XP · Upcoming events */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="space-y-4">
          <XpProgressCard stats={xpStats} />
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'practice', icon: FiZap, label: t('student.nav.practice') },
              { id: 'study', icon: FiClock, label: t('student.nav.timer') },
              { id: 'mistakes', icon: FiBookOpen, label: t('student.nav.mistakes') },
              { id: 'homework', icon: FiEdit, label: t('student.nav.homework') },
            ].map(a => (
              <button
                key={a.id}
                onClick={() => setActiveView(a.id)}
                className="ui-card ui-card-hover group flex items-center gap-2.5 p-3 text-left"
              >
                <span className="w-9 h-9 shrink-0 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform"><a.icon /></span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
        <UpcomingEventsCard limit={5} onViewAll={() => setActiveView('calendar')} className="h-full" />
        <div className="ui-card p-6 md:col-span-2 xl:col-span-1">
          <CardHeader icon={FiBookmark} title={t('student.overview.quickTitle')} subtitle={t('student.overview.quickSub')} />
          <div className="space-y-2">
            {[
              { id: 'syllabus', label: t('student.nav.syllabus') },
              { id: 'bookmarks', label: t('student.nav.bookmarks') },
              { id: 'leaderboard', label: t('student.nav.leaderboard') },
              { id: 'leaves', label: t('nav.leaves') },
            ].map(a => (
              <button key={a.id} onClick={() => setActiveView(a.id)} className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors">
                {a.label} <span className="text-brand-500">&rarr;</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress · Today · Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="ui-card p-6">
          <CardHeader icon={FiPieChart} title="Your Progress" subtitle="At a glance" />
          <div className="grid grid-cols-2 gap-y-6 gap-x-2 place-items-center">
            <ProgressRing value={attendancePct} tone={attendancePct >= 75 ? 'green' : 'red'} label="Attendance" sublabel={attendancePct >= 75 ? 'On track' : 'Needs attention'} />
            <ProgressRing value={feesPaidPct} tone="brand" label="Fees Paid" sublabel={totalFees > 0 ? `of ₹${totalFees.toLocaleString('en-IN')}` : 'No fee record'} />
            <div className="col-span-2">
              <ProgressRing value={profileCompletion} size={96} stroke={9} tone="dark" label="Profile" sublabel={profileCompletion >= 100 ? 'Complete' : 'Finish setting up'} />
            </div>
          </div>
        </div>

        <TodayClasses schedule={schedule} loading={scheduleLoading} onViewAll={() => setActiveView('timetable')} extraEvents={examEvents} />

        <div className="space-y-6 md:col-span-2 xl:col-span-1">
          <div className="relative overflow-hidden rounded-3xl bg-brand-dark text-white p-6 shadow-card">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-500/30 blur-3xl animate-float-slow" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="ui-badge bg-white/10 text-brand-300 border border-white/10"><FiClock /> Exam countdown</span>
                {nextExam && <span className="text-xs text-white/50">{new Date(nextExam.date).toLocaleDateString()}</span>}
              </div>
              {nextExam ? (
                <>
                  <p className="text-lg font-extrabold tracking-tight mb-4 truncate">{nextExam.name}</p>
                  <CountdownTiles timeLeft={timeLeft} />
                </>
              ) : (
                <>
                  <p className="text-lg font-extrabold tracking-tight">No upcoming exams</p>
                  <p className="text-sm text-white/60 mt-1">Relax &amp; prepare — consistency wins.</p>
                </>
              )}
            </div>
          </div>
          <TipOfTheDay />
        </div>
      </div>

      <AchievementBadges stats={{
        streakBest,
        attendancePct,
        hasAttendance: attendance.length > 0,
        topScore,
        feesClear: totalFees > 0 && pendingFees === 0,
        profilePct: profileCompletion,
      }} />

      <ProfileCard
        editForm={editForm}
        setEditForm={setEditForm}
        editMode={editMode}
        setEditMode={setEditMode}
        onToggleEdit={handleEditToggle}
        onSave={handleSaveProfile}
        photoFile={photoFile}
        setPhotoFile={setPhotoFile}
        hasPhoto={!!profile.profilePhoto}
        completion={profileCompletion}
        deadline={getCompletionDeadline()}
      />

      <PerformanceAnalysis studentId={student._id} onData={(d) => setTestBest(Number(d?.overall?.bestPercentage) || 0)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><MarksChart marks={marks} /></div>
        <DigitalIdCard
          student={student}
          profile={profile}
          user={user}
          photoUrl={`${config.API_URL.replace('/api', '')}${student.userId?.profilePhoto || student.profilePhoto || profile.profilePhoto}`}
          onPrint={handlePrintId}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AttendanceCard
            subjects={subjects}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            records={filteredAttendance}
            total={filteredTotal}
            present={filteredPresent}
            percentage={filteredPercentage}
          />
          <AcademicReports
            cumulativeSummary={cumulativeSummary}
            marks={marks}
            onViewSummary={() => setViewingReportCard({
              ...cumulativeSummary,
              exam: { name: 'Overall Academic Performance', type: 'Consolidated' }
            })}
            onViewExam={(summary, pct) => setViewingReportCard({
              ...summary,
              name: user.name,
              rollNo: student.rollNo || user.id.slice(-6).toUpperCase(),
              fatherName: student.fatherName,
              percentage: pct.toFixed(1)
            })}
          />
        </div>
        <div className="space-y-6">
          <FeesCard fees={fees} onReceipt={handleDownloadReceipt} />
          <AnnouncementsCard notices={sortedNotices} onSelect={setSelectedNotice} onViewAll={() => setActiveView('notices')} />
          <MaterialsCard materials={materials} />
        </div>
      </div>
    </div>
  );

  const tabContent = {
    overview,
    timetable: (
      <Timetable
        schedule={schedule}
        loading={scheduleLoading}
        error={scheduleError}
        onRetry={() => fetchSchedule(student._id)}
      />
    ),
    notices: <NoticesList notices={notices} onSelect={setSelectedNotice} />,
    live: <StudentLiveClass studentId={studentId} />,
    videos: <StudentVideo studentId={studentId} />,
    tests: <StudentTest studentId={studentId} onXpChange={bumpXp} />,
    homework: <Homework studentId={student._id} />,
    practice: <DailyPractice onXpChange={bumpXp} onNavigate={setActiveView} />,
    mistakes: <MistakeNotebook />,
    study: <StudyTimer onXpChange={bumpXp} />,
    syllabus: <SyllabusTracker />,
    leaderboard: <Leaderboard stats={xpStats} />,
    bookmarks: <Bookmarks />,
    calendar: <EventCalendar />,
    leaves: <LeaveRequests mode="request" role="student" />,
    doubts: <StudentDoubt studentId={studentId} />,
    'ai-buddy': <AIStudyBuddy />,
    attendance: <QRScanner studentId={studentId} />,
  };

  return (
    <StudentShell
      active={activeView}
      onNavigate={setActiveView}
      user={{
        name: user?.name || 'Student',
        photo: photoUrl,
        subtitle: [student.classId?.name, student.batchId?.name].filter(Boolean).join(' · ') || `ID ${user?.id?.slice(-6) || ''}`,
      }}
      onLogout={handleLogout}
      hasUnread={hasUnread}
      onBellClick={() => setShowNotifications(v => !v)}
      extraCommands={extraCommands}
      topBarExtra={xpStats ? <XpChip stats={xpStats} onClick={() => setActiveView('leaderboard')} /> : null}
    >
      <TabPanel key={activeView}>
        <Suspense fallback={<div className="space-y-4" aria-busy="true"><div className="ui-skeleton h-12 w-64" /><div className="ui-skeleton h-64 !rounded-3xl" /></div>}>
          {tabContent[activeView] || null}
        </Suspense>
      </TabPanel>

      <SelectionModal
        open={showClassModal}
        onClose={() => setShowClassModal(false)}
        icon={FiBookOpen}
        title="Select your academic level"
        subtitle="Choose your grade to customise your dashboard"
        options={availableClasses}
        itemHint="Standard track"
        onSelect={handleClassSelection}
        emptyTitle="No academic levels found."
        emptyHint="Please ask admin to add classes (11th, 12th, etc.)"
        footer="If your class isn't listed, please contact the administration office."
      />
      <SelectionModal
        open={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        icon={FiLayers}
        title="Select your batch"
        subtitle="Choose your preferred timing"
        options={availableBatches}
        itemHint="Timing schedule"
        onSelect={handleBatchSelection}
        emptyTitle="No batches found."
        emptyHint="Please ask admin to add batches"
        footer="Select your shift to see your schedule"
      />
      <NotificationDrawer
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notices={notices}
        notifications={notifications}
        onSelectNotice={(notice) => { setSelectedNotice(notice); setShowNotifications(false); }}
      />
      <NoticeModal notice={selectedNotice} onClose={() => setSelectedNotice(null)} />
      <ReportCardModal report={viewingReportCard} onClose={() => setViewingReportCard(null)} attendancePct={attendancePct} />
    </StudentShell>
  );
};

export default StudentDashboard;
