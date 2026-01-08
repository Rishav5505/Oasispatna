import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { FaUser, FaCalendarAlt, FaBook, FaBullhorn, FaDownload, FaMoneyBillWave, FaClipboardList, FaGraduationCap, FaEdit, FaSave, FaTimes, FaCamera, FaBell, FaChartLine, FaClock, FaStar, FaCheckCircle, FaChevronRight, FaSignOutAlt } from 'react-icons/fa';
import oasisLogo from '../assets/oasis_logo.png';
import receiptBanner from '../assets/receipt_banner.png';
import config from '../config';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
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
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
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
    }
  }, [user]);

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
          alert('Session expired or user not found. Please login again.');
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
      ];

      if (studentData?.classId) {
        requests.push(axios.get(`${config.API_URL}/exams/class/${studentData.classId._id}`, { headers }));
      }

      const results = await Promise.allSettled(requests);

      // Helper to get data or empty
      const getData = (index, defaultVal = []) => results[index].status === 'fulfilled' ? results[index].value.data : defaultVal;

      setAttendance(getData(0, []));
      setMarks(getData(1, []));
      setFees(getData(2, {}));
      setMaterials(getData(3, []));
      setNotices(getData(4, []));
      setNotifications(getData(5, []));

      if (studentData?.classId && results[6]) {
        setExams(results[6].status === 'fulfilled' ? results[6].value.data : []);
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

      await axios.put(`${config.API_URL}/auth/me`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      setPhotoFile(null);
      setPhotoPreview(null);
      fetchAllData();
      alert('Profile photo updated successfully!');
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo');
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
        alert('You are not logged in. Please login again.');
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
      fetchAllData(); // Refresh data
      alert('Profile updated successfully! All data saved to MongoDB.');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile: ' + (err.response?.data?.message || err.message));
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
      alert('Class selected successfully!');
    } catch (err) {
      alert('Failed to select class');
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
      alert('Batch selected successfully!');
    } catch (err) {
      alert('Failed to select batch');
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

  const renderCalendar = () => {
    const days = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayAttendance = attendance.find(a => new Date(a.date).toDateString() === date.toDateString());
      days.push({
        date: date.getDate(),
        month: date.getMonth(),
        status: dayAttendance ? dayAttendance.status : 'none'
      });
    }
    return days.reverse();
  };

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
            <div className="receipt-box">
                <div className="header">
                    <img src="${window.location.origin}${receiptBanner}" alt="Oasis Header" style="width: 100%; max-height: 150px; object-fit: contain; margin-bottom: 20px;" />
                    <h2>OASIS JEE CLASSES</h2>
                    <p>Official Payment Receipt</p>
                </div>
                <div className="details">
                    <div className="row"><span>Date:</span> <span>${new Date(payment.date).toLocaleDateString()}</span></div>
                    <div className="row"><span>Receipt No:</span> <span>${payment.transactionId || payment._id.slice(-8).toUpperCase()}</span></div>
                    <div className="row"><span>Student Name:</span> <span>${student.name || profile.name}</span></div>
                    <div className="row"><span>Class:</span> <span>${student.classId?.name || 'N/A'}</span></div>
                    <hr/>
                    <div className="row"><span>Payment Type:</span> <span>${payment.type}</span></div>
                    <div className="row"><span>Amount Paid:</span> <span>₹${payment.amount}</span></div>
                    <div className="row"><span>Payment Mode:</span> <span>Online/Cash</span></div>
                    <hr/>
                    <div className="row" style="font-weight: bold; font-size: 18px;"><span>TOTAL:</span> <span>₹${payment.amount}</span></div>
                </div>
                <div className="footer">
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

  const getProfileCompletion = () => {
    const fields = [editForm.name, editForm.fatherName, editForm.motherName, editForm.dob, editForm.phone, editForm.email, editForm.admissionDate];
    const completed = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }


  // Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md overflow-hidden p-1">
                <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Portal</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back, {student.name || profile.name || 'Student'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded-xl border border-transparent hover:border-gray-100"
              >
                <FaBell className="text-xl" />
                {(notifications.some(n => !n.read) || notices.some(n => new Date(n.createdAt) > new Date(Date.now() - 86400000))) && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden shadow-inner border border-white/20">
                  {student.profilePhoto || profile.profilePhoto ? (
                    <img src={`${config.API_URL.replace('/api', '')}${student.profilePhoto || profile.profilePhoto}`} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (student.name || profile.name || 'S').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="font-medium text-gray-900 dark:text-white">{student.name || profile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Student ID: {user?.id?.slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all font-bold text-sm"
              >
                <FaSignOutAlt />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Profile Photo */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative group">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-white/30 overflow-hidden shadow-2xl relative">
                  {uploadingPhoto ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                  ) : photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : student.profilePhoto || profile.profilePhoto ? (
                    <img src={`${config.API_URL.replace('/api', '')}${student.profilePhoto || profile.profilePhoto}`} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <FaUser className="text-4xl text-white opacity-90" />
                      <span className="text-[10px] uppercase font-bold tracking-tighter mt-1 opacity-70">No Photo</span>
                    </div>
                  )}
                </div>

                {photoFile ? (
                  <button
                    onClick={handleQuickPhotoUpload}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600 transition-all transform hover:scale-110 z-20 flex items-center justify-center border-2 border-white"
                    title="Save Photo"
                  >
                    {uploadingPhoto ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent"></div> : <FaCheckCircle className="text-lg" />}
                  </button>
                ) : (
                  <button
                    onClick={() => document.getElementById('profile-photo-upload').click()}
                    className="absolute -bottom-1 -right-1 w-9 h-9 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-xl hover:bg-blue-50 transition-all transform hover:scale-110 z-20 border-2 border-blue-50"
                  >
                    <FaCamera className="text-lg" />
                  </button>
                )}

                {photoFile && !uploadingPhoto && (
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-all z-20"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}

                <input
                  type="file"
                  id="profile-photo-upload"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Welcome back, {student.name || profile.name}!</h2>
                <p className="text-blue-100 mb-4">Ready to continue your learning journey?</p>
                <div className="flex items-center space-x-6 text-sm">
                  <span
                    onClick={() => setShowClassModal(true)}
                    className={`flex items-center cursor-pointer px-3 py-1.5 rounded-lg transition-all ${!student.classId ? 'bg-red-500/20 text-red-100 animate-pulse border border-red-400/30' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    <img src={oasisLogo} alt="Logo" className="w-4 h-4 mr-2 object-contain brightness-200" />
                    Class: {student.classId?.name || 'Click to Select'}
                  </span>
                  <span
                    onClick={() => setShowBatchModal(true)}
                    className={`flex items-center cursor-pointer px-3 py-1.5 rounded-lg transition-all ${!student.batchId ? 'bg-orange-500/20 text-orange-100 animate-pulse border border-orange-400/30' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    <FaCalendarAlt className="mr-2" />
                    Batch: {student.batchId?.name || 'Click to Select'}
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">{getProfileCompletion()}%</div>
                  <p className="text-sm opacity-90">Profile Complete</p>
                  <div className="w-20 h-2 bg-white bg-opacity-20 rounded-full mt-3 mx-auto">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${getProfileCompletion()}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                <FaCalendarAlt />
              </div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Academic Attendance</p>
              <div className="relative mb-2">
                <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{calculateAttendancePercentage()}%</p>
                <div className="w-full h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${calculateAttendancePercentage()}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                {attendance.filter(a => a.status === 'present').length} Sessions Recorded
              </p>
            </div>
          </div>

          <div className="group bg-white rounded-3xl shadow-sm border border-gray-100 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                <FaBook />
              </div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Average Marks</p>
              <div className="relative mb-2">
                <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                  {marks.length > 0 ? Math.round(marks.reduce((sum, m) => sum + (m.marks || 0), 0) / marks.length) : 0}%
                </p>
                <div className="w-full h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${marks.length > 0 ? Math.round(marks.reduce((sum, m) => sum + (m.marks || 0), 0) / marks.length) : 0}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{marks.length} Subjects Evaluated</p>
            </div>
          </div>

          <div className="group bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                <FaMoneyBillWave />
              </div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Unpaid Balance</p>
              <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">₹{fees.pendingFees || 0}</p>
              <p className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">Due: {fees.dueDate ? new Date(fees.dueDate).toLocaleDateString() : 'Paid'}</p>
            </div>
          </div>

          {/* Dynamic Exam Countdown Card (Replaces static Scheduled Exams) */}
          <div className="group bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl shadow-lg shadow-indigo-200 border border-indigo-500 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 text-white rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg backdrop-blur-sm">
                <FaClock className="animate-pulse" />
              </div>

              {nextExam ? (
                <>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Next: {nextExam.name}</p>
                  <div className="flex gap-2 mb-2">
                    <div className="bg-white/10 rounded p-1 min-w-[30px]">
                      <span className="font-black text-xl block leading-none">{String(timeLeft.days).padStart(2, '0')}</span>
                      <span className="text-[8px] uppercase opacity-70">Day</span>
                    </div>
                    <span className="font-bold pt-1">:</span>
                    <div className="bg-white/10 rounded p-1 min-w-[30px]">
                      <span className="font-black text-xl block leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
                      <span className="text-[8px] uppercase opacity-70">Hr</span>
                    </div>
                    <span className="font-bold pt-1">:</span>
                    <div className="bg-white/10 rounded p-1 min-w-[30px]">
                      <span className="font-black text-xl block leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
                      <span className="text-[8px] uppercase opacity-70">Min</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Upcoming Exams</p>
                  <p className="text-3xl font-black tracking-tight mb-2">None</p>
                </>
              )}

              <p className="text-xs font-bold text-white bg-white/20 px-4 py-1.5 rounded-full border border-white/10">
                {nextExam ? new Date(nextExam.date).toLocaleDateString() : 'Relax & Prepare!'}
              </p>
            </div>
          </div>
        </div>

        {/* Complete Your Profile Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 mb-8 transition-colors duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complete Your Profile</h2>
              <p className="text-gray-600 dark:text-gray-300">Keep your information up to date for better services</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full md:w-auto mt-4 md:mt-0">
              <div className="text-left md:text-right">
                <div className="text-sm text-gray-500">Complete by</div>
                <div className="font-medium text-gray-900">{getCompletionDeadline()}</div>
              </div>
              <div className="text-left md:text-right">
                <div className="text-sm text-gray-500">Progress</div>
                <div className="text-2xl font-bold text-blue-600">{getProfileCompletion()}%</div>
              </div>
              <button
                onClick={handleEditToggle}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center font-medium ml-auto md:ml-0"
              >
                {editMode ? <FaTimes className="mr-2" /> : <FaEdit className="mr-2" />}
                {editMode ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Father's Name</label>
                  <input
                    type="text"
                    value={editForm.fatherName}
                    onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mother's Name</label>
                  <input
                    type="text"
                    value={editForm.motherName}
                    onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admission Date</label>
                  <input
                    type="date"
                    value={editForm.admissionDate}
                    onChange={(e) => setEditForm({ ...editForm, admissionDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                  <div className="flex items-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
                    <FaCamera className="text-gray-400 text-xl" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {photoFile ? photoFile.name : 'Click to upload photo'}
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files[0])}
                      className="hidden"
                      id="edit-photo-upload"
                    />
                    <label
                      htmlFor="edit-photo-upload"
                      className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm font-medium"
                    >
                      Choose File
                    </label>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveProfile}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center font-medium"
                  >
                    <FaSave className="mr-2" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div
                onClick={() => setEditMode(true)}
                className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 cursor-pointer hover:shadow-md transition-all ${!editForm.name ? 'border-red-200' : 'border-blue-200'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <FaUser className="text-white text-xl" />
                  </div>
                  {!editForm.name && <FaStar className="text-red-500" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Full Name</h3>
                <p className="text-gray-700">{editForm.name || 'Not provided'}</p>
                {editForm.name && <FaCheckCircle className="text-green-500 mt-2" />}
              </div>

              <div
                onClick={() => setEditMode(true)}
                className={`bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 cursor-pointer hover:shadow-md transition-all ${!editForm.phone ? 'border-red-200' : 'border-green-200'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <FaUser className="text-white text-xl" />
                  </div>
                  {!editForm.phone && <FaStar className="text-red-500" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
                <p className="text-gray-700">{editForm.phone || 'Not provided'}</p>
                {editForm.phone && <FaCheckCircle className="text-green-500 mt-2" />}
              </div>

              <div
                onClick={() => setEditMode(true)}
                className={`bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 cursor-pointer hover:shadow-md transition-all ${!editForm.email ? 'border-red-200' : 'border-purple-200'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                    <FaUser className="text-white text-xl" />
                  </div>
                  {!editForm.email && <FaStar className="text-red-500" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
                <p className="text-gray-700">{editForm.email || 'Not provided'}</p>
                {editForm.email && <FaCheckCircle className="text-green-500 mt-2" />}
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                    <FaCamera className="text-white text-xl" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Profile Photo</h3>
                <p className="text-gray-700">{profile.profilePhoto ? 'Uploaded' : 'Not uploaded'}</p>
                {profile.profilePhoto && <FaCheckCircle className="text-green-500 mt-2" />}
              </div>

              <div
                onClick={() => setEditMode(true)}
                className={`bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 cursor-pointer hover:shadow-md transition-all ${!editForm.fatherName ? 'border-red-200' : 'border-yellow-200'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <FaUser className="text-white text-xl" />
                  </div>
                  {!editForm.fatherName && <FaStar className="text-red-500" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Father's Name</h3>
                <p className="text-gray-700">{editForm.fatherName || 'Not provided'}</p>
                {editForm.fatherName && <FaCheckCircle className="text-green-500 mt-2" />}
              </div>

              <div
                onClick={() => setEditMode(true)}
                className={`bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border-2 cursor-pointer hover:shadow-md transition-all ${!editForm.motherName ? 'border-red-200' : 'border-pink-200'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center">
                    <FaUser className="text-white text-xl" />
                  </div>
                  {!editForm.motherName && <FaStar className="text-red-500" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Mother's Name</h3>
                <p className="text-gray-700">{editForm.motherName || 'Not provided'}</p>
                {editForm.motherName && <FaCheckCircle className="text-green-500 mt-2" />}
              </div>

              <div
                onClick={() => setEditMode(true)}
                className={`bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border-2 cursor-pointer hover:shadow-md transition-all ${!editForm.dob ? 'border-red-200' : 'border-indigo-200'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <FaCalendarAlt className="text-white text-xl" />
                  </div>
                  {!editForm.dob && <FaStar className="text-red-500" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Date of Birth</h3>
                <p className="text-gray-700">{editForm.dob ? new Date(editForm.dob).toLocaleDateString() : 'Not provided'}</p>
                {editForm.dob && <FaCheckCircle className="text-green-500 mt-2" />}
              </div>

              <div className={`bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border-2 ${!editForm.admissionDate ? 'border-red-200' : 'border-teal-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
                    <FaClock className="text-white text-xl" />
                  </div>
                  {!editForm.admissionDate && <FaStar className="text-red-500" />}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Admission Date</h3>
                <p className="text-gray-700">{editForm.admissionDate ? new Date(editForm.admissionDate).toLocaleDateString() : 'Not provided'}</p>
                {editForm.admissionDate && <FaCheckCircle className="text-green-500 mt-2" />}
              </div>
            </div>
          )}
        </div>

        {/* Analytics & Digital ID Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Performance Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Analytics</h2>
                <p className="text-gray-500 text-sm">Subject-wise marks distribution</p>
              </div>
              <FaChartLine className="text-blue-500 text-xl" />
            </div>
            <div className="h-64">
              {marks.length > 0 ? (
                <Bar
                  data={{
                    labels: marks.map(m => m.subjectId?.name || 'Subject'),
                    datasets: [{
                      label: 'Marks Obtained',
                      data: marks.map(m => m.marks),
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderRadius: 8,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: { beginAtZero: true, max: 100 }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <FaChartLine className="text-4xl mb-2" />
                  <p>No performance data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Digital ID Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Digital ID Card</h2>
              <button
                onClick={() => {
                  const printContent = document.getElementById('digital-id-card').innerHTML;
                  const win = window.open('', '', 'width=400,height=600');
                  win.document.write('<html><head><title>Student ID Card</title></head><body style="padding: 20px; display: flex; justify-content: center;">' + printContent + '</body></html>');
                  win.document.close();
                  win.print();
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-wider"
              >
                <FaDownload /> Print ID
              </button>
            </div>

            <div id="digital-id-card" className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl flex flex-col items-center text-center">
              {/* ID Card Decor */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
              <img src={oasisLogo} alt="Logo" className="w-12 h-12 object-contain mb-4 brightness-200" />

              <div className="w-24 h-24 rounded-full border-4 border-white/20 p-1 mb-4">
                <img
                  src={`https://oasispatna.onrender.com${student.profilePhoto || profile.profilePhoto}`}
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=' + (student.name || 'Student'); }}
                  alt="Student"
                  className="w-full h-full rounded-full object-cover bg-slate-700"
                />
              </div>

              <h3 className="text-xl font-bold mb-1">{student.name || profile.name || 'Student Name'}</h3>
              <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-4">Oasis JEE Student</p>

              <div className="w-full space-y-2 text-sm bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID No.</span>
                  <span className="font-mono">{user?.id?.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class</span>
                  <span>{student.classId?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Batch</span>
                  <span>{student.batchId?.name || 'N/A'}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 w-full">
                <div className="w-full h-8 bg-white rounded flex items-center justify-center">
                  {/* Barcode Placeholder */}
                  <div className="flex gap-1 h-4">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className={`w-${Math.floor(Math.random() * 2) + 1} bg-black h-full`}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Attendance & Marks */}
          <div className="lg:col-span-2 space-y-8">
            {/* Attendance Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Attendance Overview</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Your attendance record</p>
                </div>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border-none rounded-xl px-4 py-2 font-bold text-sm text-indigo-600 dark:text-indigo-400 focus:ring-0 cursor-pointer outline-none transition-colors w-full sm:w-auto"
                >
                  {subjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Summary Stats Input */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{filteredTotal}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                  <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500 uppercase tracking-widest mb-1">Present</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{filteredPresent}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-800">
                  <p className="text-[10px] font-bold text-rose-600/70 dark:text-rose-500 uppercase tracking-widest mb-1">Absent</p>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-500">{filteredTotal - filteredPresent}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-500 uppercase tracking-widest mb-1">Rate</p>
                  <p className={`text-2xl font-black ${filteredPercentage >= 75 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'}`}>{filteredPercentage}%</p>
                </div>
              </div>

              {/* Scrollable List */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Recent Logs</h3>
                <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                  {filteredAttendance.length > 0 ? filteredAttendance.map(a => (
                    <div key={a._id} className={`p-4 rounded-2xl border transition-colors flex items-center justify-between group ${a.status === 'present' ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-rose-200 dark:hover:border-rose-800'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${a.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {new Date(a.date).getDate()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{new Date(a.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-sm uppercase ${a.status === 'present' ? 'text-gray-800 dark:text-gray-200' : 'text-red-500'}`}>{a.status}</span>
                            {a.subjectId?.name && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold border border-gray-200 dark:border-gray-600">{a.subjectId.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${a.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                      No records found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Marks Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Academic Performance</h2>
                <div className="flex items-center space-x-2">
                  <FaChartLine className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Grade Report</span>
                </div>
              </div>

              <div className="space-y-4">
                {marks.length > 0 ? marks.map(m => (
                  <div key={m._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FaBook className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{m.subjectId?.name || 'Subject'}</h3>
                        <p className="text-sm text-gray-600">{m.examId?.name || 'Exam'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{m.marks}/100</div>
                      <div className="text-xs text-gray-500">
                        {m.marks >= 90 ? 'Excellent' : m.marks >= 80 ? 'Good' : m.marks >= 70 ? 'Average' : 'Needs Improvement'}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <FaBook className="text-gray-400 text-4xl mx-auto mb-4" />
                    <p className="text-gray-500">No marks available yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Fees, Notices, Materials */}
          <div className="space-y-8">
            {/* Fees Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Fee Details</h2>
                <FaMoneyBillWave className="text-green-600 text-xl" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Fees</span>
                  <span className="font-bold text-gray-900">₹{fees.totalFees || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-600">Paid</span>
                  <span className="font-bold text-green-600">₹{fees.paidFees || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-bold text-red-600">₹{fees.pendingFees || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-gray-600">Due Date</span>
                  <span className="font-bold text-blue-600">
                    {fees.dueDate ? new Date(fees.dueDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {fees.payments && fees.payments.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Recent Payments</h3>
                  <div className="space-y-2">
                    {fees.payments.slice(0, 3).map((payment, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{new Date(payment.date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-green-600">₹{payment.amount}</span>
                          <button onClick={() => handleDownloadReceipt(payment)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <FaDownload /> Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notices */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Announcements</h2>
                <FaBullhorn className="text-orange-600 text-xl" />
              </div>

              <div className="space-y-4">
                {[...notices].reverse().slice(0, 2).map(notice => (
                  <div
                    key={notice._id}
                    onClick={() => setSelectedNotice(notice)}
                    className="p-4 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">{notice.title}</h3>
                      {new Date(notice.createdAt) > new Date(Date.now() - 604800000) && <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold uppercase rounded-full animate-pulse">Live</span>}
                    </div>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">{notice.content || notice.description}</p>
                    <div className="flex items-center text-xs text-gray-500 font-medium uppercase tracking-wide">
                      <FaClock className="mr-1" />
                      {new Date(notice.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                )) || (
                    <div className="text-center py-8">
                      <FaBullhorn className="text-gray-400 text-4xl mx-auto mb-4" />
                      <p className="text-gray-500">No announcements</p>
                    </div>
                  )}
              </div>
            </div>

            {/* Study Materials */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Study Materials</h2>
                <FaDownload className="text-indigo-600 text-xl" />
              </div>

              <div className="space-y-3">
                {materials.slice(0, 3).map(material => (
                  <div key={material._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{material.title}</h3>
                      <p className="text-sm text-gray-600 truncate">{material.description}</p>
                    </div>
                    <a
                      href={`https://oasispatna.onrender.com/${material.fileUrl}`}
                      download
                      className="ml-3 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <FaDownload className="text-sm" />
                    </a>
                  </div>
                )) || (
                    <div className="text-center py-8">
                      <FaDownload className="text-gray-400 text-4xl mx-auto mb-4" />
                      <p className="text-gray-500">No materials available</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Class Selection Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300 relative">
            <button
              onClick={() => setShowClassModal(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <FaTimes className="text-xl" />
            </button>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                <FaGraduationCap />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Select Your Academic Level</h2>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Choose your grade to customize your dashboard</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {availableClasses.length > 0 ? availableClasses.map(c => (
                <button
                  key={c._id}
                  onClick={() => handleClassSelection(c._id)}
                  className="group flex items-center justify-between p-6 bg-gray-50 hover:bg-blue-600 rounded-3xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl group"
                >
                  <div className="text-left">
                    <p className="text-lg font-black text-gray-900 group-hover:text-white transition-colors">{c.name}</p>
                    <p className="text-xs font-bold text-gray-400 group-hover:text-blue-100 transition-colors capitalize">Standard Track</p>
                  </div>
                  <FaChevronRight className="text-gray-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              )) : (
                <div className="text-center p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 font-bold">No academic levels found.</p>
                  <p className="text-[10px] text-gray-400 mt-2 uppercase">Please ask admin to add classes (11th, 12th, etc.)</p>
                </div>
              )}
            </div>

            <p className="mt-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
              If your class isn't listed, please contact<br />
              the administration office.
            </p>
          </div>
        </div>
      )}
      {/* Batch Selection Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300 relative">
            <button
              onClick={() => setShowBatchModal(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <FaTimes className="text-xl" />
            </button>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                <FaClock />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Select Your Batch</h2>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Choose your preferred timing</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {availableBatches.length > 0 ? availableBatches.map(b => (
                <button
                  key={b._id}
                  onClick={() => handleBatchSelection(b._id)}
                  className="group flex items-center justify-between p-6 bg-gray-50 hover:bg-orange-600 rounded-3xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl group"
                >
                  <div className="text-left">
                    <p className="text-lg font-black text-gray-900 group-hover:text-white transition-colors">{b.name}</p>
                    <p className="text-xs font-bold text-gray-400 group-hover:text-orange-100 transition-colors uppercase">Timing Schedule</p>
                  </div>
                  <FaChevronRight className="text-gray-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              )) : (
                <div className="text-center p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 font-bold">No batches found.</p>
                  <p className="text-[10px] text-gray-400 mt-2 uppercase">Please ask admin to add batches</p>
                </div>
              )}
            </div>
            <p className="mt-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Select your shift to see your schedule</p>
          </div>
        </div>
      )}
      {/* Notification Drawer */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setShowNotifications(false)}
          ></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[70] transform transition-transform duration-300 overflow-y-auto border-l border-slate-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div>
                <h2 className="text-lg font-black text-gray-800 tracking-tight">Notifications</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Alerts & Updates</p>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Section 1: Live Notices */}
              <div className="mb-6">
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 px-2">Official Announcements</h3>
                {notices.length > 0 ? (
                  <div className="space-y-3">
                    {notices.slice(0, 5).map(notice => (
                      <div
                        key={notice._id}
                        onClick={() => { setSelectedNotice(notice); setShowNotifications(false); }}
                        className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 cursor-pointer hover:shadow-md transition-all active:scale-95"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs shrink-0 shadow-sm"><FaBullhorn /></div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1">{notice.title}</h4>
                            <p className="text-xs text-blue-700/80 line-clamp-2 leading-relaxed">{notice.content || notice.description}</p>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mt-2">{new Date(notice.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-xs text-gray-400 py-4 italic">No active announcements</p>
                )}
              </div>

              {/* Section 2: Personal Notifications */}
              <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Personal Alerts</h3>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notif, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border transition-all ${notif.read ? 'bg-white border-gray-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${notif.read ? 'bg-gray-100 text-gray-500' : 'bg-red-500 text-white shadow-sm'}`}>
                            <FaBell />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1">{notif.title || 'Notification'}</h4>
                            <p className="text-xs text-gray-600 leading-relaxed">{notif.message || notif.content || 'New update received'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-2">{(notif.createdAt || notif.date) ? new Date(notif.createdAt || notif.date).toLocaleDateString() : 'Just Now'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 opacity-50">
                    <FaBell className="text-4xl text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-400 uppercase">No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300"
          >
            <div className="p-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <h2 className="text-2xl font-black tracking-tight relative z-10 mb-2">{selectedNotice.title}</h2>
              <div className="flex items-center gap-3 relative z-10">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20">Official Notice</span>
                <span className="text-orange-100 text-xs font-medium">{new Date(selectedNotice.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                {selectedNotice.content || selectedNotice.description}
              </p>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;

