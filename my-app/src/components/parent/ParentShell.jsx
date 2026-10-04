import React from 'react';
import {
    FiGrid, FiCalendar, FiMonitor, FiCreditCard, FiCheckSquare, FiAward, FiBookOpen,
    FiBell, FiUser, FiLogOut, FiX, FiChevronsLeft, FiChevronsRight, FiMoreHorizontal,
    FiEdit3, FiTrendingUp, FiMessageSquare, FiSend, FiClock
} from 'react-icons/fi';
import oasisFullLogo from '../../assets/oasis_full_logo.png';
import oasisLogo from '../../assets/oasis_logo.png';
import { initials } from './parentUtils';
import { useI18n } from '../../i18n/useI18n';
import LanguageToggle from '../common/LanguageToggle';

// labelKey / shortKey are i18n keys from src/i18n/dict/parent.*.js
const NAV_GROUPS = [
    { labelKey: 'parent.nav.group.home', items: [{ id: 'Overview', icon: FiGrid, labelKey: 'parent.nav.overview' }] },
    {
        labelKey: 'parent.nav.group.academics',
        items: [
            { id: 'Attendance', icon: FiCheckSquare, labelKey: 'parent.nav.attendance' },
            { id: 'Tests', icon: FiMonitor, labelKey: 'parent.nav.tests', shortKey: 'parent.nav.testsShort' },
            { id: 'Performance', icon: FiAward, labelKey: 'parent.nav.reportCards' },
            { id: 'Homework', icon: FiEdit3, labelKey: 'parent.nav.homework' },
            { id: 'Insights', icon: FiTrendingUp, labelKey: 'parent.nav.insights', shortKey: 'parent.nav.insightsShort' },
            { id: 'Timetable', icon: FiClock, labelKey: 'parent.nav.timetable' },
            { id: 'Materials', icon: FiBookOpen, labelKey: 'parent.nav.materials' },
        ],
    },
    {
        labelKey: 'parent.nav.group.fees',
        items: [
            { id: 'Fees', icon: FiCreditCard, labelKey: 'parent.nav.fees', shortKey: 'parent.nav.feesShort' },
            { id: 'Notices', icon: FiBell, labelKey: 'parent.nav.notices' },
            { id: 'Calendar', icon: FiCalendar, labelKey: 'parent.nav.calendar' },
        ],
    },
    {
        labelKey: 'parent.nav.group.connect',
        items: [
            { id: 'Chat', icon: FiMessageSquare, labelKey: 'parent.nav.chat', shortKey: 'parent.nav.chatShort' },
            { id: 'Leaves', icon: FiSend, labelKey: 'parent.nav.leaves' },
        ],
    },
    { labelKey: 'parent.nav.group.account', items: [{ id: 'Profile', icon: FiUser, labelKey: 'parent.nav.profile' }] },
];

const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

const BOTTOM_IDS = ['Overview', 'Attendance', 'Fees', 'Chat'];

