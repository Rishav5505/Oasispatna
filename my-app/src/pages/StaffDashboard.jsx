import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import { FiInbox, FiFileText, FiCreditCard, FiMessageSquare, FiCalendar, FiLogOut, FiShield } from 'react-icons/fi';
import { AuthContext } from '../contexts/AuthContext';
import config from '../config';
import { toast } from '../utils/notify';
import oasisLogo from '../assets/oasis_logo.png';
import oasisFullLogo from '../assets/oasis_full_logo.png';
import { Sidebar, Topbar, MobileBottomNav, CommandPalette } from '../components/admin/AdminShell';
import { STAFF_NAV_SPEC, buildNav } from '../components/admin/adminNav';
import { PageHeader } from '../components/admin/AdminUI';
import { api, toastError } from '../components/admin/adminApi';
import LeadsCRM from '../components/admin/LeadsCRM';
import AdmissionsManager from '../components/admin/AdmissionsManager';
import AdmissionFunnel from '../components/admin/AdmissionFunnel';
import TopbarExtras from '../components/admin/TopbarExtras';
import StaffOverview from '../components/staff/StaffOverview';
import StaffFees from '../components/staff/StaffFees';
import StaffStudents from '../components/staff/StaffStudents';
import StaffProfile from '../components/staff/StaffProfile';
import EventCalendar from '../components/common/EventCalendar';
import ChatPanel from '../components/common/ChatPanel';
import { useChatUnread } from '../components/common/useChatUnread';
import { resolveUrl } from '../components/common/api';
import { useI18n } from '../i18n/useI18n';

