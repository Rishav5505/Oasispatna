import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { AuthContext } from '../contexts/AuthContext';
import {
  FiUsers, FiUserPlus, FiUserCheck, FiSearch, FiPlus, FiMail, FiCheck, FiX, FiCheckCircle,
  FiAlertTriangle, FiClock, FiSettings, FiChevronRight, FiCalendar, FiAward, FiFileText,
  FiPrinter, FiCreditCard, FiRefreshCw, FiVolume2, FiCpu, FiTrendingUp, FiClipboard, FiVideo,
  FiHeart, FiLink, FiBookOpen, FiCamera, FiShield, FiHash, FiPhone, FiEdit2, FiTarget, FiLogOut,
  FiInbox, FiSend, FiUploadCloud, FiMessageSquare, FiCoffee, FiStar, FiDollarSign,
} from 'react-icons/fi';
import oasisLogo from '../assets/oasis_logo.png';
import oasisFullLogo from '../assets/oasis_full_logo.png';
import receiptBanner from '../assets/receipt_banner.png';
import config from '../config';
import { notify, toast } from '../utils/notify';
import OverviewAnalytics from '../components/admin/OverviewAnalytics';
import FeeApprovals from '../components/admin/FeeApprovals';
import AddStudentModal from '../components/admin/AddStudentModal';
import AcademicsManager from '../components/admin/AcademicsManager';
import NoticeHistory from '../components/admin/NoticeHistory';
import LeadsCRM from '../components/admin/LeadsCRM';
import {
  Pagination, SkeletonRows, EmptyRow, EmptyState, ConfirmDelete, ConfirmDialog, Modal, Avatar, Badge,
  ProgressRing, ProgressBar, PageHeader, SkeletonBlock, inputCls, labelCls,
  tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls, iconBtn,
} from '../components/admin/AdminUI';
import { Sidebar, Topbar, MobileBottomNav, CommandPalette } from '../components/admin/AdminShell';
import { ADMIN_NAV_SPEC, buildNav } from '../components/admin/adminNav';
import AdmissionsManager from '../components/admin/AdmissionsManager';
import AdmissionFunnel from '../components/admin/AdmissionFunnel';
import FeePlanCard from '../components/admin/FeePlanCard';
import UpcomingDues from '../components/admin/UpcomingDues';
import BulkImportModal from '../components/admin/BulkImportModal';
import FinanceManager from '../components/admin/FinanceManager';
import CertificateGenerator from '../components/admin/CertificateGenerator';
import StaffManager from '../components/admin/StaffManager';
import AtRiskCard from '../components/admin/AtRiskCard';
import TopbarExtras from '../components/admin/TopbarExtras';
import PreferencesCard from '../components/admin/PreferencesCard';
import { printInvoice } from '../components/admin/printDocs';
import { api } from '../components/admin/adminApi';
import EventCalendar from '../components/common/EventCalendar';
import UpcomingEventsCard from '../components/common/UpcomingEventsCard';
import LeaveRequests from '../components/common/LeaveRequests';
import ChatPanel from '../components/common/ChatPanel';
import { useChatUnread } from '../components/common/useChatUnread';
import { useI18n } from '../i18n/useI18n';
import { StatCard } from '../components/ui/Motion';
import usePagination from '../components/admin/usePagination';
import { toastError, formatINR } from '../components/admin/adminApi';
import { liveClassStatus } from '../components/admin/liveStatus';

const photoUrl = (p) => (p ? `${config.API_URL.replace('/api', '')}${p}` : null);
const SUBJECT_OPTIONS = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English'];
const CLASS_OPTIONS = ['Class 9', 'Class 10'];
const BATCH_OPTIONS = ['B1', 'B2'];
const LIVE_TONE = { 'LIVE NOW': 'red', UPCOMING: 'brand', COMPLETED: 'gray', CANCELLED: 'gray' };

