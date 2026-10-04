import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import {
    FiMenu, FiBell, FiSun, FiMoon, FiCalendar, FiCheckCircle, FiCreditCard, FiClock, FiDownload,
    FiTrendingUp, FiAward, FiBookOpen, FiFileText, FiChevronRight, FiLock, FiCamera, FiMail, FiPhone,
    FiMapPin, FiUsers, FiX, FiHash, FiShield, FiArrowRight, FiUserX, FiPercent, FiLayers, FiMonitor,
    FiMessageSquare, FiSend, FiSliders, FiGlobe
} from 'react-icons/fi';
import { FaQrcode, FaUniversity, FaBullhorn } from 'react-icons/fa';
import oasisLogo from '../assets/oasis_logo.png';
import oasisFullLogo from '../assets/oasis_full_logo.png';
import receiptBanner from '../assets/receipt_banner.png';
import config from '../config';
import { io } from 'socket.io-client';
import { notify } from '../utils/notify';
import TimetableTab from '../components/parent/TimetableTab';
import TestResultsTab from '../components/parent/TestResultsTab';
import UpcomingClassesCard from '../components/parent/UpcomingClassesCard';
import { EmptyState, CardsSkeleton, SkeletonBlock, ListSkeleton, Panel, Chip, AnimatedBar, ProgressRing } from '../components/parent/ParentUI';
import { resolveFileUrl, paymentStatus, errorMessage, escapeHtml, initials, verdictFor, formatINR, daysUntil } from '../components/parent/parentUtils';
import { openProgressReport } from '../components/parent/progressReport';
import { ParentSidebar, MobileBottomNav, ChildSwitcher } from '../components/parent/ParentShell';
import { HealthCheckRow, AttendanceHeatStrip, PerformanceTrendChart, FeeSnapshotCard, TipCard, DueChip, NoticeCard } from '../components/parent/OverviewWidgets';
import { PaymentTimeline } from '../components/parent/FeesWidgets';
import { NotificationsPanel, NoticeModal, ReportCardModal } from '../components/parent/ParentModals';
import { GradientBanner, StatCard, AnimatedNumber } from '../components/ui/Motion';
import { greeting } from '../components/ui/motionUtils';
import { useI18n } from '../i18n/useI18n';
import ChatPanel from '../components/common/ChatPanel';
import LeaveRequests from '../components/common/LeaveRequests';
import EventCalendar from '../components/common/EventCalendar';
import UpcomingEventsCard from '../components/common/UpcomingEventsCard';
import PushToggle from '../components/common/PushToggle';
import LanguageToggle from '../components/common/LanguageToggle';
import { useChatUnread } from '../components/common/useChatUnread';
import InstallmentPlan from '../components/parent/InstallmentPlan';
import HomeworkTab from '../components/parent/HomeworkTab';
import InsightsTab from '../components/parent/InsightsTab';
import { openInvoice } from '../components/parent/invoice';

const ONLINE_PAY_KEY = config.PAYMENT.PROVIDER === 'Razorpay' ? config.PAYMENT.RAZORPAY_KEY_ID : '';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, ArcElement);