const Avatar = ({ src, name, className = '' }) => (
    <div className={`rounded-xl bg-brand-gradient text-white font-extrabold flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
        {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initials(name)}
    </div>
);

export const ParentSidebar = ({ activeTab, onSelect, open, onClose, collapsed, onToggleCollapse, userName, userPhoto, onLogout, badges = {} }) => {
    const { t } = useI18n();
    return (
    <>
        {open && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={onClose} aria-hidden="true" />
        )}
        <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-ink-950 text-white border-r border-white/5 transition-all duration-300
                ${collapsed ? 'lg:w-[84px]' : 'lg:w-64'} w-72
                ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            aria-label="Parent navigation"
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(243,112,33,0.18),transparent_70%)]" />
            <div className={`relative h-[72px] flex items-center border-b border-white/5 ${collapsed ? 'lg:justify-center px-4' : 'px-5'} justify-between`}>
                {collapsed ? (
                    <>
                        <img src={oasisLogo} alt="Oasis" className="hidden lg:block w-10 h-10 object-contain rounded-xl bg-white p-1" />
                        <img src={oasisFullLogo} alt="Oasis JEE Classes" className="lg:hidden h-10 object-contain brightness-110" />
                    </>
                ) : (
                    <img src={oasisFullLogo} alt="Oasis JEE Classes" className="h-10 object-contain brightness-110" />
                )}
                <button onClick={onClose} className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors" aria-label={t('parent.nav.closeMenu')}>
                    <FiX className="text-xl" />
                </button>
            </div>

            <nav className="relative flex-1 overflow-y-auto ui-scrollbar px-3 py-5 space-y-6">
                {NAV_GROUPS.map(group => (
                    <div key={group.labelKey}>
                        <p className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 ${collapsed ? 'lg:hidden' : ''}`}>{t(group.labelKey)}</p>
                        <div className="space-y-1">
                            {group.items.map(item => {
                                const active = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelect(item.id)}
                                        title={collapsed ? t(item.labelKey) : undefined}
                                        aria-current={active ? 'page' : undefined}
                                        className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400
                                            ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                                            ${active ? 'bg-brand-gradient text-white shadow-brand-soft' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <item.icon className={`text-[18px] shrink-0 transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`} />
                                        <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{t(item.labelKey)}</span>
                                        {badges[item.id] > 0 && (
                                            <span className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${active ? 'bg-white/25 text-white' : 'bg-brand-500/20 text-brand-300'} ${collapsed ? 'lg:absolute lg:top-1 lg:right-2 lg:ml-0 lg:min-w-[8px] lg:h-2 lg:p-0 lg:text-[0px] lg:bg-brand-500' : ''}`}>
                                                {badges[item.id]}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="relative p-3 border-t border-white/5 space-y-2">
                <div className={`flex justify-center ${collapsed ? 'lg:hidden' : ''}`}>
                    <LanguageToggle dark />
                </div>
                <button
                    onClick={onToggleCollapse}
                    className="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <FiChevronsRight /> : <><FiChevronsLeft /> {t('parent.nav.collapse')}</>}
                </button>
                <div className={`flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.04] ring-1 ring-white/5 ${collapsed ? 'lg:flex-col lg:p-2' : ''}`}>
                    <Avatar src={userPhoto} name={userName} className="w-10 h-10 text-sm" />
                    <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
                        <p className="text-sm font-bold truncate">{userName || 'Parent'}</p>
                        <p className="text-[11px] text-gray-500 font-medium">{t('parent.guardian')}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-rose-500/90 transition-colors"
                        aria-label={t('parent.nav.signOut')}
                        title={t('parent.nav.signOut')}
                    >
                        <FiLogOut />
                    </button>
                </div>
            </div>
        </aside>
    </>
    );
};

export const MobileBottomNav = ({ activeTab, onSelect, moreOpen, setMoreOpen, onLogout, badges = {} }) => {
    const { t } = useI18n();
    const bottomItems = NAV_ITEMS.filter(i => BOTTOM_IDS.includes(i.id));
    const moreItems = NAV_ITEMS.filter(i => !BOTTOM_IDS.includes(i.id));
    const moreActive = moreItems.some(i => i.id === activeTab);
    const moreBadge = moreItems.reduce((s, i) => s + (badges[i.id] || 0), 0);

    return (
        <>
            {moreOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('parent.nav.more')}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setMoreOpen(false)} />
                    <div className="absolute inset-x-0 bottom-0 ui-card rounded-b-none rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto ui-scrollbar animate-fade-up">
                        <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 mx-auto mb-4" />
                        <div className="grid grid-cols-3 gap-3">
                            {moreItems.map(item => {
                                const active = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => { onSelect(item.id); setMoreOpen(false); }}
                                        className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl text-xs font-bold transition-all active:scale-95 ${active ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}
                                    >
                                        <item.icon className="text-xl" />
                                        <span className="text-center leading-tight">{t(item.labelKey)}</span>
                                        {badges[item.id] > 0 && <span className="absolute top-2 right-3 w-2 h-2 rounded-full bg-brand-500" />}
                                    </button>
                                );
                            })}
                            <button
                                onClick={onLogout}
                                className="flex flex-col items-center gap-2 p-3 rounded-2xl text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 active:scale-95 transition-all"
                            >
                                <FiLogOut className="text-xl" />
                                {t('parent.nav.signOut')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 ui-glass border-t border-gray-100 dark:border-white/10 pb-[env(safe-area-inset-bottom)]" aria-label="Quick navigation">
                <div className="grid grid-cols-5 px-2 py-1.5">
                    {[...bottomItems, { id: '__more', icon: FiMoreHorizontal, labelKey: 'parent.nav.more' }].map(item => {
                        const isMore = item.id === '__more';
                        const active = isMore ? (moreActive || moreOpen) : activeTab === item.id;
                        const showDot = isMore ? moreBadge > 0 : badges[item.id] > 0;
                        return (
                            <button
                                key={item.id}
                                onClick={() => (isMore ? setMoreOpen(!moreOpen) : (onSelect(item.id), setMoreOpen(false)))}
                                className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}
                                aria-current={!isMore && active ? 'page' : undefined}
                            >
                                <span className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-all duration-300 ${active ? 'bg-brand-50 dark:bg-brand-500/15' : ''}`}>
                                    <item.icon className={`text-lg transition-transform duration-300 ${active ? 'scale-110' : ''}`} />
                                    {showDot && <span className="absolute top-0.5 right-2.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-ink-900" />}
                                </span>
                                {t(item.shortKey || item.labelKey)}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
};

// Avatar pill / segmented control to switch between linked children
export const ChildSwitcher = ({ kids, selected, onSelect, photoUrl }) => {
    if (!kids || kids.length === 0) return null;
    if (kids.length === 1) {
        const k = kids[0];
        return (
            <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-gray-100/80 dark:bg-white/5 ring-1 ring-gray-200/70 dark:ring-white/10 min-w-0">
                <Avatar src={photoUrl(k)} name={k.name} className="w-7 h-7 rounded-full text-[10px]" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[7rem] sm:max-w-[10rem]">{k.name}</span>
            </div>
        );
    }
    return (
        <div role="radiogroup" aria-label="Select child" className="flex items-center gap-1 p-1 rounded-full bg-gray-100/80 dark:bg-white/5 ring-1 ring-gray-200/70 dark:ring-white/10 overflow-x-auto no-scrollbar max-w-full">
            {kids.map(k => {
                const active = k._id === selected;
                return (
                    <button
                        key={k._id}
                        role="radio"
                        aria-checked={active}
                        onClick={() => onSelect(k._id)}
                        title={k.name}
                        className={`flex items-center gap-2 rounded-full transition-all duration-300 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400
                            ${active ? 'bg-white dark:bg-ink-800 shadow-card pl-1 pr-3 py-0.5' : 'p-0.5 opacity-70 hover:opacity-100'}`}
                    >
                        <Avatar src={photoUrl(k)} name={k.name} className={`w-7 h-7 rounded-full text-[10px] ${active ? 'ring-2 ring-brand-200 dark:ring-brand-500/30' : 'grayscale-[40%]'}`} />
                        {active && <span className="text-xs font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap max-w-[6rem] sm:max-w-[9rem] truncate">{k.name.split(' ')[0]}</span>}
                    </button>
                );
            })}
        </div>
    );
};
