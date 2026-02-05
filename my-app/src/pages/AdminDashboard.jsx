import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { AuthContext } from '../contexts/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import {
  FaUserGraduate, FaChalkboardTeacher, FaUsers, FaCalendarCheck,
  FaMoneyBillWave, FaBullhorn, FaTasks, FaHistory, FaSearch,
  FaPlus, FaUserPlus, FaEnvelope, FaFilter, FaArrowUp, FaArrowDown,
  FaCheckCircle, FaExclamationTriangle, FaChartLine, FaRegClock,
  FaCogs, FaSignOutAlt, FaChevronRight, FaFileInvoiceDollar, FaTimesCircle, FaLaptopCode, FaCalendarAlt, FaChartPie, FaTrophy, FaFileAlt, FaPrint
} from 'react-icons/fa';
import oasisLogo from '../assets/oasis_logo.png';
import oasisFullLogo from '../assets/oasis_full_logo.png';
import receiptBanner from '../assets/receipt_banner.png';
import config from '../config';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const AdminDashboard = () => {
  const { user, token, updateUser, loading: authLoading } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedResultClass, setSelectedResultClass] = useState('');
  const [selectedResultExam, setSelectedResultExam] = useState('');
  const [availableExams, setAvailableExams] = useState([]);
  const [examSummary, setExamSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [viewingReportCard, setViewingReportCard] = useState(null);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', type: 'monthly', date: new Date().toISOString().split('T')[0], subjects: [] });
  const [stats, setStats] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState({ attendance: [], marks: [] });
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', phone: '', subjects: '', batches: '', classes: '', password: '' });
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ subjects: '', batches: '', classes: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewingAttendanceTeacher, setViewingAttendanceTeacher] = useState(null);

  const [teacherAttendanceLogs, setTeacherAttendanceLogs] = useState([]);
  const [fees, setFees] = useState([]);
  const [feeForm, setFeeForm] = useState({ studentId: '', amount: '', type: 'Tuition', remarks: '' });
  const [selectedFeeStudent, setSelectedFeeStudent] = useState(null); // Selected student for fee details
  const [feeSearchTerm, setFeeSearchTerm] = useState('');
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [newTotalFee, setNewTotalFee] = useState('');

  // Academics / Test State
  const [tests, setTests] = useState([]);
  const [selectedTestResults, setSelectedTestResults] = useState(null);
  const [showTestResultsModal, setShowTestResultsModal] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // Schedule State
  const [liveClasses, setLiveClasses] = useState([]);

  // Insights State
  const [insights, setInsights] = useState(null);

  // Linking State

  // Linking State
  const [parentList, setParentList] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [linkParentId, setLinkParentId] = useState('');
  const [linkStudentId, setLinkStudentId] = useState('');

  // UI & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', content: '', targetRoles: ['student', 'parent'] });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    // If auth is loading, do nothing yet
    if (authLoading) return;

    console.log('AdminDashboard useEffect', { token: !!token, user });
    if (!token || user?.role !== 'admin') {
      setLoading(false);
      // We handle the UI return for access denied separately below
      return;
    }

    fetchUsers();
    fetchProfile();
    fetchAllStudents();
    fetchMetadata();

    // Socket implementation for real-time notifications
    const socket = io(config.SOCKET_URL);
    socket.on('connect', () => console.log('✅ Admin Connected to Socket Server'));

    // Listen for new leads
    socket.on('new-lead', (newLead) => {
      console.log('📣 New demo request received:', newLead);
      setLeads(prev => [newLead, ...prev]);

      // Play notification sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
      } catch (err) {
        console.log('Audio play failed:', err);
      }

      // Auto-switch notification or toast could be added here
      alert(`New Demo Request from: ${newLead.name}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user, authLoading]);

  // Fetch exams when selected class changes for results tab
  useEffect(() => {
    if (activeTab === 'results' && selectedResultClass) {
      fetchExamsForClass(selectedResultClass);
    }
  }, [selectedResultClass, activeTab]);

  // Fetch exam summary when selected exam changes for results tab
  useEffect(() => {
    if (activeTab === 'results' && selectedResultExam) {
      fetchExamSummary(selectedResultExam);
    }
  }, [selectedResultExam, activeTab]);

  // Fetch fees when tab changes to 'fees'
  useEffect(() => {
    if (activeTab === 'fees') {
      fetchFees();
    }
    if (activeTab === 'academics') {
      fetchTests();
    }
    if (activeTab === 'schedule') {
      fetchLiveClasses();
    }
    if (activeTab === 'insights') {
      fetchInsights();
    }
    if (activeTab === 'leads') {
      fetchLeads();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProfile(res.data);
      setEditForm({ name: res.data.name, phone: res.data.phone, email: res.data.email, address: res.data.address });
    } catch (err) {
      console.error('Error fetching profile:', err);
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

      const res = await axios.put(`${config.API_URL}/auth/me`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.data.user) {
        updateUser({
          profilePhoto: res.data.user.profilePhoto,
          name: res.data.user.name
        });
      }

      setPhotoFile(null);
      setPhotoPreview(null);
      fetchProfile();
      alert('Profile photo updated successfully!');
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEdit = () => {
    setEditMode(!editMode);
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('phone', editForm.phone);
      formData.append('email', editForm.email);
      formData.append('address', editForm.address);
      if (photoFile) formData.append('profilePhoto', photoFile);

      const res = await axios.put(`${config.API_URL}/auth/me`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      if (res.data.user) {
        updateUser({
          profilePhoto: res.data.user.profilePhoto,
          name: res.data.user.name
        });
      }
      setEditMode(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchProfile();
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile: ' + (err.response?.data?.message || 'Server error'));
    }
  };

  const fetchUsers = async () => {
    console.log('Fetching users...');
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Users fetched:', res.data);
      setUsers(res.data);
      const studentUsers = res.data.filter(u => u.role === 'student');
      setStudents(studentUsers);
      const parentUsers = res.data.filter(u => u.role === 'parent');
      console.log('Parent Users Debug:', parentUsers);
      setParentList(parentUsers);
      fetchStats(res.data);
      fetchAllStudents(); // Fetch students with full populated data
      fetchTeacherAttendanceCount(); // Fetch teacher attendance
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/users/students/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAllStudents(res.data);
    } catch (err) {
      console.error('Error fetching all students:', err);
    }
  };

  const fetchTeacherAttendanceCount = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/attendance/teacher/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Filter for today's attendance
      const today = new Date().toISOString().split('T')[0];
      const presentCount = res.data.filter(a => a.date.split('T')[0] === today && a.status === 'present').length;

      setStats(prev => ({ ...prev, presentTeachers: presentCount }));
    } catch (err) {
      console.error('Error fetching teacher attendance stats:', err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [classesRes, subjectsRes, batchesRes] = await Promise.all([
        axios.get(`${config.API_URL}/users/classes`, { headers }),
        axios.get(`${config.API_URL}/users/subjects`, { headers }),
        axios.get(`${config.API_URL}/users/batches`, { headers })
      ]);
      setAvailableClasses(classesRes.data);
      setAvailableSubjects(subjectsRes.data);
      setAvailableBatches(batchesRes.data);
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchStats = (allUsers) => {
    const totalStudents = allUsers.filter(u => u.role === 'student').length;
    const totalTeachers = allUsers.filter(u => u.role === 'teacher').length;
    const totalParents = allUsers.filter(u => u.role === 'parent').length;

    // Fetch real fee stats
    const tkn = sessionStorage.getItem('token');
    axios.get(`${config.API_URL}/fees/stats`, { headers: { 'Authorization': `Bearer ${tkn}` } })
      .then(res => {
        setStats({
          totalStudents,
          totalTeachers,
          totalParents,
          presentToday: Math.floor(totalStudents * 0.8),
          absentToday: Math.floor(totalStudents * 0.2),
          totalFees: res.data.totalCollection
        });
      })
      .catch(err => {
        console.error("Fee stats error", err);
        setStats({ totalStudents, totalTeachers, totalParents, presentToday: Math.floor(totalStudents * 0.8), absentToday: Math.floor(totalStudents * 0.2), totalFees: 0 });
      });
  };

  const fetchFees = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/fees/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFees(res.data);
    } catch (err) {
      console.error('Error fetching fees:', err);
    }
  };

  const fetchTests = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/tests/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTests(res.data);
    } catch (err) {
      console.error('Error fetching tests:', err);
    }
  };

  const handleViewTestResults = async (test) => {
    setLoadingResults(true);
    setShowTestResultsModal(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/tests/${test._id}/results`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSelectedTestResults({ ...test, results: res.data });
    } catch (err) {
      console.error('Error fetching one test results:', err);
      alert('Could not fetch results for this test.');
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchLiveClasses = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/live-classes/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLiveClasses(res.data);
    } catch (err) {
      console.error('Error fetching live classes:', err);
    }
  };

  const fetchInsights = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/analytics/insights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setInsights(res.data);
    } catch (err) {
      console.error('Error fetching insights:', err);
      // Fallback for demo if API fails
      setInsights({
        toppers: [],
        atRisk: [],
        subjectPerformance: []
      });
    }
  };

  const fetchLeads = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/leads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLeads(res.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const fetchExamsForClass = async (classId) => {
    try {
      const res = await axios.get(`${config.API_URL}/exams/class/${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAvailableExams(res.data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  const fetchExamSummary = async (examId) => {
    if (!examId) return;
    setLoadingSummary(true);
    try {
      let endpoint;
      if (examId === 'total') {
        endpoint = `${config.API_URL}/marks/class-summary/${selectedResultClass}`;
      } else if (examId === 'total_monthly') {
        endpoint = `${config.API_URL}/marks/class-summary/${selectedResultClass}?type=monthly`;
      } else if (examId === 'total_unit') {
        endpoint = `${config.API_URL}/marks/class-summary/${selectedResultClass}?type=unit`;
      } else {
        endpoint = `${config.API_URL}/marks/exam-summary/${examId}`;
      }

      const res = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setExamSummary(res.data);
    } catch (err) {
      console.error('Error fetching exam summary:', err);
      alert('Failed to fetch exam summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${config.API_URL}/exams`, { ...examForm, classId: selectedResultClass }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Exam created successfully');
      setShowAddExamModal(false);
      fetchExamsForClass(selectedResultClass);
    } catch (err) {
      alert('Failed to create exam: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePublishResults = async (examId) => {
    if (!window.confirm('Are you sure you want to publish results? This will notify all students and parents.')) return;
    setIsPublishing(true);
    try {
      await axios.post(`${config.API_URL}/exams/${examId}/publish`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExamSummary(examId);
      alert('Results published and notifications sent!');
    } catch (err) {
      console.error('Error publishing results:', err);
      alert('Failed to publish results');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishResults = async (examId) => {
    if (!window.confirm('Are you sure you want to unpublish results? Visibility will be removed from student portals.')) return;
    try {
      await axios.post(`${config.API_URL}/exams/${examId}/unpublish`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExamSummary(examId);
      alert('Results unpublished');
    } catch (err) {
      console.error('Error unpublishing results:', err);
      alert('Failed to unpublish results');
    }
  };

  const handlePublishOverall = async (classId) => {
    if (!window.confirm('Are you sure you want to publish the OVERALL CUMULATIVE results? This will make the final transcripts visible to students and parents.')) return;
    setIsPublishing(true);
    try {
      await axios.post(`${config.API_URL}/marks/publish-overall/${classId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExamSummary('total');
      alert('Overall results published!');
    } catch (err) {
      console.error('Error publishing overall results:', err);
      alert('Failed to publish overall results');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishOverall = async (classId) => {
    if (!window.confirm('Are you sure you want to unpublish overall results? Final transcripts will be hidden.')) return;
    try {
      await axios.post(`${config.API_URL}/marks/unpublish-overall/${classId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExamSummary('total');
      alert('Overall results unpublished');
    } catch (err) {
      console.error('Error unpublishing overall results:', err);
      alert('Failed to unpublish overall results');
    }
  };

  const handleAddFee = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(`${config.API_URL}/fees/pay`, feeForm, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Payment recorded successfully!');
      setFeeForm({ studentId: '', amount: '', type: 'Tuition', remarks: '' });
      fetchFees();
      // Refresh users/students to update stats if necessary (though fee stats are separate)
      // Ideally we should also refresh the student list to get updated Paid amounts if we tracked that there, but we calculate it live.
    } catch (err) {
      console.error("Payment Error:", err);
      alert('Failed to record payment: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateTotalFee = async () => {
    try {
      const token = sessionStorage.getItem('token');
      // Safely get the user ID string from the potentially populated userId object
      const targetUserId = selectedFeeStudent.userId?._id || selectedFeeStudent.userId;

      await axios.put(`${config.API_URL}/users/students/${targetUserId}/fee`,
        { totalFee: newTotalFee },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      alert('Total Fee updated!');
      setIsEditingFee(false);
      fetchAllStudents(); // Refresh student data to show new fee
      // We also need to update selectedFeeStudent locally to reflect change immediately
      setSelectedFeeStudent(prev => ({ ...prev, totalFee: newTotalFee }));
    } catch (err) {
      console.error("Update Fee Error:", err);
      alert('Failed to update fee: ' + (err.response?.data?.message || err.message));
    }
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
                    <div className="row"><span>Student Name:</span> <span>${selectedFeeStudent?.name || 'Student'}</span></div>
                    <div className="row"><span>Father's Name:</span> <span>${selectedFeeStudent?.fatherName || 'N/A'}</span></div>
                    <hr/>
                    <div className="row"><span>Payment Type:</span> <span>${payment.type}</span></div>
                    <div className="row"><span>Amount Paid:</span> <span>₹${payment.amount}</span></div>
                    <div className="row"><span>Payment Mode:</span> <span>${payment.remarks || 'Admin Entry'}</span></div>
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

  const handleStudentClick = async (student) => {
    console.log('Clicked student:', student);
    setSelectedStudent(student);
    try {
      const token = sessionStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [attendanceRes, marksRes] = await Promise.all([
        axios.get(`${config.API_URL}/attendance/student/${student._id}`, { headers }),
        axios.get(`${config.API_URL}/marks/student/${student._id}`, { headers })
      ]);
      console.log('Attendance:', attendanceRes.data);
      console.log('Marks:', marksRes.data);
      setStudentDetails({ attendance: attendanceRes.data, marks: marksRes.data });
    } catch (err) {
      console.error('Error fetching student details:', err);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(`${config.API_URL}/users/teachers`, teacherForm, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Teacher added successfully');
      setTeacherForm({ name: '', email: '', phone: '', subjects: '', batches: '', classes: '', password: '' });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add teacher';
      alert(msg);
    }
  };

  const handleUpdateTeacherAssignments = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`${config.API_URL}/users/teachers/${assignForm.teacherId}`, assignForm, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Assignments updated successfully');
      setShowAssignModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update assignments');
    }
  };

  const openAssignModal = (teacher) => {
    setEditingTeacher(teacher);
    setAssignForm({
      subjects: teacher.subjects || '',
      batches: teacher.batches || '',
      classes: teacher.classes || '',
      teacherId: teacher.teacherId || teacher._id // Ensure we have the Teacher model ID
    });
    setShowAssignModal(true);
  };


  const handleViewTeacherAttendance = async (teacher) => {
    setViewingAttendanceTeacher(teacher);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/attendance/teacher/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Filter in frontend for now as backend returns all
      const logs = res.data.filter(log => log.teacherId?._id === teacher._id || log.teacherId === teacher._id);
      setTeacherAttendanceLogs(logs);
    } catch (err) {
      alert('Failed to fetch attendance logs');
    }
  };

  const handleLinkParent = async (e) => {
    e.preventDefault();
    if (!linkParentId || !linkStudentId) {
      alert('Please select both parent and student');
      return;
    }
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(`${config.API_URL}/users/link-parent`,
        { parentId: linkParentId, studentId: linkStudentId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      alert('Parent linked to student successfully');
      setLinkParentId('');
      setLinkStudentId('');
      fetchUsers(); // Refresh to show linked status
    } catch (err) {
      console.error('Error linking parent:', err);
      alert('Failed to link parent: ' + (err.response?.data?.message || 'Server error'));
    }
  };

  const handleNoticeSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!newNotice.title || !newNotice.content) {
      alert('Please fill in both title and message fields');
      return;
    }

    if (!newNotice.targetRoles || newNotice.targetRoles.length === 0) {
      alert('Please select at least one target audience');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        alert('Session expired. Please login again.');
        window.location.href = '/login';
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${config.API_URL}/notices`, newNotice, { headers });

      alert('Notice published successfully!');
      setShowNoticeModal(false);
      setNewNotice({ title: '', content: '', targetRoles: ['student', 'parent'] });

      // Optionally refresh to show new notice
      window.location.reload();
    } catch (err) {
      console.error('Notice publish error:', err);

      // Check if it's an authentication error
      if (err.response?.status === 401) {
        alert('Your session has expired. Please login again.');
        sessionStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      const errorMsg = err.response?.data?.message || err.message || 'Failed to publish notice';
      alert(`Error: ${errorMsg}`);
    }
  };

  const filteredStudents = allStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.userId?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'all' || s.classId?.name === filterClass;
    return matchesSearch && matchesClass;
  });

  // Enhanced Chart Data
  const enrollmentTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'New Enrolments',
      data: [65, 59, 80, 81, 56, 95],
      fill: true,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4
    }]
  };

  const roleDistributionData = {
    labels: ['Students', 'Teachers', 'Parents'],
    datasets: [{
      data: [stats.totalStudents, stats.totalTeachers, stats.totalParents],
      backgroundColor: ['#6366f1', '#10b981', '#f59e0b'],
      borderWidth: 0,
    }]
  };

  const revenueData = {
    labels: ['W1', 'W2', 'W3', 'W4'],
    datasets: [{
      label: 'Fee Collection',
      data: [120000, 190000, 150000, 250000],
      backgroundColor: '#6366f1',
      borderRadius: 12,
    }]
  };

  const attendanceChart = {
    labels: ['Present', 'Absent'],
    datasets: [{
      label: 'Today\'s Attendance',
      data: [stats.presentToday, stats.absentToday],
      backgroundColor: ['#10B981', '#EF4444'],
    }],
  };

  // 1. Check if Auth is still loading
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>;
  }

  // 2. Access Denied Check
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to access the Admin Dashboard.
            <br />
            Current Role: <span className="font-semibold capitalize">{user?.role || 'Guest'}</span>
          </p>
          <div className="flex justify-center space-x-4">
            <a href="/" className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Go Home</a>
            <button
              onClick={() => {
                sessionStorage.removeItem('token');
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Main Dashboard Render
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden relative">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Attendance History Modal */}
      {viewingAttendanceTeacher && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Attendance History</h2>
                <p className="font-bold text-gray-500 text-sm">Target: <span className="text-indigo-600">{viewingAttendanceTeacher.name}</span></p>
              </div>
              <button onClick={() => setViewingAttendanceTeacher(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm transition-colors">
                <FaTimesCircle className="text-2xl" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Session/Class</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {teacherAttendanceLogs.map(log => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-700">{new Date(log.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase">
                          {log.className || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString() : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${log.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {teacherAttendanceLogs.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-8 text-gray-400 font-bold">No attendance records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Pro Layout */}
      {/* Sidebar - Pro Layout */}
      <aside className={`w-72 bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white flex-shrink-0 flex flex-col shadow-2xl z-30 fixed h-full transition-all duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 opacity-100 visible' : '-translate-x-full opacity-0 invisible'} lg:static lg:opacity-100 lg:visible`}>
        <div className="p-6 flex items-center justify-between border-b border-indigo-800/50">
          {/* Replaced Logo Section */}
          <div className="w-full flex justify-center">
            <img src={oasisFullLogo} alt="Oasis Full Logo" className="h-12 md:h-16 object-contain brightness-110 drop-shadow-lg" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-indigo-300 hover:text-white absolute right-4 top-6">
            <FaTimesCircle className="text-2xl" />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {[
            { id: 'overview', icon: FaChartLine, label: 'Overview' },
            { id: 'students', icon: FaUserGraduate, label: 'Students' },
            { id: 'teachers', icon: FaChalkboardTeacher, label: 'Teachers' },
            { id: 'academics', icon: FaLaptopCode, label: 'Academics & Tests' },
            { id: 'schedule', icon: FaCalendarAlt, label: 'Schedule & Timings' },
            { id: 'insights', icon: FaChartPie, label: 'AI Insights' },
            { id: 'fees', icon: FaMoneyBillWave, label: 'Fees Management' },
            { id: 'leads', icon: FaEnvelope, label: 'Demo Requests' },
            { id: 'communication', icon: FaBullhorn, label: 'Notice Center' },
            { id: 'results', icon: FaFileAlt, label: 'Result Center' },
            { id: 'profile', icon: FaCogs, label: 'Profile Settings' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-semibold text-sm ${activeTab === item.id
                ? 'bg-indigo-500 text-white shadow-indigo-900/50 shadow-lg translate-x-1'
                : 'hover:bg-indigo-800/50 hover:text-white'
                }`}
            >
              <item.icon className={activeTab === item.id ? 'text-white' : 'text-indigo-400'} />
              {item.label}
              {activeTab === item.id && <FaChevronRight className="ml-auto text-[10px]" />}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-indigo-800/40 p-5 rounded-3xl border border-indigo-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-400/20 flex items-center justify-center text-indigo-300">
                <FaRegClock />
              </div>
              <div className="text-[11px] font-bold text-indigo-200">Session Active</div>
            </div>
            <button
              onClick={() => { sessionStorage.removeItem('token'); window.location.href = '/login'; }}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/40"
            >
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header bar */}
        <header className="h-16 md:h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-10 shadow-sm z-10 w-full transition-all">
          <div className="flex items-center gap-2 md:gap-6 flex-1 max-w-2xl">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-gray-50 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
            >
              <FaTasks className="text-xl" />
            </button>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center shadow-md overflow-hidden p-1 lg:hidden">
                <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-black tracking-tight leading-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
                    Admin Portal
                  </span>
                </h1>
                <p className="text-[10px] md:text-sm text-gray-500 font-bold truncate hidden sm:block">Control Center</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 w-full ml-4">
              <FaSearch className="text-gray-300" />
              <input
                type="text"
                placeholder="Search Universe..."
                className="w-full bg-transparent focus:outline-none text-gray-600 font-medium placeholder-gray-300 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-8">
            <div className="flex items-center gap-2 md:gap-4 md:px-5 md:py-2.5 md:bg-gray-50 md:rounded-2xl md:border md:border-dotted md:border-gray-200 group cursor-pointer transition-all">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs md:text-sm overflow-hidden border border-indigo-200 shadow-inner group-hover:scale-105 transition-transform">
                {user?.profilePhoto || profile?.profilePhoto ? (
                  <img src={`${config.API_URL.replace('/api', '')}${user?.profilePhoto || profile?.profilePhoto}`} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0) || 'A'
                )}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900 leading-none mb-1">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-10 scroll-smooth">
          {activeTab === 'overview' && (
            <>
              {/* Vibrant Welcome Banner */}
              <div className="relative overflow-hidden rounded-3xl md:rounded-[2.5rem] bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 p-6 md:p-10 shadow-2xl shadow-indigo-200/50 mb-6 md:mb-10 text-white">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 blur-3xl rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-pink-500/20 blur-3xl rounded-full pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Admin Console</span>
                      <span className="text-indigo-200 text-xs font-bold">{new Date().toDateString()}</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-[900] tracking-tight mb-2 leading-tight">
                      Namaste, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-indigo-100">{profile.name?.split(' ')[0] || 'Admin'}</span> 👋
                    </h1>
                    <p className="text-indigo-100 font-medium max-w-lg text-xs md:text-sm leading-relaxed opacity-90">
                      You have <span className="font-black text-white underline decoration-pink-400 decoration-2 underline-offset-4">{stats.totalStudents || 0} active students</span> and <span className="font-black text-white">{stats.presentToday || 0}</span> present today.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 md:gap-4 w-full md:w-auto">
                    <button onClick={() => setActiveTab('communication')} className="flex-1 md:flex-none bg-white text-indigo-600 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-xs shadow-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group">
                      <FaBullhorn className="group-hover:rotate-12 transition-transform" /> POST UPDATE
                    </button>
                    <button onClick={() => alert('System report downloading...')} className="flex-1 md:flex-none bg-indigo-800/40 text-white border border-white/20 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-xs hover:bg-indigo-800/60 transition-all backdrop-blur-md">
                      REPORTS
                    </button>
                  </div>
                </div>
              </div>
              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                {[
                  { label: 'Add Student', icon: FaUserPlus, color: 'bg-emerald-500', bg: 'hover:bg-emerald-50', border: 'hover:border-emerald-200', action: () => setActiveTab('students') },
                  { label: 'New Teacher', icon: FaPlus, color: 'bg-indigo-600', bg: 'hover:bg-indigo-50', border: 'hover:border-indigo-200', action: () => setActiveTab('teachers') },
                  { label: 'Broadcast', icon: FaBullhorn, color: 'bg-orange-500', bg: 'hover:bg-orange-50', border: 'hover:border-orange-200', action: () => setActiveTab('communication') },
                  { label: 'Exam Results', icon: FaFileAlt, color: 'bg-purple-600', bg: 'hover:bg-purple-50', border: 'hover:border-purple-200', action: () => setActiveTab('results') },
                ].map((act, i) => (
                  <button
                    key={i}
                    onClick={act.action}
                    className={`group flex flex-col items-center justify-center p-4 md:p-8 bg-white rounded-3xl md:rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${act.bg} ${act.border}`}
                  >
                    <div className={`${act.color} w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-white text-base md:text-2xl mb-2 md:mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <act.icon />
                    </div>
                    <span className="font-bold text-gray-700 text-[10px] md:text-sm group-hover:text-gray-900">{act.label}</span>
                  </button>
                ))}
              </div>

              {/* Stats & Clickable Cards */}
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {[
                  { label: 'Students', value: stats.totalStudents, trend: '+12%', icon: FaUserGraduate, color: 'indigo', gradient: 'from-indigo-500 to-blue-500', action: () => setActiveTab('students') },
                  { label: 'Teachers', value: `${stats.presentTeachers || 0}/${stats.totalTeachers || 0}`, trend: 'Live', icon: FaChalkboardTeacher, color: 'emerald', gradient: 'from-emerald-500 to-teal-500', action: () => setActiveTab('teachers') },
                  { label: 'Present', value: `${stats.presentToday}`, trend: 'Good', icon: FaCalendarCheck, color: 'orange', gradient: 'from-orange-500 to-amber-500', action: null },
                  { label: 'Collection', value: `₹${((stats.totalFees || 0) / 1000).toFixed(1)}k`, trend: 'Live', icon: FaMoneyBillWave, color: 'rose', gradient: 'from-rose-500 to-pink-500', action: () => setActiveTab('fees') },
                ].map((stat, i) => (
                  <div
                    key={i}
                    onClick={stat.action}
                    className={`p-4 md:p-8 bg-white dark:bg-gray-800 rounded-3xl md:rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] transition-all duration-300 group relative overflow-hidden ${stat.action ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : ''}`}
                  >
                    <div className={`absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700 ease-out`}></div>

                    <div className="flex items-center justify-between mb-4 md:mb-8 relative">
                      <div className={`w-10 h-10 md:w-14 md:h-14 bg-${stat.color}-50 rounded-xl md:rounded-2xl flex items-center justify-center text-${stat.color}-600 text-base md:text-xl shadow-inner`}>
                        <stat.icon />
                      </div>
                      <span className={`hidden sm:block text-${stat.trend.startsWith('+') ? 'emerald' : stat.trend === 'Good' ? 'indigo' : 'rose'}-600 text-[10px] font-black bg-${stat.trend.startsWith('+') ? 'emerald' : stat.trend === 'Good' ? 'indigo' : 'rose'}-50 px-3 py-1.5 rounded-full border border-${stat.trend.startsWith('+') ? 'emerald' : stat.trend === 'Good' ? 'indigo' : 'rose'}-100`}>
                        {stat.trend}
                      </span>
                    </div>
                    <h3 className="text-xl md:text-4xl font-[900] text-slate-800 dark:text-white mb-1 md:mb-2 relative tracking-tight">{stat.value}</h3>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest relative leading-none">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Visual Performance Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm transition-all hover:shadow-xl group">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 leading-tight">Enrollment Matrix</h2>
                      <p className="text-gray-400 font-bold text-sm">Growth analysis across roles</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                        <FaArrowUp /> 12% Growth
                      </div>
                    </div>
                  </div>
                  <div className="h-[350px]">
                    <Line
                      data={enrollmentTrendData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false } },
                          x: { grid: { display: false } }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm transition-all hover:shadow-xl flex flex-col items-center justify-center text-center">
                  <h2 className="text-xl font-black text-gray-900 mb-8 self-start">User Demographics</h2>
                  <div className="w-64 h-64 mb-8">
                    <Doughnut
                      data={roleDistributionData}
                      options={{ cutout: '75%', plugins: { legend: { display: false } } }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 w-full">
                    <div>
                      <p className="text-2xl font-black text-indigo-600">{stats.totalStudents}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Students</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-emerald-500">{stats.totalTeachers}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faculty</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-orange-500">{stats.totalParents}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Guardians</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fees & Tasks Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Fee Analytics */}
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm transition-all hover:shadow-xl">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                      <FaMoneyBillWave className="text-emerald-500" /> Revenue Stream
                    </h2>
                    <button className="text-xs font-black text-indigo-600 hover:underline">Download Ledger</button>
                  </div>
                  <div className="h-64 mb-8">
                    <Bar
                      data={revenueData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { grid: { color: '#f1f5f9' }, border: { display: false } },
                          x: { grid: { display: false } }
                        }
                      }}
                    />
                  </div>
                  <div className="p-6 bg-indigo-50 rounded-3xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                      <p className="text-2xl font-black text-indigo-900">₹8,45,200</p>
                    </div>
                    <button className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs shadow-sm hover:scale-105 transition-all">RECOVER NOW</button>
                  </div>
                </div>

                {/* Task & Notification Center */}
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm flex flex-col">
                  <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                    <FaTasks className="text-rose-500" /> Administrative Backlog
                  </h2>
                  <div className="space-y-4 flex-1">
                    {[
                      { title: 'Finalize Q3 Marks Entry', due: '2h ago', status: 'CRITICAL', color: 'rose', icon: FaCheckCircle },
                      { title: 'Employee Payroll Approval', due: 'Tomorrow', status: 'PENDING', color: 'indigo', icon: FaRegClock },
                      { title: 'Infrastructure Upgrade Plan', due: 'Sunday', status: 'PLANNING', color: 'emerald', icon: FaCogs },
                    ].map((task, i) => (
                      <div key={i} className="group p-5 bg-gray-50 rounded-3xl hover:bg-white border border-transparent hover:border-indigo-100 transition-all cursor-pointer flex items-center gap-4">
                        <div className={`w-12 h-12 bg-${task.color}-50 rounded-2xl flex items-center justify-center text-${task.color}-500 text-lg group-hover:scale-110 transition-all`}>
                          <task.icon />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[9px] font-black uppercase text-${task.color}-500 tracking-widest`}>{task.status}</span>
                            <span className="text-[10px] text-gray-400 font-bold">{task.due}</span>
                          </div>
                          <h4 className="font-bold text-gray-800 text-sm group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                        </div>
                        <FaChevronRight className="text-gray-200 group-hover:text-indigo-300 transition-all" />
                      </div>
                    ))}
                  </div>
                  <button className="mt-8 w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-2xl font-black text-sm transition-all border border-dashed border-gray-200">System Logs & Archivals</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'students' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900">Student Directory</h2>
                  <p className="text-gray-400 font-bold text-sm">Manage and visualize student footprints</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      type="text"
                      placeholder="Search student..."
                      className="w-full pl-12 pr-6 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-semibold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="w-full sm:w-auto px-6 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm font-bold text-sm text-gray-600 focus:outline-none"
                    onChange={(e) => setFilterClass(e.target.value)}
                  >
                    <option value="all">Everywhere</option>
                    <option value="Class 10">Class 10</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-4 md:px-8 py-6">Entity Identity</th>
                        <th className="px-4 md:px-8 py-6">Academic Level</th>
                        <th className="px-4 md:px-8 py-6">Linked Guardian</th>
                        <th className="px-4 md:px-8 py-6">Engagement</th>
                        <th className="px-4 md:px-8 py-6 text-right">Interactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredStudents.map(student => (
                        <tr
                          key={student._id}
                          className="group hover:bg-indigo-50/30 transition-all cursor-pointer"
                          onClick={() => handleStudentClick(student)}
                        >
                          <td className="px-4 md:px-8 py-6">
                            <div className="flex items-center gap-3 md:gap-4">
                              <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm overflow-hidden p-0 group-hover:scale-110 transition-all">
                                {student.userId?.profilePhoto ? (
                                  <img src={`${config.API_URL.replace('/api', '')}${student.userId.profilePhoto}`} alt="Profile" className="w-full h-full object-cover transition-all" />
                                ) : (
                                  <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain opacity-40 group-hover:opacity-100 transition-all p-2" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors truncate">{student.name}</p>
                                <p className="text-[10px] md:text-xs text-gray-400 font-medium truncate">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-8 py-6">
                            <span className="text-[10px] md:text-xs font-bold text-gray-600 bg-gray-50 px-3 md:px-4 py-1.5 rounded-full border border-gray-100">Grade {student.classId?.name || 'NA'}</span>
                          </td>
                          <td className="px-4 md:px-8 py-6">
                            {student.parentId ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
                                <div className="min-w-0">
                                  <p className="text-[10px] md:text-xs font-bold text-gray-900 leading-tight truncate">{student.parentId.name}</p>
                                  <p className="text-[9px] md:text-[10px] text-gray-400 font-medium truncate">{student.parentId.email}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[9px] md:text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">Not Linked</span>
                            )}
                          </td>
                          <td className="px-4 md:px-8 py-6">
                            <div className="flex items-center gap-2 md:gap-4">
                              <div className="flex-1 min-w-[60px] md:w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '82%' }}></div>
                              </div>
                              <span className="text-[10px] font-black text-emerald-600">82%</span>
                            </div>
                          </td>
                          <td className="px-4 md:px-8 py-6 text-right">
                            <button className="p-2 md:p-3 hover:bg-white rounded-xl text-gray-400 hover:text-indigo-600 transition-all hover:shadow-md">
                              <FaChevronRight className="text-xs" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Student Details & Linking Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                {selectedStudent && (
                  <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl animate-in slide-in-from-left-5 duration-500">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-black text-gray-900 leading-tight">Academic Profile: {selectedStudent.name}</h2>
                      <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-rose-500 p-2"><FaPlus className="rotate-45" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="p-6 bg-indigo-50 rounded-3xl">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Attendance</p>
                        <p className="text-2xl font-black text-indigo-600">{studentDetails.attendance.length > 0 ? Math.round((studentDetails.attendance.filter(a => a.status === 'present').length / studentDetails.attendance.length) * 100) : 0}%</p>
                      </div>
                      <div className="p-6 bg-emerald-50 rounded-3xl">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Performance</p>
                        <p className="text-2xl font-black text-emerald-600">8.4 CGPA</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Recent Performance</h4>
                      {studentDetails.marks.slice(0, 3).map((m, i) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                          <span className="font-bold text-gray-700">{m.subjectId?.name}</span>
                          <span className="font-black text-indigo-600">{m.marks}%</span>
                        </div>
                      ))}
                      {studentDetails.marks.length === 0 && <p className="text-sm font-bold text-gray-400 text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-100">No marks recorded yet</p>}
                    </div>
                  </div>
                )}

                {/* Link Parent Form */}
                <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-xl">
                  <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                    <FaUsers className="text-indigo-500" /> Link Parent Entity
                  </h2>
                  <form onSubmit={handleLinkParent} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 block">Biological Parent</label>
                      <select
                        value={linkParentId}
                        onChange={(e) => setLinkParentId(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all appearance-none"
                      >
                        <option value="">-- Select Parent Member --</option>
                        {parentList.map(p => (
                          <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 block">Associate Student</label>
                      <select
                        value={linkStudentId}
                        onChange={(e) => setLinkStudentId(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all appearance-none"
                      >
                        <option value="">-- Select Student Entity --</option>
                        {allStudents.map(s => (
                          <option key={s._id} value={s._id}>{s.name} - Class {s.classId?.name}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-3">
                      ESTABLISH CONNECTION
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
              {/* Header & Search */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div>
                  <h2 className="text-3xl font-[900] text-gray-900 mb-2 flex items-center gap-3">
                    <span className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><FaMoneyBillWave /></span>
                    Fees Management
                  </h2>
                  <p className="text-gray-500 font-medium">Search for a student to manage fees & view history.</p>
                </div>
                <div className="relative w-full md:w-96">
                  <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Student by Name..."
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-200 transition-all"
                    value={feeSearchTerm}
                    onChange={e => {
                      setFeeSearchTerm(e.target.value);
                      setSelectedFeeStudent(null); // Reset selection on search
                    }}
                  />
                  {feeSearchTerm && !selectedFeeStudent && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-20 p-2">
                      {allStudents.filter(s => s.name.toLowerCase().includes(feeSearchTerm.toLowerCase())).map(s => (
                        <div
                          key={s._id}
                          onClick={() => {
                            setSelectedFeeStudent(s);
                            setFeeForm(prev => ({ ...prev, studentId: s._id }));
                            setFeeSearchTerm(s.name);
                          }}
                          className="p-3 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <p className="font-bold text-gray-800">{s.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.classId?.name || 'Class N/A'} • {s.fatherName ? `S/O ${s.fatherName}` : 'Father: N/A'}</p>
                          </div>
                          <FaChevronRight className="text-gray-300 group-hover:text-rose-500" />
                        </div>
                      ))}
                      {allStudents.filter(s => s.name.toLowerCase().includes(feeSearchTerm.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-gray-400 font-bold text-xs">No students found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedFeeStudent ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Student Payment Profile */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-black">
                            {selectedFeeStudent.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{selectedFeeStudent.name}</h3>
                            <p className="text-indigo-200 text-sm font-medium">{selectedFeeStudent.email || 'No Email'}</p>
                          </div>
                        </div>
                        <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                          <div className="flex justify-between items-center">
                            <span className="text-indigo-200 text-xs font-bold uppercase">Class</span>
                            <span className="font-bold">{selectedFeeStudent.classId?.name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-indigo-200 text-xs font-bold uppercase">Father's Name</span>
                            <span className="font-bold">{selectedFeeStudent.fatherName || 'Not Recorded'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-indigo-200 text-xs font-bold uppercase">Admission Date</span>
                            <span className="font-bold">{new Date().toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                      <h4 className="text-gray-900 font-black text-lg mb-6">Fee Status</h4>
                      <div className="space-y-6">
                        {/* Note: In a real app, 'totalFee' would come from backend. Currently defaulting 0 or fetching if available */}
                        {(() => {
                          const studentFees = fees.filter(f => (f.studentId?._id === selectedFeeStudent._id || f.studentId === selectedFeeStudent._id));
                          const totalPaid = studentFees.reduce((acc, curr) => (curr.status === 'Paid' ? acc + curr.amount : acc), 0);
                          const totalFee = selectedFeeStudent.totalFee || 50000; // Default or fetched
                          const due = totalFee - totalPaid;

                          return (
                            <>
                              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <span className="text-emerald-800 font-bold text-sm">Total Paid</span>
                                <span className="text-2xl font-[900] text-emerald-600">₹{totalPaid.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="text-gray-500 font-bold text-sm">Total Fee</span>
                                <div className="flex items-center gap-2">
                                  {isEditingFee ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        className="w-24 p-1 rounded-lg border border-gray-300 text-sm font-bold"
                                        value={newTotalFee}
                                        onChange={(e) => setNewTotalFee(e.target.value)}
                                      />
                                      <button onClick={handleUpdateTotalFee} className="p-1 text-emerald-600 bg-emerald-100 rounded hover:bg-emerald-200"><FaCheckCircle /></button>
                                      <button onClick={() => setIsEditingFee(false)} className="p-1 text-rose-600 bg-rose-100 rounded hover:bg-rose-200"><FaTimesCircle /></button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-col items-end">
                                        <span className={`text-xl font-bold ${totalFee === 0 ? 'text-rose-500 animate-pulse' : 'text-gray-700'}`}>
                                          ₹{totalFee.toLocaleString()}
                                        </span>
                                        {totalFee === 0 && (
                                          <span className="text-[8px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full mt-1 uppercase tracking-tighter">Needs Calibration</span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => {
                                          setNewTotalFee(totalFee);
                                          setIsEditingFee(true);
                                        }}
                                        className={`p-2 rounded-xl transition-all ${totalFee === 0 ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600'}`}
                                        title="Configure Total Course Fee"
                                      >
                                        <FaCogs className={totalFee === 0 ? 'animate-spin-slow' : ''} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div >
                              <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                <span className="text-rose-800 font-bold text-sm">Due Amount</span>
                                <span className="text-xl font-black text-rose-600">₹{due > 0 ? due.toLocaleString() : 0}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right: Payment & History */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Payment Form */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2"><FaPlus className="text-indigo-500" /> Collect New Payment</h3>
                      <form onSubmit={handleAddFee} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 block">Amount (₹)</label>
                          <input
                            type="number"
                            className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-200"
                            placeholder="Enter Amount"
                            value={feeForm.amount}
                            onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 block">Payment Type</label>
                          <select
                            className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-200"
                            value={feeForm.type}
                            onChange={e => setFeeForm({ ...feeForm, type: e.target.value })}
                          >
                            <option value="Tuition">Tuition Fee</option>
                            <option value="Exam">Exam Fee</option>
                            <option value="Registration">Registration Fee</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 block">Remarks / Receipt Note</label>
                          <input
                            type="text"
                            className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-200"
                            placeholder="e.g. Paid via UPI, Transaction ID..."
                            value={feeForm.remarks}
                            onChange={e => setFeeForm({ ...feeForm, remarks: e.target.value })}
                          />
                        </div>
                        <button type="submit" className="md:col-span-2 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2">
                          <FaCheckCircle /> CONFIRM & SEND RECEIPT
                        </button>
                      </form>
                    </div>

                    {/* Student Transaction History */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                      <h3 className="text-xl font-black text-gray-900 mb-6">Payment History</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Receipt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {fees.filter(f => f.studentId?._id === selectedFeeStudent._id || f.studentId === selectedFeeStudent._id).length > 0 ? (
                              fees.filter(f => f.studentId?._id === selectedFeeStudent._id || f.studentId === selectedFeeStudent._id).map(fee => (
                                <tr key={fee._id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-bold text-gray-600">{new Date(fee.date).toLocaleDateString()}</td>
                                  <td className="px-4 py-3 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg px-2 w-fit">{fee.type}</td>
                                  <td className="px-4 py-3 font-black text-gray-800">₹{fee.amount.toLocaleString()}</td>
                                  <td className="px-4 py-3">
                                    <button onClick={() => handleDownloadReceipt(fee)} className="text-xs font-bold text-rose-500 hover:underline">View Receipt</button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan="4" className="text-center py-8 text-gray-400 font-bold">No payment history found for this student.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // No Student Selected - Show Recent Global Transactions
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900">Recent Global Transactions</h3>
                    <button onClick={fetchFees} className="text-gray-400 hover:text-rose-500"><FaHistory /></button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {fees.length > 0 ? fees.slice(0, 10).map(fee => (
                          <tr key={fee._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-bold text-gray-600">{new Date(fee.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-900">{fee.studentId?.name || 'Unknown'}</p>
                              <p className="text-[10px] text-gray-400">{fee.studentId?.fatherName ? `F: ${fee.studentId.fatherName}` : ''}</p>
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-gray-500">{fee.type}</td>
                            <td className="px-4 py-3 font-black text-gray-800">₹{fee.amount}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase">PAID</span>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan="5" className="text-center py-10 text-gray-400 font-bold">No transactions found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-10 animate-in fade-in duration-500 pb-20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900">Faculty Management</h2>
                  <p className="text-gray-400 font-bold text-sm">Track and onboard teaching staff</p>
                </div>
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                  <FaPlus /> ONBOARD TEACHER
                </button>
              </div>

              <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-8">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                  <FaUserPlus className="text-emerald-500" /> New Faculty Entry
                </h3>
                <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                    <input type="text" placeholder="Dr. John Doe" value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
                    <input type="email" placeholder="john@school.com" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Contact Number</label>
                    <input type="tel" placeholder="+91 9876543210" value={teacherForm.phone} onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })} className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all" required />
                  </div>
                  {/* Assign Subjects Section */}
                  <div className="space-y-4 col-span-1 md:col-span-2 lg:col-span-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Assign Subjects</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {['Physics', 'Chemistry', 'Maths', 'Biology', 'English'].map(sub => {
                        const isSelected = teacherForm.subjects.split(',').map(s => s.trim()).includes(sub);
                        return (
                          <label key={sub} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-transparent hover:border-indigo-100'}`}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              checked={isSelected}
                              onChange={() => {
                                const current = teacherForm.subjects.split(',').map(s => s.trim()).filter(x => x);
                                const updated = isSelected ? current.filter(i => i !== sub) : [...current, sub];
                                setTeacherForm({ ...teacherForm, subjects: updated.join(', ') });
                              }}
                            />
                            <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>{sub}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assign Classes Section */}
                  <div className="space-y-4 col-span-1 md:col-span-2 lg:col-span-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Assign Classes</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['Class 9', 'Class 10'].map(cls => {
                        const isSelected = teacherForm.classes.split(',').map(s => s.trim()).includes(cls);
                        return (
                          <label key={cls} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-transparent hover:border-emerald-100'}`}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              checked={isSelected}
                              onChange={() => {
                                const current = teacherForm.classes.split(',').map(s => s.trim()).filter(x => x);
                                const updated = isSelected ? current.filter(i => i !== cls) : [...current, cls];
                                setTeacherForm({ ...teacherForm, classes: updated.join(', ') });
                              }}
                            />
                            <span className={`text-xs font-bold ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`}>{cls}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assigned Batches Section */}
                  <div className="space-y-4 col-span-1 md:col-span-2 lg:col-span-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Assigned Batches</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['B1', 'B2'].map(batch => {
                        const isSelected = teacherForm.batches.split(',').map(s => s.trim()).includes(batch);
                        return (
                          <label key={batch} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-transparent hover:border-orange-100'}`}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              checked={isSelected}
                              onChange={() => {
                                const current = teacherForm.batches.split(',').map(s => s.trim()).filter(x => x);
                                const updated = isSelected ? current.filter(i => i !== batch) : [...current, batch];
                                setTeacherForm({ ...teacherForm, batches: updated.join(', ') });
                              }}
                            />
                            <span className={`text-xs font-bold ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>{batch}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Access Password</label>
                    <input type="password" placeholder="Create strong password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all" />
                  </div>
                  <div className="flex items-end pt-2">
                    <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-100">REGISTER TEACHER</button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-sm overflow-x-auto p-2">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      <th className="px-6 md:px-8 py-6">Faculty Member</th>
                      <th className="px-6 md:px-8 py-6">Expertise</th>
                      <th className="px-6 md:px-8 py-6">Status</th>
                      <th className="px-6 md:px-8 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.filter(u => u.role === 'teacher').map(teacher => (
                      <tr key={teacher._id} className="group hover:bg-gray-50 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-bold text-xl shadow-sm overflow-hidden">
                              {teacher.profilePhoto ? (
                                <img src={`${config.API_URL.replace('/api', '')}${teacher.profilePhoto}`} className="w-full h-full object-cover" />
                              ) : (
                                (teacher.name || '?').charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{teacher.name}</p>
                              <p className="text-xs text-gray-400 font-medium break-all">{teacher.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-wrap gap-2">
                            {(teacher.subjects ? teacher.subjects.split(',') : []).map((sub, i) => (
                              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase">{sub}</span>
                            ))}
                            {(!teacher.subjects) && <span className="text-[10px] text-gray-300 italic">None</span>}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase border border-emerald-100">Active</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => handleViewTeacherAttendance(teacher)}
                              className="p-3 bg-gray-50 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all font-bold text-xs flex items-center gap-2 group/btn"
                              title="View Attendance History"
                            >
                              <FaHistory /> <span className="hidden group-hover/btn:inline">History</span>
                            </button>
                            <button
                              onClick={() => openAssignModal(teacher)}
                              className="p-3 bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                              title="Edit Assignments"
                            >
                              <FaCogs />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>


                </table>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">Executive Intelligence</h2>
                    <p className="text-gray-400 font-bold">Automated analysis of institutional performance</p>
                  </div>
                  <button onClick={fetchInsights} className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-2">
                    <FaRegClock /> Refresh Analytics
                  </button>
                </div>

                {insights ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Toppers Pod */}
                    <div className="bg-[#FFFBEB] rounded-[2.5rem] p-8 border border-yellow-100 flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-200/20 rounded-full -mr-20 -mt-20"></div>
                      <h3 className="text-lg font-black text-yellow-800 mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <FaTrophy className="text-xl" /> Top Performers
                      </h3>
                      <div className="space-y-4 flex-1">
                        {insights.toppers?.map((student, i) => (
                          <div key={student._id || i} className="bg-white/60 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-yellow-400 text-white font-black flex items-center justify-center text-xs shadow-md">#{i + 1}</div>
                              <div>
                                <p className="font-bold text-gray-800 text-sm leading-tight">{student.name}</p>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wide">{student.className || 'Class N/A'}</p>
                              </div>
                            </div>
                            <p className="font-black text-yellow-600">{student.avgTotal}%</p>
                          </div>
                        ))}
                        {(!insights.toppers || insights.toppers.length === 0) && <p className="text-center text-gray-400 text-xs font-bold uppercase py-4">Not enough data</p>}
                      </div>
                    </div>

                    {/* At Risk Pod */}
                    <div className="bg-[#FEF2F2] rounded-[2.5rem] p-8 border border-red-100 flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-red-200/20 rounded-full -mr-20 -mt-20"></div>
                      <h3 className="text-lg font-black text-red-800 mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <FaExclamationTriangle className="text-xl" /> Needs Attention
                      </h3>
                      <div className="space-y-4 flex-1">
                        {insights.atRisk?.map((student, i) => (
                          <div key={student._id || i} className="bg-white/60 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                              <div>
                                <p className="font-bold text-gray-800 text-sm leading-tight">{student.name}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{student.className || 'Class N/A'}</p>
                              </div>
                            </div>
                            <p className="font-black text-red-500 text-xs">{student.avgTotal}% Avg</p>
                          </div>
                        ))}
                        {(!insights.atRisk || insights.atRisk.length === 0) && <p className="text-center text-gray-400 text-xs font-bold uppercase py-4">All Clear!</p>}
                      </div>
                    </div>

                    {/* Subject Stats Pod */}
                    <div className="bg-[#ECFDF5] rounded-[2.5rem] p-8 border border-emerald-100 flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-200/20 rounded-full -mr-20 -mt-20"></div>
                      <h3 className="text-lg font-black text-emerald-800 mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <FaChartPie className="text-xl" /> Subject Metrics
                      </h3>
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-60 custom-scrollbar">
                        {insights.subjectPerformance?.map((sub, i) => (
                          <div key={i} className="bg-white/60 p-4 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-emerald-900 text-xs uppercase tracking-wide">{sub.subjectName}</span>
                              <span className="font-black text-emerald-600">{sub.avgScore}%</span>
                            </div>
                            <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${sub.avgScore}%` }}></div>
                            </div>
                          </div>
                        ))}
                        {(!insights.subjectPerformance || insights.subjectPerformance.length === 0) && <p className="text-center text-gray-400 text-xs font-bold uppercase py-4">No data generated</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-indigo-300">
                    <FaChartPie className="text-6xl mb-4 animate-pulse opacity-50" />
                    <p className="font-black text-xs uppercase tracking-widest">Analyzing Institutional Data...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">Master Schedule</h2>
                    <p className="text-gray-400 font-bold">Monitor live class activities and timings</p>
                  </div>
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-2xl">
                    <FaRegClock />
                  </div>
                </div>

                <div className="bg-[#F8FAFC] rounded-[2.5rem] p-6">
                  <div className="space-y-4">
                    {liveClasses.length > 0 ? (
                      liveClasses.map((cls, idx) => {
                        const isLive = new Date() >= new Date(cls.dateTime) && new Date() <= new Date(new Date(cls.dateTime).getTime() + 60 * 60 * 1000); // 1 hour duration assumption or just check start time
                        const status = isLive ? 'LIVE NOW' : (new Date(cls.dateTime) > new Date() ? 'UPCOMING' : 'COMPLETED');

                        return (
                          <div key={cls._id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:border-indigo-100 transition-all">
                            <div className="md:w-32 text-center md:text-left shrink-0">
                              <p className="font-black text-2xl text-gray-800">{new Date(cls.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(cls.dateTime).toLocaleDateString()}</p>
                            </div>

                            <div className="flex-1 md:border-l border-gray-100 md:pl-6 text-center md:text-left">
                              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{cls.classId?.name || 'General'}</span>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{cls.subjectId?.name}</span>
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{cls.title}</h3>
                              <p className="text-sm text-gray-500 font-medium mt-1">Faculty: {cls.teacherId?.name || 'Unknown'}</p>
                            </div>

                            <div className="shrink-0 w-full md:w-auto">
                              <div className={`px-6 py-3 rounded-xl text-center font-black text-[10px] uppercase tracking-widest border ${status === 'LIVE NOW'
                                ? 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                                : status === 'UPCOMING'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : 'bg-gray-50 text-gray-400 border-gray-100'
                                }`}>
                                {status}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-20">
                        <p className="text-gray-400 font-bold italic">No classes scheduled.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'academics' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-3xl font-black text-gray-900 mb-6">Academic Monitoring</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Total Assessments</p>
                      <p className="text-5xl font-black text-indigo-600">{tests.length}</p>
                    </div>
                    <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Active Subjects</p>
                      <p className="text-5xl font-black text-emerald-600">{[...new Set(tests.map(t => t.subjectId?.name || 'General'))].length}</p>
                    </div>
                    <div className="p-8 bg-orange-50 rounded-[2rem] border border-orange-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                      <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Pending Review</p>
                      <p className="text-5xl font-black text-orange-600">--</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden p-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                        <th className="px-8 py-6">Assessment Title</th>
                        <th className="px-8 py-6">Faculty / Subject</th>
                        <th className="px-8 py-6">Date Created</th>
                        <th className="px-8 py-6 text-right">Analytics</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tests.map(test => (
                        <tr key={test._id} className="group hover:bg-gray-50 transition-all">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <FaLaptopCode />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm">{test.title}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                                  {test.questionPaperUrl ? 'PDF Attached' : 'Manual Entry'} • {test.totalMarks} Marks
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-700 text-xs">{test.subjectId?.name || 'General'}</span>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{test.teacherId?.name ? `By ${test.teacherId.name}` : 'Admin'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              {new Date(test.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => handleViewTestResults(test)}
                              className="px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-indigo-200"
                            >
                              View Report
                            </button>
                          </td>
                        </tr>
                      ))}
                      {tests.length === 0 && (
                        <tr><td colSpan="4" className="text-center py-10 text-gray-400 font-bold italic">No academic tests found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900">Demo Class Requests</h2>
                  <p className="text-gray-400 font-bold text-sm">Potential students interested in a free demo</p>
                </div>
                <div className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-black text-sm border border-indigo-100 shadow-sm">
                  TOTAL LEADS: {leads.length}
                </div>
              </div>

              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-8 py-6">Student Info</th>
                        <th className="px-8 py-6">Contact Details</th>
                        <th className="px-8 py-6">Requested Course</th>
                        <th className="px-8 py-6">Batch Time</th>
                        <th className="px-8 py-6">Requested At</th>
                        <th className="px-8 py-6">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leads.map((lead) => (
                        <tr key={lead._id} className="group hover:bg-gray-50 transition-all">
                          <td className="px-8 py-6">
                            <p className="font-bold text-gray-900 text-sm">{lead.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Demo Enrollment</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <FaEnvelope className="text-indigo-400" /> {lead.email}
                              </p>
                              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <span className="text-indigo-400">📞</span> {lead.phone}
                              </p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase border border-indigo-100">
                              {lead.course || 'N/A'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 uppercase">
                              {lead.batchTiming || 'Any'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs font-bold text-gray-500">{new Date(lead.createdAt).toLocaleDateString()}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(lead.createdAt).toLocaleTimeString()}</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="max-w-xs">
                              <p className="text-xs text-gray-600 italic leading-relaxed">
                                {lead.message || 'No additional message provided.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {leads.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 text-4xl mb-4">
                                📬
                              </div>
                              <p className="text-gray-400 font-bold">No demo requests found yet.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">Result Center</h2>
                    <p className="text-gray-400 font-bold mt-1 uppercase text-[10px] tracking-widest">Generate and publish class reports</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="min-w-[180px]">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-2">Select Class</label>
                      <select
                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all text-sm appearance-none cursor-pointer shadow-sm"
                        value={selectedResultClass}
                        onChange={(e) => { setSelectedResultClass(e.target.value); setSelectedResultExam(''); setExamSummary(null); }}
                      >
                        <option value="">Choose Class</option>
                        {availableClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="min-w-[220px]">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-2">Select Exam</label>
                      <select
                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all text-sm appearance-none cursor-pointer shadow-sm disabled:opacity-50"
                        value={selectedResultExam}
                        onChange={(e) => setSelectedResultExam(e.target.value)}
                        disabled={!selectedResultClass}
                      >
                        <option value="">Choose Exam</option>
                        {selectedResultClass && (
                          <option value="total" className="text-indigo-600 font-black">TOTAL (OVERALL)</option>
                        )}
                      </select>
                    </div>
                    {selectedResultClass && (
                      <button
                        onClick={() => {
                          setExamForm({ ...examForm, subjects: availableSubjects.filter(s => s.classId?._id === selectedResultClass || s.classId === selectedResultClass).map(s => s._id) });
                          setShowAddExamModal(true);
                        }}
                        className="mt-6 md:mt-0 p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all self-end"
                        title="Add New Exam"
                      >
                        <FaPlus />
                      </button>
                    )}
                  </div>
                </div>

                {!selectedResultExam ? (
                  <div className="py-20 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-gray-300 mx-auto mb-4 shadow-sm">
                      <FaFileAlt className="text-2xl" />
                    </div>
                    <p className="text-gray-400 font-bold">Please select a class and an exam to view results.</p>
                  </div>
                ) : loadingSummary ? (
                  <div className="py-20 text-center">
                    <FaHistory className="animate-spin text-4xl text-indigo-400 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold">Compiling academic reports...</p>
                  </div>
                ) : examSummary ? (
                  <div className="animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-8 p-6 bg-indigo-50/30 rounded-3xl border border-indigo-50">
                      <div className="flex items-center gap-6">
                        <div className={`px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest ${examSummary.isPublished ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-orange-100 text-orange-600 border border-orange-200'}`}>
                          {examSummary.isPublished ? 'RESULTS PUBLISHED' : 'DRAFT (NOT PUBLISHED)'}
                        </div>
                        <div className="text-sm font-bold text-gray-600">
                          {examSummary.results?.length || 0} Students Record Found
                        </div>
                      </div>
                      <div className="flex gap-4">
                        {selectedResultExam !== 'total' ? (
                          examSummary.isPublished ? (
                            <button onClick={() => handleUnpublishResults(selectedResultExam)} className="px-6 py-3 bg-white text-gray-600 border border-gray-200 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all">UNPUBLISH</button>
                          ) : (
                            <button
                              onClick={() => handlePublishResults(selectedResultExam)}
                              disabled={isPublishing}
                              className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                            >
                              {isPublishing ? 'PUBLISHING...' : 'PUBLISH RESULTS'}
                            </button>
                          )
                        ) : (
                          // Overall Publish logic
                          examSummary.isPublished ? (
                            <button onClick={() => handleUnpublishOverall(selectedResultClass)} className="px-6 py-3 bg-white text-gray-600 border border-gray-200 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all uppercase">Hide Results</button>
                          ) : (
                            <button
                              onClick={() => handlePublishOverall(selectedResultClass)}
                              disabled={isPublishing}
                              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 uppercase"
                            >
                              {isPublishing ? 'PUBLISHING...' : 'Publish Publicly'}
                            </button>
                          )
                        )}
                        <button onClick={() => window.print()} className="p-3 bg-white text-indigo-600 border border-indigo-100 rounded-2xl hover:bg-indigo-50 transition-all shadow-sm">
                          <FaPrint />
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                            <th className="px-6 py-4">Rank</th>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4 text-center">Cumulative Score</th>
                            <th className="px-6 py-4">Proficiency</th>
                            <th className="px-6 py-4 text-right">Academic Output</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(examSummary.results || []).map((res, idx) => (
                            <tr key={res.studentId} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-6">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${res.rank === 1 ? 'bg-yellow-400 text-white' : res.rank === 2 ? 'bg-gray-300 text-white' : res.rank === 3 ? 'bg-orange-400 text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                  {res.rank}
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div>
                                  <p className="font-black text-gray-900 text-sm mb-1">{res.name}</p>
                                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">REGISTERED ID: {res.rollNo}</p>
                                </div>
                              </td>
                              <td className="px-6 py-6 text-center">
                                <p className="font-black text-gray-700 text-sm">{res.totalObtained}</p>
                                <p className="text-[10px] font-bold text-gray-300 italic">out of {res.totalMax}</p>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${parseFloat(res.percentage) > 85 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : parseFloat(res.percentage) > 60 ? 'bg-gradient-to-r from-indigo-400 to-violet-500' : 'bg-gradient-to-r from-rose-400 to-pink-500'}`} style={{ width: `${res.percentage}%` }}></div>
                                  </div>
                                  <span className="font-black text-gray-900 text-sm min-w-[50px]">{res.percentage}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-6 text-right">
                                <button
                                  onClick={() => setViewingReportCard(res)}
                                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all transform active:scale-95"
                                >
                                  {selectedResultExam === 'total' ? 'Final Transcript' : 'View Report'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-5 duration-500">
              <div className="text-center">
                <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center text-orange-500 text-3xl mx-auto mb-6 shadow-sm border border-orange-100">
                  <FaBullhorn />
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-2">Notice Center</h2>
                <p className="text-gray-400 font-bold">Broadcast updates to your entire academic community</p>
              </div>

              <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-2xl space-y-8">
                <form onSubmit={handleNoticeSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3 block ml-2">Target Distribution</label>
                      <div className="flex flex-wrap gap-4">
                        {['student', 'parent', 'teacher'].map(role => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              const roles = newNotice.targetRoles.includes(role)
                                ? newNotice.targetRoles.filter(r => r !== role)
                                : [...newNotice.targetRoles, role];
                              setNewNotice({ ...newNotice, targetRoles: roles });
                            }}
                            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${newNotice.targetRoles.includes(role)
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100'
                              : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-100'
                              }`}
                          >
                            {role.toUpperCase()}S
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3 block ml-2">Heading</label>
                      <input
                        type="text"
                        placeholder="Urgent Maintenance / Holiday Update..."
                        className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[2rem] focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all shadow-inner"
                        value={newNotice.title}
                        onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3 block ml-2">Message Protocol</label>
                      <textarea
                        rows="6"
                        placeholder="Detailed announcement content goes here..."
                        className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[2rem] focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all resize-none shadow-inner"
                        value={newNotice.content}
                        onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-10 py-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[2rem] font-black tracking-widest shadow-2xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 text-sm"
                  >
                    <FaEnvelope className="text-lg" /> INITIALIZE BROADCAST
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
              <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-2xl shadow-gray-100/50">
                <div className="flex flex-col items-center mb-12">
                  <div className="w-40 h-40 rounded-[3rem] bg-indigo-50 border-8 border-white shadow-2xl flex items-center justify-center text-5xl text-indigo-600 font-black mb-8 relative group overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} className="w-full h-full object-cover" />
                    ) : (user?.profilePhoto || profile?.profilePhoto) ? (
                      <img src={`${config.API_URL.replace('/api', '')}${user?.profilePhoto || profile?.profilePhoto}`} className="w-full h-full object-cover" />
                    ) : profile.name?.charAt(0)}
                    <label className="absolute inset-0 bg-indigo-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer backdrop-blur-sm">
                      <FaPlus className="text-white text-2xl mb-2" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Update Photo</span>
                      <input type="file" className="hidden" onChange={handlePhotoChange} accept="image/*" />
                    </label>
                  </div>
                  {photoPreview && (
                    <div className="flex gap-4 mb-6 animate-in slide-in-from-top duration-500">
                      <button
                        onClick={handleQuickPhotoUpload}
                        disabled={uploadingPhoto}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2"
                      >
                        {uploadingPhoto ? <FaHistory className="animate-spin" /> : <FaCheckCircle />} CONFIRM CHANGE
                      </button>
                      <button
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-200 transition-all"
                      >
                        REVERT
                      </button>
                    </div>
                  )}
                  <h2 className="text-4xl font-black text-gray-900 leading-tight mb-2">{profile.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100">Oasis Administrator</span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 block mb-2">Canonical Identity</label>
                      <div className="px-8 py-5 bg-gray-50 rounded-[2rem] font-bold text-gray-800 border border-transparent hover:border-indigo-100 transition-all shadow-inner">
                        {profile.name}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 block mb-2">Platform Protocol ID</label>
                      <div className="px-8 py-5 bg-gray-50 rounded-[2rem] font-mono text-indigo-500 border border-transparent hover:border-indigo-100 transition-all shadow-inner">
                        #{profile._id?.slice(-8).toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 block mb-2">Verified Communications</label>
                    <div className="px-8 py-5 bg-gray-50 rounded-[2rem] font-bold text-gray-800 border border-transparent hover:border-indigo-100 transition-all shadow-inner">
                      {profile.phone || '91XXXXXXXX'}
                    </div>
                  </div>
                  <button className="w-full py-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-[2rem] font-black tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs">
                    ACCREDITED SECURITY SETTINGS
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Exam Modal */}
          {showAddExamModal && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h2 className="text-2xl font-black text-gray-900">Provision Academic Exam</h2>
                  <button onClick={() => setShowAddExamModal(false)} className="w-10 h-10 rounded-xl bg-white text-gray-400 hover:text-red-500 shadow-sm flex items-center justify-center transition-all">
                    <FaTimesCircle className="text-xl" />
                  </button>
                </div>
                <form onSubmit={handleCreateExam} className="p-10 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-2">Session Title</label>
                      <input
                        type="text"
                        required
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all shadow-inner"
                        placeholder="e.g. Phase 1 - Monthly Test"
                        value={examForm.name}
                        onChange={e => setExamForm({ ...examForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-2">Testing Category</label>
                        <select
                          className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all appearance-none shadow-sm"
                          value={examForm.type}
                          onChange={e => setExamForm({ ...examForm, type: e.target.value })}
                        >
                          <option value="unit">Unit Test</option>
                          <option value="monthly">Monthly Test</option>
                          <option value="final">Final Exam</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-2">Execution Date</label>
                        <input
                          type="date"
                          required
                          className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 focus:outline-none font-bold text-gray-700 transition-all shadow-sm"
                          value={examForm.date}
                          onChange={e => setExamForm({ ...examForm, date: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black tracking-widest shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95">
                    INITIALIZE EXAM PROTOCOL
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
      {/* Task: Teacher Module Activation - Assignment Modal */}
      {
        showAssignModal && editingTeacher && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black">Manage Assignments</h3>
                  <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">{editingTeacher.name}</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all">
                  <FaSignOutAlt className="rotate-180" />
                </button>
              </div>
              <form onSubmit={handleUpdateTeacherAssignments} className="p-10 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Assign Subjects</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Physics', 'Chemistry', 'Maths', 'Biology', 'English'].map(sub => {
                      const isSelected = assignForm.subjects.split(',').map(s => s.trim()).includes(sub);
                      return (
                        <label key={sub} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-transparent hover:border-indigo-100'}`}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={isSelected}
                            onChange={() => {
                              const current = assignForm.subjects.split(',').map(s => s.trim()).filter(x => x);
                              const updated = isSelected ? current.filter(i => i !== sub) : [...current, sub];
                              setAssignForm({ ...assignForm, subjects: updated.join(', ') });
                            }}
                          />
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>{sub}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Assign Classes</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Class 9', 'Class 10'].map(cls => {
                      const isSelected = assignForm.classes.split(',').map(s => s.trim()).includes(cls);
                      return (
                        <label key={cls} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-transparent hover:border-emerald-100'}`}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            checked={isSelected}
                            onChange={() => {
                              const current = assignForm.classes.split(',').map(s => s.trim()).filter(x => x);
                              const updated = isSelected ? current.filter(i => i !== cls) : [...current, cls];
                              setAssignForm({ ...assignForm, classes: updated.join(', ') });
                            }}
                          />
                          <span className={`text-xs font-bold ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`}>{cls}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Batches</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['B1', 'B2'].map(batch => {
                      const isSelected = assignForm.batches.split(',').map(s => s.trim()).includes(batch);
                      return (
                        <label key={batch} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-transparent hover:border-orange-100'}`}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            checked={isSelected}
                            onChange={() => {
                              const current = assignForm.batches.split(',').map(s => s.trim()).filter(x => x);
                              const updated = isSelected ? current.filter(i => i !== batch) : [...current, batch];
                              setAssignForm({ ...assignForm, batches: updated.join(', ') });
                            }}
                          />
                          <span className={`text-xs font-bold ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>{batch}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 transition-all transform hover:-translate-y-1">
                  UPDATE ASSIGNMENTS
                </button>
              </form>
            </div>
          </div>
        )
      }
      {
        showTestResultsModal && selectedTestResults && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-indigo-50 bg-indigo-50/30 flex justify-between items-start shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedTestResults.subjectId?.name || 'Subject'}</span>
                    <span className="text-xs font-bold text-gray-400">|</span>
                    <span className="text-xs font-bold text-gray-400">{new Date(selectedTestResults.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 leading-tight">{selectedTestResults.title}</h2>
                  <p className="text-gray-500 font-bold mt-1">Total Marks: {selectedTestResults.totalMarks} • Questions: {selectedTestResults.questions?.length || 0}</p>
                </div>
                <button onClick={() => setShowTestResultsModal(false)} className="w-10 h-10 rounded-xl bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shadow-sm">
                  <FaTimesCircle className="text-xl" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
                {loadingResults ? (
                  <div className="flex flex-col items-center justify-center h-64 text-indigo-500">
                    <FaHistory className="text-4xl animate-spin mb-4" />
                    <p className="font-bold text-xs uppercase tracking-widest">Generating Digital Report...</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="px-6 py-4">Rank</th>
                          <th className="px-6 py-4">Student</th>
                          <th className="px-6 py-4 text-center">Score</th>
                          <th className="px-6 py-4 text-center">Efficiency</th>
                          <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedTestResults.results && selectedTestResults.results.length > 0 ? (
                          selectedTestResults.results.map((result, index) => {
                            const percentage = Math.round((result.score / selectedTestResults.totalMarks) * 100);
                            return (
                              <tr key={result._id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div>
                                    <p className="font-bold text-gray-800 text-sm">{result.studentId?.name || 'Unknown Student'}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">ID: {(result.studentId?._id || '').slice(-6)}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="font-black text-indigo-600 text-base">{result.score}</span>
                                  <span className="text-gray-300 text-xs font-bold">/{selectedTestResults.totalMarks}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500">{percentage}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${percentage >= 40 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {percentage >= 40 ? 'Qualified' : 'Needs Impr.'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-bold italic">
                              No submissions found for this test yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 bg-white shrink-0 flex justify-end">
                <button onClick={() => setShowTestResultsModal(false)} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all uppercase tracking-widest">Close Report</button>
              </div>
            </div>
          </div>
        )
      }
      {/* Report Card Premium Modal */}
      {
        viewingReportCard && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:p-0 print:shadow-none print:static">
              {/* Tool Bar - Hidden in Print */}
              <div className="px-8 py-4 bg-gray-50 border-b flex justify-between items-center shrink-0 print:hidden">
                <div className="flex items-center gap-3">
                  <FaTrophy className="text-yellow-500" />
                  <h3 className="font-black text-gray-700 text-sm">Academic Report Preview</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    <FaPrint /> PRINT RECORD
                  </button>
                  <button
                    onClick={() => setViewingReportCard(null)}
                    className="p-2.5 bg-white text-gray-400 hover:text-red-500 rounded-xl border border-gray-200 transition-all shadow-sm"
                  >
                    <FaTimesCircle className="text-lg" />
                  </button>
                </div>
              </div>

              {/* Printable Body */}
              <div className="flex-1 overflow-y-auto p-10 md:p-16 print:overflow-visible print:p-0" id="printable-report-card">
                <div className="border-4 border-indigo-600 p-1 relative min-h-[1000px]">
                  <div className="border border-indigo-200 p-8 h-full bg-white relative">
                    {/* Brand Header */}
                    <div className="flex justify-between items-start mb-12 border-b-2 border-indigo-600 pb-8">
                      <div>
                        <img src={oasisFullLogo} alt="Logo" className="h-16 mb-4 filter contrast-125" />
                        <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em]">Excellence in JEE/NEET Coaching</p>
                      </div>
                      <div className="text-right">
                        <h1 className="text-4xl font-black text-indigo-900 mb-1">REPORT CARD</h1>
                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">{examSummary?.examName} - 2026</p>
                      </div>
                    </div>

                    {/* Student Info Grid */}
                    <div className="grid grid-cols-2 gap-y-10 mb-16 bg-gray-50/50 p-10 rounded-3xl border border-gray-100">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Student Name</label>
                          <p className="text-2xl font-black text-indigo-900 underline underline-offset-4 decoration-indigo-200">{viewingReportCard.name}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Roll Number</label>
                          <p className="text-lg font-bold text-gray-700">{viewingReportCard.rollNo}</p>
                        </div>
                      </div>
                      <div className="space-y-4 text-right">
                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Father's Name</label>
                          <p className="text-lg font-bold text-gray-700">{viewingReportCard.fatherName || 'Not Provided'}</p>
                        </div>
                        <div className="flex justify-end gap-10">
                          <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Class</label>
                            <p className="text-lg font-bold text-indigo-600">Standard IX</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Section</label>
                            <p className="text-lg font-bold text-indigo-600">Oasis-A1</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Marks Table */}
                    <div className="mb-16">
                      <table className="w-full border-collapse border-2 border-indigo-600">
                        <thead>
                          <tr className="bg-indigo-600 text-white">
                            <th className="px-4 py-4 text-left font-black text-[10px] uppercase tracking-widest border-r border-indigo-500">Subject Name</th>
                            <th className="px-2 py-4 text-center font-black text-[10px] uppercase tracking-widest border-r border-indigo-500">Unit Test<br /><span className="text-[8px] opacity-70">(Max: 20)</span></th>
                            <th className="px-2 py-4 text-center font-black text-[10px] uppercase tracking-widest border-r border-indigo-500">Monthly Test<br /><span className="text-[8px] opacity-70">(Max: 30)</span></th>
                            <th className="px-2 py-4 text-center font-black text-[10px] uppercase tracking-widest border-r border-indigo-500">Final Term<br /><span className="text-[8px] opacity-70">(Max: 50)</span></th>
                            <th className="px-4 py-4 text-center font-black text-[10px] uppercase tracking-widest border-r border-indigo-500">Total Marks<br /><span className="text-[8px] opacity-70">(Max: 100)</span></th>
                            <th className="px-4 py-4 text-right font-black text-[10px] uppercase tracking-widest">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {viewingReportCard.subjectResults.map(sub => (
                            <tr key={sub.subjectId} className="hover:bg-indigo-50/20 transition-colors">
                              <td className="px-4 py-4 font-black text-gray-800 border-r border-gray-100">{sub.subjectName}</td>
                              <td className="px-2 py-4 text-center font-bold text-gray-600 border-r border-gray-100 bg-gray-50/30">{sub.unit || 0}</td>
                              <td className="px-2 py-4 text-center font-bold text-gray-600 border-r border-gray-100">{sub.monthly || 0}</td>
                              <td className="px-2 py-4 text-center font-bold text-indigo-500 border-r border-gray-100 bg-indigo-50/10">{sub.final || 0}</td>
                              <td className="px-4 py-4 text-center font-black text-indigo-700 text-lg border-r border-gray-100 bg-indigo-50/30">{sub.total || 0}</td>
                              <td className="px-4 py-4 text-right">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${sub.total >= 40 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {sub.total >= 90 ? 'A+' : sub.total >= 80 ? 'A' : sub.total >= 70 ? 'B+' : sub.total >= 60 ? 'B' : sub.total >= 40 ? 'C' : 'FAIL'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-indigo-600 text-white">
                            <th className="px-6 py-6 text-left font-black text-[11px] uppercase border-r border-indigo-500">GRAND TOTAL ASSESSMENT</th>
                            <th colSpan="3" className="px-6 py-6 text-center font-black opacity-60 text-[10px] border-r border-indigo-500">Manual Ledger Summation</th>
                            <th className="px-6 py-6 text-center font-black text-white text-2xl border-r border-indigo-500">{viewingReportCard.totalObtained} <span className="text-xs opacity-60">/ {viewingReportCard.totalMax}</span></th>
                            <th className="px-6 py-6 text-right font-black text-white text-xl">{viewingReportCard.percentage}%</th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Performance Summary */}
                    <div className="grid grid-cols-3 gap-6 mb-20 text-center">
                      <div className="p-6 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-indigo-100 transition-all">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Rank in Class</label>
                        <p className="text-3xl font-black text-gray-800">{viewingReportCard.rank}</p>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-indigo-100 transition-all">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Attendance</label>
                        <p className="text-3xl font-black text-gray-800">{viewingReportCard.attendancePercentage}%</p>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-indigo-100 transition-all">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Conduct</label>
                        <p className={`text-3xl font-black ${viewingReportCard.conduct === 'EXCELLENT' || viewingReportCard.conduct === 'VERY GOOD' ? 'text-emerald-600' : viewingReportCard.conduct === 'GOOD' ? 'text-indigo-600' : 'text-orange-500'}`}>
                          {viewingReportCard.conduct}
                        </p>
                      </div>
                    </div>

                    {/* Footer Signatures */}
                    <div className="mt-auto flex justify-between items-end pb-12 pt-12 border-t border-gray-100">
                      <div className="text-center w-48">
                        <div className="h-1 bg-gray-200 mb-2"></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Class Teacher</p>
                      </div>
                      <div className="text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-1 bg-indigo-600 mb-2"></div>
                          <img src={oasisLogo} alt="Seal" className="w-12 h-12 opacity-20 filter grayscale mb-2" />
                          <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em]">Institute Seal</p>
                        </div>
                      </div>
                      <div className="text-center w-48">
                        <div className="h-1 bg-gray-200 mb-2 font-handwriting italic text-gray-400 text-xs">Principal Signature</div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authorized Signature</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default AdminDashboard;