const ParentDashboard = () => {
    const { user, logout, updateUser, loading: authLoading } = useContext(AuthContext);
    const { theme, toggleTheme } = useTheme() || {};
    const { t } = useI18n();
    // Shared socket.io connection (notifications + live chat); set once connected
    const [socket, setSocket] = useState(null);
    const { count: chatUnread } = useChatUnread({ socket });
    const [invoiceBusyId, setInvoiceBusyId] = useState(null);
    const [profile, setProfile] = useState({});
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [marks, setMarks] = useState([]);
    const [onlineTestResults, setOnlineTestResults] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [notices, setNotices] = useState([]);
    const [fees, setFees] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [activeTab, setActiveTab] = useState('Overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [viewingReportCard, setViewingReportCard] = useState(null);
    const [cumulativeSummary, setCumulativeSummary] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', address: '' });
    const [testAnalysis, setTestAnalysis] = useState(null);
    const [reportMonth, setReportMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    // Per-section loading flags (start true so tabs show skeletons until first load)
    const [loadingState, setLoadingState] = useState({
        children: true, attendance: true, marks: true, fees: true, tests: true, analysis: true, materials: true, notices: true
    });
    const setLoadingFor = (key, value) => setLoadingState(prev => ({ ...prev, [key]: value }));

    // Razorpay Loader
    const loadRazorpay = () => {
        if (window.Razorpay) return Promise.resolve(true);
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [onlinePayUnavailable, setOnlinePayUnavailable] = useState(!ONLINE_PAY_KEY);
    const [paymentMethod, setPaymentMethod] = useState(ONLINE_PAY_KEY ? 'Razorpay' : 'UPI');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState({ ref: '', bankName: '', remarks: '' });
    const [justSubmittedManual, setJustSubmittedManual] = useState(false);
    const selectedChildRef = useRef(null);

    useEffect(() => {
        if (user?.id) {
            fetchProfile();
            fetchChildren();
            fetchMaterials();
            fetchNotices();
            fetchNotifications();
        }
    }, [user]);

    // Real-time notifications (server verifies the JWT sent on 'join')
    useEffect(() => {
        if (!user?.id) return undefined;
        const token = sessionStorage.getItem('token');
        if (!token) return undefined;
        const socket = io(config.SOCKET_URL || config.API_URL.replace('/api', ''), { auth: { token } });
        socket.on('connect', () => { socket.emit('join', token); setSocket(socket); });
        socket.on('notification', (newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
            if (newNotif?.title) notify(newNotif.title);
            // Fee approvals/rejections should be reflected immediately
            if (/fee|payment/i.test(`${newNotif?.title || ''} ${newNotif?.type || ''}`)) {
                if (selectedChildRef.current) fetchFees(selectedChildRef.current);
            }
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(newNotif.title, { body: newNotif.message });
            }
        });
        return () => {
            socket.off('notification');
            socket.disconnect();
        };
    }, [user?.id]);

    useEffect(() => {
        selectedChildRef.current = selectedChild;
        if (selectedChild) {
            setJustSubmittedManual(false);
            fetchAttendance(selectedChild);
            fetchMarks(selectedChild);
            fetchFees(selectedChild);
            fetchOnlineTestResults(selectedChild);
            fetchTestAnalysis(selectedChild);
        }
    }, [selectedChild]);

    const fetchProfile = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${config.API_URL}/auth/me`, { headers });
            setProfile(res.data);
            setEditForm({ name: res.data.name, phone: res.data.phone, email: res.data.email, address: res.data.address });
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
    };

    // ... (keep handlePhotoChange and handleQuickPhotoUpload same)

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
        formData.append('name', editForm.name);

        try {
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

    const fetchChildren = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        setLoadingFor('children', true);
        try {
            const res = await axios.get(`${config.API_URL}/users/parent/students`, { headers });
            const list = Array.isArray(res.data) ? res.data : [];
            setChildren(list);
            if (list.length > 0) {
                setSelectedChild(list[0]._id);
            } else {
                // Nothing to load for per-child sections
                setLoadingState(prev => ({ ...prev, attendance: false, marks: false, fees: false, tests: false, analysis: false }));
            }
        } catch (err) {
            console.error('Error fetching children:', err);
            setChildren([]);
            setLoadingState(prev => ({ ...prev, attendance: false, marks: false, fees: false, tests: false, analysis: false }));
            notify(errorMessage(err, 'Failed to load linked students'));
        } finally {
            setLoadingFor('children', false);
        }
    };

    const fetchAttendance = async (id) => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        setLoadingFor('attendance', true);
        try {
            const res = await axios.get(`${config.API_URL}/attendance/student/${id}`, { headers });
            setAttendance(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching attendance:', err);
            setAttendance([]);
            notify(errorMessage(err, 'Failed to load attendance'));
        } finally {
            setLoadingFor('attendance', false);
        }
    };

    const fetchMarks = async (id) => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        setLoadingFor('marks', true);
        // allSettled: a missing cumulative summary must not hide the per-exam marks
        const [marksRes, summaryRes] = await Promise.allSettled([
            axios.get(`${config.API_URL}/marks/student/${id}`, { headers }),
            axios.get(`${config.API_URL}/marks/student-summary/${id}`, { headers })
        ]);
        if (marksRes.status === 'fulfilled') {
            setMarks(Array.isArray(marksRes.value.data) ? marksRes.value.data : []);
        } else {
            console.error('Error fetching marks:', marksRes.reason);
            setMarks([]);
            notify(errorMessage(marksRes.reason, 'Failed to load marks'));
        }
        setCumulativeSummary(summaryRes.status === 'fulfilled' ? summaryRes.value.data : null);
        setLoadingFor('marks', false);
    };

    const fetchFees = async (id) => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        setLoadingFor('fees', true);
        try {
            const res = await axios.get(`${config.API_URL}/fees/student/${id}`, { headers });
            setFees(res.data || {});
        } catch (err) {
            console.error('Error fetching fees:', err);
            setFees({});
            notify(errorMessage(err, 'Failed to load fee details'));
        } finally {
            setLoadingFor('fees', false);
        }
    };

    const fetchOnlineTestResults = async (id) => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        setLoadingFor('tests', true);
        try {
            const res = await axios.get(`${config.API_URL}/tests/student/${id}`, { headers });
            setOnlineTestResults(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching online tests:', err);
            setOnlineTestResults([]);
            notify(errorMessage(err, 'Failed to load online test results'));
        } finally {
            setLoadingFor('tests', false);
        }
    };

    const fetchTestAnalysis = async (id) => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        setLoadingFor('analysis', true);
        try {
            const res = await axios.get(`${config.API_URL}/tests/student/${id}/analysis`, { headers });
            setTestAnalysis(res.data || null);
        } catch (err) {
            console.error('Error fetching test analysis:', err);
            setTestAnalysis(null);
            // 404 just means the analysis endpoint/data isn't available yet
            if (err.response?.status !== 404) notify(errorMessage(err, 'Failed to load test analysis'));
        } finally {
            setLoadingFor('analysis', false);
        }
    };

    const fetchMaterials = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        setLoadingFor('materials', true);
        try {
            const res = await axios.get(`${config.API_URL}/study-material`, { headers });
            setMaterials(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching materials:', err);
            notify(errorMessage(err, 'Failed to load study materials'));
        } finally {
            setLoadingFor('materials', false);
        }
    };

    const fetchNotices = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        setLoadingFor('notices', true);
        try {
            const res = await axios.get(`${config.API_URL}/notices`, { headers });
            setNotices(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching notices:', err);
            notify(errorMessage(err, 'Failed to load notices'));
        } finally {
            setLoadingFor('notices', false);
        }
    };

    const fetchNotifications = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${config.API_URL}/notifications`, { headers });
            setNotifications(res.data);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    const disableOnlinePay = () => {
        setOnlinePayUnavailable(true);
        setPaymentMethod('UPI');
        notify('Online payment coming soon — use UPI/Bank transfer');
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!paymentAmount || Number(paymentAmount) <= 0) return notify('Please enter a valid amount');

        const token = sessionStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (paymentMethod === 'Razorpay') {
            if (onlinePayUnavailable || !ONLINE_PAY_KEY) return disableOnlinePay();
            setPaymentLoading(true);
            try {
                // 1. Load Razorpay SDK
                const sdkLoaded = await loadRazorpay();
                if (!sdkLoaded) {
                    notify('Razorpay SDK failed to load. Are you online?');
                    return;
                }

                // 2. Create Order on Backend (503 = gateway not configured on server)
                const result = await axios.post(`${config.API_URL}/fees/razorpay/create-order`, {
                    amount: paymentAmount,
                    studentId: selectedChild
                }, { headers });

                const { amount, id: order_id, currency } = result.data;

                // 3. Open Razorpay Checkout
                const options = {
                    key: ONLINE_PAY_KEY,
                    amount: amount.toString(),
                    currency: currency,
                    name: "Oasis JEE Classes",
                    description: "Fee Payment Transaction",
                    image: oasisLogo,
                    order_id: order_id,
                    handler: async function (response) {
                        try {
                            const data = {
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                studentId: selectedChild,
                                amount: paymentAmount
                            };

                            await axios.post(`${config.API_URL}/fees/razorpay/verify`, data, { headers });

                            notify('Payment Successful and Verified!');
                            setShowPaymentModal(false);
                            setPaymentAmount('');
                            setPaymentDetails({ ref: '', bankName: '', remarks: '' });
                            fetchFees(selectedChild);
                        } catch (error) {
                            console.error("Verification Error", error);
                            notify("Payment successful but verification failed. Please contact the office with your payment ID.");
                        }
                    },
                    prefill: {
                        name: profile.name,
                        email: profile.email,
                        contact: profile.phone
                    },
                    notes: {
                        address: "Oasis JEE Classes"
                    },
                    theme: {
                        color: "#f37021"
                    }
                };

                const paymentObject = new window.Razorpay(options);
                paymentObject.on?.('payment.failed', () => notify('Payment failed. No amount was captured — please try again.'));
                paymentObject.open();
            } catch (err) {
                console.error('Payment Error Details:', err.response?.data || err.message);
                if (err.response?.status === 503) {
                    disableOnlinePay();
                } else {
                    notify(`Payment Error: ${errorMessage(err, 'Could not connect to payment server')}`);
                }
            } finally {
                setPaymentLoading(false);
            }
            return;
        }

        // Manual/Offline Payment (UPI or Bank transfer) -> stays 'Pending' until admin approves
        if (!paymentDetails.ref.trim()) return notify('Please enter the UTR / transaction reference number');
        setPaymentLoading(true);
        try {
            const sourceNote = paymentDetails.bankName ? `Source: ${paymentDetails.bankName}` : '';
            await axios.post(`${config.API_URL}/fees/pay`, {
                studentId: selectedChild,
                amount: paymentAmount,
                mode: paymentMethod,
                paymentMethod: paymentMethod,
                transactionId: paymentDetails.ref.trim(),
                remarks: `${sourceNote} ${paymentDetails.remarks}`.trim()
            }, { headers });

            notify(`${paymentMethod} payment submitted — awaiting admin approval`);
            setJustSubmittedManual(true);
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentDetails({ ref: '', bankName: '', remarks: '' });
            fetchFees(selectedChild);
        } catch (err) {
            console.error('Payment Error Details:', err.response?.data || err.message);
            notify(`Payment Error: ${errorMessage(err, 'Could not connect to financial server')}`);
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleMarkAllRead = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        try {
            await axios.patch(`${config.API_URL}/notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Error marking notifications as read:', err);
        }
    };

    const toggleNotifications = (e) => {
        e.stopPropagation();
        setIsNotificationsOpen(!isNotificationsOpen);
    };

    // Close notifications when clicking outside
    useEffect(() => {
        const closeNotifications = () => setIsNotificationsOpen(false);
        if (isNotificationsOpen) {
            window.addEventListener('click', closeNotifications);
        }
        return () => window.removeEventListener('click', closeNotifications);
    }, [isNotificationsOpen]);


    const handleDownloadReceipt = (payment) => {
        const receiptNo = payment.transactionId || String(payment._id || '').slice(-8).toUpperCase();
        const bannerSrc = new URL(receiptBanner, window.location.origin).href;
        const receiptContent = `
            <html>
            <head>
                <title>Fee Receipt - ${escapeHtml(receiptNo || 'N/A')}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 40px; }
                    .receipt-box { border: 2px dashed #333; padding: 20px; max-width: 600px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .details { margin-bottom: 20px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                    .footer button { background: #f37021; color: #fff; border: 0; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; }
                    @media print { .footer button { display: none; } body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="receipt-box">
                    <div class="header">
                        <img src="${bannerSrc}" alt="Oasis Header" style="width: 100%; max-height: 150px; object-fit: contain; margin-bottom: 20px;" />
                        <h2>OASIS JEE CLASSES</h2>
                        <p>Official Payment Receipt</p>
                    </div>
                    <div class="details">
                        <div class="row"><span>Date:</span> <span>${new Date(payment.date || payment.createdAt).toLocaleDateString()}</span></div>
                        <div class="row"><span>Receipt No:</span> <span>${escapeHtml(receiptNo)}</span></div>
                        <div class="row"><span>Student Name:</span> <span>${escapeHtml(currentChild?.name || 'Student')}</span></div>
                        <div class="row"><span>Class:</span> <span>${escapeHtml(currentChild?.classId?.name || 'N/A')}</span></div>
                        <div class="row"><span>Mode:</span> <span>${escapeHtml(payment.mode || 'N/A')}</span></div>
                        <hr/>
                        <div class="row"><span>Amount Paid:</span> <span>₹${Number(payment.amount || 0).toLocaleString('en-IN')}</span></div>
                    </div>
                    <div class="footer">
                        <button onclick="window.print()">PRINT RECEIPT</button>
                    </div>
                </div>
            </body>
            </html>
        `;
        const win = window.open('', '', 'width=800,height=600');
        if (!win) return notify('Please allow pop-ups to download the receipt');
        win.document.write(receiptContent);
        win.document.close();
    };

    const handleDownloadInvoice = async (payment) => {
        if (!payment?._id || invoiceBusyId) return;
        setInvoiceBusyId(payment._id);
        try {
            const result = await openInvoice(payment._id, {
                logoUrl: new URL(oasisFullLogo, window.location.origin).href,
                loadingText: t('parent.invoice.preparing'),
            });
            if (result === 'popup') notify(t('parent.invoice.popup'));
        } catch (err) {
            notify(errorMessage(err, t('parent.invoice.failed')));
        } finally {
            setInvoiceBusyId(null);
        }
    };

    // "Pay this installment" → open the existing pay flow with the amount prefilled
    const payInstallment = (amount) => {
        setPaymentAmount(String(amount));
        setShowPaymentModal(true);
    };

    const handleDownloadProgressReport = () => {
        if (!currentChild) return notify('Please select a student first');
        const opened = openProgressReport({
            child: currentChild,
            month: reportMonth,
            attendance,
            marks,
            tests: onlineTestResults,
            analysis: testAnalysis,
            parentName: profile.name || user?.name,
            logoUrl: new URL(oasisFullLogo, window.location.origin).href
        });
        if (!opened) notify('Please allow pop-ups to open the progress report');
    };

    // Derived Data
    const currentChild = children.find(c => c._id === selectedChild);
    const pendingFees = fees.pendingFees || 0;
    const activeNoticesCount = notices.filter(n => n.targetRoles?.includes('parent')).length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const totalDays = attendance.length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    // Overview card: last 30 days only
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAttendance = attendance.filter(a => a.date && new Date(a.date) >= thirtyDaysAgo);
    const recentPresent = recentAttendance.filter(a => a.status === 'present').length;
    const attendance30Percentage = recentAttendance.length > 0 ? Math.round((recentPresent / recentAttendance.length) * 100) : 0;
    const payments = fees.payments || [];
    const pendingPayments = payments.filter(p => paymentStatus(p) === 'Pending');
    const pendingPaymentsTotal = pendingPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    // Filtered Attendance for Tab
    const filteredAttendance = selectedSubject === 'All'
        ? attendance
        : attendance.filter(a => a.subjectId?.name === selectedSubject);

    // Filtered Stats
    const filteredPresent = filteredAttendance.filter(a => a.status === 'present').length;
    const filteredTotal = filteredAttendance.length;
    const filteredPercentage = filteredTotal > 0 ? Math.round((filteredPresent / filteredTotal) * 100) : 0;
    const subjects = ['All', ...new Set(attendance.map(a => a.subjectId?.name).filter(Boolean))];


    // ---------- Presentation-only derived values ----------
    const apiOrigin = config.API_URL.replace('/api', '');
    const photoUrl = (p) => (p?.profilePhoto ? `${apiOrigin}${p.profilePhoto}` : null);
    const firstName = (profile.name || user?.name || 'Parent').split(' ')[0];
    const childFirst = currentChild?.name?.split(' ')[0] || 'Your child';
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const unreadCount = notifications.filter(n => !n.read).length;
    const hasChildren = children.length > 0;

    const monthAttendance = attendance.filter(a => {
        if (!a.date) return false;
        const d = new Date(a.date);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    const monthPct = monthAttendance.length > 0
        ? Math.round((monthAttendance.filter(a => a.status === 'present').length / monthAttendance.length) * 100)
        : null;
    const healthAttendance = recentAttendance.length > 0 ? attendance30Percentage : (totalDays > 0 ? attendancePercentage : null);

    const markPercents = marks.map(m => {
        const max = Number(m.maxMarks) || 100;
        return Math.round(((Number(m.marks) || 0) / max) * 1000) / 10;
    });
    const avgMarkPct = markPercents.length > 0 ? Math.round(markPercents.reduce((a, b) => a + b, 0) / markPercents.length) : null;
    const analysisAvg = testAnalysis?.overall?.testsTaken > 0 ? Math.round(testAnalysis.overall.avgPercentage || 0) : null;
    const healthTests = analysisAvg ?? avgMarkPct;

    const feeTotal = Number(fees.totalFees || 0);
    const feePaid = Number(fees.paidFees || 0);
    const feePaidPct = feeTotal > 0 ? Math.min(100, Math.round((feePaid / feeTotal) * 100)) : null;
    const feeDueDays = daysUntil(fees.dueDate);
    const feeVerdict = feeTotal <= 0
        ? verdictFor(null)
        : pendingFees <= 0
            ? { label: 'Excellent', tone: 'green', color: '#10b981' }
            : feeDueDays !== null && feeDueDays < 0
                ? { label: 'Needs attention', tone: 'red', color: '#f43f5e' }
                : { label: 'Good', tone: 'amber', color: '#f59e0b' };

    const upcomingTests = onlineTestResults
        .filter(t => !t.attempted && t.startTime && new Date(t.startTime) >= today)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const nextTest = upcomingTests[0];
    const openTests = onlineTestResults.filter(t => !t.attempted && (!t.endTime || new Date(t.endTime) >= today)).length;
    const nextTestLabel = nextTest
        ? `Next test: ${new Date(nextTest.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
        : openTests > 0 ? `${openTests} test${openTests > 1 ? 's' : ''} open` : 'No tests scheduled';

    const examSummaries = Object.values(marks.reduce((acc, m) => {
        const examId = m.examId?._id || 'unknown';
        if (!acc[examId]) acc[examId] = { exam: m.examId, subjectResults: [], totalObtained: 0, totalMax: 0 };
        acc[examId].subjectResults.push({
            subjectId: m.subjectId?._id,
            subjectName: m.subjectId?.name || 'Subject',
            obtained: m.marks,
            maxMarks: m.maxMarks || 100
        });
        acc[examId].totalObtained += m.marks;
        acc[examId].totalMax += (m.maxMarks || 100);
        return acc;
    }, {}));

    const openReportCard = (summary) => setViewingReportCard({
        ...summary,
        name: currentChild?.name,
        rollNo: currentChild?.rollNo || 'N/A',
        fatherName: user.name,
        percentage: ((summary.totalObtained / summary.totalMax) * 100).toFixed(1)
    });

    const goTo = (tab) => { setActiveTab(tab); setIsSidebarOpen(false); setMoreOpen(false); };
    const openPayment = () => setShowPaymentModal(true);

    const TAB_META = {
        Overview: { title: t('parent.title.overview'), crumb: t('parent.nav.group.home') },
        Attendance: { title: t('parent.title.attendance'), crumb: t('parent.nav.group.academics') },
        Tests: { title: t('parent.title.tests'), crumb: t('parent.nav.group.academics') },
        Performance: { title: t('parent.title.reportCards'), crumb: t('parent.nav.group.academics') },
        Homework: { title: t('parent.title.homework'), crumb: t('parent.nav.group.academics') },
        Insights: { title: t('parent.title.insights'), crumb: t('parent.nav.group.academics') },
        Timetable: { title: t('parent.title.timetable'), crumb: t('parent.nav.group.academics') },
        Materials: { title: t('parent.title.materials'), crumb: t('parent.nav.group.academics') },
        Fees: { title: t('parent.title.fees'), crumb: t('parent.nav.group.fees') },
        Notices: { title: t('parent.title.notices'), crumb: t('parent.nav.group.fees') },
        Calendar: { title: t('parent.title.calendar'), crumb: t('parent.nav.group.fees') },
        Chat: { title: t('parent.title.chat'), crumb: t('parent.nav.group.connect') },
        Leaves: { title: t('parent.title.leaves'), crumb: t('parent.nav.group.connect') },
        Profile: { title: t('parent.title.profile'), crumb: t('parent.nav.group.account') },
    };
    const navBadges = { Fees: pendingFees > 0 ? 1 : 0, Notices: activeNoticesCount, Chat: chatUnread };
    // Selected child first so the leave form defaults to the child being viewed
    const leaveStudentOptions = currentChild
        ? [currentChild, ...children.filter(c => c._id !== currentChild._id)].map(c => ({ _id: c._id, name: c.name }))
        : children.map(c => ({ _id: c._id, name: c.name }));
    const noChildState = loadingState.children
        ? <CardsSkeleton count={3} />
        : <EmptyState icon={FiUserX} title={t('parent.noChildTitle')} hint={t('parent.noChildHint')} />;

    const renderReportAction = (variant = 'glass') => (
        <div className={`flex items-stretch rounded-xl overflow-hidden ${variant === 'glass' ? 'bg-white/10 ring-1 ring-white/25 backdrop-blur-md' : 'bg-white dark:bg-ink-800 ring-1 ring-gray-200 dark:ring-white/10'}`}>
            <input
                type="month"
                value={reportMonth}
                max={new Date().toISOString().slice(0, 7)}
                onChange={(e) => setReportMonth(e.target.value)}
                aria-label="Report month"
                className={`bg-transparent text-xs font-bold px-3 outline-none border-none focus:ring-0 min-w-0 w-32 ${variant === 'glass' ? 'text-white [color-scheme:dark]' : 'text-gray-700 dark:text-gray-200 dark:[color-scheme:dark]'}`}
            />
            <button
                onClick={handleDownloadProgressReport}
                disabled={!currentChild}
                className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-colors disabled:opacity-50 ${variant === 'glass' ? 'text-white bg-black/25 hover:bg-black/40' : 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100'}`}
            >
                <FiDownload /> Progress report
            </button>
        </div>
    );

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-ink-950">
                <div className="flex flex-col items-center gap-4">
                    <img src={oasisLogo} alt="Oasis" className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-card animate-pulse" />
                    <p className="text-sm font-semibold text-gray-500">{t('parent.loadingDashboard')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#f7f7f8] dark:bg-ink-950 overflow-hidden relative font-sans transition-colors duration-300">
            <ParentSidebar
                activeTab={activeTab}
                onSelect={goTo}
                open={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(c => !c)}
                userName={profile.name || user?.name}
                userPhoto={photoUrl(user)}
                onLogout={logout}
                badges={navBadges}
            />

            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Top bar */}
                <header className="relative z-30 h-[64px] md:h-[72px] shrink-0 ui-glass border-x-0 border-t-0 border-b border-gray-100 dark:border-white/5 flex items-center gap-3 px-3 md:px-8">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 shrink-0" aria-label={t('parent.nav.openMenu')}>
                        <FiMenu className="text-xl" />
                    </button>
                    <div className="hidden md:block min-w-0 shrink-0">
                        <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                            {t('parent.portal')} <FiChevronRight className="text-[10px]" /> {TAB_META[activeTab]?.crumb}
                        </p>
                        <h1 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">{TAB_META[activeTab]?.title}</h1>
                    </div>

                    <div className="flex-1 min-w-0 flex md:justify-center">
                        {loadingState.children
                            ? <SkeletonBlock className="h-9 w-40 rounded-full" />
                            : <ChildSwitcher kids={children} selected={selectedChild} onSelect={setSelectedChild} photoUrl={photoUrl} />}
                    </div>

                    <div className="flex items-center gap-1 md:gap-2 shrink-0">
                        <LanguageToggle className="hidden sm:inline-flex" />
                        <PushToggle compact className="hidden sm:inline-flex" />
                        <button
                            onClick={toggleTheme}
                            className="hidden sm:flex p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-brand-600 transition-colors"
                            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
                        </button>
                        <div className="relative">
                            <button
                                onClick={toggleNotifications}
                                className={`relative p-2.5 rounded-xl transition-colors ${isNotificationsOpen ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
                                aria-expanded={isNotificationsOpen}
                            >
                                <FiBell className="text-lg" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-ink-900 animate-glow">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            {isNotificationsOpen && (
                                <NotificationsPanel
                                    notifications={notifications}
                                    onMarkAllRead={handleMarkAllRead}
                                    onOpen={(n) => { setSelectedNotice(n); setIsNotificationsOpen(false); }}
                                    onClose={() => setIsNotificationsOpen(false)}
                                />
                            )}
                        </div>
                        <button onClick={() => goTo('Profile')} className="flex items-center gap-2.5 pl-1 md:pl-2 pr-1 md:pr-3 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" aria-label="My profile">
                            <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white text-xs font-extrabold flex items-center justify-center overflow-hidden shadow-brand-soft">
                                {photoUrl(user) ? <img src={photoUrl(user)} alt="" className="w-full h-full object-cover" /> : initials(user?.name || 'P')}
                            </span>
                            <span className="hidden xl:block text-left">
                                <span className="block text-xs font-bold text-gray-900 dark:text-white leading-tight">{user?.name || 'Parent'}</span>
                                <span className="block text-[10px] font-semibold text-gray-400">{t('parent.guardian')}</span>
                            </span>
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="relative flex-1 overflow-y-auto ui-scrollbar scroll-smooth">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-brand-mesh opacity-70 dark:opacity-30" />
                    <div key={activeTab} className="relative max-w-7xl mx-auto px-4 md:px-8 pt-5 md:pt-8 pb-28 lg:pb-12 space-y-6 animate-fade-up">

                        {/* ================= OVERVIEW ================= */}
                        {activeTab === 'Overview' && (
                            <>
                                <GradientBanner
                                    title={`${greeting()}, ${firstName} 👋`}
                                    subtitle={hasChildren ? `${t('parent.heading.weekGlance', { name: childFirst })} · ${todayStr}` : todayStr}
                                    right={
                                        <div className="flex flex-col gap-2 w-full md:w-auto">
                                            <button onClick={openPayment} disabled={!selectedChild} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-ink-900 font-bold text-sm shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-60">
                                                <FiCreditCard className="text-brand-600" /> {pendingFees > 0 ? t('parent.payAmount', { amount: formatINR(pendingFees) }) : t('parent.makePayment')}
                                            </button>
                                            {renderReportAction()}
                                        </div>
                                    }
                                >
                                    {hasChildren && (
                                        <div className="flex flex-wrap gap-2">
                                            <Chip tone="glass" icon={FiCheckCircle}>
                                                {monthPct === null ? 'No attendance this month' : `${monthPct}% attendance this month`}
                                            </Chip>
                                            <Chip tone="glass" icon={FiMonitor}>{nextTestLabel}</Chip>
                                            <Chip tone="glass" icon={pendingFees > 0 ? FiClock : FiCheckCircle}>
                                                {pendingFees > 0
                                                    ? `${formatINR(pendingFees)} due${feeDueDays !== null ? (feeDueDays < 0 ? ' · overdue' : feeDueDays === 0 ? ' today' : ` in ${feeDueDays}d`) : ''}`
                                                    : 'Fees cleared'}
                                            </Chip>
                                        </div>
                                    )}
                                </GradientBanner>

                                {!loadingState.children && !hasChildren ? (
                                    <EmptyState
                                        icon={FiUserX}
                                        title={t('parent.noChildTitle')}
                                        hint={t('parent.noChildHint')}
                                    />
                                ) : (
                                    <>
                                        <HealthCheckRow
                                            attendancePct={healthAttendance}
                                            testPct={healthTests}
                                            feePct={feePaidPct}
                                            feeVerdict={feeVerdict}
                                            attendanceDetail={recentAttendance.length > 0 ? `${recentPresent}/${recentAttendance.length} classes · last 30 days` : totalDays > 0 ? `${presentDays}/${totalDays} classes overall` : 'No classes recorded'}
                                            testDetail={analysisAvg !== null ? `${testAnalysis.overall.testsTaken} online test${testAnalysis.overall.testsTaken > 1 ? 's' : ''}` : marks.length > 0 ? `${marks.length} published mark${marks.length > 1 ? 's' : ''}` : 'No results yet'}
                                            feeDetail={feeTotal > 0 ? `${formatINR(feePaid)} of ${formatINR(feeTotal)}` : 'No fee plan yet'}
                                            loading={loadingState}
                                            onNavigate={goTo}
                                        />

                                        {pendingPayments.length > 0 && (
                                            <button onClick={() => goTo('Fees')} className="w-full text-left p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/20 flex items-center gap-4 hover:shadow-card transition-all">
                                                <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0"><FiClock /></span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-sm font-bold text-amber-900 dark:text-amber-200">Payment awaiting approval</span>
                                                    <span className="block text-xs text-amber-800/80 dark:text-amber-300/80">{formatINR(pendingPaymentsTotal)} submitted via UPI/Bank transfer is being verified by the office.</span>
                                                </span>
                                                <FiChevronRight className="text-amber-500 shrink-0" />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <Panel
                                                className="lg:col-span-2"
                                                title={t('parent.heading.performanceTrend')}
                                                subtitle={t('parent.heading.performanceTrendHint')}
                                                icon={FiTrendingUp}
                                                action={<button onClick={() => goTo('Performance')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1">Report cards <FiArrowRight /></button>}
                                            >
                                                <PerformanceTrendChart
                                                    labels={marks.map(m => m.subjectId?.name || m.examId?.name || 'Test')}
                                                    values={markPercents}
                                                    loading={loadingState.marks}
                                                    emptyHint="Exam marks will be plotted here once published."
                                                />
                                            </Panel>
                                            <FeeSnapshotCard
                                                fees={fees}
                                                pendingApprovalTotal={pendingPaymentsTotal}
                                                loading={loadingState.fees}
                                                onPay={openPayment}
                                                onHistory={() => goTo('Fees')}
                                                canPay={!!selectedChild}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className="lg:col-span-2">
                                                <AttendanceHeatStrip attendance={attendance} loading={loadingState.attendance} onOpen={() => goTo('Attendance')} />
                                            </div>
                                            <TipCard />
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {selectedChild && <UpcomingClassesCard key={selectedChild} studentId={selectedChild} />}
                                    <Panel
                                        className={selectedChild ? '' : 'lg:col-span-2'}
                                        title={t('parent.heading.latestNotices')}
                                        subtitle={t('parent.heading.fromInstitute')}
                                        icon={FaBullhorn}
                                        action={<button onClick={() => goTo('Notices')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1">{t('parent.viewAll')} <FiArrowRight /></button>}
                                    >
                                        {loadingState.notices ? <ListSkeleton rows={3} /> : notices.length === 0 ? (
                                            <EmptyState icon={FaBullhorn} title="No recent updates" hint="Announcements will appear here." />
                                        ) : (
                                            <div className="space-y-3 ui-stagger">
                                                {notices.slice(0, 3).map((notice, idx) => (
                                                    <NoticeCard key={notice._id || idx} notice={notice} onClick={() => setSelectedNotice(notice)} compact />
                                                ))}
                                            </div>
                                        )}
                                    </Panel>
                                </div>

                                <UpcomingEventsCard limit={5} onViewAll={() => goTo('Calendar')} />
                            </>
                        )}

                        {/* ================= FEES ================= */}
                        {activeTab === 'Fees' && (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <Panel
                                        className="lg:col-span-2"
                                        title={t('parent.heading.feeSummary')}
                                        subtitle={currentChild ? t('parent.heading.forChild', { name: currentChild.name }) : t('parent.heading.selectStudent')}
                                        icon={FiCreditCard}
                                        action={!loadingState.fees && <DueChip pending={pendingFees} dueDate={fees.dueDate} />}
                                    >
                                        {loadingState.fees ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-24" />)}</div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 ui-stagger">
                                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total fee</p>
                                                        <p className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight"><AnimatedNumber value={feeTotal} prefix="₹" /></p>
                                                    </div>
                                                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paid</p>
                                                        <p className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 tracking-tight"><AnimatedNumber value={feePaid} prefix="₹" /></p>
                                                    </div>
                                                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10">
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Pending due</p>
                                                        <p className="mt-1 text-2xl font-extrabold text-rose-700 dark:text-rose-300 tracking-tight"><AnimatedNumber value={Number(fees.pendingFees || 0)} prefix="₹" /></p>
                                                        {pendingPaymentsTotal > 0 && (
                                                            <p className="text-[11px] font-bold text-amber-600 mt-1">{formatINR(pendingPaymentsTotal)} awaiting approval</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-6">
                                                    <div className="flex justify-between text-xs font-bold mb-2">
                                                        <span className="text-gray-600 dark:text-gray-300">Paid vs pending</span>
                                                        <span className="text-gray-400">{feePaidPct ?? 0}% paid</span>
                                                    </div>
                                                    <AnimatedBar value={feePaidPct ?? 0} className="h-3" barClassName={feePaidPct >= 100 ? 'bg-emerald-500' : 'bg-brand-gradient'} />
                                                </div>
                                            </>
                                        )}

                                        {(justSubmittedManual || pendingPayments.length > 0) && (
                                            <div className="mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/20 flex items-start gap-3">
                                                <span className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0"><FiClock /></span>
                                                <div>
                                                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Awaiting approval</p>
                                                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                                                        Your UPI / bank transfer details have been received. The office will verify the transaction and the amount will move to &quot;Paid&quot; once approved, usually within 1 working day. You will be notified when it is approved.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                                            <button onClick={openPayment} disabled={!selectedChild} className="ui-btn-primary px-6 py-3">
                                                <FiCreditCard /> {onlinePayUnavailable ? 'Submit UPI / Bank Payment' : 'Pay Online / Direct'}
                                            </button>
                                            {onlinePayUnavailable && (
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                    <FiLock className="text-brand-500" /> Online payment coming soon — use UPI/Bank transfer
                                                </p>
                                            )}
                                        </div>
                                    </Panel>

                                    <div className="rounded-3xl p-5 md:p-6 bg-brand-dark text-white relative overflow-hidden">
                                        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-brand-500/20 blur-2xl" />
                                        <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300 flex items-center gap-2"><FiShield /> {t('parent.heading.howPayments')}</p>
                                        <ol className="relative mt-4 space-y-4">
                                            {[
                                                { t: 'Pay the institute', d: 'Via UPI or bank transfer (details at the Oasis front office).' },
                                                { t: 'Submit the reference', d: 'Enter the UTR / transaction number using the payment button.' },
                                                { t: 'Office verifies', d: 'Usually within 1 working day — you get notified and a receipt unlocks.' },
                                            ].map((s, i) => (
                                                <li key={s.t} className="flex gap-3">
                                                    <span className="w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-extrabold flex items-center justify-center shrink-0">{i + 1}</span>
                                                    <span>
                                                        <span className="block text-sm font-bold">{s.t}</span>
                                                        <span className="block text-xs text-white/65 leading-relaxed">{s.d}</span>
                                                    </span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>

                                {selectedChild && (
                                    <InstallmentPlan
                                        key={selectedChild}
                                        studentId={selectedChild}
                                        onPay={payInstallment}
                                        refreshKey={`${fees.paidFees || 0}-${payments.length}`}
                                    />
                                )}

                                <Panel title={t('parent.heading.paymentHistory')} subtitle={t('parent.heading.paymentHistoryHint')} icon={FiFileText}>
                                    {loadingState.fees ? (
                                        <ListSkeleton rows={3} />
                                    ) : payments.length === 0 ? (
                                        <EmptyState
                                            icon={FiFileText}
                                            title="No payments recorded yet"
                                            hint="Payments you make or submit will appear here with their status."
                                            action={selectedChild && <button onClick={openPayment} className="ui-btn-primary"><FiCreditCard /> Make a payment</button>}
                                        />
                                    ) : (
                                        <PaymentTimeline
                                            payments={payments}
                                            onReceipt={handleDownloadReceipt}
                                            onInvoice={handleDownloadInvoice}
                                            invoiceLabel={t('parent.invoice.download')}
                                            invoiceBusyId={invoiceBusyId}
                                        />
                                    )}
                                </Panel>
                            </>
                        )}

                        {/* ================= ATTENDANCE ================= */}
                        {activeTab === 'Attendance' && (loadingState.attendance ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[0, 1, 2, 3].map(i => <SkeletonBlock key={i} className="h-28 rounded-3xl" />)}
                                </div>
                                <SkeletonBlock className="h-96 rounded-3xl" />
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ui-stagger">
                                    <StatCard icon={FiLayers} label="Total classes" value={filteredTotal} tone="dark" />
                                    <StatCard icon={FiCheckCircle} label="Present" value={filteredPresent} tone="green" />
                                    <StatCard icon={FiX} label="Absent" value={filteredTotal - filteredPresent} tone="red" />
                                    <StatCard
                                        icon={FiPercent}
                                        label="Attendance"
                                        value={filteredPercentage}
                                        suffix="%"
                                        tone={filteredPercentage >= 75 ? 'green' : 'amber'}
                                        hint={filteredTotal === 0 ? 'No records' : verdictFor(filteredPercentage, { good: 85, ok: 75 }).label}
                                    />
                                </div>

                                <AttendanceHeatStrip attendance={attendance} loading={false} onOpen={() => document.getElementById('attendance-calendar')?.scrollIntoView({ behavior: 'smooth' })} />

                                <div id="attendance-calendar" className="ui-card p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center"><FiCalendar /></span>
                                        <div>
                                            <h2 className="text-base md:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">{t('parent.heading.attendanceCalendar')}</h2>
                                            <p className="text-xs text-gray-500">Filter by subject</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist" aria-label="Filter by subject">
                                        {subjects.map(sub => (
                                            <button
                                                key={sub}
                                                role="tab"
                                                aria-selected={selectedSubject === sub}
                                                onClick={() => setSelectedSubject(sub)}
                                                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${selectedSubject === sub ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900 shadow-card' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-700'}`}
                                            >
                                                {sub}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {Object.entries(
                                    filteredAttendance.reduce((acc, curr) => {
                                        const date = new Date(curr.date);
                                        const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                                        if (!acc[monthKey]) acc[monthKey] = [];
                                        acc[monthKey].push(curr);
                                        return acc;
                                    }, {})
                                ).reverse().map(([monthYear, monthDays]) => {
                                    const [mName, yName] = monthYear.split(' ');
                                    const monthDate = new Date(`${mName} 1, ${yName}`);
                                    const mIdx = monthDate.getMonth();
                                    const daysInMonth = new Date(yName, mIdx + 1, 0).getDate();
                                    const firstDay = new Date(yName, mIdx, 1).getDay();
                                    const mPresent = monthDays.filter(d => d.status === 'present').length;
                                    const mAbsent = monthDays.filter(d => d.status === 'absent').length;
                                    const mPct = mPresent + mAbsent > 0 ? Math.round((mPresent / (mPresent + mAbsent)) * 100) : 0;

                                    return (
                                        <section key={monthYear} className="ui-card p-5 md:p-7">
                                            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                                                <div>
                                                    <h3 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{monthYear}</h3>
                                                    <div className="flex gap-4 mt-1 text-xs font-semibold text-gray-500">
                                                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> Present {mPresent}</span>
                                                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-rose-500 rounded-full" /> Absent {mAbsent}</span>
                                                    </div>
                                                </div>
                                                <ProgressRing value={mPct} size={56} stroke={6} color={verdictFor(mPct, { good: 85, ok: 75 }).color}>
                                                    <span className="text-xs font-extrabold text-gray-900 dark:text-white">{mPct}%</span>
                                                </ProgressRing>
                                            </div>

                                            <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                                    <div key={day} className="text-center text-[10px] md:text-[11px] font-bold text-gray-400 py-1 uppercase tracking-wider">{day}</div>
                                                ))}
                                                {Array.from({ length: firstDay }).map((_, i) => (
                                                    <div key={`empty-${i}`} className="h-10 md:h-14"></div>
                                                ))}
                                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                                    const dNum = i + 1;
                                                    const attendanceRecord = monthDays.find(ad => new Date(ad.date).getDate() === dNum);
                                                    const isPresent = attendanceRecord?.status === 'present';
                                                    const isAbsent = attendanceRecord?.status === 'absent';
                                                    return (
                                                        <div
                                                            key={dNum}
                                                            title={isPresent ? 'Present' : isAbsent ? 'Absent' : 'No record'}
                                                            className={`h-10 md:h-14 rounded-xl flex items-center justify-center text-xs md:text-sm font-bold transition-transform hover:scale-105
                                                                ${isPresent ? 'bg-emerald-500 text-white shadow-[0_6px_16px_-6px_rgba(16,185,129,0.6)]'
                                                                    : isAbsent ? 'bg-rose-500 text-white shadow-[0_6px_16px_-6px_rgba(244,63,94,0.6)]'
                                                                        : 'bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500'}`}
                                                        >
                                                            {dNum}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    );
                                })}

                                {filteredAttendance.length === 0 && (
                                    <EmptyState icon={FiCalendar} title={`No attendance records found for ${selectedSubject}.`} hint="Records appear here as soon as teachers mark attendance." />
                                )}
                            </>
                        ))}

                        {/* ================= PERFORMANCE / REPORT CARDS ================= */}
                        {activeTab === 'Performance' && loadingState.marks && <CardsSkeleton count={3} height="h-56" />}
                        {activeTab === 'Performance' && !loadingState.marks && (
                            <>
                                <div className="ui-card p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-11 h-11 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-lg shadow-brand-soft"><FiAward /></span>
                                        <div>
                                            <h2 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('parent.heading.resultCentre')}</h2>
                                            <p className="text-sm text-gray-500">Official report cards and monthly progress reports</p>
                                        </div>
                                    </div>
                                    {renderReportAction('light')}
                                </div>

                                {cumulativeSummary && cumulativeSummary.isPublished && (
                                    <div className="relative overflow-hidden rounded-3xl bg-brand-sunset text-white p-6 md:p-8 shadow-brand-glow">
                                        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
                                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex items-start gap-5">
                                                <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-white/15 ring-1 ring-white/25 items-center justify-center text-3xl shrink-0"><FiAward /></div>
                                                <div>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        <span className="ui-badge bg-white/15 ring-1 ring-white/25 text-white">Official record</span>
                                                        <span className="ui-badge bg-black/20 text-white">2025-26</span>
                                                    </div>
                                                    <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">Final cumulative record</h3>
                                                    <p className="text-white/80 text-sm mt-1 max-w-md">Overall academic performance summary including all unit tests, monthly assessments, and attendance records.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between md:justify-end gap-6">
                                                <div className="md:text-right">
                                                    <p className="text-4xl md:text-5xl font-extrabold tracking-tight"><AnimatedNumber value={Number(cumulativeSummary.percentage)} decimals={Number.isInteger(Number(cumulativeSummary.percentage)) ? 0 : 1} suffix="%" /></p>
                                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Aggregate score</p>
                                                </div>
                                                <button
                                                    onClick={() => setViewingReportCard({
                                                        ...cumulativeSummary,
                                                        exam: { name: 'Final Cumulative Result', type: 'Consolidated' },
                                                        name: currentChild?.name,
                                                        fatherName: user.name
                                                    })}
                                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-ink-900 font-bold text-sm shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                                                >
                                                    <FiFileText className="text-brand-600" /> View transcript
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400 mb-3">{t('parent.heading.recentAssessments')}</h3>
                                    {examSummaries.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ui-stagger">
                                            {examSummaries.map((summary, idx) => {
                                                const pct = summary.totalMax > 0 ? (summary.totalObtained / summary.totalMax) * 100 : 0;
                                                const v = verdictFor(pct, { good: 75, ok: 50 });
                                                return (
                                                    <div key={summary.exam?._id || idx} className="ui-card ui-card-hover p-5 flex flex-col">
                                                        <div className="flex items-start gap-4">
                                                            <ProgressRing value={pct} size={64} stroke={6} color={v.color}>
                                                                <span className="text-sm font-extrabold text-gray-900 dark:text-white">{pct.toFixed(0)}%</span>
                                                            </ProgressRing>
                                                            <div className="min-w-0 flex-1">
                                                                <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">{summary.exam?.type || 'Standard'}</span>
                                                                <h4 className="mt-1.5 font-extrabold text-gray-900 dark:text-white leading-snug line-clamp-2">{summary.exam?.name || 'Academic Assessment'}</h4>
                                                                <p className="text-xs text-gray-500 mt-0.5">{summary.totalObtained} / {summary.totalMax} marks</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 space-y-2">
                                                            {summary.subjectResults.slice(0, 3).map((s, i) => (
                                                                <div key={s.subjectId || i}>
                                                                    <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1">
                                                                        <span className="truncate">{s.subjectName}</span><span>{s.obtained}/{s.maxMarks}</span>
                                                                    </div>
                                                                    <AnimatedBar value={(s.obtained / (s.maxMarks || 100)) * 100} className="h-1.5" />
                                                                </div>
                                                            ))}
                                                            {summary.subjectResults.length > 3 && <p className="text-[11px] text-gray-400 font-semibold">+{summary.subjectResults.length - 3} more subjects</p>}
                                                        </div>
                                                        <button onClick={() => openReportCard(summary)} className="ui-btn-dark mt-5 w-full">
                                                            <FiFileText /> View report card
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <EmptyState icon={FiBookOpen} title="No academic reports available yet." hint="Report cards appear here once exam marks are published." />
                                    )}
                                </div>
                            </>
                        )}

                        {/* ================= MATERIALS ================= */}
                        {activeTab === 'Materials' && (
                            loadingState.materials ? <CardsSkeleton count={6} /> : materials.length === 0 ? (
                                <EmptyState icon={FiBookOpen} title="No study materials shared yet" hint="Notes and PDFs uploaded by teachers for your ward's class will appear here." />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ui-stagger">
                                    {materials.map(m => (
                                        <div key={m._id} className="ui-card ui-card-hover group p-5 flex flex-col">
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center text-lg group-hover:bg-brand-gradient group-hover:text-white group-hover:rotate-6 transition-all duration-300"><FiFileText /></span>
                                                {m.subjectId?.name && <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">{m.subjectId.name}</span>}
                                            </div>
                                            <h3 className="mt-4 font-extrabold text-gray-900 dark:text-white truncate">{m.title}</h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">{m.description || 'Study material provided for students.'}</p>
                                            <a
                                                href={resolveFileUrl(m.fileUrl)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download
                                                className="ui-btn-secondary mt-4 w-full"
                                            >
                                                <FiDownload /> Download resource
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ================= NOTICES ================= */}
                        {activeTab === 'Notices' && (
                            <Panel title={t('parent.heading.noticeBoard')} subtitle="Official announcements and circulars" icon={FaBullhorn}
                                action={!loadingState.notices && notices.length > 0 && <Chip tone="brand">{notices.length} notice{notices.length > 1 ? 's' : ''}</Chip>}
                            >
                                {loadingState.notices ? <ListSkeleton rows={4} /> : notices.length === 0 ? (
                                    <EmptyState icon={FaBullhorn} title="No active notices available" hint="Institute announcements and circulars will appear here." />
                                ) : (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 ui-stagger">
                                        {notices.map(notice => (
                                            <NoticeCard key={notice._id} notice={notice} onClick={() => setSelectedNotice(notice)} />
                                        ))}
                                    </div>
                                )}
                            </Panel>
                        )}

                        {/* ================= TESTS ================= */}
                        {activeTab === 'Tests' && (
                            <TestResultsTab
                                key={selectedChild || 'none'}
                                tests={onlineTestResults}
                                loading={loadingState.tests}
                                childName={currentChild?.name}
                                analysis={testAnalysis}
                                analysisLoading={loadingState.analysis}
                            />
                        )}

                        {/* ================= TIMETABLE ================= */}
                        {activeTab === 'Timetable' && (
                            selectedChild
                                ? <TimetableTab key={selectedChild} studentId={selectedChild} childName={currentChild?.name} />
                                : loadingState.children
                                    ? <CardsSkeleton count={3} />
                                    : <EmptyState icon={FiCalendar} title={t('parent.noChildTitle')} />
                        )}

                        {/* ================= HOMEWORK ================= */}
                        {activeTab === 'Homework' && (
                            selectedChild
                                ? <HomeworkTab key={selectedChild} studentId={selectedChild} childName={currentChild?.name} />
                                : noChildState
                        )}

                        {/* ================= LEARNING INSIGHTS ================= */}
                        {activeTab === 'Insights' && (
                            selectedChild ? (
                                <>
                                <div className="ui-card p-5 md:p-6 flex items-center gap-3">
                                    <span className="w-11 h-11 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-lg shadow-brand-soft"><FiTrendingUp /></span>
                                    <div className="min-w-0">
                                        <h2 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('parent.ins.title')}</h2>
                                        <p className="text-sm text-gray-500">{t('parent.ins.subtitle', { name: childFirst })}</p>
                                    </div>
                                </div>
                                    <InsightsTab key={selectedChild} studentId={selectedChild} />
                                </>
                            ) : noChildState
                        )}

                        {/* ================= CALENDAR ================= */}
                        {activeTab === 'Calendar' && (
                            <>
                                <div className="ui-card p-5 md:p-6 flex items-center gap-3">
                                    <span className="w-11 h-11 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-lg shadow-brand-soft"><FiCalendar /></span>
                                    <div className="min-w-0">
                                        <h2 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('parent.cal.title')}</h2>
                                        <p className="text-sm text-gray-500">{t('parent.cal.subtitle')}</p>
                                    </div>
                                </div>
                                <EventCalendar />
                            </>
                        )}

                        {/* ================= CHAT ================= */}
                        {activeTab === 'Chat' && (
                            <>
                                <div className="ui-card p-5 md:p-6 flex items-center gap-3">
                                    <span className="w-11 h-11 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-lg shadow-brand-soft"><FiMessageSquare /></span>
                                    <div className="min-w-0">
                                        <h2 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('parent.chat.title')}</h2>
                                        <p className="text-sm text-gray-500">{t('parent.chat.subtitle', { name: childFirst })}</p>
                                    </div>
                                </div>
                                <ChatPanel socket={socket} className="h-[calc(100dvh-16rem)] lg:h-[calc(100dvh-15rem)] min-h-[440px]" />
                            </>
                        )}

                        {/* ================= LEAVE REQUESTS ================= */}
                        {activeTab === 'Leaves' && (
                            hasChildren ? (
                                <>
                                <div className="ui-card p-5 md:p-6 flex items-center gap-3">
                                    <span className="w-11 h-11 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-lg shadow-brand-soft"><FiSend /></span>
                                    <div className="min-w-0">
                                        <h2 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('parent.leave.title')}</h2>
                                        <p className="text-sm text-gray-500">{t('parent.leave.subtitle')}</p>
                                    </div>
                                </div>
                                    <LeaveRequests key={selectedChild || 'none'} mode="request" role="parent" studentOptions={leaveStudentOptions} />
                                </>
                            ) : noChildState
                        )}

                        {/* ================= PROFILE ================= */}
                        {activeTab === 'Profile' && (
                            <div className="max-w-3xl mx-auto space-y-6">
                                <div className="ui-card overflow-hidden">
                                    <div className="h-28 md:h-32 bg-brand-sunset relative">
                                        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                                    </div>
                                    <div className="px-5 md:px-8 pb-6 -mt-12 md:-mt-14 flex flex-col sm:flex-row sm:items-end gap-4">
                                        <div className="relative group w-24 h-24 md:w-28 md:h-28 rounded-3xl ring-4 ring-white dark:ring-ink-900 bg-brand-gradient text-white text-3xl font-extrabold flex items-center justify-center overflow-hidden shadow-card shrink-0">
                                            {photoPreview ? (
                                                <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                                            ) : profile.profilePhoto ? (
                                                <img src={`${apiOrigin}${profile.profilePhoto}`} className="w-full h-full object-cover" alt="Profile" />
                                            ) : initials(profile.name || 'P')}
                                            <label className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col items-center justify-center gap-1 text-xs font-bold transition-opacity cursor-pointer">
                                                <FiCamera className="text-xl" /> Change
                                                <input type="file" className="sr-only" onChange={handlePhotoChange} accept="image/*" aria-label="Upload profile photo" />
                                            </label>
                                        </div>
                                        <div className="flex-1 min-w-0 sm:pb-1">
                                            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight truncate">{profile.name}</h2>
                                            <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">Registered guardian</p>
                                        </div>
                                        {photoPreview && (
                                            <div className="flex gap-2 animate-fade-up">
                                                <button onClick={handleQuickPhotoUpload} disabled={uploadingPhoto} className="ui-btn-primary">
                                                    {uploadingPhoto ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <FiCheckCircle />} Save photo
                                                </button>
                                                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="ui-btn-secondary">Cancel</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Panel title={t('parent.heading.accountDetails')} icon={FiShield}>
                                    <dl className="divide-y divide-gray-100 dark:divide-white/5">
                                        {[
                                            { icon: FiMail, label: 'Email', value: profile.email },
                                            { icon: FiPhone, label: 'Phone', value: profile.phone },
                                            { icon: FiMapPin, label: 'Address', value: profile.address || 'Not Provided' },
                                        ].map(row => (
                                            <div key={row.label} className="flex items-center gap-4 py-3.5">
                                                <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 flex items-center justify-center shrink-0"><row.icon /></span>
                                                <dt className="text-xs font-bold uppercase tracking-wider text-gray-400 w-20 shrink-0">{row.label}</dt>
                                                <dd className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-all min-w-0">{row.value || '—'}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </Panel>

                                <Panel title={t('parent.settings.title')} icon={FiSliders}>
                                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 flex items-center justify-center shrink-0"><FiGlobe /></span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t('parent.settings.language')}</p>
                                                    <p className="text-xs text-gray-500">{t('parent.settings.languageHint')}</p>
                                                </div>
                                            </div>
                                            <LanguageToggle className="self-start sm:self-auto" />
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 flex items-center justify-center shrink-0"><FiBell /></span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t('parent.settings.push')}</p>
                                                    <p className="text-xs text-gray-500">{t('parent.settings.pushHint')}</p>
                                                </div>
                                            </div>
                                            <PushToggle className="self-start sm:self-auto" />
                                        </div>
                                    </div>
                                </Panel>

                                {children.length > 0 && (
                                    <Panel title={t('parent.heading.linkedStudents')} subtitle="Tap to switch the dashboard view" icon={FiUsers}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {children.map(student => {
                                                const active = student._id === selectedChild;
                                                return (
                                                    <button
                                                        key={student._id}
                                                        onClick={() => setSelectedChild(student._id)}
                                                        className={`flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all ${active ? 'ring-2 ring-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'ring-1 ring-gray-100 dark:ring-white/5 hover:ring-brand-200'}`}
                                                    >
                                                        <span className="w-11 h-11 rounded-xl bg-brand-gradient text-white font-extrabold flex items-center justify-center overflow-hidden shrink-0">
                                                            {photoUrl(student) ? <img src={photoUrl(student)} alt="" className="w-full h-full object-cover" /> : initials(student.name)}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{student.name}</span>
                                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400"><FiHash /> {student._id.slice(-6)}</span>
                                                        </span>
                                                        {active && <span className="ui-badge bg-brand-500 text-white">Viewing</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </Panel>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <MobileBottomNav
                activeTab={activeTab}
                onSelect={goTo}
                moreOpen={moreOpen}
                setMoreOpen={setMoreOpen}
                onLogout={logout}
                badges={navBadges}
            />

            {/* ================= PAYMENT MODAL ================= */}
            {showPaymentModal && (
                <div
                    onClick={() => !paymentLoading && setShowPaymentModal(false)}
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pay-title"
                        className="ui-card w-full sm:max-w-lg rounded-b-none sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in"
                    >
                        <div className="px-6 py-5 flex justify-between items-start gap-4 border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="w-11 h-11 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-lg shadow-brand-soft"><FiCreditCard /></span>
                                <div>
                                    <h2 id="pay-title" className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">{t('parent.heading.payFees')}</h2>
                                    <p className="text-xs text-gray-500">For {currentChild?.name || 'student'} · Due {formatINR(pendingFees)}</p>
                                </div>
                            </div>
                            <button onClick={() => !paymentLoading && setShowPaymentModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" aria-label="Close payment">
                                <FiX className="text-lg" />
                            </button>
                        </div>

                        <form onSubmit={handlePayment} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto ui-scrollbar p-6 space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="pay-amount" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount (INR)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-gray-300">₹</span>
                                        <input
                                            id="pay-amount"
                                            type="number"
                                            min="1"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            className="ui-input pl-11 py-4 text-2xl font-extrabold text-gray-900 dark:text-white"
                                            required
                                        />
                                    </div>
                                    {pendingFees > 0 && (
                                        <button type="button" onClick={() => setPaymentAmount(String(pendingFees))} className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 normal-case hover:bg-brand-100 transition-colors">
                                            Pay full due ({formatINR(pendingFees)})
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment method</p>
                                    <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Payment method">
                                        {[
                                            { id: 'Razorpay', label: 'Online', icon: FiCreditCard, disabled: onlinePayUnavailable },
                                            { id: 'UPI', label: 'UPI', icon: FaQrcode },
                                            { id: 'Bank Transfer', label: 'Bank', icon: FaUniversity },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={paymentMethod === opt.id}
                                                disabled={opt.disabled}
                                                onClick={() => setPaymentMethod(opt.id)}
                                                title={opt.disabled ? 'Online payment coming soon' : undefined}
                                                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${opt.disabled
                                                    ? 'border-dashed border-gray-200 dark:border-white/10 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                    : paymentMethod === opt.id
                                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 shadow-brand-soft'
                                                        : 'border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-brand-200 active:scale-95'}`}
                                            >
                                                <opt.icon className="text-lg" />
                                                {opt.label}
                                                {opt.disabled && <span className="text-[9px] uppercase tracking-widest">Soon</span>}
                                            </button>
                                        ))}
                                    </div>
                                    {onlinePayUnavailable && (
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Online payment coming soon — use UPI/Bank transfer</p>
                                    )}
                                </div>

                                {paymentMethod === 'Razorpay' && !onlinePayUnavailable ? (
                                    <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-100 dark:ring-brand-500/20 flex items-center gap-4">
                                        <span className="w-12 h-12 rounded-xl bg-white dark:bg-ink-800 text-brand-600 flex items-center justify-center text-xl shrink-0"><FiLock /></span>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Secure online payment</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Pay via UPI, Cards, or Netbanking using the Razorpay gateway. Confirmed instantly.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-100 dark:ring-amber-500/20 text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
                                            Pay to the institute&apos;s {paymentMethod === 'UPI' ? 'UPI ID / QR code' : 'bank account'} (available at the Oasis front office), then enter the transaction reference below. The payment will show as <b>Awaiting approval</b> until the office verifies it.
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="pay-ref" className="text-xs font-bold text-gray-500 uppercase tracking-wider">{paymentMethod === 'UPI' ? 'UPI Transaction / UTR No.' : 'Bank Reference / UTR No.'} *</label>
                                            <input
                                                id="pay-ref"
                                                type="text"
                                                value={paymentDetails.ref}
                                                onChange={(e) => setPaymentDetails(d => ({ ...d, ref: e.target.value }))}
                                                placeholder="e.g. 412345678901"
                                                className="ui-input font-semibold"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                value={paymentDetails.bankName}
                                                onChange={(e) => setPaymentDetails(d => ({ ...d, bankName: e.target.value }))}
                                                placeholder={paymentMethod === 'UPI' ? 'UPI app (optional)' : 'Bank name (optional)'}
                                                aria-label={paymentMethod === 'UPI' ? 'UPI app' : 'Bank name'}
                                                className="ui-input"
                                            />
                                            <input
                                                type="text"
                                                value={paymentDetails.remarks}
                                                onChange={(e) => setPaymentDetails(d => ({ ...d, remarks: e.target.value }))}
                                                placeholder="Remarks (optional)"
                                                aria-label="Remarks"
                                                className="ui-input"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.02] flex flex-col-reverse sm:flex-row gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5">
                                {!paymentLoading && (
                                    <button type="button" onClick={() => setShowPaymentModal(false)} className="ui-btn-secondary sm:flex-1">
                                        Cancel
                                    </button>
                                )}
                                <button type="submit" disabled={paymentLoading || !paymentAmount} className="ui-btn-primary sm:flex-[2] py-3">
                                    {paymentLoading ? (
                                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    ) : paymentMethod === 'Razorpay' && !onlinePayUnavailable ? (
                                        <><FiLock /> Pay securely</>
                                    ) : (
                                        <><FiCheckCircle /> Submit for approval</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedNotice && <NoticeModal notice={selectedNotice} onClose={() => setSelectedNotice(null)} />}

            {viewingReportCard && (
                <ReportCardModal card={viewingReportCard} onClose={() => setViewingReportCard(null)} fallbackAttendance={attendancePercentage} />
            )}
        </div>
    );
};

export default ParentDashboard;
