import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    FiHome, FiCalendar, FiVideo, FiPlayCircle, FiClipboard, FiHelpCircle, FiCpu, FiBell, FiSearch,
    FiLogOut, FiMenu, FiX, FiMoreHorizontal, FiSun, FiMoon, FiChevronsLeft, FiChevronsRight, FiCornerDownLeft,
    FiZap, FiBookOpen, FiClock, FiList, FiAward, FiBookmark, FiEdit, FiGrid, FiSend,
} from 'react-icons/fi';
import { useI18n } from '../../i18n/useI18n';
import LanguageToggle from '../common/LanguageToggle';
import PushToggle from '../common/PushToggle';
import { FaQrcode } from 'react-icons/fa';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import { useTheme } from '../../contexts/ThemeContext';
import oasisLogo from '../../assets/oasis_logo.png';

// name/short are English fallbacks; key/shortKey are i18n keys (see i18n/dict/student.*.js)
const NAV_GROUPS = [
    { label: 'Home', key: 'student.group.home', items: [
        { id: 'overview', name: 'Dashboard', key: 'student.nav.dashboard', short: 'Home', shortKey: 'student.short.home', icon: FiHome },
        { id: 'timetable', name: 'Timetable', key: 'student.nav.timetable', short: 'Timetable', shortKey: 'student.nav.timetable', icon: FiCalendar },
        { id: 'calendar', name: 'Calendar', key: 'nav.calendar', short: 'Calendar', shortKey: 'nav.calendar', icon: FiGrid },
    ] },
    { label: 'Learn', key: 'student.group.learn', items: [
        { id: 'live', name: 'Live Classes', key: 'student.nav.live', short: 'Live', shortKey: 'student.short.live', icon: FiVideo },
        { id: 'videos', name: 'Video Library', key: 'student.nav.videos', short: 'Videos', shortKey: 'student.short.videos', icon: FiPlayCircle },
        { id: 'tests', name: 'Online Tests', key: 'student.nav.tests', short: 'Tests', shortKey: 'student.short.tests', icon: FiClipboard },
        { id: 'homework', name: 'Homework', key: 'student.nav.homework', short: 'Homework', shortKey: 'student.nav.homework', icon: FiEdit },
    ] },
    { label: 'Practice', key: 'student.group.practice', items: [
        { id: 'practice', name: 'Daily Practice', key: 'student.nav.practice', short: 'DPP', shortKey: 'student.short.dpp', icon: FiZap, badge: true },
        { id: 'mistakes', name: 'Mistake Notebook', key: 'student.nav.mistakes', short: 'Mistakes', shortKey: 'student.short.mistakes', icon: FiBookOpen },
        { id: 'study', name: 'Study Timer', key: 'student.nav.timer', short: 'Timer', shortKey: 'student.short.timer', icon: FiClock },
        { id: 'syllabus', name: 'Syllabus', key: 'student.nav.syllabus', short: 'Syllabus', shortKey: 'student.nav.syllabus', icon: FiList },
        { id: 'leaderboard', name: 'XP & Leaderboard', key: 'student.nav.leaderboard', short: 'XP', shortKey: 'student.short.xp', icon: FiAward },
        { id: 'bookmarks', name: 'Bookmarks & Formulas', key: 'student.nav.bookmarks', short: 'Saved', shortKey: 'student.short.saved', icon: FiBookmark },
    ] },
    { label: 'Help', key: 'student.group.help', items: [
        { id: 'doubts', name: 'Ask Doubts', key: 'student.nav.askDoubts', short: 'Doubts', shortKey: 'student.nav.doubts', icon: FiHelpCircle },
        { id: 'ai-buddy', name: 'AI Buddy', key: 'student.nav.aiBuddy', short: 'AI Buddy', shortKey: 'student.nav.aiBuddy', icon: FiCpu },
    ] },
    { label: 'Campus', key: 'student.group.campus', items: [
        { id: 'attendance', name: 'Mark Presence', key: 'student.nav.markPresence', short: 'Scan', shortKey: 'student.short.scan', icon: FaQrcode },
        { id: 'notices', name: 'Notices', key: 'student.nav.notices', short: 'Notices', shortKey: 'student.nav.notices', icon: HiOutlineSpeakerphone },
        { id: 'leaves', name: 'Leave Requests', key: 'nav.leaves', short: 'Leave', shortKey: 'student.short.leave', icon: FiSend },
    ] },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);
const BOTTOM_IDS = ['overview', 'practice', 'tests', 'attendance'];

const navItemFor = (id) => ALL_ITEMS.find(i => i.id === id) || ALL_ITEMS[0];
// t() returns the key itself when missing -> fall back to the English label
const tx = (t, key, fallback) => { if (!key) return fallback; const v = t(key); return v === key ? fallback : v; };

