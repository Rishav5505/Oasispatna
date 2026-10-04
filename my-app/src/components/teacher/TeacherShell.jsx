import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    FiGrid, FiVideo, FiPlayCircle, FiClipboard, FiBookOpen, FiCheckSquare, FiBarChart2,
    FiHelpCircle, FiCalendar, FiClock, FiVolume2, FiUser, FiLogOut, FiMenu, FiX, FiSearch,
    FiBell, FiSun, FiMoon, FiChevronsLeft, FiChevronsRight, FiMoreHorizontal, FiCornerDownLeft, FiChevronDown,
    FiDatabase, FiEdit3, FiLayers, FiAlertTriangle, FiMessageSquare, FiFileText, FiFlag
} from 'react-icons/fi';
import oasisLogo from '../../assets/oasis_logo.png';
import oasisFullLogo from '../../assets/oasis_full_logo.png';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from './TeacherUI';
import { timeAgo } from './teacherApi';
import { useI18n } from '../../i18n/useI18n';
import LanguageToggle from '../common/LanguageToggle';
import PushToggle from '../common/PushToggle';

const NAV_GROUPS = [
    { k: 'teacher.group.overview', items: [{ id: 'overview', icon: FiGrid, k: 'teacher.nav.overview' }] },
    {
        k: 'teacher.group.teaching', items: [
            { id: 'live-classes', icon: FiVideo, k: 'teacher.nav.liveClasses' },
            { id: 'recorded-classes', icon: FiPlayCircle, k: 'teacher.nav.videos' },
            { id: 'online-tests', icon: FiClipboard, k: 'teacher.nav.tests' },
            { id: 'question-bank', icon: FiDatabase, k: 'teacher.nav.questionBank' },
            { id: 'homework', icon: FiEdit3, k: 'teacher.nav.homework' },
            { id: 'materials', icon: FiBookOpen, k: 'teacher.nav.materials' },
            { id: 'syllabus', icon: FiLayers, k: 'teacher.nav.syllabus' },
        ]
    },
    {
        k: 'teacher.group.classroom', items: [
            { id: 'attendance', icon: FiCheckSquare, k: 'teacher.nav.attendance' },
            { id: 'marks', icon: FiBarChart2, k: 'teacher.nav.marks' },
            { id: 'doubts', icon: FiHelpCircle, k: 'teacher.nav.doubts' },
            { id: 'at-risk', icon: FiAlertTriangle, k: 'teacher.nav.atRisk' },
            { id: 'messages', icon: FiMessageSquare, k: 'teacher.nav.messages' },
            { id: 'leaves', icon: FiFileText, k: 'teacher.nav.leaves' },
        ]
    },
    {
        k: 'teacher.group.me', items: [
            { id: 'timetable', icon: FiCalendar, k: 'teacher.nav.timetable' },
            { id: 'calendar', icon: FiFlag, k: 'teacher.nav.calendar' },
            { id: 'my-attendance', icon: FiClock, k: 'teacher.nav.myAttendance' },
            { id: 'notices', icon: FiVolume2, k: 'teacher.nav.notices' },
            { id: 'profile', icon: FiUser, k: 'teacher.nav.profile' },
        ]
    },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items.map(i => ({ ...i, groupK: g.k })));
const findItem = (id) => ALL_ITEMS.find(i => i.id === id) || ALL_ITEMS[0];

const BOTTOM_TABS = ['overview', 'live-classes', 'attendance', 'doubts'];