// Toggle-chip multi-select over a comma-separated string (same storage format as before).
const ChipToggleGroup = ({ label, options, value, onChange }) => {
  const current = value.split(',').map(s => s.trim()).filter(Boolean);
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const on = current.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onChange((on ? current.filter(i => i !== opt) : [...current, opt]).join(', '))}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${on ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-700'}`}
            >
              {on ? <FiCheck /> : <FiPlus className="opacity-50" />} {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, token, updateUser, loading: authLoading } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
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
  const [savingFee, setSavingFee] = useState(false);
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
  const [newNotice, setNewNotice] = useState({ title: '', content: '', targetRoles: ['student', 'parent'], sendEmail: false });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [testsLoading, setTestsLoading] = useState(false);
  const [feesLoading, setFeesLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [noticeReloadKey, setNoticeReloadKey] = useState(0);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [admissionsLiveKey, setAdmissionsLiveKey] = useState(0);
  const [pendingAdmissions, setPendingAdmissions] = useState(0);
  const [socket, setSocket] = useState(null);
  const [planReloadKey, setPlanReloadKey] = useState(0);
  const { t } = useI18n();
  const nav = useMemo(() => buildNav(ADMIN_NAV_SPEC, t), [t]);
  const { count: chatUnread } = useChatUnread({ socket });

  // Shell / presentation-only state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [summary, setSummary] = useState({ pendingPayments: 0, newLeads: 0 });
  const [confirmState, setConfirmState] = useState(null); // { title, message, confirmLabel, tone, onConfirm }
  const mainRef = useRef(null);
  const teacherFormRef = useRef(null);

  const navigate = useCallback((tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
  }, []);

  // Ctrl/⌘ + K opens the quick-jump palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    // Contract §0: authenticate the socket with the JWT (handshake + 'join'), never the raw user id.
    const socket = io(config.SOCKET_URL, { auth: { token } });
    socket.on('connect', () => {
      socket.emit('join', token);
    });

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
      notify(`New Demo Request from: ${newLead.name}`);
    });

    // Online admission submitted from the public /admission page
    socket.on('new-admission', (payload) => {
      const name = payload?.studentName || payload?.admission?.studentName || '';
      toast.success(t('admin.adm.liveToast', { name, no: payload?.applicationNo || payload?.admission?.applicationNo || '' }), { icon: '🎓', duration: 6000 });
      setAdmissionsLiveKey(k => k + 1);
      setPendingAdmissions(n => n + 1);
    });
    socket.on('connect', () => setSocket(socket));

    api.get('/admissions', { status: 'submitted' }).then(list => setPendingAdmissions(list.length)).catch(() => {});

    return () => {
      socket.disconnect();
      setSocket(null);
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
    if (activeTab === 'tests') {
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
      notify('Profile photo updated successfully!');
    } catch (err) {
      console.error('Error uploading photo:', err);
      notify('Failed to upload photo: ' + (err.response?.data?.message || err.message));
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
      notify('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      notify('Failed to update profile: ' + (err.response?.data?.message || 'Server error'));
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
      toastError(err, 'Failed to load students');
    } finally {
      setStudentsLoading(false);
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
    setStats(prev => ({
      ...prev,
      totalStudents: allUsers.filter(u => u.role === 'student').length,
      totalTeachers: allUsers.filter(u => u.role === 'teacher').length,
      totalParents: allUsers.filter(u => u.role === 'parent').length,
    }));
  };

  const fetchFees = async () => {
    setFeesLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/fees/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFees(res.data);
    } catch (err) {
      toastError(err, 'Failed to load fee records');
    } finally {
      setFeesLoading(false);
    }
  };

  const fetchTests = async () => {
    setTestsLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/tests/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTests(res.data);
    } catch (err) {
      toastError(err, 'Failed to load tests');
    } finally {
      setTestsLoading(false);
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
      notify('Could not fetch results for this test.');
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchLiveClasses = async () => {
    setLiveLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/live-classes/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLiveClasses(res.data);
    } catch (err) {
      toastError(err, 'Failed to load live classes');
    } finally {
      setLiveLoading(false);
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
    setLeadsLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/leads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLeads(res.data);
    } catch (err) {
      toastError(err, 'Failed to load demo requests');
    } finally {
      setLeadsLoading(false);
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
      notify('Failed to fetch exam summary');
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
      notify('Exam created successfully');
      setShowAddExamModal(false);
      fetchExamsForClass(selectedResultClass);
    } catch (err) {
      notify('Failed to create exam: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePublishResults = async (examId) => {
    setIsPublishing(true);
    try {
      await axios.post(`${config.API_URL}/exams/${examId}/publish`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExamSummary(examId);
      notify('Results published and notifications sent!');
    } catch (err) {
      console.error('Error publishing results:', err);
      notify('Failed to publish results');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishResults = async (examId) => {
    try {
      await axios.post(`${config.API_URL}/exams/${examId}/unpublish`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExamSummary(examId);
      notify('Results unpublished');
    } catch (err) {
      console.error('Error unpublishing results:', err);
      notify('Failed to unpublish results');
    }
  };

  const handlePublishOverall = async (classId) => {
    setIsPublishing(true);
    try {
      await axios.post(`${config.API_URL}/marks/publish-overall/${classId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExamSummary('total');
      notify('Overall results published!');
    } catch (err) {
      console.error('Error publishing overall results:', err);
      notify('Failed to publish overall results');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishOverall = async (classId) => {
    try {
      await axios.post(`${config.API_URL}/marks/unpublish-overall/${classId}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExamSummary('total');
      notify('Overall results unpublished');
    } catch (err) {
      console.error('Error unpublishing overall results:', err);
      notify('Failed to unpublish overall results');
    }
  };

  const handleAddFee = async (e) => {
    e.preventDefault();
    if (savingFee) return; // double clicks used to record the same payment several times
    setSavingFee(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(`${config.API_URL}/fees/pay`, feeForm, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      notify('Payment recorded successfully!');
      setFeeForm(prev => ({ studentId: prev.studentId, amount: '', type: 'Tuition', remarks: '' }));
      fetchFees();
      setPlanReloadKey(k => k + 1);
      // Refresh users/students to update stats if necessary (though fee stats are separate)
      // Ideally we should also refresh the student list to get updated Paid amounts if we tracked that there, but we calculate it live.
    } catch (err) {
      console.error("Payment Error:", err);
      notify('Failed to record payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingFee(false);
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
      notify('Total Fee updated!');
      setIsEditingFee(false);
      fetchAllStudents(); // Refresh student data to show new fee
      // We also need to update selectedFeeStudent locally to reflect change immediately
      setSelectedFeeStudent(prev => ({ ...prev, totalFee: newTotalFee }));
    } catch (err) {
      console.error("Update Fee Error:", err);
      notify('Failed to update fee: ' + (err.response?.data?.message || err.message));
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
            <div class="receipt-box">
                <div class="header">
                    <img src="${window.location.origin}${receiptBanner}" alt="Oasis Header" style="width: 100%; max-height: 150px; object-fit: contain; margin-bottom: 20px;" />
                    <h2>OASIS JEE CLASSES</h2>
                    <p>Official Payment Receipt</p>
                </div>
                <div class="details">
                    <div class="row"><span>Date:</span> <span>${new Date(payment.date).toLocaleDateString()}</span></div>
                    <div class="row"><span>Receipt No:</span> <span>${payment.transactionId || payment._id.slice(-8).toUpperCase()}</span></div>
                    <div class="row"><span>Student Name:</span> <span>${selectedFeeStudent?.name || 'Student'}</span></div>
                    <div class="row"><span>Father's Name:</span> <span>${selectedFeeStudent?.fatherName || 'N/A'}</span></div>
                    <hr/>
                    <div class="row"><span>Payment Type:</span> <span>${payment.type}</span></div>
                    <div class="row"><span>Amount Paid:</span> <span>₹${payment.amount}</span></div>
                    <div class="row"><span>Payment Mode:</span> <span>${payment.remarks || 'Admin Entry'}</span></div>
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
      notify('Teacher added successfully — login details emailed to teacher');
      setTeacherForm({ name: '', email: '', phone: '', subjects: '', batches: '', classes: '', password: '' });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add teacher';
      notify(msg);
    }
  };

  const handleUpdateTeacherAssignments = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`${config.API_URL}/users/teachers/${assignForm.teacherId}`, assignForm, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      notify('Assignments updated successfully');
      setShowAssignModal(false);
      fetchUsers();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to update assignments');
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
    } catch {
      notify('Failed to fetch attendance logs');
    }
  };

  const handleLinkParent = async (e) => {
    e.preventDefault();
    if (!linkParentId || !linkStudentId) {
      notify('Please select both parent and student');
      return;
    }
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(`${config.API_URL}/users/link-parent`,
        { parentId: linkParentId, studentId: linkStudentId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      notify('Parent linked to student successfully');
      setLinkParentId('');
      setLinkStudentId('');
      fetchUsers(); // Refresh to show linked status
    } catch (err) {
      console.error('Error linking parent:', err);
      notify('Failed to link parent: ' + (err.response?.data?.message || 'Server error'));
    }
  };

  const handleNoticeSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!newNotice.title || !newNotice.content) {
      notify('Please fill in both title and message fields');
      return;
    }

    if (!newNotice.targetRoles || newNotice.targetRoles.length === 0) {
      notify('Please select at least one target audience');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        notify('Session expired. Please login again.');
        window.location.href = '/login';
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${config.API_URL}/notices`, newNotice, { headers });

      notify('Notice published successfully!');
      setNewNotice({ title: '', content: '', targetRoles: ['student', 'parent'], sendEmail: false });
      setNoticeReloadKey(k => k + 1);
    } catch (err) {
      console.error('Notice publish error:', err);

      // Check if it's an authentication error
      if (err.response?.status === 401) {
        notify('Your session has expired. Please login again.');
        sessionStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }

      const errorMsg = err.response?.data?.message || err.message || 'Failed to publish notice';
      notify(`Error: ${errorMsg}`);
    }
  };

  const handleDeleteStudent = async (student) => {
    const userId = student.userId?._id || student.userId;
    if (!userId) {
      notify('Cannot delete: this student has no linked login');
      return;
    }
    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(`${config.API_URL}/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      notify(`${student.name} deleted`);
      if (selectedStudent?._id === student._id) setSelectedStudent(null);
      setAllStudents(prev => prev.filter(s => s._id !== student._id));
      fetchUsers();
    } catch (err) {
      toastError(err, 'Failed to delete student');
    }
  };

  const filteredStudents = allStudents.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.userId?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'all' || s.classId?.name === filterClass;
    return matchesSearch && matchesClass;
  });

  // Jump to a student's fee profile (from dues lists)
  const openFeeStudent = (studentId) => {
    const s = allStudents.find(x => String(x._id) === String(studentId));
    if (!s) return;
    setSelectedFeeStudent(s);
    setFeeForm(prev => ({ ...prev, studentId: s._id }));
    setFeeSearchTerm(s.name);
    navigate('fees');
  };

  // Client-side pagination (20/page) for the large tables
  const studentPg = usePagination(filteredStudents);
  const feesPg = usePagination(fees);
  const testsPg = usePagination(tests);
  const teacherUsers = users.filter(u => u.role === 'teacher');

  // Fees tab KPIs, derived from already-loaded fees + students (same rules as the analytics endpoint).
  const feeKpis = useMemo(() => {
    const paidBy = new Map();
    let collected = 0;
    fees.forEach(f => {
      if ((f.status || 'Paid') !== 'Paid') return;
      const amt = Number(f.amount) || 0;
      collected += amt;
      const sid = String(f.studentId?._id || f.studentId || '');
      paidBy.set(sid, (paidBy.get(sid) || 0) + amt);
    });
    const pending = allStudents.reduce((a, s) => a + Math.max(0, (Number(s.totalFee) || 0) - (paidBy.get(String(s._id)) || 0)), 0);
    const pendingCount = fees.filter(f => (f.status || '').toLowerCase() === 'pending').length;
    return { collected, pending, pendingCount, pct: collected + pending > 0 ? (collected / (collected + pending)) * 100 : 0 };
  }, [fees, allStudents]);

  const childrenOf = useCallback(
    (parentId) => allStudents.filter(s => (s.parentId?._id || s.parentId) === parentId),
    [allStudents],
  );

  const logout = () => { sessionStorage.removeItem('token'); window.location.href = '/login'; };
  const askConfirm = (opts) => setConfirmState(opts);
  const myPhoto = photoUrl(user?.profilePhoto || profile?.profilePhoto);
  const newLeadCount = Math.max(summary.newLeads || 0, leads.filter(l => (l.status || 'new') === 'new').length);
  const navBadges = { fees: summary.pendingPayments || 0, leads: newLeadCount, admissions: pendingAdmissions, chat: chatUnread };
  const notifications = [
    { id: 'leads', icon: FiInbox, count: newLeadCount, label: `new demo request${newLeadCount === 1 ? '' : 's'}`, hint: 'Open the leads CRM', tab: 'leads' },
    { id: 'fees', icon: FiCreditCard, count: summary.pendingPayments || 0, label: `payment${summary.pendingPayments === 1 ? '' : 's'} awaiting approval`, hint: 'Review in Fees', tab: 'fees' },
    { id: 'admissions', icon: FiFileText, count: pendingAdmissions, label: t('admin.notif.admissions'), hint: t('admin.notif.admissionsHint'), tab: 'admissions' },
    { id: 'chat', icon: FiMessageSquare, count: chatUnread, label: t('admin.notif.chat'), hint: t('admin.notif.chatHint'), tab: 'chat' },
  ];
  const paletteActions = [
    { key: 'add-student', label: 'Add a new student', hint: 'Create login & email credentials', icon: FiUserPlus, run: () => { navigate('students'); setShowAddStudent(true); } },
    { key: 'onboard-teacher', label: 'Onboard a teacher', hint: 'Open the faculty form', icon: FiUserCheck, run: () => { navigate('teachers'); setTimeout(() => teacherFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 150); } },
    { key: 'record-payment', label: 'Record a fee payment', hint: 'Search a student in Fees', icon: FiCreditCard, run: () => navigate('fees') },
    { key: 'broadcast', label: 'Broadcast a notice', hint: 'Students, parents, teachers', icon: FiVolume2, run: () => navigate('communication') },
    { key: 'link-parent', label: 'Link parent to student', hint: 'Parents directory', icon: FiLink, run: () => navigate('parents') },
    { key: 'bulk-import', label: t('admin.palette.bulk'), hint: t('admin.palette.bulkHint'), icon: FiUploadCloud, run: () => { navigate('students'); setShowBulkImport(true); } },
    { key: 'review-admissions', label: t('admin.palette.admissions'), hint: t('admin.palette.admissionsHint'), icon: FiFileText, run: () => navigate('admissions') },
    { key: 'salaries', label: t('admin.palette.salaries'), hint: t('admin.palette.salariesHint'), icon: FiDollarSign, run: () => navigate('finance') },
    { key: 'certificates', label: t('admin.palette.certificates'), hint: t('admin.palette.certificatesHint'), icon: FiStar, run: () => navigate('certificates') },
    { key: 'add-event', label: t('admin.palette.event'), hint: t('admin.palette.eventHint'), icon: FiCalendar, run: () => navigate('calendar') },
    { key: 'leaves', label: t('admin.palette.leaves'), hint: t('admin.palette.leavesHint'), icon: FiCoffee, run: () => navigate('leaves') },
  ];

  const labelSm = 'text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider';
  const h3 = 'font-extrabold text-gray-900 dark:text-white tracking-tight';
  const searchInput = (value, onChange, placeholder, extra = '') => (
    <div className={`relative ${extra}`}>
      <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input type="text" placeholder={placeholder} aria-label={placeholder} className="ui-input !pl-10" value={value} onChange={onChange} />
    </div>
  );

  // 1. Check if Auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-ink-950 bg-brand-mesh">
        <img src={oasisLogo} alt="Oasis" className="w-14 h-14 object-contain animate-pulse" />
        <p className="text-sm font-semibold text-gray-500">Loading authentication…</p>
      </div>
    );
  }

  // 2. Access Denied Check
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink-950 bg-brand-mesh flex flex-col items-center justify-center p-4">
        <div className="ui-card p-8 max-w-md w-full text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center text-2xl mb-4"><FiShield /></div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Access denied</h1>
          <p className="text-gray-500 mb-6">
            You do not have permission to access the Admin Dashboard.
            <br />
            Current role: <span className="font-semibold capitalize text-gray-800 dark:text-gray-200">{user?.role || 'Guest'}</span>
          </p>
          <div className="flex justify-center gap-3">
            <a href="/" className="ui-btn-secondary">Go home</a>
            <button onClick={logout} className="ui-btn-primary"><FiLogOut /> Logout</button>
          </div>
        </div>
      </div>
    );
  }

  const selectedFeeTotals = (() => {
    if (!selectedFeeStudent) return null;
    const studentFees = fees.filter(f => (f.studentId?._id === selectedFeeStudent._id || f.studentId === selectedFeeStudent._id));
    const totalPaid = studentFees.reduce((acc, curr) => (curr.status === 'Paid' ? acc + curr.amount : acc), 0);
    const totalFee = selectedFeeStudent.totalFee || 50000; // Default or fetched
    const due = totalFee - totalPaid;
    return { studentFees, totalPaid, totalFee, due };
  })();

  const feeMatches = feeSearchTerm && !selectedFeeStudent
    ? allStudents.filter(s => s.name.toLowerCase().includes(feeSearchTerm.toLowerCase()))
    : [];

  // 3. Main Dashboard Render
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-ink-950 bg-brand-mesh text-gray-900 dark:text-gray-100">
      <Sidebar
        activeTab={activeTab}
        onNavigate={navigate}
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        badges={navBadges}
        user={user}
        photoUrl={myPhoto}
        onLogout={logout}
        logo={oasisFullLogo}
        logoMark={oasisLogo}
        nav={nav}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          activeTab={activeTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          notifications={notifications}
          onNavigate={navigate}
          user={user}
          photoUrl={myPhoto}
          onLogout={logout}
          logoMark={oasisLogo}
          nav={nav}
          extras={<TopbarExtras onOpenChat={() => navigate('chat')} chatCount={chatUnread} />}
        />

        <main ref={mainRef} className="flex-1 overflow-y-auto ui-scrollbar scroll-smooth">
          <div key={activeTab} className="max-w-[1440px] mx-auto px-4 md:px-8 pt-5 md:pt-8 pb-28 lg:pb-12 space-y-6 animate-fade-up">

            {activeTab === 'overview' && (
              <OverviewAnalytics
                profileName={profile.name}
                presentTeachers={stats.presentTeachers}
                setActiveTab={navigate}
                onAddStudent={() => { navigate('students'); setShowAddStudent(true); }}
                students={allStudents}
                leads={leads}
                onSummary={setSummary}
              />
            )}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                <UpcomingDues compact limit={5} onViewAll={() => navigate('fees')} onSelectStudent={openFeeStudent} />
                <AtRiskCard limit={5} />
                <UpcomingEventsCard limit={5} onViewAll={() => navigate('calendar')} className="h-full" />
              </div>
            )}

            {/* ============================ STUDENTS ============================ */}
            {activeTab === 'students' && (
              <>
                <PageHeader
                  icon={FiUsers}
                  eyebrow="People"
                  title="Student directory"
                  subtitle={`${filteredStudents.length} of ${allStudents.length} students`}
                  actions={(
                    <>
                      {searchInput(searchTerm, (e) => { setSearchTerm(e.target.value); studentPg.setPage(1); }, 'Search student…', 'sm:w-64')}
                      <select
                        className="ui-input sm:!w-auto font-semibold"
                        value={filterClass}
                        onChange={(e) => { setFilterClass(e.target.value); studentPg.setPage(1); }}
                        aria-label="Filter by class"
                      >
                        <option value="all">All classes</option>
                        {availableClasses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowBulkImport(true)} className="ui-btn-secondary whitespace-nowrap">
                        <FiUploadCloud /> {t('admin.bulk.button')}
                      </button>
                      <button onClick={() => setShowAddStudent(true)} className="ui-btn-primary whitespace-nowrap">
                        <FiUserPlus /> Add student
                      </button>
                    </>
                  )}
                />

                <div className="ui-card overflow-hidden">
                  <div className={`${tableScroll} max-h-[68vh]`}>
                    <table className="w-full text-left border-collapse min-w-[820px]">
                      <thead>
                        <tr className={theadRow}>
                          <th className={thCls}>Student</th>
                          <th className={thCls}>Class</th>
                          <th className={thCls}>Guardian</th>
                          <th className={thCls}>Batch</th>
                          <th className={`${thCls} text-right`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {studentsLoading && allStudents.length === 0 && <SkeletonRows rows={6} cols={5} />}
                        {!studentsLoading && studentPg.total === 0 && (
                          <EmptyRow
                            colSpan={5}
                            icon={FiUsers}
                            title={allStudents.length ? 'No students match your search' : 'No students yet'}
                            hint={allStudents.length ? 'Try a different name or class filter.' : 'Enrol your first student to get started.'}
                            action={allStudents.length ? null : <button onClick={() => setShowAddStudent(true)} className="ui-btn-primary"><FiUserPlus /> Add student</button>}
                          />
                        )}
                        {studentPg.pageItems.map(student => (
                          <tr
                            key={student._id}
                            className={`${rowCls} cursor-pointer ${selectedStudent?._id === student._id ? 'bg-brand-50/60 dark:bg-white/5' : ''}`}
                            onClick={() => handleStudentClick(student)}
                          >
                            <td className={tdCls}>
                              <div className="flex items-center gap-3">
                                <Avatar name={student.name} src={photoUrl(student.userId?.profilePhoto)} size="md" />
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-brand-600 transition-colors truncate">{student.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{student.userId?.email || student.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className={tdCls}><Badge tone="gray">Grade {student.classId?.name || 'NA'}</Badge></td>
                            <td className={tdCls}>
                              {student.parentId ? (
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={student.parentId.name} size="sm" className="!bg-none !bg-ink-900 !shadow-none" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{student.parentId.name}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{student.parentId.email}</p>
                                  </div>
                                </div>
                              ) : (
                                <Badge tone="amber">Not linked</Badge>
                              )}
                            </td>
                            <td className={`${tdCls} text-sm font-semibold text-gray-600 dark:text-gray-300`}>{student.batchId?.name || '—'}</td>
                            <td className={`${tdCls} text-right`}>
                              <div className="flex items-center justify-end gap-1">
                                <ConfirmDelete compact onConfirm={() => handleDeleteStudent(student)} confirmLabel="Delete" />
                                <button className={iconBtn} aria-label={`Open ${student.name}`}>
                                  <FiChevronRight className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination {...studentPg} label="students" />
                </div>

                <div className="ui-card p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ink-900 text-white flex items-center justify-center"><FiLink /></div>
                    <div>
                      <p className={h3}>Link a parent to a student</p>
                      <p className="text-xs text-gray-500">{allStudents.filter(s => !s.parentId).length} students have no guardian linked</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('parents')} className="ui-btn-secondary">Open parents <FiChevronRight /></button>
                </div>

                {/* Student profile slide-over */}
                {selectedStudent && (
                  <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedStudent(null)}>
                    <aside
                      className="absolute right-0 inset-y-0 w-full max-w-md bg-white dark:bg-ink-900 shadow-2xl flex flex-col animate-slide-in-right"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Student profile"
                    >
                      <div className="relative bg-brand-sunset text-white p-6 pb-14">
                        <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center" aria-label="Close profile"><FiX /></button>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Academic profile</p>
                      </div>
                      <div className="px-6 -mt-10 flex items-end gap-4">
                        <Avatar name={selectedStudent.name} src={photoUrl(selectedStudent.userId?.profilePhoto)} size="xl" className="!w-20 !h-20 !text-2xl ring-4" />
                        <div className="pb-1 min-w-0">
                          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white truncate">{selectedStudent.name}</h3>
                          <p className="text-xs text-gray-500 truncate">{selectedStudent.userId?.email || selectedStudent.email}</p>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto ui-scrollbar p-6 space-y-6">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="brand">Grade {selectedStudent.classId?.name || 'NA'}</Badge>
                          {selectedStudent.batchId?.name && <Badge tone="gray">{selectedStudent.batchId.name}</Badge>}
                          {selectedStudent.parentId ? <Badge tone="green">Guardian linked</Badge> : <Badge tone="amber">No guardian</Badge>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {(() => {
                            const att = studentDetails.attendance;
                            const pct = att.length > 0 ? Math.round((att.filter(a => a.status === 'present').length / att.length) * 100) : 0;
                            return (
                              <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4 flex flex-col items-center">
                                <ProgressRing value={pct} size={96} stroke={9} color={pct >= 75 ? '#10b981' : pct >= 50 ? '#f37021' : '#ef4444'}>
                                  <p className="text-xl font-extrabold">{pct}%</p>
                                </ProgressRing>
                                <p className={`${labelSm} mt-2`}>Attendance</p>
                              </div>
                            );
                          })()}
                          <div className="rounded-2xl bg-brand-dark text-white p-4 flex flex-col items-center justify-center">
                            <p className="text-4xl font-extrabold">{studentDetails.marks.length}</p>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">Marks recorded</p>
                          </div>
                        </div>
                        <div>
                          <p className={`${labelSm} mb-3`}>Recent performance</p>
                          <div className="space-y-2.5">
                            {studentDetails.marks.slice(0, 3).map((m, i) => (
                              <div key={i} className="p-3.5 rounded-2xl ring-1 ring-gray-100 dark:ring-white/5">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{m.subjectId?.name}</span>
                                  <span className="font-extrabold text-brand-600">{m.marks}%</span>
                                </div>
                                <ProgressBar value={m.marks} />
                              </div>
                            ))}
                            {studentDetails.marks.length === 0 && <EmptyState icon={FiClipboard} title="No marks recorded yet" />}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-2">
                        <button onClick={() => { setLinkStudentId(selectedStudent._id); setSelectedStudent(null); navigate('parents'); }} className="ui-btn-secondary flex-1"><FiLink /> Link parent</button>
                        <button onClick={() => setSelectedStudent(null)} className="ui-btn-dark flex-1">Close</button>
                      </div>
                    </aside>
                  </div>
                )}
              </>
            )}

            {/* ============================ PARENTS ============================ */}
            {activeTab === 'parents' && (
              <>
                <PageHeader icon={FiHeart} eyebrow="People" title="Parents & guardians" subtitle={`${parentList.length} parent accounts · ${allStudents.filter(s => s.parentId).length} students linked`} />
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 md:gap-6">
                  <div className="xl:col-span-2 ui-card overflow-hidden h-fit">
                    <div className={`${tableScroll} max-h-[70vh]`}>
                      <table className="w-full text-left min-w-[640px]">
                        <thead>
                          <tr className={theadRow}>
                            <th className={thCls}>Parent</th>
                            <th className={thCls}>Phone</th>
                            <th className={thCls}>Children</th>
                          </tr>
                        </thead>
                        <tbody className={tbodyCls}>
                          {loading && parentList.length === 0 && <SkeletonRows rows={4} cols={3} />}
                          {!loading && parentList.length === 0 && <EmptyRow colSpan={3} icon={FiHeart} title="No parent accounts yet" hint="Parents appear here once they register." />}
                          {parentList.map(p => {
                            const kids = childrenOf(p._id);
                            return (
                              <tr key={p._id} className={rowCls}>
                                <td className={tdCls}>
                                  <div className="flex items-center gap-3">
                                    <Avatar name={p.name} src={photoUrl(p.profilePhoto)} size="md" />
                                    <div className="min-w-0">
                                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{p.name}</p>
                                      <p className="text-xs text-gray-500 truncate">{p.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className={`${tdCls} text-sm text-gray-600 dark:text-gray-300`}>{p.phone || '—'}</td>
                                <td className={tdCls}>
                                  {kids.length ? (
                                    <div className="flex flex-wrap gap-1.5">{kids.map(k => <Badge key={k._id} tone="brand">{k.name}</Badge>)}</div>
                                  ) : (
                                    <button onClick={() => setLinkParentId(p._id)} className="ui-badge bg-amber-50 text-amber-700 hover:bg-amber-100"><FiLink /> Link a student</button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="ui-card p-5 md:p-6 h-fit xl:sticky xl:top-4">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiLink /></div>
                      <div>
                        <h3 className={h3}>Link parent to student</h3>
                        <p className="text-xs text-gray-500">Gives the parent access to the child&apos;s progress</p>
                      </div>
                    </div>
                    <form onSubmit={handleLinkParent} className="space-y-4">
                      <div>
                        <label className={labelCls} htmlFor="link-parent">Parent</label>
                        <select id="link-parent" value={linkParentId} onChange={(e) => setLinkParentId(e.target.value)} className={inputCls}>
                          <option value="">— Select parent —</option>
                          {parentList.map(p => (
                            <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-center text-brand-400"><FiLink /></div>
                      <div>
                        <label className={labelCls} htmlFor="link-student">Student</label>
                        <select id="link-student" value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)} className={inputCls}>
                          <option value="">— Select student —</option>
                          {allStudents.map(s => (
                            <option key={s._id} value={s._id}>{s.name} - Class {s.classId?.name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="ui-btn-primary w-full !py-3">
                        <FiCheck /> Link accounts
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}

            {/* ============================ FEES ============================ */}
            {activeTab === 'fees' && (
              <>
                <PageHeader
                  icon={FiCreditCard}
                  eyebrow="Finance"
                  title="Fees management"
                  subtitle="Search a student to collect payments and view history"
                  actions={(
                    <div className="relative w-full lg:w-96">
                      {searchInput(feeSearchTerm, e => { setFeeSearchTerm(e.target.value); setSelectedFeeStudent(null); }, 'Search student by name…')}
                      {feeSearchTerm && !selectedFeeStudent && (
                        <div className="absolute top-full left-0 right-0 mt-2 ui-card !rounded-2xl max-h-72 overflow-y-auto ui-scrollbar z-20 p-1.5 animate-scale-in origin-top">
                          {feeMatches.map(s => (
                            <button
                              type="button"
                              key={s._id}
                              onClick={() => {
                                setSelectedFeeStudent(s);
                                setFeeForm(prev => ({ ...prev, studentId: s._id }));
                                setFeeSearchTerm(s.name);
                              }}
                              className="group w-full p-2.5 hover:bg-brand-50 dark:hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 text-left"
                            >
                              <Avatar name={s.name} size="sm" />
                              <span className="flex-1 min-w-0">
                                <span className="block font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{s.name}</span>
                                <span className="block text-[11px] text-gray-500">{s.classId?.name || 'Class N/A'} · {s.fatherName ? `S/O ${s.fatherName}` : 'Father: N/A'}</span>
                              </span>
                              <FiChevronRight className="text-gray-300 group-hover:text-brand-500" />
                            </button>
                          ))}
                          {feeMatches.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">No students found</div>}
                        </div>
                      )}
                    </div>
                  )}
                />

                {selectedFeeStudent ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                    {/* Left: Student payment profile */}
                    <div className="space-y-5">
                      <div className="relative overflow-hidden rounded-3xl bg-brand-sunset text-white p-6 shadow-brand-glow">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                        <div className="relative">
                          <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl font-extrabold">
                              {selectedFeeStudent.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-extrabold truncate">{selectedFeeStudent.name}</h3>
                              <p className="text-white/70 text-sm truncate">{selectedFeeStudent.email || 'No Email'}</p>
                            </div>
                            <button onClick={() => { setSelectedFeeStudent(null); setFeeSearchTerm(''); }} className="ml-auto w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0" aria-label="Back to all fees"><FiX /></button>
                          </div>
                          <dl className="space-y-2.5 bg-black/15 p-4 rounded-2xl text-sm">
                            {[['Class', selectedFeeStudent.classId?.name || 'N/A'], ["Father's name", selectedFeeStudent.fatherName || 'Not Recorded'], ['Admission date', new Date().toLocaleDateString()]].map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-3"><dt className="text-white/70 font-semibold">{k}</dt><dd className="font-bold text-right">{v}</dd></div>
                            ))}
                          </dl>
                        </div>
                      </div>

                      <FeePlanCard
                        key={selectedFeeStudent._id}
                        studentId={selectedFeeStudent._id}
                        defaultTotal={selectedFeeStudent.totalFee}
                        canEdit
                        reloadKey={planReloadKey}
                        onChanged={(p) => { setSelectedFeeStudent(prev => ({ ...prev, totalFee: p.netFee })); fetchAllStudents(); }}
                      />

                      {/* Financial summary */}
                      <div className="ui-card p-5 md:p-6">
                        <h4 className={`${h3} mb-4`}>Fee status</h4>
                        <div className="flex justify-center mb-5">
                          <ProgressRing value={selectedFeeTotals.totalFee > 0 ? (selectedFeeTotals.totalPaid / selectedFeeTotals.totalFee) * 100 : 0} size={140} stroke={13} color="#10b981" label="Share of total fee paid">
                            <p className="text-2xl font-extrabold">{selectedFeeTotals.totalFee > 0 ? Math.min(100, Math.round((selectedFeeTotals.totalPaid / selectedFeeTotals.totalFee) * 100)) : 0}%</p>
                            <p className={labelSm}>paid</p>
                          </ProgressRing>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                            <span className="text-emerald-800 dark:text-emerald-300 font-bold text-sm">Total paid</span>
                            <span className="text-xl font-extrabold text-emerald-600">₹{selectedFeeTotals.totalPaid.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl">
                            <span className="text-gray-500 font-bold text-sm">Total fee</span>
                            <div className="flex items-center gap-2">
                              {isEditingFee ? (
                                <div className="flex items-center gap-1.5 animate-scale-in">
                                  <input
                                    type="number"
                                    className="ui-input !w-28 !py-1.5 font-bold"
                                    value={newTotalFee}
                                    onChange={(e) => setNewTotalFee(e.target.value)}
                                    aria-label="New total fee"
                                  />
                                  <button onClick={handleUpdateTotalFee} className="w-8 h-8 rounded-lg text-emerald-600 bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center" aria-label="Save total fee"><FiCheck /></button>
                                  <button onClick={() => setIsEditingFee(false)} className="w-8 h-8 rounded-lg text-red-600 bg-red-100 hover:bg-red-200 flex items-center justify-center" aria-label="Cancel"><FiX /></button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-col items-end">
                                    <span className={`text-lg font-extrabold ${selectedFeeTotals.totalFee === 0 ? 'text-red-500 animate-pulse' : 'text-gray-800 dark:text-gray-100'}`}>
                                      ₹{selectedFeeTotals.totalFee.toLocaleString()}
                                    </span>
                                    {selectedFeeTotals.totalFee === 0 && <Badge tone="red" className="mt-1">Needs calibration</Badge>}
                                  </div>
                                  <button
                                    onClick={() => { setNewTotalFee(selectedFeeTotals.totalFee); setIsEditingFee(true); }}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${selectedFeeTotals.totalFee === 0 ? 'bg-brand-gradient text-white shadow-brand-soft animate-glow' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50'}`}
                                    title="Configure total course fee"
                                    aria-label="Configure total course fee"
                                  >
                                    <FiEdit2 />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3.5 bg-red-50 dark:bg-red-500/10 rounded-2xl">
                            <span className="text-red-800 dark:text-red-300 font-bold text-sm">Due amount</span>
                            <span className="text-xl font-extrabold text-red-600">₹{selectedFeeTotals.due > 0 ? selectedFeeTotals.due.toLocaleString() : 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: payment & history */}
                    <div className="lg:col-span-2 space-y-5">
                      <div className="ui-card p-5 md:p-6">
                        <h3 className={`${h3} mb-5 flex items-center gap-2.5`}><span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiPlus /></span> Collect new payment</h3>
                        <form onSubmit={handleAddFee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls} htmlFor="fee-amount">Amount (₹)</label>
                            <input id="fee-amount" type="number" className={`${inputCls} text-lg`} placeholder="Enter amount" value={feeForm.amount} onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })} required />
                          </div>
                          <div>
                            <label className={labelCls} htmlFor="fee-type">Payment type</label>
                            <select id="fee-type" className={inputCls} value={feeForm.type} onChange={e => setFeeForm({ ...feeForm, type: e.target.value })}>
                              <option value="Tuition">Tuition Fee</option>
                              <option value="Exam">Exam Fee</option>
                              <option value="Registration">Registration Fee</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className={labelCls} htmlFor="fee-remarks">Remarks / receipt note</label>
                            <input id="fee-remarks" type="text" className={inputCls} placeholder="e.g. Paid via UPI, Transaction ID…" value={feeForm.remarks} onChange={e => setFeeForm({ ...feeForm, remarks: e.target.value })} />
                          </div>
                          <button type="submit" disabled={savingFee} className="md:col-span-2 ui-btn-primary !py-3">
                            <FiCheckCircle /> {savingFee ? 'Recording…' : <>Confirm &amp; send receipt</>}
                          </button>
                        </form>
                      </div>

                      <div className="ui-card overflow-hidden">
                        <div className="px-5 md:px-6 py-5 flex items-center justify-between">
                          <h3 className={h3}>Payment history</h3>
                          <Badge tone="gray">{selectedFeeTotals.studentFees.length} payments</Badge>
                        </div>
                        <div className={`${tableScroll} max-h-[28rem]`}>
                          <table className="w-full text-left min-w-[520px]">
                            <thead>
                              <tr className={theadRow}>
                                <th className={thCls}>Date</th>
                                <th className={thCls}>Type</th>
                                <th className={thCls}>Amount</th>
                                <th className={`${thCls} text-right`}>Receipt</th>
                              </tr>
                            </thead>
                            <tbody className={tbodyCls}>
                              {selectedFeeTotals.studentFees.length > 0 ? (
                                selectedFeeTotals.studentFees.map(fee => (
                                  <tr key={fee._id} className={rowCls}>
                                    <td className={`${tdCls} text-sm font-semibold text-gray-600 dark:text-gray-300`}>{new Date(fee.date).toLocaleDateString()}</td>
                                    <td className={tdCls}><Badge tone="brand">{fee.type}</Badge></td>
                                    <td className={`${tdCls} font-extrabold text-gray-900 dark:text-white`}>₹{fee.amount.toLocaleString()}</td>
                                    <td className={`${tdCls} text-right`}>
                                      <span className="inline-flex flex-wrap justify-end gap-1">
                                        <button onClick={() => handleDownloadReceipt(fee)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5"><FiFileText /> View receipt</button>
                                        {(fee.status || 'Paid') === 'Paid' && <button type="button" onClick={() => printInvoice(fee._id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"><FiPrinter /> {t('admin.fees.invoice')}</button>}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <EmptyRow colSpan={4} icon={FiCreditCard} title="No payment history for this student" />
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // No student selected - KPIs, approvals, defaulters and all transactions
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                      <div className="relative overflow-hidden rounded-3xl bg-brand-dark text-white p-6 shadow-card flex items-center gap-6">
                        <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-500/25 blur-3xl" />
                        <ProgressRing value={feeKpis.pct} size={124} stroke={12} track="rgba(255,255,255,0.08)" label="Collected vs pending">
                          <p className="text-2xl font-extrabold">{Math.round(feeKpis.pct)}%</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">collected</p>
                        </ProgressRing>
                        <div className="relative space-y-3 min-w-0">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-500" />Collected</p>
                            <p className="text-xl font-extrabold truncate">{formatINR(feeKpis.collected)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/30" />Pending</p>
                            <p className="text-xl font-extrabold text-brand-300 truncate">{formatINR(feeKpis.pending)}</p>
                          </div>
                        </div>
                      </div>
                      <StatCard icon={FiTrendingUp} label="Transactions" value={fees.length} hint="All recorded fee entries" tone="brand" />
                      <StatCard icon={FiClock} label="Awaiting approval" value={feeKpis.pendingCount} hint="Manual payments to review" tone={feeKpis.pendingCount ? 'amber' : 'dark'} />
                    </div>

                    <UpcomingDues onSelectStudent={openFeeStudent} />

                    <FeeApprovals onChanged={fetchFees} />

                    <div className="ui-card overflow-hidden">
                      <div className="flex justify-between items-center px-5 md:px-6 py-5">
                        <div>
                          <h3 className={h3}>All transactions</h3>
                          <p className="text-xs text-gray-500">{fees.length} records</p>
                        </div>
                        <button onClick={fetchFees} className={iconBtn} title="Refresh" aria-label="Refresh transactions"><FiRefreshCw className={feesLoading ? 'animate-spin' : ''} /></button>
                      </div>
                      <div className={`${tableScroll} max-h-[36rem]`}>
                        <table className="w-full text-left min-w-[680px]">
                          <thead>
                            <tr className={theadRow}>
                              <th className={thCls}>Student</th>
                              <th className={thCls}>Date</th>
                              <th className={thCls}>Type</th>
                              <th className={thCls}>Amount</th>
                              <th className={thCls}>Status</th>
                              <th className={`${thCls} text-right`}>{t('admin.fees.invoice')}</th>
                            </tr>
                          </thead>
                          <tbody className={tbodyCls}>
                            {feesLoading && fees.length === 0 ? <SkeletonRows rows={5} cols={6} /> : feesPg.total === 0 ? (
                              <EmptyRow colSpan={6} icon={FiCreditCard} title="No transactions found" hint="Search a student above to record the first payment." />
                            ) : feesPg.pageItems.map(fee => {
                              const st = (fee.status || 'Paid').toLowerCase();
                              return (
                                <tr key={fee._id} className={rowCls}>
                                  <td className={tdCls}>
                                    <div className="flex items-center gap-3">
                                      <Avatar name={fee.studentId?.name || '?'} size="sm" />
                                      <div className="min-w-0">
                                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{fee.studentId?.name || 'Unknown'}</p>
                                        <p className="text-[11px] text-gray-400">{fee.studentId?.fatherName ? `F: ${fee.studentId.fatherName}` : ''}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className={`${tdCls} text-sm text-gray-600 dark:text-gray-300`}>{new Date(fee.date || fee.createdAt).toLocaleDateString()}</td>
                                  <td className={`${tdCls} text-sm font-semibold text-gray-600 dark:text-gray-300`}>{fee.type}</td>
                                  <td className={`${tdCls} font-extrabold text-gray-900 dark:text-white`}>₹{Number(fee.amount || 0).toLocaleString('en-IN')}</td>
                                  <td className={tdCls}>
                                    <Badge tone={st === 'paid' ? 'green' : st === 'rejected' ? 'red' : 'amber'} dot>{fee.status || 'Paid'}</Badge>
                                  </td>
                                  <td className={`${tdCls} text-right`}>
                                    {st === 'paid' ? (
                                      <button type="button" onClick={() => printInvoice(fee._id)} className={iconBtn} title={t('admin.fees.invoice')} aria-label={t('admin.fees.invoiceFor', { name: fee.studentId?.name || '' })}><FiPrinter /></button>
                                    ) : <span className="text-xs text-gray-300">—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <Pagination {...feesPg} label="transactions" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ============================ TEACHERS ============================ */}
            {activeTab === 'teachers' && (
              <>
                <PageHeader
                  icon={FiUserCheck}
                  eyebrow="People"
                  title="Faculty management"
                  subtitle={`${teacherUsers.length} teachers · ${stats.presentTeachers ?? 0} checked in today`}
                  actions={(
                    <button onClick={() => teacherFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="ui-btn-primary">
                      <FiPlus /> Onboard teacher
                    </button>
                  )}
                />

                <div className="ui-card overflow-hidden">
                  <div className={`${tableScroll} max-h-[60vh]`}>
                    <table className="w-full text-left border-collapse min-w-[820px]">
                      <thead>
                        <tr className={theadRow}>
                          <th className={thCls}>Faculty member</th>
                          <th className={thCls}>Expertise</th>
                          <th className={thCls}>Classes / Batches</th>
                          <th className={thCls}>Status</th>
                          <th className={`${thCls} text-right`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {teacherUsers.length === 0 && (loading
                          ? <SkeletonRows rows={4} cols={5} />
                          : <EmptyRow colSpan={5} icon={FiUserCheck} title="No teachers yet" hint="Use the form below to onboard your first faculty member." />)}
                        {teacherUsers.map(teacher => (
                          <tr key={teacher._id} className={rowCls}>
                            <td className={tdCls}>
                              <div className="flex items-center gap-3">
                                <Avatar name={teacher.name || '?'} src={photoUrl(teacher.profilePhoto)} size="md" />
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">{teacher.name}</p>
                                  <p className="text-xs text-gray-500 break-all">{teacher.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className={tdCls}>
                              <div className="flex flex-wrap gap-1.5">
                                {(teacher.subjects ? teacher.subjects.split(',') : []).map((sub, i) => (
                                  <Badge key={i} tone="brand">{sub.trim()}</Badge>
                                ))}
                                {(!teacher.subjects) && <span className="text-xs text-gray-400 italic">None</span>}
                              </div>
                            </td>
                            <td className={`${tdCls} text-xs text-gray-500`}>
                              <p className="font-semibold text-gray-700 dark:text-gray-300">{teacher.classes || '—'}</p>
                              <p>{teacher.batches || ''}</p>
                            </td>
                            <td className={tdCls}><Badge tone="green" dot>Active</Badge></td>
                            <td className={`${tdCls} text-right`}>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewTeacherAttendance(teacher)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 hover:bg-brand-50 hover:text-brand-600 transition-all active:scale-95"
                                  title="View attendance history"
                                >
                                  <FiClock /> History
                                </button>
                                <button onClick={() => openAssignModal(teacher)} className={iconBtn} title="Edit assignments" aria-label={`Edit assignments for ${teacher.name}`}>
                                  <FiSettings />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div ref={teacherFormRef} className="ui-card p-5 md:p-7 scroll-mt-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiUserPlus /></div>
                    <div>
                      <h3 className={h3}>New faculty entry</h3>
                      <p className="text-xs text-gray-500">Login details are emailed to the teacher automatically.</p>
                    </div>
                  </div>
                  <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className={labelCls} htmlFor="t-name">Full name</label>
                      <input id="t-name" type="text" placeholder="Dr. John Doe" value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="t-email">Email address</label>
                      <input id="t-email" type="email" placeholder="john@school.com" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="t-phone">Contact number</label>
                      <input id="t-phone" type="tel" placeholder="+91 9876543210" value={teacherForm.phone} onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })} className={inputCls} required />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <ChipToggleGroup label="Assign subjects" options={SUBJECT_OPTIONS} value={teacherForm.subjects} onChange={(v) => setTeacherForm({ ...teacherForm, subjects: v })} />
                    </div>
                    <div className="md:col-span-1 lg:col-span-1">
                      <ChipToggleGroup label="Assign classes" options={CLASS_OPTIONS} value={teacherForm.classes} onChange={(v) => setTeacherForm({ ...teacherForm, classes: v })} />
                    </div>
                    <div className="md:col-span-1 lg:col-span-2">
                      <ChipToggleGroup label="Assigned batches" options={BATCH_OPTIONS} value={teacherForm.batches} onChange={(v) => setTeacherForm({ ...teacherForm, batches: v })} />
                    </div>
                    <div className="md:col-span-1 lg:col-span-2">
                      <label className={labelCls} htmlFor="t-pass">Access password (optional)</label>
                      <input id="t-pass" type="password" placeholder="Leave blank to auto-generate & email" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} className={inputCls} />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="ui-btn-primary w-full !py-3"><FiUserPlus /> Register teacher</button>
                    </div>
                  </form>
                </div>
              </>
            )}

            {/* ============================ INSIGHTS ============================ */}
            {activeTab === 'insights' && (
              <>
                <PageHeader
                  icon={FiCpu}
                  eyebrow="Insights"
                  title="Executive intelligence"
                  subtitle="Automated analysis of institutional performance"
                  actions={<button onClick={fetchInsights} className="ui-btn-secondary"><FiRefreshCw /> Refresh analytics</button>}
                />
                {insights ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 ui-stagger">
                    {/* Toppers */}
                    <div className="relative overflow-hidden rounded-3xl bg-brand-sunset text-white p-6 shadow-brand-glow">
                      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                      <h3 className="relative font-extrabold mb-5 flex items-center gap-2.5"><span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><FiAward /></span> Top performers</h3>
                      <div className="relative space-y-2.5">
                        {insights.toppers?.map((student, i) => (
                          <div key={student._id || i} className="bg-white/10 backdrop-blur p-3 rounded-2xl flex items-center gap-3 hover:bg-white/15 transition-colors">
                            <div className={`w-9 h-9 rounded-xl font-extrabold flex items-center justify-center text-sm ${i === 0 ? 'bg-white text-brand-700' : 'bg-black/25'}`}>#{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{student.name}</p>
                              <p className="text-[11px] text-white/70">{student.className || 'Class N/A'}</p>
                            </div>
                            <p className="font-extrabold">{student.avgTotal}%</p>
                          </div>
                        ))}
                        {(!insights.toppers || insights.toppers.length === 0) && <p className="text-center text-white/70 text-sm py-6">Not enough data yet</p>}
                      </div>
                    </div>

                    {/* At risk */}
                    <div className="ui-card p-6">
                      <h3 className={`${h3} mb-5 flex items-center gap-2.5`}><span className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 flex items-center justify-center"><FiAlertTriangle /></span> Needs attention</h3>
                      <div className="space-y-2.5">
                        {insights.atRisk?.map((student, i) => (
                          <div key={student._id || i} className="p-3 rounded-2xl ring-1 ring-red-100 dark:ring-red-500/20 bg-red-50/40 dark:bg-red-500/5 flex items-center gap-3">
                            <Avatar name={student.name} size="sm" className="!bg-none !bg-red-500 !shadow-none" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{student.name}</p>
                              <p className="text-[11px] text-gray-500">{student.className || 'Class N/A'}</p>
                            </div>
                            <Badge tone="red" dot pulse>{student.avgTotal}% avg</Badge>
                          </div>
                        ))}
                        {(!insights.atRisk || insights.atRisk.length === 0) && <EmptyState icon={FiCheckCircle} title="All clear!" hint="No students are currently at risk." />}
                      </div>
                    </div>

                    {/* Subject metrics */}
                    <div className="ui-card p-6">
                      <h3 className={`${h3} mb-5 flex items-center gap-2.5`}><span className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><FiTarget /></span> Subject metrics</h3>
                      <div className="space-y-4 max-h-72 overflow-y-auto ui-scrollbar pr-1">
                        {insights.subjectPerformance?.map((sub, i) => (
                          <div key={i}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{sub.subjectName}</span>
                              <span className="font-extrabold text-sm text-gray-900 dark:text-white">{sub.avgScore}%</span>
                            </div>
                            <ProgressBar value={sub.avgScore} />
                          </div>
                        ))}
                        {(!insights.subjectPerformance || insights.subjectPerformance.length === 0) && <EmptyState icon={FiTarget} title="No data generated yet" />}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-80" />)}</div>
                )}
              </>
            )}

            {/* ============================ SCHEDULE ============================ */}
            {activeTab === 'schedule' && (
              <>
                <PageHeader
                  icon={FiCalendar}
                  eyebrow="Academics"
                  title="Master schedule"
                  subtitle="Monitor live class activities and timings"
                  actions={(
                    <div className="flex flex-wrap gap-2">
                      {['LIVE NOW', 'UPCOMING', 'COMPLETED'].map(st => (
                        <Badge key={st} tone={LIVE_TONE[st]} dot={st === 'LIVE NOW'} pulse={st === 'LIVE NOW'}>
                          {liveClasses.filter(c => liveClassStatus(c) === st).length} {st.toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  )}
                />
                <div className="space-y-3 ui-stagger">
                  {liveLoading && liveClasses.length === 0 ? (
                    [0, 1, 2].map(i => <SkeletonBlock key={i} className="h-24" />)
                  ) : liveClasses.length > 0 ? (
                    liveClasses.map((cls) => {
                      const status = liveClassStatus(cls);
                      const live = status === 'LIVE NOW';
                      return (
                        <div key={cls._id} className={`ui-card ui-card-hover p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 ${live ? 'ring-2 ring-red-300 dark:ring-red-500/40' : ''} ${status === 'COMPLETED' || status === 'CANCELLED' ? 'opacity-75' : ''}`}>
                          <div className={`md:w-28 shrink-0 rounded-2xl px-4 py-3 text-center ${live ? 'bg-red-500 text-white animate-glow' : status === 'UPCOMING' ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}>
                            <p className="font-extrabold text-xl leading-none tabular-nums">{new Date(cls.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="text-[11px] font-semibold opacity-80 mt-1">{new Date(cls.dateTime).toLocaleDateString()}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <Badge tone="gray">{cls.classId?.name || 'General'}</Badge>
                              <Badge tone="brand">{cls.subjectId?.name}</Badge>
                            </div>
                            <h3 className={`font-bold text-gray-900 dark:text-white truncate ${status === 'CANCELLED' ? 'line-through' : ''}`}>{cls.title}</h3>
                            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5"><FiUserCheck /> {cls.teacherId?.name || 'Unknown'} · <FiClock /> {Number(cls.duration) || 60} min</p>
                          </div>
                          <Badge tone={LIVE_TONE[status]} dot={live} pulse={live} className="self-start md:self-center !text-xs !px-3 !py-1.5">
                            {live && <FiVideo />} {status}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <div className="ui-card"><EmptyState icon={FiCalendar} title="No classes scheduled" hint="Live classes created by teachers will appear here." /></div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'academics' && (
              <AcademicsManager teachers={teacherUsers} onChanged={fetchMetadata} />
            )}

            {/* ============================ TESTS ============================ */}
            {activeTab === 'tests' && (
              <>
                <PageHeader icon={FiClipboard} eyebrow="Academics" title="Tests & assessments" subtitle="Online tests created by faculty and their submissions" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 ui-stagger">
                  <StatCard icon={FiClipboard} label="Total assessments" value={tests.length} tone="brand" />
                  <StatCard icon={FiBookOpen} label="Active subjects" value={[...new Set(tests.map(t => t.subjectId?.name || 'General'))].length} tone="dark" />
                  <StatCard icon={FiTrendingUp} label="Active now" value={tests.filter(t => (t.status || 'active') === 'active').length} tone="green" />
                </div>

                <div className="ui-card overflow-hidden">
                  <div className={`${tableScroll} max-h-[65vh]`}>
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className={theadRow}>
                          <th className={thCls}>Assessment</th>
                          <th className={thCls}>Subject / Faculty</th>
                          <th className={thCls}>Created</th>
                          <th className={`${thCls} text-right`}>Analytics</th>
                        </tr>
                      </thead>
                      <tbody className={tbodyCls}>
                        {testsLoading && tests.length === 0 && <SkeletonRows rows={5} cols={4} />}
                        {testsPg.pageItems.map(test => (
                          <tr key={test._id} className={rowCls}>
                            <td className={tdCls}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center group-hover:bg-brand-gradient group-hover:text-white transition-all"><FiClipboard /></div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors truncate">{test.title}</p>
                                  <p className="text-xs text-gray-500">{test.questionPaperUrl ? 'PDF attached' : 'Manual entry'} · {test.totalMarks} marks</p>
                                </div>
                              </div>
                            </td>
                            <td className={tdCls}>
                              <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{test.subjectId?.name || 'General'}</p>
                              <p className="text-xs text-gray-500">{test.teacherId?.name ? `By ${test.teacherId.name}` : 'Admin'}</p>
                            </td>
                            <td className={tdCls}><Badge tone="gray">{new Date(test.createdAt).toLocaleDateString()}</Badge></td>
                            <td className={`${tdCls} text-right`}>
                              <button onClick={() => handleViewTestResults(test)} className="ui-btn-secondary !py-2 !text-xs">
                                <FiTrendingUp /> View report
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!testsLoading && tests.length === 0 && (
                          <EmptyRow colSpan={4} icon={FiClipboard} title="No tests created yet" hint="Tests created by teachers will show up here." />
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination {...testsPg} label="tests" />
                </div>
              </>
            )}

            {activeTab === 'leads' && (
              <>
                <LeadsCRM leads={leads} setLeads={setLeads} loading={leadsLoading} onRefresh={fetchLeads} />
                <AdmissionFunnel reloadKey={leads.length} />
              </>
            )}

            {activeTab === 'admissions' && (
              <AdmissionsManager canApprove reloadKey={admissionsLiveKey} />
            )}

            {activeTab === 'finance' && (
              <FinanceManager teachers={teacherUsers} onTeachersChanged={fetchUsers} />
            )}

            {activeTab === 'certificates' && (
              <CertificateGenerator students={allStudents} classes={availableClasses} />
            )}

            {activeTab === 'staff' && <StaffManager />}

            {activeTab === 'calendar' && (
              <>
                <PageHeader icon={FiCalendar} eyebrow={t('admin.group.academics')} title={t('admin.heading.calendar')} subtitle={t('admin.calendar.subtitle')} />
                <EventCalendar canEdit classOptions={availableClasses} />
              </>
            )}

            {activeTab === 'leaves' && (
              <>
                <PageHeader icon={FiCoffee} eyebrow={t('admin.group.engagement')} title={t('admin.heading.leaves')} subtitle={t('admin.leaves.subtitle')} />
                <LeaveRequests mode="review" role="admin" />
              </>
            )}

            {activeTab === 'chat' && (
              <>
                <PageHeader icon={FiMessageSquare} eyebrow={t('admin.group.engagement')} title={t('admin.heading.chat')} subtitle={t('admin.chat.subtitle')} />
                <ChatPanel socket={socket} />
              </>
            )}

            {/* ============================ RESULTS ============================ */}
            {activeTab === 'results' && (
              <>
                <PageHeader icon={FiAward} eyebrow="Academics" title="Result center" subtitle="Generate and publish class reports" />
                <div className="ui-card p-5 flex flex-col md:flex-row md:items-end gap-4">
                  <div className="md:w-56">
                    <label className={labelCls} htmlFor="res-class">Class</label>
                    <select
                      id="res-class"
                      className={inputCls}
                      value={selectedResultClass}
                      onChange={(e) => { setSelectedResultClass(e.target.value); setSelectedResultExam(''); setExamSummary(null); }}
                    >
                      <option value="">Choose class</option>
                      {availableClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="md:w-64">
                    <label className={labelCls} htmlFor="res-exam">Exam</label>
                    <select
                      id="res-exam"
                      className={`${inputCls} disabled:opacity-50`}
                      value={selectedResultExam}
                      onChange={(e) => setSelectedResultExam(e.target.value)}
                      disabled={!selectedResultClass}
                    >
                      <option value="">Choose exam</option>
                      {availableExams.map(ex => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
                      {selectedResultClass && (
                        <option value="total">TOTAL (OVERALL)</option>
                      )}
                    </select>
                  </div>
                  {selectedResultClass && (
                    <button
                      onClick={() => {
                        setExamForm({ ...examForm, subjects: availableSubjects.filter(s => s.classId?._id === selectedResultClass || s.classId === selectedResultClass).map(s => s._id) });
                        setShowAddExamModal(true);
                      }}
                      className="ui-btn-secondary md:ml-auto"
                    >
                      <FiPlus /> New exam
                    </button>
                  )}
                </div>

                {!selectedResultExam ? (
                  <div className="ui-card"><EmptyState icon={FiFileText} title="Select a class and an exam" hint="Results, rankings and report cards will appear here." /></div>
                ) : loadingSummary ? (
                  <div className="ui-card p-5 space-y-3">{[0, 1, 2, 3].map(i => <SkeletonBlock key={i} className="h-14 !rounded-2xl" />)}<p className="text-center text-sm text-gray-500">Compiling academic reports…</p></div>
                ) : examSummary ? (
                  <div className="ui-card overflow-hidden animate-fade-up">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 md:px-6 py-5 border-b border-gray-100 dark:border-white/5">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge tone={examSummary.isPublished ? 'green' : 'amber'} dot>{examSummary.isPublished ? 'Results published' : 'Draft — not published'}</Badge>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{examSummary.results?.length || 0} student records</span>
                      </div>
                      <div className="flex gap-2">
                        {selectedResultExam !== 'total' ? (
                          examSummary.isPublished ? (
                            <button onClick={() => askConfirm({ title: 'Unpublish results?', message: 'Are you sure you want to unpublish results? Visibility will be removed from student portals.', confirmLabel: 'Unpublish', tone: 'red', onConfirm: () => handleUnpublishResults(selectedResultExam) })} className="ui-btn-secondary">Unpublish</button>
                          ) : (
                            <button
                              onClick={() => askConfirm({ title: 'Publish results?', message: 'Are you sure you want to publish results? This will notify all students and parents.', confirmLabel: 'Publish', onConfirm: () => handlePublishResults(selectedResultExam) })}
                              disabled={isPublishing}
                              className="ui-btn-primary"
                            >
                              <FiSend /> {isPublishing ? 'Publishing…' : 'Publish results'}
                            </button>
                          )
                        ) : (
                          // Overall publish logic
                          examSummary.isPublished ? (
                            <button onClick={() => askConfirm({ title: 'Hide overall results?', message: 'Are you sure you want to unpublish overall results? Final transcripts will be hidden.', confirmLabel: 'Hide results', tone: 'red', onConfirm: () => handleUnpublishOverall(selectedResultClass) })} className="ui-btn-secondary">Hide results</button>
                          ) : (
                            <button
                              onClick={() => askConfirm({ title: 'Publish overall results?', message: 'Are you sure you want to publish the OVERALL CUMULATIVE results? This will make the final transcripts visible to students and parents.', confirmLabel: 'Publish publicly', onConfirm: () => handlePublishOverall(selectedResultClass) })}
                              disabled={isPublishing}
                              className="ui-btn-primary"
                            >
                              <FiSend /> {isPublishing ? 'Publishing…' : 'Publish publicly'}
                            </button>
                          )
                        )}
                        <button onClick={() => window.print()} className={iconBtn} aria-label="Print results" title="Print">
                          <FiPrinter />
                        </button>
                      </div>
                    </div>

                    <div className={`${tableScroll} max-h-[65vh]`}>
                      <table className="w-full text-left min-w-[760px]">
                        <thead>
                          <tr className={theadRow}>
                            <th className={thCls}>Rank</th>
                            <th className={thCls}>Student</th>
                            <th className={`${thCls} text-center`}>Score</th>
                            <th className={thCls}>Proficiency</th>
                            <th className={`${thCls} text-right`}>Report</th>
                          </tr>
                        </thead>
                        <tbody className={tbodyCls}>
                          {(examSummary.results || []).length === 0 && <EmptyRow colSpan={5} icon={FiAward} title="No marks recorded for this selection" />}
                          {(examSummary.results || []).map((res) => (
                            <tr key={res.studentId} className={rowCls}>
                              <td className={tdCls}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${res.rank === 1 ? 'bg-brand-gradient text-white shadow-brand-glow' : res.rank === 2 ? 'bg-ink-900 text-white' : res.rank === 3 ? 'bg-brand-200 text-brand-900' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                                  {res.rank <= 3 ? <span className="flex items-center gap-0.5"><FiAward className="text-xs" />{res.rank}</span> : res.rank}
                                </div>
                              </td>
                              <td className={tdCls}>
                                <p className="font-bold text-sm text-gray-900 dark:text-white">{res.name}</p>
                                <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1"><FiHash />{res.rollNo}</p>
                              </td>
                              <td className={`${tdCls} text-center`}>
                                <p className="font-extrabold text-gray-900 dark:text-white">{res.totalObtained}</p>
                                <p className="text-[11px] text-gray-400">of {res.totalMax}</p>
                              </td>
                              <td className={`${tdCls} min-w-[12rem]`}>
                                <div className="flex items-center gap-3">
                                  <ProgressBar value={parseFloat(res.percentage)} className="flex-1" barClass={parseFloat(res.percentage) >= 40 ? 'bg-brand-gradient' : 'bg-red-500'} />
                                  <span className="font-extrabold text-sm text-gray-900 dark:text-white w-14 text-right tabular-nums">{res.percentage}%</span>
                                </div>
                              </td>
                              <td className={`${tdCls} text-right`}>
                                <button onClick={() => setViewingReportCard(res)} className="ui-btn-dark !py-2 !text-xs">
                                  <FiFileText /> {selectedResultExam === 'total' ? 'Final transcript' : 'View report'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            {/* ============================ COMMUNICATION ============================ */}
            {activeTab === 'communication' && (
              <>
                <PageHeader icon={FiVolume2} eyebrow="Engagement" title="Notice center" subtitle="Broadcast updates to your entire academic community" />
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 md:gap-6">
                  <form onSubmit={handleNoticeSubmit} className="xl:col-span-3 ui-card p-5 md:p-7 space-y-5">
                    <div>
                      <p className={labelCls}>Audience</p>
                      <div className="flex flex-wrap gap-2">
                        {['student', 'parent', 'teacher'].map(role => {
                          const on = newNotice.targetRoles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                const roles = newNotice.targetRoles.includes(role)
                                  ? newNotice.targetRoles.filter(r => r !== role)
                                  : [...newNotice.targetRoles, role];
                                setNewNotice({ ...newNotice, targetRoles: roles });
                              }}
                              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold capitalize transition-all active:scale-95 ${on ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-brand-600'}`}
                            >
                              {on ? <FiCheck /> : <FiPlus className="opacity-50" />} {role}s
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className={labelCls} htmlFor="notice-title">Heading</label>
                      <input
                        id="notice-title"
                        type="text"
                        placeholder="Holiday update / Exam schedule…"
                        className={`${inputCls} text-base font-bold`}
                        value={newNotice.title}
                        onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelCls} htmlFor="notice-content">Message</label>
                      <textarea
                        id="notice-content"
                        rows="6"
                        placeholder="Detailed announcement content goes here…"
                        className={`${inputCls} resize-none leading-relaxed`}
                        value={newNotice.content}
                        onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                        required
                      />
                      <p className="text-right text-[11px] text-gray-400 mt-1">{newNotice.content.length} characters</p>
                    </div>

                    <label className="flex items-center gap-4 p-4 rounded-2xl ring-1 ring-brand-100 dark:ring-white/10 bg-brand-50/60 dark:bg-white/5 cursor-pointer group hover:bg-brand-50 transition-all">
                      <span className="w-10 h-10 rounded-xl bg-white dark:bg-ink-800 text-brand-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><FiMail /></span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">Also send via email</span>
                        <span className="block text-xs text-gray-500">Delivers a copy to every recipient&apos;s inbox</span>
                      </span>
                      <span className="relative inline-flex items-center">
                        <input
                          id="sendEmailToggle"
                          type="checkbox"
                          className="sr-only peer"
                          checked={newNotice.sendEmail}
                          onChange={(e) => {
                            console.log('Toggle Changed:', e.target.checked);
                            setNewNotice({ ...newNotice, sendEmail: e.target.checked });
                          }}
                        />
                        <span className="w-11 h-6 bg-gray-300 dark:bg-white/20 rounded-full peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow after:transition-all peer-checked:after:translate-x-5" />
                      </span>
                    </label>

                    <button type="submit" className="ui-btn-primary w-full !py-3.5 !text-base">
                      <FiSend /> Publish broadcast
                    </button>
                  </form>

                  {/* Live preview */}
                  <div className="xl:col-span-2 space-y-3">
                    <p className={labelSm}>Live preview</p>
                    <div className="relative overflow-hidden ui-card p-5">
                      <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
                      <div className="flex items-center gap-3 mb-3">
                        <img src={oasisLogo} alt="" className="w-10 h-10 object-contain rounded-xl bg-white p-1 ring-1 ring-gray-100" />
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Oasis JEE Classes</p>
                          <p className="text-[11px] text-gray-400">Just now · Notice</p>
                        </div>
                      </div>
                      <h4 className={`font-extrabold text-lg break-words ${newNotice.title ? 'text-gray-900 dark:text-white' : 'text-gray-300'}`}>{newNotice.title || 'Your heading appears here'}</h4>
                      <p className={`mt-2 text-sm whitespace-pre-line break-words leading-relaxed ${newNotice.content ? 'text-gray-600 dark:text-gray-300' : 'text-gray-300'}`}>{newNotice.content || 'Start typing your message to see how students and parents will read it.'}</p>
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {newNotice.targetRoles.map(r => <Badge key={r} tone="brand">{r}s</Badge>)}
                        {newNotice.sendEmail && <Badge tone="dark"><FiMail /> Email</Badge>}
                        {newNotice.targetRoles.length === 0 && <Badge tone="red">No audience selected</Badge>}
                      </div>
                    </div>
                  </div>
                </div>

                <NoticeHistory reloadKey={noticeReloadKey} />
              </>
            )}

            {/* ============================ PROFILE ============================ */}
            {activeTab === 'profile' && (
              <div className="max-w-3xl mx-auto">
                <div className="ui-card overflow-hidden">
                  <div className="relative h-36 bg-brand-sunset">
                    <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                  </div>
                  <div className="px-6 md:px-8 pb-8">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-14">
                      <div className="relative group w-32 h-32 rounded-3xl ring-4 ring-white dark:ring-ink-900 shadow-card-hover overflow-hidden bg-brand-gradient flex items-center justify-center text-5xl text-white font-extrabold shrink-0">
                        {photoPreview ? (
                          <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                        ) : (user?.profilePhoto || profile?.profilePhoto) ? (
                          <img
                            src={myPhoto}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=f37021&color=fff&bold=true`;
                            }}
                          />
                        ) : profile.name?.charAt(0)}
                        <label className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer backdrop-blur-sm">
                          <FiCamera className="text-white text-2xl mb-1" />
                          <span className="text-[11px] font-bold text-white">Update photo</span>
                          <input type="file" className="sr-only" onChange={handlePhotoChange} accept="image/*" />
                        </label>
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white truncate">{profile.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge tone="brand" dot pulse>Oasis administrator</Badge>
                        </div>
                      </div>
                    </div>

                    {photoPreview && (
                      <div className="flex flex-wrap gap-2.5 mt-5 p-3 rounded-2xl bg-brand-50 dark:bg-white/5 animate-fade-up">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1 self-center">New photo selected — save it?</p>
                        <button onClick={handleQuickPhotoUpload} disabled={uploadingPhoto} className="ui-btn-primary">
                          {uploadingPhoto ? <FiRefreshCw className="animate-spin" /> : <FiCheckCircle />} Confirm change
                        </button>
                        <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="ui-btn-secondary">Revert</button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                      {[
                        { icon: FiUsers, label: 'Full name', value: profile.name },
                        { icon: FiHash, label: 'Admin ID', value: `#${profile._id?.slice(-8).toUpperCase() || ''}`, mono: true },
                        { icon: FiPhone, label: 'Phone', value: profile.phone || '91XXXXXXXX' },
                        { icon: FiMail, label: 'Email', value: profile.email || '—' },
                      ].map(f => (
                        <div key={f.label} className="flex items-center gap-3.5 p-4 rounded-2xl ring-1 ring-gray-100 dark:ring-white/5 hover:ring-brand-200 transition-all">
                          <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0"><f.icon /></span>
                          <div className="min-w-0">
                            <p className={labelSm}>{f.label}</p>
                            <p className={`font-bold text-gray-900 dark:text-white truncate ${f.mono ? 'font-mono text-brand-600' : ''}`}>{f.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <PreferencesCard />
                    <button className="ui-btn-dark w-full mt-6 !py-3">
                      <FiShield /> Security settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileBottomNav activeTab={activeTab} onNavigate={navigate} badges={navBadges} nav={nav} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} actions={paletteActions} nav={nav} />
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        onConfirm={confirmState?.onConfirm}
        onClose={() => setConfirmState(null)}
      />

      {/* Teacher attendance history */}
      {viewingAttendanceTeacher && (
        <Modal
          icon={FiClock}
          title="Attendance history"
          subtitle={viewingAttendanceTeacher.name}
          onClose={() => setViewingAttendanceTeacher(null)}
          maxWidth="max-w-2xl"
          bodyClass="p-0"
          footer={<button onClick={() => setViewingAttendanceTeacher(null)} className="ui-btn-dark">Close</button>}
        >
          <table className="w-full text-left">
            <thead>
              <tr className={theadRow}>
                <th className={thCls}>Date</th>
                <th className={thCls}>Session / class</th>
                <th className={thCls}>Time</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {teacherAttendanceLogs.map(log => (
                <tr key={log._id} className={rowCls}>
                  <td className={`${tdCls} font-semibold text-sm text-gray-800 dark:text-gray-200`}>{new Date(log.date).toLocaleDateString()}</td>
                  <td className={tdCls}><Badge tone="brand">{log.className || 'General'}</Badge></td>
                  <td className={`${tdCls} font-mono text-xs text-gray-500`}>{log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString() : '-'}</td>
                  <td className={tdCls}><Badge tone={log.status === 'present' ? 'green' : 'red'} dot>{log.status}</Badge></td>
                </tr>
              ))}
              {teacherAttendanceLogs.length === 0 && (
                <EmptyRow colSpan={4} icon={FiClock} title="No attendance records found" />
              )}
            </tbody>
          </table>
        </Modal>
      )}

      {/* Add exam */}
      {showAddExamModal && (
        <Modal icon={FiAward} title="Create exam" subtitle="Subjects for the selected class are attached automatically" onClose={() => setShowAddExamModal(false)}>
          <form onSubmit={handleCreateExam} className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="exam-name">Exam title</label>
              <input id="exam-name" type="text" required className={inputCls} placeholder="e.g. Phase 1 - Monthly Test" value={examForm.name} onChange={e => setExamForm({ ...examForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="exam-type">Category</label>
                <select id="exam-type" className={inputCls} value={examForm.type} onChange={e => setExamForm({ ...examForm, type: e.target.value })}>
                  <option value="unit">Unit Test</option>
                  <option value="monthly">Monthly Test</option>
                  <option value="final">Final Exam</option>
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="exam-date">Date</label>
                <input id="exam-date" type="date" required className={inputCls} value={examForm.date} onChange={e => setExamForm({ ...examForm, date: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button type="button" onClick={() => setShowAddExamModal(false)} className="ui-btn-secondary">Cancel</button>
              <button type="submit" className="ui-btn-primary"><FiPlus /> Create exam</button>
            </div>
          </form>
        </Modal>
      )}

      {showBulkImport && (
        <BulkImportModal
          classes={availableClasses}
          onClose={() => setShowBulkImport(false)}
          onImported={() => { fetchUsers(); fetchAllStudents(); }}
        />
      )}

      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onCreated={() => { fetchUsers(); fetchAllStudents(); }}
        />
      )}

      {/* Teacher assignment modal */}
      {showAssignModal && editingTeacher && (
        <Modal icon={FiSettings} title="Manage assignments" subtitle={editingTeacher.name} onClose={() => setShowAssignModal(false)} maxWidth="max-w-lg">
          <form onSubmit={handleUpdateTeacherAssignments} className="space-y-6">
            <ChipToggleGroup label="Subjects" options={SUBJECT_OPTIONS} value={assignForm.subjects} onChange={(v) => setAssignForm({ ...assignForm, subjects: v })} />
            <ChipToggleGroup label="Classes" options={CLASS_OPTIONS} value={assignForm.classes} onChange={(v) => setAssignForm({ ...assignForm, classes: v })} />
            <ChipToggleGroup label="Batches" options={BATCH_OPTIONS} value={assignForm.batches} onChange={(v) => setAssignForm({ ...assignForm, batches: v })} />
            <div className="flex justify-end gap-2.5 pt-2">
              <button type="button" onClick={() => setShowAssignModal(false)} className="ui-btn-secondary">Cancel</button>
              <button type="submit" className="ui-btn-primary"><FiCheck /> Update assignments</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Test results */}
      {showTestResultsModal && selectedTestResults && (
        <Modal
          icon={FiTrendingUp}
          title={selectedTestResults.title}
          subtitle={`${selectedTestResults.subjectId?.name || 'Subject'} · ${new Date(selectedTestResults.createdAt).toLocaleDateString()} · ${selectedTestResults.totalMarks} marks · ${selectedTestResults.questions?.length || 0} questions`}
          onClose={() => setShowTestResultsModal(false)}
          maxWidth="max-w-4xl"
          bodyClass="p-0"
          z="z-[210]"
          footer={<button onClick={() => setShowTestResultsModal(false)} className="ui-btn-dark">Close report</button>}
        >
          {loadingResults ? (
            <div className="p-6 space-y-3">{[0, 1, 2, 3].map(i => <SkeletonBlock key={i} className="h-12 !rounded-xl" />)}</div>
          ) : (
            <div className={tableScroll}>
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className={theadRow}>
                    <th className={thCls}>Rank</th>
                    <th className={thCls}>Student</th>
                    <th className={`${thCls} text-center`}>Score</th>
                    <th className={thCls}>Efficiency</th>
                    <th className={`${thCls} text-right`}>Status</th>
                  </tr>
                </thead>
                <tbody className={tbodyCls}>
                  {selectedTestResults.results && selectedTestResults.results.length > 0 ? (
                    selectedTestResults.results.map((result, index) => {
                      const percentage = Math.round((result.score / selectedTestResults.totalMarks) * 100);
                      return (
                        <tr key={result._id} className={rowCls}>
                          <td className={tdCls}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs ${index === 0 ? 'bg-brand-gradient text-white' : index === 1 ? 'bg-ink-900 text-white' : index === 2 ? 'bg-brand-200 text-brand-900' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className={tdCls}>
                            <div className="flex items-center gap-3">
                              <Avatar name={result.studentId?.name || '?'} size="sm" />
                              <div>
                                <p className="font-bold text-sm text-gray-900 dark:text-white">{result.studentId?.name || 'Unknown Student'}</p>
                                <p className="text-[11px] text-gray-400">ID: {(result.studentId?._id || '').slice(-6)}</p>
                              </div>
                            </div>
                          </td>
                          <td className={`${tdCls} text-center`}>
                            <span className="font-extrabold text-brand-600 text-base">{result.score}</span>
                            <span className="text-gray-400 text-xs font-semibold">/{selectedTestResults.totalMarks}</span>
                          </td>
                          <td className={`${tdCls} min-w-[10rem]`}>
                            <div className="flex items-center gap-2">
                              <ProgressBar value={percentage} className="flex-1" barClass={percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-brand-500' : 'bg-red-500'} />
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-10 text-right">{percentage}%</span>
                            </div>
                          </td>
                          <td className={`${tdCls} text-right`}>
                            <Badge tone={percentage >= 40 ? 'green' : 'red'}>{percentage >= 40 ? 'Qualified' : 'Needs impr.'}</Badge>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <EmptyRow colSpan={5} icon={FiClipboard} title="No submissions found for this test yet" />
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {/* Report card (printable) */}
      {viewingReportCard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[250] flex items-center justify-center p-4 md:p-10 animate-fade-in print:static print:bg-white print:p-0">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in print:p-0 print:shadow-none print:static print:max-h-none">
            {/* Tool bar - hidden in print */}
            <div className="px-6 py-4 bg-ink-950 text-white flex justify-between items-center shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center"><FiAward /></span>
                <div>
                  <h3 className="font-extrabold text-sm">Academic report preview</h3>
                  <p className="text-[11px] text-gray-400">{viewingReportCard.name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="ui-btn-primary !py-2">
                  <FiPrinter /> Print record
                </button>
                <button onClick={() => setViewingReportCard(null)} className="w-10 h-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center" aria-label="Close report">
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>

            {/* Printable body */}
            <div className="flex-1 overflow-y-auto ui-scrollbar p-6 md:p-12 print:overflow-visible print:p-0 text-gray-900" id="printable-report-card">
              <div className="border-4 border-brand-500 p-1 relative min-h-[1000px] rounded-sm">
                <div className="border border-brand-200 p-8 h-full bg-white relative">
                  {/* Brand header */}
                  <div className="flex justify-between items-start mb-12 border-b-2 border-brand-500 pb-8">
                    <div>
                      <img src={oasisFullLogo} alt="Logo" className="h-16 mb-4 filter contrast-125" />
                      <p className="text-[12px] font-extrabold text-brand-600 uppercase tracking-[0.3em]">Excellence in JEE/NEET Coaching</p>
                    </div>
                    <div className="text-right">
                      <h1 className="text-4xl font-extrabold text-ink-900 mb-1">REPORT CARD</h1>
                      <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">{examSummary?.examName} - 2026</p>
                    </div>
                  </div>

                  {/* Student info */}
                  <div className="grid grid-cols-2 gap-y-10 mb-16 bg-brand-50/40 p-10 rounded-3xl border border-brand-100">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest block mb-1">Student Name</label>
                        <p className="text-2xl font-extrabold text-ink-900 underline underline-offset-4 decoration-brand-200">{viewingReportCard.name}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest block mb-1">Roll Number</label>
                        <p className="text-lg font-bold text-gray-700">{viewingReportCard.rollNo}</p>
                      </div>
                    </div>
                    <div className="space-y-4 text-right">
                      <div>
                        <label className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest block mb-1">Father&apos;s Name</label>
                        <p className="text-lg font-bold text-gray-700">{viewingReportCard.fatherName || 'Not Provided'}</p>
                      </div>
                      <div className="flex justify-end gap-10">
                        <div>
                          <label className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest block mb-1">Class</label>
                          <p className="text-lg font-bold text-brand-600">Standard IX</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest block mb-1">Section</label>
                          <p className="text-lg font-bold text-brand-600">Oasis-A1</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Marks table */}
                  <div className="mb-16">
                    <table className="w-full border-collapse border-2 border-brand-500">
                      <thead>
                        <tr className="bg-brand-500 text-white">
                          <th className="px-4 py-4 text-left font-extrabold text-[10px] uppercase tracking-widest border-r border-brand-400">Subject Name</th>
                          <th className="px-2 py-4 text-center font-extrabold text-[10px] uppercase tracking-widest border-r border-brand-400">Unit Test<br /><span className="text-[8px] opacity-70">(Max: 20)</span></th>
                          <th className="px-2 py-4 text-center font-extrabold text-[10px] uppercase tracking-widest border-r border-brand-400">Monthly Test<br /><span className="text-[8px] opacity-70">(Max: 30)</span></th>
                          <th className="px-2 py-4 text-center font-extrabold text-[10px] uppercase tracking-widest border-r border-brand-400">Final Term<br /><span className="text-[8px] opacity-70">(Max: 50)</span></th>
                          <th className="px-4 py-4 text-center font-extrabold text-[10px] uppercase tracking-widest border-r border-brand-400">Total Marks<br /><span className="text-[8px] opacity-70">(Max: 100)</span></th>
                          <th className="px-4 py-4 text-right font-extrabold text-[10px] uppercase tracking-widest">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {viewingReportCard.subjectResults.map(sub => (
                          <tr key={sub.subjectId}>
                            <td className="px-4 py-4 font-extrabold text-gray-800 border-r border-gray-100">{sub.subjectName}</td>
                            <td className="px-2 py-4 text-center font-bold text-gray-600 border-r border-gray-100 bg-gray-50/30">{sub.unit || 0}</td>
                            <td className="px-2 py-4 text-center font-bold text-gray-600 border-r border-gray-100">{sub.monthly || 0}</td>
                            <td className="px-2 py-4 text-center font-bold text-brand-500 border-r border-gray-100 bg-brand-50/20">{sub.final || 0}</td>
                            <td className="px-4 py-4 text-center font-extrabold text-brand-700 text-lg border-r border-gray-100 bg-brand-50/40">{sub.total || 0}</td>
                            <td className="px-4 py-4 text-right">
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase ${sub.total >= 40 ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'}`}>
                                {sub.total >= 90 ? 'A+' : sub.total >= 80 ? 'A' : sub.total >= 70 ? 'B+' : sub.total >= 60 ? 'B' : sub.total >= 40 ? 'C' : 'FAIL'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-ink-900 text-white">
                          <th className="px-6 py-6 text-left font-extrabold text-[11px] uppercase border-r border-white/10">GRAND TOTAL ASSESSMENT</th>
                          <th colSpan="3" className="px-6 py-6 text-center font-extrabold opacity-60 text-[10px] border-r border-white/10">Manual Ledger Summation</th>
                          <th className="px-6 py-6 text-center font-extrabold text-white text-2xl border-r border-white/10">{viewingReportCard.totalObtained} <span className="text-xs opacity-60">/ {viewingReportCard.totalMax}</span></th>
                          <th className="px-6 py-6 text-right font-extrabold text-brand-300 text-xl">{viewingReportCard.percentage}%</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Performance summary */}
                  <div className="grid grid-cols-3 gap-6 mb-20 text-center">
                    <div className="p-6 bg-gray-50 rounded-2xl">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Rank in Class</label>
                      <p className="text-3xl font-extrabold text-gray-800">{viewingReportCard.rank}</p>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-2xl">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Attendance</label>
                      <p className="text-3xl font-extrabold text-gray-800">{viewingReportCard.attendancePercentage}%</p>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-2xl">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Conduct</label>
                      <p className="text-3xl font-extrabold text-brand-600">{viewingReportCard.conduct}</p>
                    </div>
                  </div>

                  {/* Footer signatures */}
                  <div className="mt-auto flex justify-between items-end pb-12 pt-12 border-t border-gray-100">
                    <div className="text-center w-48">
                      <div className="h-1 bg-gray-200 mb-2"></div>
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Class Teacher</p>
                    </div>
                    <div className="text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-1 bg-brand-500 mb-2"></div>
                        <img src={oasisLogo} alt="Seal" className="w-12 h-12 opacity-20 filter grayscale mb-2" />
                        <p className="text-[10px] font-extrabold text-ink-900 uppercase tracking-[0.2em]">Institute Seal</p>
                      </div>
                    </div>
                    <div className="text-center w-48">
                      <div className="h-1 bg-gray-200 mb-2 italic text-gray-400 text-xs">Principal Signature</div>
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Authorized Signature</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