export const Avatar = ({ src, name = 'Student', className = 'w-10 h-10', textClass = 'text-sm' }) => {
    const [failedSrc, setFailedSrc] = useState(null);
    const initial = (name || 'S').trim().charAt(0).toUpperCase();
    return (
        <div className={`shrink-0 rounded-full bg-brand-gradient text-white font-bold flex items-center justify-center overflow-hidden ring-2 ring-white/70 dark:ring-white/10 ${className} ${textClass}`}>
            {src && failedSrc !== src ? (
                <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setFailedSrc(src)} />
            ) : initial}
        </div>
    );
};

const SidebarContent = ({ active, onNavigate, collapsed, user, onLogout, onToggleCollapse, onClose }) => {
    const { t } = useI18n();
    return (
    <div className="flex flex-col h-full">
        <div className={`flex items-center gap-3 px-5 pt-6 pb-5 ${collapsed ? 'justify-center px-3' : ''}`}>
            <div className="w-10 h-10 shrink-0 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-brand-glow">
                <img src={oasisLogo} alt="Oasis" className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
                <div className="min-w-0 flex-1">
                    <p className="text-white font-extrabold tracking-tight leading-none">Oasis <span className="text-brand-400">JEE</span></p>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-1">Student Portal</p>
                </div>
            )}
            {onClose && (
                <button onClick={onClose} className="ml-auto w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center" aria-label="Close menu">
                    <FiX />
                </button>
            )}
        </div>

        <nav className="flex-1 overflow-y-auto ui-scrollbar px-3 pb-4 space-y-5" aria-label="Student navigation">
            {NAV_GROUPS.map(group => (
                <div key={group.label}>
                    {!collapsed && <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">{tx(t, group.key, group.label)}</p>}
                    <div className="space-y-1">
                        {group.items.map(item => {
                            const Icon = item.icon;
                            const isActive = active === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    title={collapsed ? tx(t, item.key, item.name) : undefined}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`group w-full ui-nav-item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${collapsed ? 'justify-center px-0' : ''} ${isActive ? 'ui-nav-item-active' : '!text-gray-400 hover:!text-white hover:!bg-white/5'}`}
                                >
                                    <Icon className={`text-lg shrink-0 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                                    {!collapsed && <span className="truncate">{tx(t, item.key, item.name)}</span>}
                                    {!collapsed && (item.id === 'ai-buddy' || item.badge) && (
                                        <span className={`ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-brand-500/15 text-brand-400'}`}>New</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>

        <div className="p-3 border-t border-white/5">
            {onClose && (
                <div className="flex items-center justify-between gap-2 mb-3 px-1">
                    <LanguageToggle dark />
                    <PushToggle compact />
                </div>
            )}
            {onToggleCollapse && (
                <button
                    onClick={onToggleCollapse}
                    className={`w-full mb-2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <FiChevronsRight /> : <><FiChevronsLeft /> Collapse</>}
                </button>
            )}
            <div className={`flex items-center gap-3 rounded-2xl bg-white/5 border border-white/5 p-3 ${collapsed ? 'justify-center p-2' : ''}`}>
                <Avatar src={user.photo} name={user.name} />
                {!collapsed && (
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{user.subtitle}</p>
                    </div>
                )}
                {!collapsed && (
                    <button onClick={onLogout} className="w-9 h-9 shrink-0 rounded-xl text-gray-400 hover:text-white hover:bg-red-500/80 flex items-center justify-center transition-colors" aria-label="Logout" title="Logout">
                        <FiLogOut />
                    </button>
                )}
            </div>
            {collapsed && (
                <button onClick={onLogout} className="mt-2 w-full h-10 rounded-xl text-gray-400 hover:text-white hover:bg-red-500/80 flex items-center justify-center transition-colors" aria-label="Logout" title="Logout">
                    <FiLogOut />
                </button>
            )}
        </div>
    </div>
    );
};

// Ctrl/⌘+K quick jump
const CommandPalette = ({ open, onClose, onNavigate, extraCommands = [] }) => {
    const { t } = useI18n();
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState(0);
    const inputRef = useRef(null);

    const items = useMemo(() => {
        const all = [
            ...ALL_ITEMS.map(i => ({ key: i.id, label: tx(t, i.key, i.name), hint: 'Go to', icon: i.icon, run: () => onNavigate(i.id) })),
            ...extraCommands.map(c => ({ key: c.id, label: c.label, hint: 'Action', icon: c.icon, run: c.run })),
        ];
        const q = query.trim().toLowerCase();
        return q ? all.filter(i => i.label.toLowerCase().includes(q)) : all;
    }, [query, onNavigate, extraCommands, t]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 30);
    }, [open]);

    if (!open) return null;

    const choose = (item) => { if (!item) return; item.run(); onClose(); setQuery(''); setCursor(0); };
    const safeCursor = Math.min(cursor, Math.max(0, items.length - 1));

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(Math.min(items.length - 1, safeCursor + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(Math.max(0, safeCursor - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(items[safeCursor]); }
        else if (e.key === 'Escape') { onClose(); }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-[12vh] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="ui-card w-full max-w-lg overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Quick search">
                <div className="flex items-center gap-3 px-5 border-b border-gray-100 dark:border-white/10">
                    <FiSearch className="text-gray-400 text-lg shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
                        onKeyDown={onKeyDown}
                        placeholder="Jump to a section or action…"
                        className="flex-1 py-4 bg-transparent text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                        aria-label="Search"
                    />
                    <kbd className="hidden sm:inline text-[10px] font-bold text-gray-400 border border-gray-200 dark:border-white/10 rounded-md px-1.5 py-0.5">ESC</kbd>
                </div>
                <ul className="max-h-80 overflow-y-auto ui-scrollbar p-2" role="listbox">
                    {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-gray-400">No matches for &ldquo;{query}&rdquo;</li>}
                    {items.map((item, idx) => {
                        const Icon = item.icon;
                        const activeRow = idx === safeCursor;
                        return (
                            <li key={item.key} role="option" aria-selected={activeRow}>
                                <button
                                    onMouseEnter={() => setCursor(idx)}
                                    onClick={() => choose(item)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-colors ${activeRow ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeRow ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>{Icon && <Icon />}</span>
                                    <span className="flex-1 truncate">{item.label}</span>
                                    <span className="text-[10px] uppercase tracking-widest text-gray-400">{item.hint}</span>
                                    {activeRow && <FiCornerDownLeft className="text-gray-400" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

const MobileBottomNav = ({ active, onNavigate, moreOpen, setMoreOpen }) => {
    const { t } = useI18n();
    const bottomItems = BOTTOM_IDS.map(navItemFor);
    const activeIdx = moreOpen ? 4 : (BOTTOM_IDS.indexOf(active) === -1 ? 4 : BOTTOM_IDS.indexOf(active));
    const moreGroups = NAV_GROUPS
        .map(g => ({ ...g, items: g.items.filter(i => !BOTTOM_IDS.includes(i.id)) }))
        .filter(g => g.items.length > 0);
    const short = (item) => tx(t, item.shortKey, item.short);

    return (
        <>
            {moreOpen && (
                <>
                    <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setMoreOpen(false)} />
                    <div className="lg:hidden fixed left-3 right-3 z-50 ui-card p-4 animate-fade-up" style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))' }} role="dialog" aria-label="More sections">
                        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/10 mx-auto mb-4" />
                        <div className="max-h-[60vh] overflow-y-auto ui-scrollbar -mx-1 px-1 space-y-4">
                            {moreGroups.map(group => (
                                <div key={group.label}>
                                    <p className="px-1 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{tx(t, group.key, group.label)}</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {group.items.map(item => {
                                            const Icon = item.icon;
                                            const isActive = active === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => { onNavigate(item.id); setMoreOpen(false); }}
                                                    className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all active:scale-95 ${isActive ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}
                                                >
                                                    <Icon className="text-lg" />
                                                    <span className="text-[10px] font-bold leading-tight text-center line-clamp-2">{short(item)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div className="flex items-center justify-between gap-2 pt-1">
                                <LanguageToggle />
                                <PushToggle compact />
                            </div>
                        </div>
                    </div>
                </>
            )}
            <nav
                className="lg:hidden fixed bottom-0 inset-x-0 z-50 ui-glass border-t border-gray-100 dark:border-white/10 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                aria-label="Bottom navigation"
            >
                <div className="relative grid grid-cols-5 px-2 py-2">
                    <span
                        className="absolute top-2 bottom-2 left-2 rounded-2xl bg-brand-gradient shadow-brand-soft transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ width: 'calc((100% - 1rem) / 5)', transform: `translateX(${activeIdx * 100}%)` }}
                        aria-hidden="true"
                    />
                    {bottomItems.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = activeIdx === idx;
                        return (
                            <button
                                key={item.id}
                                onClick={() => { onNavigate(item.id); setMoreOpen(false); }}
                                aria-current={isActive ? 'page' : undefined}
                                className={`relative z-10 flex flex-col items-center gap-0.5 py-1.5 transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400'}`}
                            >
                                <Icon className={`text-lg transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                                <span className="text-[10px] font-bold">{short(item)}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setMoreOpen(v => !v)}
                        aria-expanded={moreOpen}
                        className={`relative z-10 flex flex-col items-center gap-0.5 py-1.5 transition-colors duration-300 ${activeIdx === 4 ? 'text-white' : 'text-gray-400'}`}
                    >
                        {moreOpen ? <FiX className="text-lg" /> : <FiMoreHorizontal className="text-lg" />}
                        <span className="text-[10px] font-bold">{activeIdx === 4 && !moreOpen ? short(navItemFor(active)) : tx(t, 'nav.more', 'More')}</span>
                    </button>
                </div>
            </nav>
        </>
    );
};

// Full dashboard chrome: sidebar (desktop) / drawer + bottom nav (mobile), top bar, command palette
const StudentShell = ({ active, onNavigate, user, onLogout, hasUnread, onBellClick, extraCommands, topBarExtra, children }) => {
    const { theme, toggleTheme } = useTheme() || {};
    const { t } = useI18n();
    const currentName = tx(t, navItemFor(active).key, navItemFor(active).name);
    const [collapsed, setCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);

    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen(v => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const go = (id) => {
        onNavigate(id);
        setDrawerOpen(false);
        setMoreOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-ink-950 bg-brand-mesh bg-fixed transition-colors duration-300">
            {/* Desktop sidebar */}
            <aside className={`hidden lg:block fixed inset-y-0 left-0 z-40 bg-ink-950 border-r border-white/5 transition-[width] duration-300 ${collapsed ? 'w-20' : 'w-72'}`}>
                <SidebarContent
                    active={active}
                    onNavigate={go}
                    collapsed={collapsed}
                    user={user}
                    onLogout={onLogout}
                    onToggleCollapse={() => setCollapsed(c => !c)}
                />
            </aside>

            {/* Mobile drawer */}
            {drawerOpen && (
                <div className="lg:hidden fixed inset-0 z-[90]">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setDrawerOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-ink-950 shadow-2xl animate-slide-in-left">
                        <SidebarContent active={active} onNavigate={go} user={user} onLogout={onLogout} onClose={() => setDrawerOpen(false)} />
                    </aside>
                </div>
            )}

            <div className={`transition-[padding] duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
                {/* Top bar */}
                <header className="sticky z-30 ui-glass border-b border-gray-100/80 dark:border-white/5" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
                    <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
                        <button onClick={() => setDrawerOpen(true)} className="lg:hidden w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Open menu">
                            <FiMenu className="text-xl" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="hidden sm:block text-[11px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-1">{tx(t, 'student.crumb', 'Student')} &rsaquo; {currentName}</p>
                            <h1 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight truncate leading-tight">{currentName}</h1>
                        </div>

                        {topBarExtra && <div className="hidden sm:flex items-center">{topBarExtra}</div>}
                        <LanguageToggle className="hidden md:inline-flex" />
                        <PushToggle compact className="hidden sm:flex" />

                        <button
                            onClick={() => setPaletteOpen(true)}
                            className="hidden xl:flex items-center gap-3 w-56 px-3.5 py-2 rounded-xl bg-gray-100/80 dark:bg-white/5 border border-transparent hover:border-brand-200 text-sm text-gray-400 transition-colors"
                            aria-label="Open quick search"
                        >
                            <FiSearch />
                            <span className="flex-1 text-left">Quick jump…</span>
                            <kbd className="text-[10px] font-bold border border-gray-200 dark:border-white/10 rounded-md px-1.5 py-0.5">Ctrl K</kbd>
                        </button>
                        <button onClick={() => setPaletteOpen(true)} className="xl:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Quick search">
                            <FiSearch className="text-lg" />
                        </button>

                        {toggleTheme && (
                            <button
                                onClick={toggleTheme}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-brand-600 transition-all"
                                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {theme === 'dark' ? <FiSun className="text-lg hover:rotate-45 transition-transform" /> : <FiMoon className="text-lg" />}
                            </button>
                        )}

                        <button
                            onClick={onBellClick}
                            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${hasUnread ? 'text-brand-600 bg-brand-50 dark:bg-brand-500/10 animate-glow' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                            aria-label={hasUnread ? 'Notifications (unread)' : 'Notifications'}
                        >
                            <FiBell className="text-lg" />
                            {hasUnread && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-ink-900" />}
                        </button>

                        <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-gray-200 dark:border-white/10">
                            <Avatar src={user.photo} name={user.name} className="w-9 h-9" />
                            <div className="hidden xl:block leading-tight">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                                <p className="text-[11px] text-gray-400">{user.subtitle}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-28 lg:pb-10 max-w-[1400px] mx-auto">
                    {children}
                </main>
            </div>

            <MobileBottomNav active={active} onNavigate={go} moreOpen={moreOpen} setMoreOpen={setMoreOpen} />
            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={go} extraCommands={extraCommands} />
        </div>
    );
};

export default StudentShell;