/* ---------------- Command palette (Ctrl/⌘ + K) ---------------- */
// Mounted only while open, so its state resets on every open.
const CommandPalette = ({ onClose, onNavigate }) => {
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState(0);
    const { t } = useI18n();

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const items = ALL_ITEMS.map(i => ({ ...i, label: t(i.k), group: t(i.groupK) }));
        // Match the translated label and the English id so search works in both languages
        return q ? items.filter(i => `${i.label} ${i.group} ${i.id}`.toLowerCase().includes(q)) : items;
    }, [query, t]);

    const go = (item) => { if (item) { onNavigate(item.id); onClose(); } };
    const onKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); go(results[cursor]); }
        else if (e.key === 'Escape') onClose();
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="ui-card w-full max-w-lg overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()} role="dialog" aria-label="Quick search">
                <div className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-white/5">
                    <FiSearch className="text-gray-400" />
                    <input
                        autoFocus
                        value={query}
                        onChange={e => { setQuery(e.target.value); setCursor(0); }}
                        onKeyDown={onKey}
                        placeholder="Jump to… (tests, attendance, doubts)"
                        className="flex-1 py-4 bg-transparent text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                    />
                    <kbd className="text-[10px] font-bold text-gray-400 border border-gray-200 dark:border-white/10 rounded-md px-1.5 py-0.5">ESC</kbd>
                </div>
                <div className="max-h-[50vh] overflow-y-auto ui-scrollbar p-2">
                    {results.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No matches for “{query}”</p>
                    ) : results.map((item, idx) => (
                        <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setCursor(idx)}
                            onClick={() => go(item)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${idx === cursor ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${idx === cursor ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}><item.icon /></span>
                            <span className="flex-1 text-sm font-semibold">{item.label}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.group}</span>
                            {idx === cursor && <FiCornerDownLeft className="text-brand-500" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ---------------- Sidebar ---------------- */
const SidebarNav = ({ activeTab, onNavigate, collapsed, badges }) => {
    const { t } = useI18n();
    return (
    <nav className="flex-1 overflow-y-auto ui-scrollbar px-3 py-4 space-y-5" aria-label="Teacher navigation">
        {NAV_GROUPS.map(group => (
            <div key={group.k}>
                {collapsed
                    ? <div className="mx-auto my-2 h-px w-6 bg-white/10" />
                    : <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{t(group.k)}</p>}
                <div className="space-y-1">
                    {group.items.map(item => {
                        const active = activeTab === item.id;
                        const badge = badges?.[item.id];
                        return (
                            <button
                                key={item.id}
                                type="button"
                                title={collapsed ? t(item.k) : undefined}
                                aria-current={active ? 'page' : undefined}
                                onClick={() => onNavigate(item.id)}
                                className={`ui-nav-item w-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${collapsed ? 'justify-center px-0' : ''} ${active ? 'ui-nav-item-active' : 'text-gray-400 hover:text-white hover:bg-white/5 dark:hover:bg-white/5'}`}
                            >
                                <item.icon className={`text-[1.05rem] shrink-0 transition-transform duration-300 ${active ? '' : 'group-hover:scale-110'}`} />
                                {!collapsed && <span className="truncate">{t(item.k)}</span>}
                                {badge > 0 && (
                                    collapsed
                                        ? <span className="absolute top-2 right-3 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-ink-950" />
                                        : <span className={`ml-auto min-w-[1.25rem] px-1.5 py-0.5 rounded-md text-[10px] font-bold text-center ${active ? 'bg-white/25 text-white' : 'bg-brand-500 text-white'}`}>{badge}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        ))}
    </nav>
    );
};

const Sidebar = ({ activeTab, onNavigate, user, onLogout, collapsed, setCollapsed, open, setOpen, badges }) => (
    <>
        {open && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={() => setOpen(false)} />}
        <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-ink-950 text-white border-r border-white/5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                ${collapsed ? 'lg:w-[84px]' : 'lg:w-72'} w-72 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
            <div className="absolute inset-x-0 top-0 h-48 bg-brand-mesh opacity-60 pointer-events-none" />
            <div className={`relative flex items-center h-20 px-5 ${collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'}`}>
                <img src={oasisFullLogo} alt="Oasis JEE Classes" className={`h-11 object-contain ${collapsed ? 'lg:hidden' : ''}`} />
                {collapsed && <img src={oasisLogo} alt="Oasis" className="hidden lg:block w-10 h-10 object-contain" />}
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10">
                    <FiX />
                </button>
            </div>

            <div className="relative flex-1 flex flex-col min-h-0">
                <SidebarNav activeTab={activeTab} onNavigate={onNavigate} collapsed={collapsed} badges={badges} />
            </div>

            <div className="relative p-3 border-t border-white/5 space-y-2">
                <button
                    type="button"
                    onClick={() => setCollapsed(c => !c)}
                    className="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition"
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <FiChevronsRight /> : <><FiChevronsLeft /> Collapse</>}
                </button>
                <div className={`flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 ${collapsed ? 'lg:justify-center lg:p-2' : ''}`}>
                    <Avatar name={user?.name} photo={user?.profilePhoto} size="sm" className="ring-ink-950" />
                    <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
                        <p className="text-sm font-bold truncate">{user?.name || 'Educator'}</p>
                        <p className="text-[11px] text-gray-500 truncate">Faculty</p>
                    </div>
                    <button
                        type="button"
                        onClick={onLogout}
                        aria-label="Log out"
                        title="Log out"
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500 transition ${collapsed ? 'lg:hidden' : ''}`}
                    >
                        <FiLogOut />
                    </button>
                </div>
            </div>
        </aside>
    </>
);

/* ---------------- Top bar ---------------- */
const NotificationBell = ({ notifications, notices, onSeen, onNavigate }) => {
    const [open, setOpen] = useState(false);
    const unread = notifications.filter(n => !n.read).length;
    const recentNotices = (notices || []).slice(0, 3);
    return (
        <div className="relative">
            <button
                type="button"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
                onClick={() => { setOpen(o => !o); if (!open) onSeen(); }}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5 transition ${unread ? 'animate-glow' : ''}`}
            >
                <FiBell className="text-lg" />
                {unread > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-ink-900" />}
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] ui-card z-50 overflow-hidden animate-scale-in origin-top-right">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <p className="text-sm font-extrabold text-gray-900 dark:text-white">Notifications</p>
                            <span className="text-[11px] font-semibold text-gray-400">{notifications.length} this session</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto ui-scrollbar">
                            {notifications.length === 0 && recentNotices.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-8">You're all caught up ✨</p>
                            )}
                            {notifications.map(n => (
                                <div key={n.id} className="px-4 py-3 flex gap-3 border-b border-gray-50 dark:border-white/5">
                                    <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{n.message}</p>
                                        <p className="text-[11px] text-gray-400">{timeAgo(n.at)}</p>
                                    </div>
                                </div>
                            ))}
                            {recentNotices.length > 0 && (
                                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Latest notices</div>
                            )}
                            {recentNotices.map(nt => (
                                <button key={nt._id} type="button" onClick={() => { setOpen(false); onNavigate('notices'); }} className="w-full text-left px-4 py-2.5 hover:bg-brand-50/60 dark:hover:bg-white/5 flex gap-3">
                                    <FiVolume2 className="mt-0.5 text-brand-500 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{nt.title}</p>
                                        <p className="text-[11px] text-gray-400">{nt.createdAt ? timeAgo(nt.createdAt) : ''}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const AvatarMenu = ({ user, onNavigate, onLogout }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5 transition" aria-label="Account menu">
                <Avatar name={user?.name} photo={user?.profilePhoto} size="sm" />
                <div className="hidden md:block text-left leading-tight">
                    <p className="text-sm font-bold text-gray-900 dark:text-white max-w-[140px] truncate">{user?.name || 'Educator'}</p>
                    <p className="text-[11px] text-gray-400">Faculty</p>
                </div>
                <FiChevronDown className={`hidden md:block text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 ui-card z-50 p-1.5 animate-scale-in origin-top-right">
                        {[{ id: 'profile', icon: FiUser, label: 'My profile' }, { id: 'my-attendance', icon: FiClock, label: 'My attendance' }, { id: 'timetable', icon: FiCalendar, label: 'My timetable' }].map(m => (
                            <button key={m.id} type="button" onClick={() => { setOpen(false); onNavigate(m.id); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-white/5 hover:text-brand-600">
                                <m.icon /> {m.label}
                            </button>
                        ))}
                        <div className="my-1 h-px bg-gray-100 dark:bg-white/5" />
                        <button type="button" onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                            <FiLogOut /> Log out
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

/* ---------------- Mobile bottom nav + More sheet ---------------- */
const MobileNav = ({ activeTab, onNavigate, badges }) => {
    const [moreOpen, setMoreOpen] = useState(false);
    const { t } = useI18n();
    const items = BOTTOM_TABS.map(id => ALL_ITEMS.find(i => i.id === id));
    const moreActive = !BOTTOM_TABS.includes(activeTab);
    const moreBadge = Object.entries(badges || {}).some(([id, n]) => n > 0 && !BOTTOM_TABS.includes(id));
    return (
        <>
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 ui-glass border-t border-gray-100 dark:border-white/5" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} aria-label="Quick navigation">
                <div className="grid grid-cols-5 px-2 py-1.5">
                    {items.map(item => {
                        const active = activeTab === item.id;
                        return (
                            <button key={item.id} type="button" onClick={() => onNavigate(item.id)} className="relative flex flex-col items-center gap-1 py-1.5" aria-current={active ? 'page' : undefined}>
                                <span className={`relative w-12 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${active ? 'bg-brand-gradient text-white shadow-brand-soft' : 'text-gray-400'}`}>
                                    <item.icon className="text-lg" />
                                    {badges?.[item.id] > 0 && <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white" />}
                                </span>
                                <span className={`text-[10px] font-bold ${active ? 'text-brand-600' : 'text-gray-400'}`}>{item.id === 'overview' ? t('teacher.nav.home') : t(item.k).split(' ')[0]}</span>
                            </button>
                        );
                    })}
                    <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-1.5">
                        <span className={`relative w-12 h-8 rounded-full flex items-center justify-center transition-all ${moreActive ? 'bg-brand-gradient text-white shadow-brand-soft' : 'text-gray-400'}`}>
                            <FiMoreHorizontal className="text-lg" />
                            {moreBadge && <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white" />}
                        </span>
                        <span className={`text-[10px] font-bold ${moreActive ? 'text-brand-600' : 'text-gray-400'}`}>{t('teacher.nav.more')}</span>
                    </button>
                </div>
            </nav>
            {moreOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setMoreOpen(false)}>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-ink-900 rounded-t-3xl p-5 pb-8 animate-fade-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="mx-auto mb-4 w-10 h-1.5 rounded-full bg-gray-200 dark:bg-white/10" />
                        {NAV_GROUPS.map(group => (
                            <div key={group.k} className="mb-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">{t(group.k)}</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {group.items.map(item => {
                                        const active = activeTab === item.id;
                                        return (
                                            <button key={item.id} type="button" onClick={() => { onNavigate(item.id); setMoreOpen(false); }} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl text-center transition ${active ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                                <span className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/5'}`}>
                                                    <item.icon />
                                                    {badges?.[item.id] > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-ink-900">{badges[item.id] > 99 ? '99+' : badges[item.id]}</span>}
                                                </span>
                                                <span className="text-[10px] font-bold leading-tight">{t(item.k)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

/* ---------------- Shell ---------------- */
const TeacherShell = ({ activeTab, onNavigate, user, onLogout, badges, notifications, onNotificationsSeen, notices, children }) => {
    const { theme, toggleTheme } = useTheme() || {};
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const scrollRef = useRef(null);
    const { t } = useI18n();
    const current = findItem(activeTab);

    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [activeTab]);

    const navigate = (id) => { onNavigate(id); setDrawerOpen(false); };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-ink-950 text-gray-900 dark:text-gray-100">
            <Sidebar
                activeTab={activeTab} onNavigate={navigate} user={user} onLogout={onLogout} badges={badges}
                collapsed={collapsed} setCollapsed={setCollapsed} open={drawerOpen} setOpen={setDrawerOpen}
            />

            <main className="flex-1 flex flex-col min-w-0 relative">
                <div className="absolute inset-x-0 top-0 h-80 bg-brand-mesh pointer-events-none opacity-70" />
                <header className="relative z-30 h-16 md:h-[72px] flex items-center gap-3 px-4 md:px-8 ui-glass border-b border-gray-100/80 dark:border-white/5">
                    <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5">
                        <FiMenu className="text-lg" />
                    </button>
                    <img src={oasisLogo} alt="" className="lg:hidden w-8 h-8 object-contain" />
                    <div className="min-w-0 flex-1">
                        <p className="hidden sm:block text-[11px] font-semibold text-gray-400">Teacher <span className="mx-1">/</span> {t(current.groupK)}</p>
                        <h1 className="text-base md:text-lg font-extrabold tracking-tight truncate">{t(current.k)}</h1>
                    </div>

                    <button
                        type="button"
                        onClick={() => setPaletteOpen(true)}
                        className="hidden xl:flex items-center gap-2 w-56 px-3.5 py-2.5 rounded-xl bg-gray-100/80 dark:bg-white/5 border border-transparent hover:border-brand-200 text-sm text-gray-400 transition"
                    >
                        <FiSearch /> <span className="flex-1 text-left">{t('teacher.nav.quickJump')}</span>
                        <kbd className="text-[10px] font-bold border border-gray-200 dark:border-white/10 rounded-md px-1.5 py-0.5 bg-white dark:bg-ink-800">Ctrl K</kbd>
                    </button>
                    <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Search" className="xl:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">
                        <FiSearch className="text-lg" />
                    </button>
                    <LanguageToggle className="hidden sm:inline-flex" />
                    <PushToggle compact className="hidden sm:flex" />
                    {toggleTheme && (
                        <button type="button" onClick={toggleTheme} aria-label="Toggle dark mode" className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5 transition">
                            {theme === 'dark' ? <FiSun className="text-lg hover:rotate-45 transition-transform" /> : <FiMoon className="text-lg" />}
                        </button>
                    )}
                    <NotificationBell notifications={notifications} notices={notices} onSeen={onNotificationsSeen} onNavigate={navigate} />
                    <AvatarMenu user={user} onNavigate={navigate} onLogout={onLogout} />
                </header>

                <div ref={scrollRef} className="relative flex-1 overflow-y-auto ui-scrollbar">
                    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-5 md:py-8 pb-28 lg:pb-10">
                        {children}
                    </div>
                </div>
            </main>

            <MobileNav activeTab={activeTab} onNavigate={navigate} badges={badges} />
            {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={navigate} />}
        </div>
    );
};

export default TeacherShell;
