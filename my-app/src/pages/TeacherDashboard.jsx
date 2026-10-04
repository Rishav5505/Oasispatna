import React, { useState, useEffect, useContext, lazy, Suspense } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../contexts/AuthContext';
import oasisLogo from '../assets/oasis_logo.png';
import config from '../config';
import { notify, toast } from '../utils/notify';
import TeacherTimetable from '../components/teacher/TeacherTimetable';
import StudyResources from '../components/teacher/StudyResources';
import TeacherShell from '../components/teacher/TeacherShell';
import TeacherOverview from '../components/teacher/TeacherOverview';
import AttendancePanel from '../components/teacher/AttendancePanel';
import MarksPanel from '../components/teacher/MarksPanel';
import { MyAttendanceTab, NoticesTab, NoticeModal, ProfileTab } from '../components/teacher/TeacherSelfTabs';
import { CalendarTab, LeavesTab, MessagesTab, PreferencesCard } from '../components/teacher/TeacherExtraTabs';
import { useChatUnread } from '../components/common/useChatUnread';
import { Spinner } from '../components/teacher/TeacherUI';

// Heavier tabs load on demand to keep the main bundle small.
const TeacherLiveClass = lazy(() => import('../components/live/TeacherLiveClass'));
const TeacherVideo = lazy(() => import('../components/video/TeacherVideo'));
const TeacherTest = lazy(() => import('../components/test/TeacherTest'));
const DoubtBoard = lazy(() => import('../components/doubt/DoubtBoard'));
const QuestionBank = lazy(() => import('../components/teacher/QuestionBank'));
const Homework = lazy(() => import('../components/teacher/Homework'));
const Syllabus = lazy(() => import('../components/teacher/Syllabus'));
const AtRiskTab = lazy(() => import('../components/teacher/AtRisk').then(m => ({ default: m.AtRiskTab })));

