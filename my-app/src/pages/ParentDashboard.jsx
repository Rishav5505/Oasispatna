import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    FaUserGraduate, FaChalkboardTeacher, FaMoneyBillWave, FaBullhorn,
    FaChartLine, FaRegClock, FaSignOutAlt, FaChevronRight, FaTimesCircle,
    FaCalendarAlt, FaBook, FaFilePdf, FaArrowUp, FaArrowDown, FaCheckCircle,
    FaTasks, FaSearch, FaWallet, FaLock, FaBell, FaCreditCard, FaLayerGroup, FaHistory, FaIdCard, FaEnvelopeOpenText, FaPlus
} from 'react-icons/fa';
import oasisLogo from '../assets/oasis_logo.png';
import oasisFullLogo from '../assets/oasis_full_logo.png';
import receiptBanner from '../assets/receipt_banner.png';
import config from '../config';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaLaptopCode } from 'react-icons/fa';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, ArcElement);

const ParentDashboard = () => {
    const { user, logout, updateUser, loading: authLoading } = useContext(AuthContext);
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
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', address: '' });

    // Razorpay Loader
    const loadRazorpay = () => {
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
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState({ ref: '', bankName: '', remarks: '' });

    useEffect(() => {
        if (user?.id) {
            fetchProfile();
            fetchChildren();
            fetchMaterials();
            fetchNotices();
            fetchNotifications();
        }
    }, [user]);

    useEffect(() => {
        if (selectedChild) {
            fetchAttendance(selectedChild);
            fetchMarks(selectedChild);
            fetchFees(selectedChild);
            fetchOnlineTestResults(selectedChild);
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
            if (res.data.user?.profilePhoto) {
                updateUser({ profilePhoto: res.data.user.profilePhoto });
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

    const fetchChildren = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${config.API_URL}/users/parent/students`, { headers });
            setChildren(res.data);
            if (res.data.length > 0) setSelectedChild(res.data[0]._id);
        } catch (err) {
            console.error('Error fetching children:', err);
            setChildren([]);
        }
    };

    const fetchAttendance = async (id) => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${config.API_URL}/attendance/student/${id}`, { headers });
            setAttendance(res.data);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        }
    };

    const fetchMarks = async (id) => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${config.API_URL}/marks/student/${id}`, { headers });
            setMarks(res.data);
        } catch (err) {
            console.error('Error fetching marks:', err);
        }
    };

    const fetchFees = async (id) => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${config.API_URL}/fees/student/${id}`, { headers });
            setFees(res.data);
        } catch (err) {
            console.error('Error fetching fees:', err);
        }
    };

    const fetchOnlineTestResults = async (id) => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${config.API_URL}/tests/student/${id}`, { headers });
            // Filter tests to show results or at least attempted ones or all with status
            setOnlineTestResults(res.data);
        } catch (err) {
            console.error('Error fetching online tests:', err);
        }
    };

    const fetchMaterials = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${config.API_URL}/study-material`, { headers });
            setMaterials(res.data);
        } catch (err) {
            console.error('Error fetching materials:', err);
        }
    };

    const fetchNotices = async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.get(`${config.API_URL}/notices`, { headers });
            setNotices(res.data);
        } catch (err) {
            console.error('Error fetching notices:', err);
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

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!paymentAmount || paymentAmount <= 0) return alert('Enter valid amount');

        setPaymentLoading(true);
        const token = sessionStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (paymentMethod === 'Razorpay') {
                // 1. Load Razorpay SDK
                const res = await loadRazorpay();
                if (!res) {
                    alert('Razorpay SDK failed to load. Are you online?');
                    setPaymentLoading(false);
                    return;
                }

                // 2. Create Order on Backend
                const result = await axios.post(`${config.API_URL}/fees/razorpay/create-order`, {
                    amount: paymentAmount,
                    studentId: selectedChild
                }, { headers });

                if (!result) {
                    alert("Server error. Are you online?");
                    setPaymentLoading(false);
                    return;
                }

                const { amount, id: order_id, currency } = result.data;

                // 3. Open Razorpay Checktout
                const options = {
                    key: config.PAYMENT.RAZORPAY_KEY_ID, // Key ID from config
                    amount: amount.toString(),
                    currency: currency,
                    name: "Oasis Institute",
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

                            alert('Payment Successful and Verified!');
                            setShowPaymentModal(false);
                            setPaymentAmount('');
                            setPaymentDetails({ ref: '', bankName: '', remarks: '' });
                            fetchFees(selectedChild);
                        } catch (error) {
                            console.error("Verification Error", error);
                            alert("Payment successful but verification failed.");
                        }
                    },
                    prefill: {
                        name: profile.name,
                        email: profile.email,
                        contact: profile.phone
                    },
                    notes: {
                        address: "Oasis Institute Corporate Office"
                    },
                    theme: {
                        color: "#6366f1"
                    }
                };

                const paymentObject = new window.Razorpay(options);
                paymentObject.open();
                setPaymentLoading(false);
            } else {
                // Manual/Offline Payment Request (UPI QR or Bank)
                await axios.post(`${config.API_URL}/fees/pay`, {
                    studentId: selectedChild,
                    amount: paymentAmount,
                    paymentMethod: paymentMethod,
                    transactionId: paymentDetails.ref,
                    remarks: `${paymentDetails.bankName ? 'Source: ' + paymentDetails.bankName : ''} ${paymentDetails.remarks}`
                }, { headers });

                alert(`${paymentMethod} Transaction Logged Successfully!`);
                setShowPaymentModal(false);
                setPaymentAmount('');
                setPaymentDetails({ ref: '', bankName: '', remarks: '' });
                fetchFees(selectedChild);
                setPaymentLoading(false);
            }

        } catch (err) {
            console.error('Payment Error Details:', err.response?.data || err.message);
            alert(`Payment Error: ${err.response?.data?.message || 'Could not connect to financial server'}`);
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
                        <div className="row"><span>Student Name:</span> <span>${currentChild?.name || 'Student'}</span></div>
                        <div className="row"><span>Class:</span> <span>${currentChild?.classId?.name || 'N/A'}</span></div>
                        <hr/>
                        <div className="row"><span>Amount Paid:</span> <span>₹${payment.amount}</span></div>
                    </div>
                    <div className="footer">
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

    // Derived Data
    const currentChild = children.find(c => c._id === selectedChild);
    const pendingFees = fees.pendingFees || 0;
    const activeNoticesCount = notices.filter(n => n.targetRoles.includes('parent')).length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const totalDays = attendance.length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    const avgMarks = marks.length > 0 ? Math.round(marks.reduce((a, b) => a + b.marks, 0) / marks.length) : 0;

    // Filtered Attendance for Tab
    const filteredAttendance = selectedSubject === 'All'
        ? attendance
        : attendance.filter(a => a.subjectId?.name === selectedSubject);

    // Filtered Stats
    const filteredPresent = filteredAttendance.filter(a => a.status === 'present').length;
    const filteredTotal = filteredAttendance.length;
    const filteredPercentage = filteredTotal > 0 ? Math.round((filteredPresent / filteredTotal) * 100) : 0;
    const subjects = ['All', ...new Set(attendance.map(a => a.subjectId?.name).filter(Boolean))];

    // Charts with TEAL Theme
    const performanceData = {
        labels: marks.map(m => m.subjectId?.name || m.examId?.name || 'Test'),
        datasets: [{
            label: 'Marks %',
            data: marks.map(m => m.marks),
            fill: true,
            borderColor: '#14b8a6', // Teal-500
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            tension: 0.4
        }]
    };

    const attendanceData = {
        labels: ['Present', 'Absent'],
        datasets: [{
            data: [presentDays, totalDays - presentDays],
            backgroundColor: ['#10b981', '#f43f5e'], // Emerald-500, Rose-500
            borderWidth: 0,
        }]
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-gray-950 overflow-hidden relative font-sans transition-colors duration-300">
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar - Teal/Emerald Gradient for Parent Identity */}
            <aside className={`w-72 bg-gradient-to-b from-teal-950 via-teal-900 to-emerald-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-white flex-shrink-0 flex flex-col shadow-2xl z-30 fixed h-full transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static`}>
                <div className="p-6 flex items-center justify-between border-b border-teal-800/50 dark:border-gray-800">
                    <div className="w-full flex justify-center">
                        <img src={oasisFullLogo} alt="Oasis Logo" className="h-16 object-contain brightness-110 drop-shadow-lg" />
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-indigo-300 hover:text-white absolute right-4 top-6">
                        <FaTimesCircle className="text-2xl" />
                    </button>
                </div>

                <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
                    {[
                        { id: 'Overview', icon: FaChartLine, label: 'Overview' },
                        { id: 'Tests', icon: FaLaptopCode, label: 'Online Test Results' },
                        { id: 'Fees', icon: FaMoneyBillWave, label: 'Pay Fees / History' },
                        { id: 'Attendance', icon: FaCalendarAlt, label: 'Attendance' },
                        { id: 'Performance', icon: FaUserGraduate, label: 'Performance' },
                        { id: 'Materials', icon: FaBook, label: 'Study Materials' },
                        { id: 'Notices', icon: FaBullhorn, label: 'Notice Board' },
                        { id: 'Profile', icon: FaIdCard, label: 'My Profile' },
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
                            onClick={logout}
                            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-900/40"
                        >
                            <FaSignOutAlt /> Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden w-full bg-[#F8FAFC] dark:bg-gray-950 transition-colors duration-300">
                {/* Header */}
                <header className="h-16 md:h-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 md:px-10 shadow-sm z-[60] w-full transition-colors duration-300">
                    <div className="flex items-center gap-2 md:gap-6 flex-1 max-w-2xl">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-indigo-600 shrink-0"
                        >
                            <FaTasks className="text-xl" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center shadow-md overflow-hidden p-1 shrink-0 lg:hidden">
                                <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg md:text-2xl font-black tracking-tight leading-tight">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400">
                                        Parent Portal
                                    </span>
                                </h1>
                                <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400 font-bold truncate hidden sm:block">Institute Management System</p>
                            </div>
                        </div>

                        {children.length > 1 && (
                            <div className="ml-2 hidden md:block">
                                <select
                                    value={selectedChild}
                                    onChange={(e) => setSelectedChild(e.target.value)}
                                    className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2 font-bold text-sm text-indigo-600 dark:text-indigo-400 focus:ring-0 cursor-pointer outline-none transition-colors"
                                >
                                    {children.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 md:gap-8">
                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={toggleNotifications}
                                className={`p-2 md:p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-colors relative focus:outline-none ${isNotificationsOpen ? 'bg-gray-50 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}
                            >
                                <FaBell className={`text-lg md:text-xl transition-colors ${isNotificationsOpen ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400'}`} />
                                {notifications.some(n => !n.read) && (
                                    <span className="absolute top-1.5 md:top-2 right-1.5 md:right-2.5 w-2 md:w-2.5 h-2 md:h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {isNotificationsOpen && (
                                <div
                                    className="fixed inset-x-4 top-20 lg:absolute lg:inset-auto lg:right-[-10px] lg:top-full lg:mt-4 w-auto lg:w-96 bg-white dark:bg-gray-900 rounded-3xl lg:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-gray-800 dark:text-white text-[10px] md:text-xs uppercase tracking-widest">Notifications</h3>
                                            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full">{notifications.length} Total</span>
                                        </div>
                                    </div>
                                    <div className="max-h-[50vh] lg:max-h-80 overflow-y-auto custom-scrollbar">
                                        {notifications.length > 0 ? (
                                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                                {notifications.map(n => (
                                                    <div
                                                        key={n._id}
                                                        onClick={() => {
                                                            setSelectedNotice(n);
                                                            setIsNotificationsOpen(false);
                                                        }}
                                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group ${!n.read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                                    >
                                                        <div className="flex gap-3 md:gap-4">
                                                            <div className={`mt-1 w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${!n.read ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                                                <FaBell className="text-[10px] md:text-xs" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-xs font-bold mb-1 truncate ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                    {n.title}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-500 leading-relaxed line-clamp-2">
                                                                    {n.message}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-10 text-center flex flex-col items-center justify-center">
                                                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-200 dark:text-gray-700 mx-auto mb-4">
                                                    <FaBell className="text-xl md:text-2xl" />
                                                </div>
                                                <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">All caught up!</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-center">
                                        <button
                                            onClick={() => setIsNotificationsOpen(false)}
                                            className="w-full py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 font-black text-[9px] md:text-[10px] uppercase rounded-xl transition-colors tracking-widest"
                                        >
                                            Close Panel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 md:gap-4 md:px-5 md:py-2.5 md:bg-gray-50 md:dark:bg-gray-800 md:rounded-2xl md:border md:border-dotted md:border-gray-200 md:dark:border-gray-700 cursor-pointer hover:bg-white dark:hover:bg-gray-700 transition-all group">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs md:text-sm overflow-hidden border border-indigo-200 dark:border-indigo-800 shadow-inner group-hover:scale-105 transition-transform">
                                {profile.profilePhoto ? (
                                    <img src={`${config.API_URL.replace('/api', '')}${profile.profilePhoto}`} alt="Parent" className="w-full h-full object-cover" />
                                ) : (
                                    profile.name?.charAt(0).toUpperCase() || 'P'
                                )}
                            </div>
                            <div className="text-right hidden lg:block">
                                <p className="text-xs font-bold text-gray-900 dark:text-white leading-none mb-1">{profile.name || 'Parent'}</p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Guardian</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-10 scroll-smooth">
                    {activeTab === 'Overview' && (
                        <>
                            {/* Welcome Banner - Parent Indigo Style */}
                            <div className="relative overflow-hidden rounded-3xl md:rounded-[2.5rem] bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-6 md:p-10 shadow-2xl shadow-indigo-200/50 mb-6 md:mb-10 text-white">
                                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 blur-3xl rounded-full pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-yellow-500/20 blur-3xl rounded-full pointer-events-none"></div>

                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">PARENT PORTAL</span>
                                            <span className="text-indigo-100 text-xs font-bold">{new Date().toDateString()}</span>
                                        </div>
                                        <h1 className="text-3xl md:text-5xl font-[900] tracking-tight mb-2 leading-tight">
                                            Namaste, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-blue-100">{profile.name?.split(' ')[0]}</span> 👋
                                        </h1>
                                        <p className="text-indigo-50 font-medium max-w-lg text-xs md:text-sm leading-relaxed opacity-90">
                                            You are viewing progress for <span className="font-black text-white underline decoration-yellow-400 decoration-2 underline-offset-4">{currentChild?.name || 'Student'}</span>.
                                            <br />
                                            Attendance is <span className="font-black text-white">{attendancePercentage}%</span> and academic performance is <span className="font-black text-indigo-200">{avgMarks > 0 ? 'Optimal' : 'Tracking'}</span>.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 md:gap-4 w-full md:w-auto">
                                        <button onClick={() => setActiveTab('Fees')} className="flex-1 md:flex-none bg-white text-indigo-700 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-xs shadow-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group">
                                            <FaMoneyBillWave className="group-hover:rotate-12 transition-transform" /> PAY FEES
                                        </button>
                                        <button onClick={() => window.print()} className="flex-1 md:flex-none bg-indigo-900/30 text-white border border-white/20 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-xs hover:bg-indigo-900/50 transition-all backdrop-blur-md">
                                            D'LOAD REPORT
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Cards - Admin Style */}
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                                {[
                                    { label: 'Attendance', value: `${attendancePercentage}%`, trend: 'Last 30 Days', icon: FaCalendarAlt, color: 'blue', gradient: 'from-blue-500 to-cyan-500' },
                                    { label: 'Avg Assessment', value: `${avgMarks}%`, trend: 'Academics', icon: FaChartLine, color: 'indigo', gradient: 'from-indigo-500 to-blue-500' },
                                    { id: 'fees', label: 'Outstanding Due', value: `₹${pendingFees.toLocaleString()}`, trend: 'Important', icon: FaWallet, color: 'rose', gradient: 'from-rose-500 to-pink-500' },
                                    { label: 'Notices', value: activeNoticesCount, trend: 'Updates', icon: FaBullhorn, color: 'orange', gradient: 'from-orange-500 to-amber-500' },
                                ].map((stat, i) => (
                                    <div
                                        key={i}
                                        onClick={() => stat.id === 'fees' && setActiveTab('Fees')}
                                        className={`p-4 md:p-8 bg-white dark:bg-gray-800 rounded-3xl md:rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl ${stat.id === 'fees' ? 'cursor-pointer' : ''}`}
                                    >
                                        <div className={`absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700 ease-out`}></div>
                                        <div className="flex items-center justify-between mb-4 md:mb-8 relative">
                                            <div className={`w-10 h-10 md:w-14 md:h-14 bg-${stat.color}-50 rounded-xl md:rounded-2xl flex items-center justify-center text-${stat.color}-600 text-base md:text-xl shadow-inner`}>
                                                <stat.icon />
                                            </div>
                                            <span className={`hidden sm:block text-${stat.color}-600 text-[10px] font-black bg-${stat.color}-50 px-3 py-1.5 rounded-full border border-${stat.color}-100`}>
                                                {stat.trend}
                                            </span>
                                        </div>
                                        <div className="flex items-end justify-between relative">
                                            <div>
                                                <h3 className="text-xl md:text-4xl font-[900] text-slate-800 dark:text-white mb-1 md:mb-2 tracking-tight">{stat.value}</h3>
                                                <p className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest leading-none">{stat.label}</p>
                                            </div>
                                            {stat.id === 'fees' && (
                                                <button className="p-1.5 md:p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg md:rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                                                    <FaMoneyBillWave className="text-xs md:text-base" />
                                                </button>
                                            )}
                                        </div>
                                    </div >
                                ))}
                            </div >

                            {/* Live Notices Section - Restored */}
                            < div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm mb-6 mt-6" >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                        <FaBullhorn className="text-orange-500" /> Latest Updates
                                    </h3>
                                    <button onClick={() => setActiveTab('Notices')} className="text-xs font-bold text-indigo-600 hover:underline">View All</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {notices.slice(0, 2).map((notice, idx) => (
                                        <div key={idx} onClick={() => setSelectedNotice(notice)} className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 cursor-pointer transition-colors relative group">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm font-black text-lg">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-orange-600 transition-colors">{notice.title}</h4>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{notice.message || notice.content}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                                                        {new Date(notice.createdAt || Date.now()).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <FaChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                    {notices.length === 0 && <p className="text-gray-400 text-sm font-bold italic col-span-2 text-center py-4">No recent updates</p>}
                                </div>
                            </div >

                            {/* Charts Grid - Admin Layout */}
                            < div className="grid grid-cols-1 lg:grid-cols-3 gap-8" >
                                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-xl group">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Performance Matrix</h2>
                                            <p className="text-gray-400 dark:text-gray-500 font-bold text-sm">Subject-wise progression</p>
                                        </div>
                                    </div>
                                    <div className="h-[350px]">
                                        <Line data={performanceData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-xl flex flex-col items-center justify-center text-center">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white mb-8 self-start">Attendance</h2>
                                    <div className="w-64 h-64 mb-8">
                                        <Doughnut data={attendanceData} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        <div>
                                            <p className="text-2xl font-black text-emerald-500">{presentDays} Days</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Present</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black text-rose-500">{totalDays - presentDays} Days</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Absent</p>
                                        </div>
                                    </div>
                                </div>
                            </div >
                        </>
                    )}

                    {/* FEES TAB */}
                    {
                        activeTab === 'Fees' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Fee Structure</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                                            <p className="text-xs font-bold text-gray-400 dark:text-gray-300 uppercase">Total Fee</p>
                                            <p className="text-3xl font-black text-gray-900 dark:text-white">₹{fees.totalFees}</p>
                                        </div>
                                        <div className="p-6 bg-emerald-50 rounded-2xl">
                                            <p className="text-xs font-bold text-emerald-600 uppercase">Paid Amount</p>
                                            <p className="text-3xl font-black text-emerald-700">₹{fees.paidFees}</p>
                                        </div>
                                        <div className="p-6 bg-rose-50 rounded-2xl">
                                            <p className="text-xs font-bold text-rose-600 uppercase">Pending Due</p>
                                            <p className="text-3xl font-black text-rose-700">₹{fees.pendingFees}</p>
                                        </div>
                                    </div>

                                    <div className="mb-8 flex flex-wrap gap-4">
                                        <button
                                            onClick={() => setShowPaymentModal(true)}
                                            className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                                        >
                                            <FaWallet /> Pay Online / Direct
                                        </button>
                                    </div>

                                    <div className="mt-10">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Payment History</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                        <th className="pb-3 pl-4">Date</th>
                                                        <th className="pb-3">Transaction ID</th>
                                                        <th className="pb-3">Mode</th>
                                                        <th className="pb-3">Amount</th>
                                                        <th className="pb-3">Receipt</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                                    {fees.payments?.map(p => (
                                                        <tr key={p._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                                            <td className="py-4 pl-4 font-medium text-gray-700 dark:text-gray-300">{new Date(p.date).toLocaleDateString()}</td>
                                                            <td className="py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{p.transactionId || 'N/A'}</td>
                                                            <td className="py-4 text-sm text-gray-500 dark:text-gray-400 capitalize">{p.mode}</td>
                                                            <td className="py-4 font-bold text-gray-900 dark:text-white">₹{p.amount}</td>
                                                            <td className="py-4">
                                                                <button onClick={() => handleDownloadReceipt(p)} className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1">
                                                                    <FaFilePdf /> Receipt
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* ATTENDANCE TAB - Restored Calendar View */}
                    {
                        activeTab === 'Attendance' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Attendance Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Total Classes</p>
                                        <p className="text-3xl font-black text-gray-900 dark:text-white">{filteredTotal}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Present</p>
                                        <p className="text-3xl font-black text-emerald-500">{filteredPresent}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Absent</p>
                                        <p className="text-3xl font-black text-rose-500">{filteredTotal - filteredPresent}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Attendance %</p>
                                        <p className={`text-3xl font-black ${filteredPercentage >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>{filteredPercentage}%</p>
                                    </div>
                                </div>

                                {/* Filter Section */}
                                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Academic Calendar</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Filter by Subject:</span>
                                        <select
                                            value={selectedSubject}
                                            onChange={(e) => setSelectedSubject(e.target.value)}
                                            className="bg-gray-50 dark:bg-gray-700 border-none rounded-xl px-4 py-2 font-bold text-sm text-indigo-600 dark:text-indigo-400 focus:ring-0 cursor-pointer outline-none transition-colors"
                                        >
                                            {subjects.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Group attendance by month using FILTERED attendance */}
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

                                    return (
                                        <div key={monthYear} className="bg-white dark:bg-gray-800 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>

                                            <div className="flex items-center justify-between mb-8 relative z-10">
                                                <div>
                                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{monthYear}</h2>
                                                    <div className="flex gap-4 mt-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                                                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">PRESENT: {monthDays.filter(d => d.status === 'present').length}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
                                                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">ABSENT: {monthDays.filter(d => d.status === 'absent').length}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                                    Log Detail
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-7 gap-3 relative z-10">
                                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                                                    <div key={day} className="text-center text-[10px] font-black text-gray-300 dark:text-gray-600 py-2 uppercase tracking-widest">{day}</div>
                                                ))}

                                                {/* Empty days before first of month */}
                                                {Array.from({ length: firstDay }).map((_, i) => (
                                                    <div key={`empty-${i}`} className="h-12 md:h-16"></div>
                                                ))}

                                                {/* Days of the month */}
                                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                                    const dNum = i + 1;
                                                    const attendanceRecord = monthDays.find(ad => new Date(ad.date).getDate() === dNum);
                                                    const isPresent = attendanceRecord?.status === 'present';
                                                    const isAbsent = attendanceRecord?.status === 'absent';

                                                    return (
                                                        <div
                                                            key={dNum}
                                                            className={`h-12 md:h-16 rounded-2xl flex flex-col items-center justify-center relative transition-all border shadow-sm
                                                            ${isPresent ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-100 scale-105 z-10 font-bold' :
                                                                    isAbsent ? 'bg-rose-500 text-white border-rose-400 shadow-rose-100 scale-105 z-10 font-bold' :
                                                                        'bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-700'}`}
                                                        >
                                                            <span className="text-sm md:text-lg">{dNum}</span>
                                                            {attendanceRecord && (
                                                                <div className="absolute bottom-1 w-1 h-1 bg-white/50 rounded-full"></div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredAttendance.length === 0 && (
                                    <div className="p-20 text-center bg-gray-50 dark:bg-gray-800 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-700">
                                        <FaCalendarAlt className="text-4xl text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-400 dark:text-gray-500 font-bold">No attendance records found for {selectedSubject}.</p>
                                    </div>
                                )}
                            </div>
                        )}

                    {/* PERFORMANCE TAB */}
                    {activeTab === 'Performance' && (
                        <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Exam Results</h2>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                        <th className="pb-3 pl-4">Subject</th>
                                        <th className="pb-3">Exam</th>
                                        <th className="pb-3 text-center">Marks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {marks.map(m => (
                                        <tr key={m._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="py-4 pl-4 font-bold text-gray-700 dark:text-gray-300">{m.subjectId?.name}</td>
                                            <td className="py-4 text-sm text-gray-500 dark:text-gray-400">{m.examId?.name}</td>
                                            <td className="py-4 text-center">
                                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-black text-sm">{m.marks}%</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* MATERIALS TAB */}
                    {activeTab === 'Materials' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {materials.map(m => (
                                <div key={m._id} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group">
                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl mb-6 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <FaBook />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 truncate">{m.title}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Study material provided for students.</p>
                                    <a
                                        href={`${config.API_URL.replace('/api', '')}/${m.fileUrl}`}
                                        download
                                        className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-wider hover:underline"
                                    >
                                        <FaFilePdf /> Download Resource
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* NOTICES TAB */}
                    {activeTab === 'Notices' && (
                        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Notice Board</h2>
                                    <p className="text-gray-400 font-bold text-sm">Official announcements and circulars</p>
                                </div>
                                <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <FaBullhorn /> Broadcasts
                                </div>
                            </div>

                            <div className="space-y-4">
                                {notices.map((notice) => (
                                    <div
                                        key={notice._id}
                                        onClick={() => setSelectedNotice(notice)}
                                        className="group p-6 rounded-[2rem] border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors"></div>
                                        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex flex-col items-center justify-center border border-gray-100 shadow-sm shrink-0">
                                                <span className="text-xl font-black text-orange-500">{new Date(notice.createdAt || Date.now()).getDate()}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(notice.createdAt || Date.now()).toLocaleString('default', { month: 'short' })}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md text-[9px] font-black uppercase tracking-widest">Notice</span>
                                                    {notice.targetRoles?.map(r => (
                                                        <span key={r} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-bold uppercase tracking-widest">{r}</span>
                                                    ))}
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">{notice.title}</h3>
                                                <p className="text-sm text-gray-500 line-clamp-2">{notice.message || notice.content}</p>
                                            </div>
                                            <div className="self-end md:self-center">
                                                <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                                                    <FaChevronRight />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {notices.length === 0 && (
                                    <div className="text-center py-20 opacity-50">
                                        <FaBullhorn className="text-6xl text-gray-300 mx-auto mb-4" />
                                        <p className="font-bold text-gray-400">No active notices available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Tests' && (
                        <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Online Test Results</h2>
                                    <p className="text-gray-400 font-bold text-sm">Performance in digital assessments</p>
                                </div>
                                <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <FaLaptopCode /> Digital Report
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            <th className="pb-4 pl-4">Test Title</th>
                                            <th className="pb-4">Subject</th>
                                            <th className="pb-4">Date</th>
                                            <th className="pb-4">Status</th>
                                            <th className="pb-4 text-right pr-4">Score / Marks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {onlineTestResults.map((test) => (
                                            <tr key={test._id} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="py-4 pl-4 font-bold text-gray-800">
                                                    {test.title}
                                                </td>
                                                <td className="py-4 font-bold text-gray-500">
                                                    {test.subjectId?.name || 'General'}
                                                </td>
                                                <td className="py-4 font-medium text-gray-400 text-xs uppercase tracking-widest">
                                                    {new Date(test.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-4">
                                                    {test.attempted ? (
                                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                            Completed
                                                        </span>
                                                    ) : (
                                                        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                            Missed / Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 text-right pr-4">
                                                    {test.attempted ? (
                                                        <span className="font-black text-indigo-600 text-base">
                                                            {test.score} <span className="text-gray-300 text-xs">/ {test.totalMarks}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 font-bold">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {onlineTestResults.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="text-center py-10 text-gray-400 font-bold italic">
                                                    No online tests found for this student.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                </div>
            </main >

            {/* Payment Modal Overlay - Complex */}
            {
                showPaymentModal && (
                    <div
                        onClick={() => !paymentLoading && setShowPaymentModal(false)}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 dark:border-gray-700"
                        >
                            <div className="p-6 md:p-8 pb-4 flex justify-between items-center bg-white dark:bg-gray-800 border-b border-slate-50 dark:border-gray-700">
                                <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Financial Authorization</h2>
                                <button onClick={() => setShowPaymentModal(false)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-gray-700 text-slate-400 dark:text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all flex items-center justify-center"><FaTimesCircle className="text-xl" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-6 custom-scrollbar">
                                <form onSubmit={handlePayment} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest ml-1">Configure Amount (INR)</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 dark:text-gray-600">₹</span>
                                            <input
                                                type="number"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                className="w-full pl-12 pr-6 py-5 bg-slate-50 dark:bg-gray-700 rounded-2xl border-none font-black text-2xl text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl shadow-sm">
                                            <FaCreditCard />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">Secure Online Payment</h4>
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Pay via UPI, Cards, or Netbanking using Razorpay gateway.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 dark:bg-gray-700 rounded-2xl flex items-center gap-3">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Gateway: Razorpay (Standard Protocol)</p>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={paymentLoading || !paymentAmount}
                                        className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${paymentLoading ? 'bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none hover:-translate-y-1'}`}
                                    >
                                        {paymentLoading ? (
                                            <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <FaLock /> INITIALIZE SECURE PAYMENT
                                            </>
                                        )}
                                    </button>
                                    {!paymentLoading && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPaymentModal(false)}
                                            className="w-full py-4 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                                        >
                                            Return to Dashboard
                                        </button>
                                    )}
                                    <p className="text-[9px] text-center text-slate-300 dark:text-gray-600 font-bold uppercase tracking-widest italic pt-2">Encrypted Secure Payment Gateway</p>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Notice Detail Modal */}
            {
                selectedNotice && (
                    <div
                        onClick={() => setSelectedNotice(null)}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-gray-700 animate-in slide-in-from-bottom-6 duration-500"
                        >
                            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <div className="relative z-10 flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shrink-0 shadow-lg">
                                            <FaBullhorn />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest">Broadcast Notice</span>
                                            </div>
                                            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">{selectedNotice.title}</h2>
                                            {selectedNotice.createdAt && (
                                                <p className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest mt-2">
                                                    Published: {new Date(selectedNotice.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedNotice(null)}
                                        className="w-10 h-10 rounded-xl bg-white/80 dark:bg-gray-700 backdrop-blur-sm text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 transition-all flex items-center justify-center shrink-0"
                                    >
                                        <FaTimesCircle className="text-xl" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 md:p-10 max-h-[60vh] overflow-y-auto">
                                {/* Message Content */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <FaEnvelopeOpenText className="text-indigo-600 dark:text-indigo-400" />
                                        Notice Details
                                    </h3>
                                    <div className="bg-slate-50 dark:bg-gray-700/50 rounded-2xl p-6 border border-slate-100 dark:border-gray-700">
                                        <p className="text-base text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {selectedNotice.message || selectedNotice.content || selectedNotice.description || 'No message content available.'}
                                        </p>
                                    </div>
                                </div>

                                {selectedNotice.targetRoles && selectedNotice.targetRoles.length > 0 && (
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                        <p className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Intended Recipients</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedNotice.targetRoles.map((role, i) => (
                                                <span key={i} className="px-3 py-1 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 md:p-8 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50">
                                <button
                                    onClick={() => setSelectedNotice(null)}
                                    className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    Close Notice
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {activeTab === 'Profile' && (
                <div className="flex justify-center w-full min-h-full pb-10">
                    <div className="w-full max-w-2xl animate-in fade-in duration-500">
                        <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-12 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex flex-col items-center mb-10">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-teal-50 dark:bg-teal-900/20 border-4 border-white dark:border-gray-800 shadow-xl flex items-center justify-center text-4xl text-teal-600 dark:text-teal-400 font-black mb-6 relative group overflow-hidden">
                                    {photoPreview ? (
                                        <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                                    ) : profile.profilePhoto ? (
                                        <img src={`${config.API_URL.replace('/api', '')}${profile.profilePhoto}`} className="w-full h-full object-cover" alt="Profile" />
                                    ) : profile.name?.charAt(0)}
                                    <label className="absolute inset-0 bg-teal-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer">
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
                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                )}
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white">{profile.name}</h2>
                                <p className="text-teal-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Registered Guardian</p>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Details</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Email</span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 break-all text-right ml-4">{profile.email}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Phone</span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{profile.phone}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Address</span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{profile.address || 'Not Provided'}</span>
                                        </div>
                                    </div>
                                </div>

                                {children.length > 0 && (
                                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Linked Students</p>
                                        <div className="grid grid-cols-1 gap-3">
                                            {children.map(student => (
                                                <div key={student._id} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-800 dark:text-white">{student.name}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase">ID: {student._id.slice(-6)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentDashboard;

