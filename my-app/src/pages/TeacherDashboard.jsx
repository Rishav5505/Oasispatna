import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import {
  FaChalkboardTeacher, FaUsers, FaCalendarCheck, FaBook,
  FaFilePdf, FaChartLine, FaHistory, FaSearch, FaPlus,
  FaChevronRight, FaSignOutAlt, FaRegClock, FaCheckCircle,
  FaTimesCircle, FaFileUpload, FaUserGraduate, FaClipboardList, FaUserClock, FaBullhorn, FaTimes
} from 'react-icons/fa';
import oasisLogo from '../assets/oasis_logo.png';
import oasisFullLogo from '../assets/oasis_full_logo.png';
import config from '../config';

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
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
    } catch (e) {
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
  const [newMark, setNewMark] = useState({ subjectId: '', marks: '', examId: '', remarks: '' });
  const [exams, setExams] = useState([]);

  // Material State
  const [materialForm, setMaterialForm] = useState({ title: '', subjectId: '', file: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);

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
      await axios.put(`${config.API_URL}/auth/me`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Profile photo updated successfully!');
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchTeacherProfile(); // Refresh profile data
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const fetchTeacherProfile = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const [resProfile, resTeacher] = await Promise.all([
        axios.get(`${config.API_URL}/auth/me`, { headers }),
        axios.get(`${config.API_URL}/teacher/me`, { headers })
      ]);
      setProfile(resProfile.data);
      setTeacherData(resTeacher.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching teacher profile:', err);
      setLoading(false);
    }
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
      alert("Please select a class/session to check in.");
      return;
    }
    const token = sessionStorage.getItem('token');
    try {
      await axios.post(`${config.API_URL}/attendance/teacher/mark`,
        { className: selectedCheckInClass },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      alert(`Checked in for ${selectedCheckInClass}!`);
      fetchMyAttendanceStatus(); // Refresh status
      setSelectedCheckInClass(''); // Reset selection
    } catch (err) {
      alert('Failed to check in: ' + (err.response?.data?.message || 'Server error'));
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
    }
  };

  const handleMarkAttendance = async () => {
    if (!attendanceSubject || !selectedClass) {
      alert('Please select Class and Subject');
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

      alert('Attendance synced successfully for ' + studentsToSave.length + ' students!');
      fetchAttendanceRecords(); // Refresh to confirm
    } catch (err) {
      alert('Failed to sync attendance: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setLoadingStudents(false);
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
      alert('Marks and remarks uploaded successfully!');
      setNewMark({ subjectId: '', marks: '', examId: '', remarks: '' });
      setSelectedMarkStudent(null);
    } catch (err) {
      alert('Failed to upload marks');
    }
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', materialForm.title);
    formData.append('subjectId', materialForm.subjectId);
    formData.append('file', materialForm.file);
    const token = sessionStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    };
    try {
      await axios.post(`${config.API_URL}/study-material`, formData, { headers });
      alert('Study material uploaded successfully!');
      setMaterialForm({ title: '', subjectId: '', file: null });
    } catch (err) {
      alert('Failed to upload material');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-indigo-600 font-bold">Loading Teacher Portal...</div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar - Hidden on mobile by default, toggled via state */}
      <aside className={`w-72 bg-gradient-to-b from-teal-900 via-emerald-900 to-green-900 text-emerald-100 flex-shrink-0 flex flex-col shadow-2xl z-30 fixed inset-y-0 left-0 transform transition-transform duration-300 lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-emerald-800/50">
          <div className="w-full flex justify-center">
            <img src={oasisFullLogo} alt="Oasis Full Logo" className="h-16 object-contain brightness-110 drop-shadow-lg" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-emerald-300 hover:text-white absolute right-4 top-6">
            <FaTimesCircle className="text-2xl" />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {[
            { id: 'overview', icon: FaChartLine, label: 'Dashboard' },
            { id: 'attendance', icon: FaCalendarCheck, label: 'Attendance' },
            { id: 'marks', icon: FaClipboardList, label: 'Academic Performance' },
            { id: 'materials', icon: FaBook, label: 'Study Resources' },
            { id: 'my-attendance', icon: FaUserClock, label: 'My Attendance' },
            { id: 'notices', icon: FaBullhorn, label: 'Notice Board' },
            { id: 'profile', icon: FaUserGraduate, label: 'My Profile' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-semibold text-sm ${activeTab === item.id
                ? 'bg-emerald-500 text-white shadow-emerald-900/50 shadow-lg translate-x-1'
                : 'hover:bg-emerald-800/50 hover:text-white'
                }`}
            >
              <item.icon className={activeTab === item.id ? 'text-white' : 'text-emerald-400'} />
              {item.label}
              {activeTab === item.id && <FaChevronRight className="ml-auto text-[10px]" />}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-emerald-800/50">
          <button
            onClick={() => { sessionStorage.removeItem('token'); window.location.href = '/login'; }}
            className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all border border-red-500/20"
          >
            <FaSignOutAlt /> TERMINATE SESSION
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full relative">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-10 shadow-sm z-10 w-full">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-gray-50 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <FaClipboardList className="text-xl" />
            </button>
            <h2 className="text-xl font-black text-gray-900 capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 rounded-2xl border border-dotted border-gray-200">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm overflow-hidden border border-emerald-200 shadow-inner">
                {profile.profilePhoto ? (
                  <img src={`${config.API_URL.replace('/api', '')}${profile.profilePhoto}`} alt="Teacher" className="w-full h-full object-cover" />
                ) : (
                  profile.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900 leading-none mb-1">{profile.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expert Educator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-10 pb-24 md:pb-10">
          {activeTab === 'overview' && (
            <div className="space-y-10 animate-in fade-in duration-500">

              {/* Teacher Welcome Banner */}
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-10 shadow-2xl shadow-emerald-200/50 text-white relative">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 blur-3xl rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-teal-900/10 blur-3xl rounded-full pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Faculty Portal</span>
                      <span className="text-emerald-50 text-xs font-bold">{new Date().toDateString()}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-[900] tracking-tight mb-2 leading-tight">
                      Welcome Back, <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-white">{profile.name?.split(' ')[0] || 'Educator'}</span> 👨‍🏫
                    </h1>
                    <p className="text-emerald-50 font-medium max-w-lg text-sm leading-relaxed opacity-90">
                      You are managing <span className="font-black text-white underline decoration-emerald-200 decoration-2 underline-offset-4">{teacherData.batches.length || 0} batches</span> and impacting students with your expertise.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    {/* Simplified Quick Access - full implementation in My Attendance tab */}
                    <button onClick={() => setActiveTab('my-attendance')} className="bg-white text-teal-600 px-6 py-3 rounded-2xl font-black text-xs shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2 group animate-pulse">
                      <FaUserClock className="group-hover:rotate-12 transition-transform" />
                      {todayAttendance.length > 0 ? `${todayAttendance.length} SESSIONS DONE` : 'START DAY CHECK-IN'}
                    </button>

                    <button onClick={() => setActiveTab('attendance')} className="bg-teal-900/40 text-white border border-white/20 px-6 py-3 rounded-2xl font-black text-xs hover:bg-teal-900/60 transition-all backdrop-blur-md flex items-center gap-2">
                      <FaCalendarCheck /> MARK STUDENT ATTENDANCE
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
                  <div className="flex items-center justify-between mb-8 relative">
                    <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-600 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      <FaUsers />
                    </div>
                    <span className="text-emerald-600 text-[10px] font-black bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">ACTIVE</span>
                  </div>
                  <h3 className="text-4xl font-[900] text-gray-800 mb-2 relative tracking-tight">{teacherData.batches.length || 0}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest relative">Active Batches</p>
                </div>

                <div className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
                  <div className="flex items-center justify-between mb-8 relative">
                    <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      <FaBook />
                    </div>
                    <span className="text-indigo-600 text-[10px] font-black bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">EXPERTISE</span>
                  </div>
                  <h3 className="text-4xl font-[900] text-gray-800 mb-2 relative tracking-tight">{teacherData.subjects.length || 0}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest relative">Assigned Subjects</p>
                </div>

                <div className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700 ease-out"></div>
                  <div className="flex items-center justify-between mb-8 relative">
                    <div className="w-16 h-16 bg-orange-50 rounded-[1.5rem] flex items-center justify-center text-orange-500 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      <FaRegClock />
                    </div>
                    <span className="text-orange-600 text-[10px] font-black bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">STATUS</span>
                  </div>
                  <h3 className="text-4xl font-[900] text-gray-800 mb-2 relative tracking-tight">Active</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest relative">System Access</p>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 mb-8">Recent Activities</h3>
                <div className="space-y-6">
                  {[
                    { title: 'Attendance Marked', desc: 'Batch Alpha - Grade 10', time: '10 mins ago', icon: FaCheckCircle, color: 'emerald' },
                    { title: 'Notes Uploaded', desc: 'Physics - Chapter 4', time: '2 hours ago', icon: FaFileUpload, color: 'indigo' },
                  ].map((act, i) => (
                    <div key={i} className="flex items-center gap-6 p-4 hover:bg-gray-50 rounded-2xl transition-all">
                      <div className={`w-12 h-12 bg-${act.color}-50 text-${act.color}-500 rounded-xl flex items-center justify-center`}>
                        <act.icon />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-sm">{act.title}</h4>
                        <p className="text-xs text-gray-400 font-medium">{act.desc}</p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-300 uppercase">{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">Mark Attendance</h2>
                    <p className="text-gray-400 font-bold">Recording student footprints for today</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <select
                      className="w-full md:w-auto px-6 py-3.5 bg-gray-50 rounded-2xl border-none font-bold text-sm text-gray-600 focus:outline-none"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                    >
                      <option value="">{teacherData.classes?.length === 0 ? 'No Classes Assigned' : 'Select Class'}</option>
                      {teacherData.classes?.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      className="w-full md:w-auto px-6 py-3.5 bg-gray-50 rounded-2xl border-none font-bold text-sm text-gray-600 focus:outline-none"
                      value={attendanceSubject}
                      onChange={(e) => setAttendanceSubject(e.target.value)}
                    >
                      <option value="">Select Subject</option>
                      {teacherData.subjects.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="w-full md:w-auto px-6 py-3.5 bg-gray-50 rounded-2xl border-none font-bold text-sm text-gray-600 focus:outline-none"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={handleMarkAttendance}
                  disabled={!selectedClass || !attendanceSubject || students.length === 0}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-emerald-200/50 transition-all disabled:opacity-50 hover:scale-[1.01]"
                >
                  {loadingStudents ? 'LOADING RECORDS...' : 'FINALIZE AND SAVE ATTENDANCE'}
                </button>
              </div>

              {!selectedClass || !attendanceSubject ? (
                <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 text-center">
                  <FaUserClock className="text-6xl mb-6 opacity-20" />
                  <p className="font-bold text-lg">Please select Class & Subject</p>
                  <p className="text-sm">Student list will appear automatically after selection</p>
                </div>
              ) : loadingStudents ? (
                <div className="py-20 flex flex-col items-center justify-center text-emerald-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
                  <p className="font-bold">Syncing Student Records...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-red-50 flex flex-col items-center justify-center text-red-200 text-center">
                  <FaUsers className="text-6xl mb-6 opacity-20" />
                  <p className="font-bold text-lg text-red-300">No Students Found</p>
                  <p className="text-sm">There are no students enrolled in this class.</p>
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden p-2 md:p-4 overflow-x-auto">
                  <table className="w-full text-left min-w-[600px] md:min-w-0">
                    <thead>
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-8 py-6">Student Identity</th>
                        <th className="px-8 py-6 text-right">Status Protocol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map(s => (
                        <tr key={s._id} className="group hover:bg-emerald-50/30 transition-all">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center font-black text-emerald-600">{(s.name || s.userId?.name || '?').charAt(0)}</div>
                              <p className="font-bold text-gray-800 text-sm">{s.name || s.userId?.name || 'Unknown Student'}</p>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex gap-2 justify-end">
                              {['present', 'absent'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => setAttendanceData({ ...attendanceData, [s._id]: status })}
                                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${attendanceData[s._id] === status
                                    ? status === 'present' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-red-500 text-white shadow-lg'
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'marks' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-500">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Academic Records</h2>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Global Selector</p>
                  </div>
                  <div className="space-y-4">
                    <select
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm text-gray-700"
                      value={marksClass}
                      onChange={(e) => {
                        setMarksClass(e.target.value);
                        fetchClassStudents(e.target.value, 'marks');
                      }}
                    >
                      <option value="">-- Choose Class --</option>
                      {teacherData.classes?.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm text-gray-700"
                      value={newMark.subjectId}
                      onChange={(e) => setNewMark({ ...newMark, subjectId: e.target.value })}
                    >
                      <option value="">-- Choose Subject --</option>
                      {teacherData.subjects.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {marksStudents.map(s => (
                      <button
                        key={s._id}
                        onClick={() => setSelectedMarkStudent(s)}
                        className={`w-full p-4 rounded-2xl text-left transition-all ${selectedMarkStudent?._id === s._id ? 'bg-indigo-600 text-white shadow-xl' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        <p className="font-bold text-sm">{s.name || s.userId?.name || 'Unknown'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedMarkStudent ? (
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl space-y-8 animate-in slide-in-from-right-5">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 text-2xl font-black">
                        {(selectedMarkStudent.name || selectedMarkStudent.userId?.name || '?').charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-gray-900">{selectedMarkStudent.name || selectedMarkStudent.userId?.name || 'Unknown'}</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mark Entry Terminal</p>
                      </div>
                    </div>

                    <form onSubmit={handleUploadMarks} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Subject</label>
                          <select
                            className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-gray-700"
                            value={newMark.subjectId}
                            onChange={(e) => setNewMark({ ...newMark, subjectId: e.target.value })}
                            required
                          >
                            <option value="">-- Select Subject --</option>
                            {teacherData.subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Exam Cycle</label>
                          <select
                            className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-gray-700"
                            value={newMark.examId}
                            onChange={(e) => setNewMark({ ...newMark, examId: e.target.value })}
                            required
                          >
                            <option value="">-- Select Exam --</option>
                            {exams.map(e => <option key={e._id} value={e._id}>{e.name} ({e.type})</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Score (%)</label>
                        <input
                          type="number"
                          max="100"
                          placeholder="0-100"
                          className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-gray-700 text-3xl text-center"
                          value={newMark.marks}
                          onChange={(e) => setNewMark({ ...newMark, marks: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Pedagogical Remarks</label>
                        <textarea
                          rows="4"
                          placeholder="Provide constructive feedback..."
                          className="w-full p-6 bg-gray-50 rounded-[2rem] border-none font-bold text-gray-700 resize-none"
                          value={newMark.remarks}
                          onChange={(e) => setNewMark({ ...newMark, remarks: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-100">COMMIT TO LEDGER</button>
                    </form>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 border-4 border-dashed border-gray-100 rounded-[3rem] p-20">
                    <FaClipboardList className="text-6xl mb-6 opacity-20" />
                    <p className="font-bold">Select a student from the sidebar to start evaluation</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-5 duration-500">
              <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-2xl space-y-10">
                <div className="text-center">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center text-3xl mx-auto mb-6">
                    <FaFileUpload />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900">Resource Repository</h2>
                  <p className="text-gray-400 font-bold">Upload PDF notes or study materials for students</p>
                </div>

                <form onSubmit={handleUploadMaterial} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Resource Heading</label>
                    <input
                      type="text"
                      placeholder="e.g., Quantum Mechanics Part 1"
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-gray-700"
                      value={materialForm.title}
                      onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Target Subject</label>
                    <select
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-gray-700"
                      value={materialForm.subjectId}
                      onChange={(e) => setMaterialForm({ ...materialForm, subjectId: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Subject --</option>
                      {teacherData.subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="relative group cursor-pointer">
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      onChange={(e) => setMaterialForm({ ...materialForm, file: e.target.files[0] })}
                      required
                    />
                    <div className="p-10 border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400 group-hover:border-emerald-100 group-hover:text-emerald-500 transition-all">
                      <FaFilePdf className="text-4xl mb-4" />
                      <p className="font-bold text-sm">{materialForm.file ? materialForm.file.name : 'Select or Drop PDF Document'}</p>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-2xl shadow-emerald-100 transition-all">DELEGATE TO COMMUNITY</button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'my-attendance' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl -ml-16 -mb-16"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="text-center md:text-left">
                    <h2 className="text-4xl font-[900] mb-2">My Attendance Portal</h2>
                    <p className="text-emerald-100 font-medium opacity-90">Manage your daily check-ins and track work history</p>
                    <div className="mt-8 flex items-center gap-4 bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl w-fit mx-auto md:mx-0">
                      <FaRegClock className="text-emerald-200" />
                      <span className="font-bold font-mono text-xl">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/20 flex flex-col items-center gap-6 min-w-[280px]">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl shadow-lg">
                      {todayAttendance.length > 0 ? <FaCheckCircle className="text-emerald-500" /> : <FaUserClock className="text-teal-600" />}
                    </div>
                    <div className="w-full">
                      <h3 className="text-2xl font-[900] text-center mb-1">Session Check-In</h3>
                      <p className="text-emerald-100 text-xs font-bold text-center uppercase tracking-widest mb-4">
                        {todayAttendance.length} Sessions Marked Today
                      </p>
                      <select
                        className="w-full p-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-emerald-200 focus:outline-none focus:bg-white/30 font-bold mb-3 option:text-black"
                        value={selectedCheckInClass}
                        onChange={(e) => setSelectedCheckInClass(e.target.value)}
                      >
                        <option value="" className="text-gray-800">Select Class...</option>
                        {teacherData.classes && teacherData.classes.length > 0 ?
                          teacherData.classes.map((cls, idx) => (
                            <option key={idx} value={cls.name} className="text-gray-800">{cls.name}</option>
                          )) : (
                            ['Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                              <option key={c} value={c} className="text-gray-800">{c}</option>
                            ))
                          )
                        }
                        <option value="Extra Class" className="text-gray-800">Extra Class</option>
                      </select>

                      <button onClick={handleTeacherCheckIn} className="w-full py-4 bg-white text-emerald-800 rounded-xl font-black text-sm hover:scale-105 transition-transform shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" disabled={!selectedCheckInClass}>
                        PUNCH IN
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Log */}
              <div className="grid grid-cols-1 gap-6">
                {todayAttendance.length > 0 && (
                  <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100">
                    <h4 className="text-lg font-black text-emerald-800 mb-4 flex items-center gap-2"><FaUserClock /> Today's Sessions</h4>
                    <div className="flex flex-wrap gap-4">
                      {todayAttendance.map((log) => (
                        <div key={log._id} className="bg-white px-6 py-4 rounded-xl shadow-sm border border-emerald-100 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                            {log.className?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{log.className || 'General Session'}</p>
                            <p className="text-xs text-gray-400 font-mono">{new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
                <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                  <FaHistory className="text-emerald-500" /> Attendance Log
                </h3>
                <div className="overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Session/Class</th>
                        <th className="px-6 py-4">Check-In Time</th>
                        <th className="px-6 py-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {myAttendanceHistory.map(record => (
                        <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-700">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase">
                              {record.className || 'General'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-gray-500">
                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-gray-400">
                            {record.remarks || '-'}
                          </td>
                        </tr>
                      ))}
                      {myAttendanceHistory.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-gray-400 font-bold">No records found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notices' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
              <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-4xl font-[900] mb-2 flex items-center gap-3"><FaBullhorn /> Notice Board</h2>
                  <p className="text-orange-100 font-medium opacity-90">Stay updated with latest announcements from administration</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {notices.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[3rem] shadow-sm border border-gray-100">
                    <div className="text-gray-200 text-6xl mb-4"><FaBullhorn className="mx-auto" /></div>
                    <p className="text-gray-400 font-bold text-lg">No New Notices</p>
                  </div>
                ) : (
                  notices.map(notice => (
                    <div
                      key={notice._id}
                      onClick={() => setSelectedNotice(notice)}
                      className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden group"
                    >
                      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-400 to-rose-500 group-hover:w-3 transition-all"></div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-black text-gray-800 group-hover:text-orange-600 transition-colors mb-2">{notice.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 md:w-3/4">{notice.content || 'Click to view details...'}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-3 py-1 rounded-full whitespace-nowrap ml-4">
                          {new Date(notice.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Status:</span>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-xs font-black text-emerald-600">Active Circular</span>
                        </div>
                        <span className="text-[10px] font-black text-indigo-400 ml-auto uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Read More &rarr;</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Modal for Notice Details */}
          {selectedNotice && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setSelectedNotice(null)}
            >
              <div
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300"
              >
                <div className="p-8 bg-gradient-to-r from-orange-500 to-rose-500 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                  <h2 className="text-3xl font-black tracking-tight relative z-10 mb-2">{selectedNotice.title}</h2>
                  <div className="flex items-center gap-3 relative z-10">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20">Official Circular</span>
                    <span className="text-orange-100 text-xs font-medium">{new Date(selectedNotice.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <button
                    onClick={() => setSelectedNotice(null)}
                    className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all shadow-lg"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="p-10 max-h-[60vh] overflow-y-auto bg-white">
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg font-medium">
                      {selectedNotice.content}
                    </p>
                  </div>
                  <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500"><FaBullhorn /></div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sent By</p>
                      <p className="text-sm font-bold text-gray-800">Institute Administration</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-100 text-right">
                  <button
                    onClick={() => setSelectedNotice(null)}
                    className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl active:scale-95"
                  >
                    Close Notice
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
              <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
                <div className="flex flex-col items-center mb-10">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-50 border-4 border-white shadow-xl flex items-center justify-center text-4xl text-emerald-600 font-black mb-6 relative group overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} className="w-full h-full object-cover" />
                    ) : profile.profilePhoto ? (
                      <img src={`${config.API_URL.replace('/api', '')}${profile.profilePhoto}`} className="w-full h-full object-cover" />
                    ) : profile.name?.charAt(0)}
                    <label className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer">
                      <FaPlus className="text-white" />
                      <input type="file" className="hidden" onChange={handlePhotoChange} accept="image/*" />
                    </label>
                  </div>
                  {photoPreview && (
                    <div className="flex gap-2 mb-4 animate-in slide-in-from-top duration-300">
                      <button
                        onClick={handleQuickPhotoUpload}
                        disabled={uploadingPhoto}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                      >
                        {uploadingPhoto ? <FaHistory className="animate-spin" /> : <FaCheckCircle />} SAVE PHOTO
                      </button>
                      <button
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-300 transition-all"
                      >
                        CANCEL
                      </button>
                    </div>
                  )}
                  <h2 className="text-3xl font-black text-gray-900">{profile.name}</h2>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Platform Educator</p>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-gray-50 rounded-3xl">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subjects</p>
                      <div className="flex flex-wrap gap-2">
                        {teacherData.subjects.map(s => <span key={s._id} className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase">{s.name}</span>)}
                      </div>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-3xl">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Batches</p>
                      <div className="flex flex-wrap gap-2">
                        {teacherData.batches.map(b => <span key={b._id} className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase">{b.name}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                      <span className="text-xs font-bold text-gray-400 uppercase">Registered Email</span>
                      <span className="text-sm font-bold text-gray-700">{profile.email}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                      <span className="text-xs font-bold text-gray-400 uppercase">Contact Node</span>
                      <span className="text-sm font-bold text-gray-700">{profile.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;