/** Front-desk / receptionist dashboard (role 'staff'). Reuses the admin shell and admin components. */
const StaffDashboard = () => {
  const { user, token, loading: authLoading } = useContext(AuthContext);
  const { t } = useI18n();
  const nav = useMemo(() => buildNav(STAFF_NAV_SPEC, t), [t]);

  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [pendingAdmissions, setPendingAdmissions] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [liveKey, setLiveKey] = useState(0);
  const [focusFeeStudent, setFocusFeeStudent] = useState(null);
  const [socket, setSocket] = useState(null);
  const mainRef = useRef(null);
  const { count: chatUnread } = useChatUnread({ socket });

  const navigate = useCallback((tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
  }, []);

  const fetchLeads = useCallback(() => api.get('/leads')
    .then(setLeads)
    .catch(err => toastError(err, t('admin.common.loadFailed')))
    .finally(() => setLeadsLoading(false)), [t]);

  const fetchStudents = useCallback(() => api.get('/users/students/all')
    .then(setStudents)
    .catch(err => toastError(err, t('admin.common.loadFailed')))
    .finally(() => setStudentsLoading(false)), [t]);

  const fetchCounts = useCallback(() => Promise.all([
    api.get('/admissions', { status: 'submitted' }).then(l => setPendingAdmissions(l.length)).catch(() => {}),
    api.get('/fees/pending').then(l => setPendingPayments(l.length)).catch(() => {}),
  ]), []);

  const isStaff = user?.role === 'staff';

  useEffect(() => {
    if (authLoading || !token || !isStaff) return undefined;
    fetchLeads();
    fetchStudents();
    fetchCounts();

    const s = io(config.SOCKET_URL, { auth: { token } });
    s.on('connect', () => { s.emit('join', token); setSocket(s); });
    s.on('new-lead', (lead) => {
      setLeads(prev => (prev.some(l => l._id === lead._id) ? prev : [lead, ...prev]));
      toast.success(t('staff.toast.lead', { name: lead?.name || '' }), { icon: '📣' });
    });
    s.on('new-admission', (payload) => {
      const name = payload?.studentName || payload?.admission?.studentName || '';
      toast.success(t('admin.adm.liveToast', { name, no: payload?.applicationNo || payload?.admission?.applicationNo || '' }), { icon: '🎓', duration: 6000 });
      setPendingAdmissions(n => n + 1);
      setLiveKey(k => k + 1);
    });
    return () => { s.disconnect(); setSocket(null); };
  }, [authLoading, token, isStaff, fetchLeads, fetchStudents, fetchCounts, t]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const logout = () => { sessionStorage.removeItem('token'); window.location.href = '/login'; };
  const openFeeStudent = useCallback((id) => { setFocusFeeStudent(id); navigate('fees'); }, [navigate]);
  const clearFocus = useCallback(() => setFocusFeeStudent(null), []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-ink-950 bg-brand-mesh">
        <img src={oasisLogo} alt="Oasis" className="w-14 h-14 object-contain animate-pulse" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink-950 bg-brand-mesh flex items-center justify-center p-4">
        <div className="ui-card p-8 max-w-md w-full text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center text-2xl mb-4"><FiShield /></div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">{t('staff.denied')}</h1>
          <button type="button" onClick={logout} className="ui-btn-primary"><FiLogOut /> {t('staff.logout')}</button>
        </div>
      </div>
    );
  }

  const newLeads = leads.filter(l => (l.status || 'new') === 'new').length;
  const badges = { leads: newLeads, admissions: pendingAdmissions, fees: pendingPayments, chat: chatUnread };
  const notifications = [
    { id: 'leads', icon: FiInbox, count: newLeads, label: t('staff.notif.leads'), hint: t('staff.notif.leadsHint'), tab: 'leads' },
    { id: 'admissions', icon: FiFileText, count: pendingAdmissions, label: t('admin.notif.admissions'), hint: t('admin.notif.admissionsHint'), tab: 'admissions' },
    { id: 'fees', icon: FiCreditCard, count: pendingPayments, label: t('staff.notif.payments'), hint: t('staff.notif.paymentsHint'), tab: 'fees' },
    { id: 'chat', icon: FiMessageSquare, count: chatUnread, label: t('admin.notif.chat'), hint: t('admin.notif.chatHint'), tab: 'chat' },
  ];
  const paletteActions = [
    { key: 'record', label: t('staff.palette.record'), hint: t('staff.palette.recordHint'), icon: FiCreditCard, run: () => navigate('fees') },
    { key: 'admissions', label: t('admin.palette.admissions'), hint: t('admin.palette.admissionsHint'), icon: FiFileText, run: () => navigate('admissions') },
    { key: 'calendar', label: t('staff.palette.calendar'), hint: t('staff.palette.calendarHint'), icon: FiCalendar, run: () => navigate('calendar') },
  ];
  const photo = user?.profilePhoto ? resolveUrl(user.profilePhoto) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-ink-950 bg-brand-mesh text-gray-900 dark:text-gray-100">
      <Sidebar
        activeTab={activeTab} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} badges={badges}
        user={user} photoUrl={photo} onLogout={logout} logo={oasisFullLogo} logoMark={oasisLogo} nav={nav}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          activeTab={activeTab} onOpenSidebar={() => setSidebarOpen(true)} onOpenPalette={() => setPaletteOpen(true)}
          notifications={notifications} onNavigate={navigate} user={user} photoUrl={photo} onLogout={logout} logoMark={oasisLogo}
          nav={nav} extras={<TopbarExtras onOpenChat={() => navigate('chat')} chatCount={chatUnread} />}
        />
        <main ref={mainRef} className="flex-1 overflow-y-auto ui-scrollbar scroll-smooth">
          <div key={activeTab} className="max-w-[1440px] mx-auto px-4 md:px-8 pt-5 md:pt-8 pb-28 lg:pb-12 space-y-6 animate-fade-up">
            {activeTab === 'overview' && (
              <StaffOverview name={user?.name} leads={leads} onNavigate={navigate} onOpenFeeStudent={openFeeStudent} reloadKey={liveKey} />
            )}
            {activeTab === 'leads' && (
              <>
                <LeadsCRM leads={leads} setLeads={setLeads} loading={leadsLoading} onRefresh={fetchLeads} />
                <AdmissionFunnel reloadKey={leads.length} />
              </>
            )}
            {activeTab === 'admissions' && <AdmissionsManager canApprove={false} reloadKey={liveKey} />}
            {activeTab === 'fees' && <StaffFees students={students} focusStudentId={focusFeeStudent} onFocusHandled={clearFocus} onDataChanged={fetchCounts} />}
            {activeTab === 'students' && (
              <StaffStudents students={students} loading={studentsLoading} onRefresh={fetchStudents} onOpenFees={openFeeStudent} />
            )}
            {activeTab === 'calendar' && (
              <>
                <PageHeader icon={FiCalendar} eyebrow={t('admin.group.engagement')} title={t('admin.heading.calendar')} subtitle={t('staff.calendar.subtitle')} />
                <EventCalendar />
              </>
            )}
            {activeTab === 'chat' && (
              <>
                <PageHeader icon={FiMessageSquare} eyebrow={t('admin.group.engagement')} title={t('admin.heading.chat')} subtitle={t('admin.chat.subtitle')} />
                <ChatPanel socket={socket} />
              </>
            )}
            {activeTab === 'profile' && <StaffProfile />}
          </div>
        </main>
      </div>
      <MobileBottomNav activeTab={activeTab} onNavigate={navigate} badges={badges} nav={nav} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} actions={paletteActions} nav={nav} />
    </div>
  );
};

export default StaffDashboard;