const TeacherDashboard = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [profile, setProfile] = useState({});
  const [teacherData, setTeacherData] = useState({ subjects: [], batches: [], classes: [] });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const decodeToken = (t) => {
    try {
      return JSON.parse(atob(t.split('.')[1]));
    } catch {
      return null;
    }
  };

  // Attendance State
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { studentId: status }
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceSubject, setAttendanceSubject] = useState('');
  const [todayAttendance, setTodayAttendance] = useState([]); // Array of today's check-ins
  const [selectedCheckInClass, setSelectedCheckInClass] = useState(''); // Selected class for check-in
  const [myAttendanceHistory, setMyAttendanceHistory] = useState([]); // Attendance history

  // Marks State
  const [marksClass, setMarksClass] = useState('');
  const [marksStudents, setMarksStudents] = useState([]);
  const [selectedMarkStudent, setSelectedMarkStudent] = useState(null);
  const [newMark, setNewMark] = useState({ subjectId: '', marks: '', maxMarks: '100', examId: '', remarks: '' });
  const [exams, setExams] = useState([]);
  const [marksViewMode, setMarksViewMode] = useState('entry'); // 'entry' | 'bulk' | 'view'
  const [activityStats, setActivityStats] = useState(null); // counts reported by RecentActivity
  const [classMarks, setClassMarks] = useState([]);
  const [fetchingClassMarks, setFetchingClassMarks] = useState(false);
  const [qrToken, setQrToken] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);

  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [inbox, setInbox] = useState([]); // live socket notifications for the bell (UI only)
  const [socket, setSocket] = useState(null); // shared with chat (set once connected)
  const [chatTarget, setChatTarget] = useState(null); // parent userId to open in chat
  const [focusTestId, setFocusTestId] = useState(null); // test to open after "build from bank"
  const { count: chatUnread } = useChatUnread({ socket });

  useEffect(() => {
    if (user?.id) {
      fetchTeacherProfile();
      fetchExams();
      fetchMyAttendanceStatus();
      fetchNotices();

      const token = sessionStorage.getItem('token');
      if (token) {
        const decoded = decodeToken(token);
        if (decoded?.user?.classIds?.length > 0) {
          setSelectedClass(decoded.user.classIds[0]);
        }
      }
      const socket = io(config.SOCKET_URL, { auth: { token } });
      // Server verifies the JWT and joins the user's room (a raw userId is rejected)
      socket.on('connect', () => { if (token) socket.emit('join', token); setSocket(socket); });
      socket.on('notification', (n) => {
        const message = n?.message || n?.title || 'New notification';
        toast(message, { icon: '🔔' });
        setInbox(list => [{ id: Date.now() + Math.random(), message, at: new Date(), read: false }, ...list].slice(0, 20));
      });
      return () => { socket.disconnect(); setSocket(null); };
    } else if (!sessionStorage.getItem('token')) {
      setLoading(false); // nothing to load; avoid an endless spinner
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass && attendanceSubject && attendanceDate) {
      fetchAttendanceRecords();
    }
  }, [selectedClass, attendanceSubject, attendanceDate]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleQuickPhotoUpload = async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    const token = sessionStorage.getItem('token');
    const formData = new FormData();
    formData.append('profilePhoto', photoFile);

    try {
      const res = await axios.put(`${config.API_URL}/auth/me`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      notify('Profile photo updated successfully!');
      if (res.data.user) {
        updateUser({
          profilePhoto: res.data.user.profilePhoto,
          name: res.data.user.name
        });
      }
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchTeacherProfile(); // Refresh profile data
    } catch (err) {
      console.error('Error uploading photo:', err);
      notify('Failed to upload photo: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const fetchTeacherProfile = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    const headers = { 'Authorization': `Bearer ${token}` };
    const [resProfile, resTeacher] = await Promise.allSettled([
      axios.get(`${config.API_URL}/auth/me`, { headers }),
      axios.get(`${config.API_URL}/teacher/me`, { headers })
    ]);
    if (resProfile.status === 'fulfilled') setProfile(resProfile.value.data || {});
    if (resTeacher.status === 'fulfilled') {
      const t = resTeacher.value.data || {};
      setTeacherData({ ...t, subjects: t.subjects || [], batches: t.batches || [], classes: t.classes || [] });
    } else {
      console.error('Error fetching teacher profile:', resTeacher.reason);
      notify('Failed to load your teaching assignments: ' + (resTeacher.reason?.response?.data?.message || 'Server error'));
    }
    setLoading(false);
  };

  const fetchExams = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const res = await axios.get(`${config.API_URL}/exams`, { headers });
      setExams(res.data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  const fetchNotices = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const res = await axios.get(`${config.API_URL}/notices`, { headers });
      setNotices(res.data);
    } catch (err) {
      console.error('Error fetching notices:', err);
    }
  };

  const fetchMyAttendanceStatus = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${config.API_URL}/attendance/teacher/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // res.data.data is now an array
      setTodayAttendance(res.data.data || []);

      // Fetch history
      const historyRes = await axios.get(`${config.API_URL}/attendance/teacher/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMyAttendanceHistory(historyRes.data);
    } catch (err) {
      console.error('Error fetching my attendance:', err);
    }
  };

  const handleTeacherCheckIn = async () => {
    if (!selectedCheckInClass) {
      notify("Please select a class/session to check in.");
      return;
    }
    const token = sessionStorage.getItem('token');
    try {
      await axios.post(`${config.API_URL}/attendance/teacher/mark`,
        { className: selectedCheckInClass },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      notify(`Checked in for ${selectedCheckInClass}!`);
      fetchMyAttendanceStatus(); // Refresh status
      setSelectedCheckInClass(''); // Reset selection
    } catch (err) {
      notify('Failed to check in: ' + (err.response?.data?.message || 'Server error'));
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!selectedClass || !attendanceSubject) return;
    setLoadingStudents(true);
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      // 1. Fetch students for class
      const studentRes = await axios.get(`${config.API_URL}/teacher/classes/${selectedClass}/students`, { headers });
      setStudents(studentRes.data);

      // 2. Fetch existing attendance for this class/subject/date
      const attendanceRes = await axios.get(`${config.API_URL}/attendance/class/${selectedClass}/subject/${attendanceSubject}/date/${attendanceDate}`, { headers });

      // 3. Merge attendance into status object
      const initialStatus = {};
      // Default to 'present' for new entries
      studentRes.data.forEach(s => initialStatus[s._id] = 'present');
      // Override with existing data from server
      attendanceRes.data.forEach(a => {
        initialStatus[a.studentId] = a.status;
      });
      setAttendanceData(initialStatus);
    } catch (err) {
      console.error('Error fetching attendance records:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchClassStudents = async (classId, type = 'attendance') => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const res = await axios.get(`${config.API_URL}/teacher/classes/${classId}/students`, { headers });
      if (type === 'attendance') {
        setStudents(res.data);
        const initialAttendance = {};
        res.data.forEach(s => initialAttendance[s._id] = 'present');
        setAttendanceData(initialAttendance);
      } else {
        setMarksStudents(res.data);
      }
    } catch (err) {
      console.error('Error fetching class students:', err);
      notify('Failed to load students: ' + (err.response?.data?.message || 'Server error'));
    }
  };

  const handleMarkAttendance = async () => {
    if (!attendanceSubject || !selectedClass) {
      notify('Please select Class and Subject');
      return;
    }
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };

    const studentsToSave = Object.keys(attendanceData).map(studentId => ({
      studentId,
      status: attendanceData[studentId]
    }));

    setLoadingStudents(true);
    try {
      await axios.post(`${config.API_URL}/attendance/bulk`, {
        students: studentsToSave,
        date: attendanceDate,
        subjectId: attendanceSubject
      }, { headers });

      notify('Attendance synced successfully for ' + studentsToSave.length + ' students!');
      fetchAttendanceRecords(); // Refresh to confirm
    } catch (err) {
      notify('Failed to sync attendance: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedClass || !attendanceSubject) {
      notify('Please select Class and Subject first');
      return;
    }
    setGeneratingQR(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.post(`${config.API_URL}/attendance/qr/generate`, {
        classId: selectedClass,
        subjectId: attendanceSubject
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setQrToken(res.data.qrToken);
      setShowQRModal(true);
    } catch (err) {
      console.error('QR generate failed:', err);
      notify('Failed to generate QR session');
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleUploadMarks = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      await axios.post(`${config.API_URL}/marks`, {
        ...newMark,
        studentId: selectedMarkStudent._id
      }, { headers });
      notify('Marks and remarks uploaded successfully!');
      setNewMark({ ...newMark, marks: '', remarks: '' }); // Clear marks and remarks but keep subject/exam/maxMarks
      setSelectedMarkStudent(null);
      if (marksViewMode === 'view') fetchClassMarks(); // Refresh if in view mode
    } catch (err) {
      notify('Failed to upload marks: ' + (err.response?.data?.message || 'Server error'));
    }
  };

  const fetchClassMarks = async () => {
    if (!marksClass || !newMark.subjectId || !newMark.examId) {
      notify('Please select Class, Subject and Exam');
      return;
    }
    setFetchingClassMarks(true);
    const token = sessionStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const res = await axios.get(`${config.API_URL}/marks/class/${marksClass}/subject/${newMark.subjectId}/exam/${newMark.examId}`, { headers });
      setClassMarks(res.data);
    } catch (err) {
      console.error('Error fetching class marks:', err);
      notify('Failed to fetch marks');
    } finally {
      setFetchingClassMarks(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-50 dark:bg-ink-950 bg-brand-mesh">
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl bg-brand-500/30 blur-2xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-3xl bg-white dark:bg-ink-900 shadow-brand-glow flex items-center justify-center animate-float-slow">
          <img src={oasisLogo} alt="Oasis" className="w-12 h-12 object-contain" />
        </div>
      </div>
      <div className="w-40 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div className="h-full w-1/2 bg-brand-gradient rounded-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </div>
      <p className="text-sm font-semibold text-gray-500">Preparing your teacher workspace…</p>
    </div>
  );

  const navigate = (tab) => {
    if (tab !== 'messages') setChatTarget(null);
    setActiveTab(tab);
  };

  const handleLogout = () => { sessionStorage.removeItem('token'); window.location.href = '/login'; };

  return (
    <TeacherShell
      activeTab={activeTab}
      onNavigate={navigate}
      user={user}
      onLogout={handleLogout}
      badges={{ doubts: activityStats?.pendingDoubts || 0, messages: chatUnread }}
      notifications={inbox}
      onNotificationsSeen={() => setInbox(list => list.map(n => ({ ...n, read: true })))}
      notices={notices}
    >
      <Suspense fallback={<Spinner label="Loading…" variant="grid" />}>
      <div key={activeTab} className="animate-fade-up">
        {activeTab === 'overview' && (
          <TeacherOverview
            user={user}
            teacherData={teacherData}
            todayAttendance={todayAttendance}
            checkInClass={selectedCheckInClass}
            setCheckInClass={setSelectedCheckInClass}
            onCheckIn={handleTeacherCheckIn}
            activityStats={activityStats}
            onStats={setActivityStats}
            onNavigate={navigate}
          />
        )}

        {activeTab === 'timetable' && <TeacherTimetable />}

        {activeTab === 'attendance' && (
          <AttendancePanel
            teacherData={teacherData}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            attendanceSubject={attendanceSubject}
            setAttendanceSubject={setAttendanceSubject}
            attendanceDate={attendanceDate}
            setAttendanceDate={setAttendanceDate}
            students={students}
            attendanceData={attendanceData}
            setAttendanceData={setAttendanceData}
            loadingStudents={loadingStudents}
            onSave={handleMarkAttendance}
            onGenerateQR={handleGenerateQR}
            generatingQR={generatingQR}
            showQRModal={showQRModal}
            setShowQRModal={setShowQRModal}
            qrToken={qrToken}
          />
        )}

        {activeTab === 'marks' && (
          <MarksPanel
            teacherData={teacherData}
            exams={exams}
            marksViewMode={marksViewMode}
            onModeChange={(mode) => {
              setMarksViewMode(mode);
              if (mode === 'view' && marksClass && newMark.subjectId && newMark.examId) fetchClassMarks();
            }}
            marksClass={marksClass}
            onMarksClassChange={(classId) => {
              setMarksClass(classId);
              fetchClassStudents(classId, 'marks');
            }}
            newMark={newMark}
            setNewMark={setNewMark}
            marksStudents={marksStudents}
            selectedMarkStudent={selectedMarkStudent}
            setSelectedMarkStudent={setSelectedMarkStudent}
            onUploadMarks={handleUploadMarks}
            onFetchClassMarks={fetchClassMarks}
            fetchingClassMarks={fetchingClassMarks}
            classMarks={classMarks}
            onEditMark={(m) => {
              setSelectedMarkStudent(m.studentId);
              setNewMark({ ...newMark, marks: m.marks, maxMarks: m.maxMarks || 100, remarks: m.remarks || '' });
              setMarksViewMode('entry');
            }}
          />
        )}

        {activeTab === 'materials' && <StudyResources teacherData={teacherData} />}

        {activeTab === 'live-classes' && <TeacherLiveClass teacherData={teacherData} />}
        {activeTab === 'recorded-classes' && <TeacherVideo teacherData={teacherData} />}
        {activeTab === 'online-tests' && (
          <TeacherTest teacherData={teacherData} focusTestId={focusTestId} onFocusHandled={() => setFocusTestId(null)} />
        )}
        {activeTab === 'question-bank' && (
          <QuestionBank
            teacherData={teacherData}
            onTestBuilt={(test) => { if (test?._id) setFocusTestId(test._id); navigate('online-tests'); }}
          />
        )}
        {activeTab === 'homework' && <Homework teacherData={teacherData} />}
        {activeTab === 'syllabus' && <Syllabus teacherData={teacherData} />}
        {activeTab === 'at-risk' && (
          <AtRiskTab teacherData={teacherData} onMessage={(userId) => { setChatTarget(userId); setActiveTab('messages'); }} />
        )}
        {activeTab === 'messages' && <MessagesTab socket={socket} initialUserId={chatTarget} />}
        {activeTab === 'leaves' && <LeavesTab />}
        {activeTab === 'calendar' && <CalendarTab teacherData={teacherData} />}
        {activeTab === 'doubts' && <DoubtBoard teacherData={teacherData} />}

        {activeTab === 'my-attendance' && (
          <MyAttendanceTab
            teacherData={teacherData}
            todayAttendance={todayAttendance}
            history={myAttendanceHistory}
            checkInClass={selectedCheckInClass}
            setCheckInClass={setSelectedCheckInClass}
            onCheckIn={handleTeacherCheckIn}
          />
        )}

        {activeTab === 'notices' && <NoticesTab notices={notices} onOpen={setSelectedNotice} />}

        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            teacherData={teacherData}
            photoPreview={photoPreview}
            uploadingPhoto={uploadingPhoto}
            onPhotoChange={handlePhotoChange}
            onPhotoSave={handleQuickPhotoUpload}
            onPhotoCancel={() => { setPhotoFile(null); setPhotoPreview(null); }}
          />
        )}
        {activeTab === 'profile' && <div className="mt-6"><PreferencesCard /></div>}
      </div>
      </Suspense>

      <NoticeModal notice={selectedNotice} onClose={() => setSelectedNotice(null)} />
    </TeacherShell>
  );
};

export default TeacherDashboard;

