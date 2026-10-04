import React, { useEffect } from 'react';
import { FiX, FiBell, FiPrinter, FiAward, FiCheckCircle } from 'react-icons/fi';
import { FaBullhorn } from 'react-icons/fa';
import oasisFullLogo from '../../assets/oasis_full_logo.png';
import oasisLogo from '../../assets/oasis_logo.png';

const useEscape = (onClose) => {
    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);
};

const timeAgo = (date) => {
    if (!date) return '';
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Dropdown panel anchored under the bell button
export const NotificationsPanel = ({ notifications, onMarkAllRead, onOpen, onClose }) => {
    const unread = notifications.filter(n => !n.read).length;
    return (
        <div
            className="fixed inset-x-3 top-[72px] lg:absolute lg:inset-auto lg:right-0 lg:top-full lg:mt-3 lg:w-96 ui-card shadow-card-hover z-50 overflow-hidden animate-scale-in origin-top-right"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Notifications"
        >
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Notifications</h3>
                    {unread > 0 && <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{unread} new</span>}
                </div>
                <div className="flex items-center gap-1">
                    {unread > 0 && (
                        <button onClick={onMarkAllRead} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 px-2 py-1 rounded-lg transition-colors">
                            Mark all read
                        </button>
                    )}
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Close notifications">
                        <FiX />
                    </button>
                </div>
            </div>
            <div className="max-h-[60vh] lg:max-h-96 overflow-y-auto ui-scrollbar">
                {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-50 dark:divide-white/5">
                        {notifications.map(n => (
                            <button
                                key={n._id}
                                onClick={() => onOpen(n)}
                                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-brand-50/40 dark:hover:bg-white/[0.03] transition-colors ${!n.read ? 'bg-brand-50/30 dark:bg-brand-500/[0.04]' : ''}`}
                            >
                                <span className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${!n.read ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                                    <FiBell className="text-sm" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-2">
                                        <span className={`text-sm font-bold truncate ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</span>
                                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                                    </span>
                                    <span className="block text-xs text-gray-500 leading-relaxed line-clamp-2">{n.message}</span>
                                    {n.createdAt && <span className="block text-[10px] text-gray-400 font-semibold mt-1">{timeAgo(n.createdAt)}</span>}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-3"><FiCheckCircle className="text-xl" /></div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">You&apos;re all caught up</p>
                        <p className="text-xs text-gray-400 mt-0.5">New updates will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const NoticeModal = ({ notice, onClose }) => {
    useEscape(onClose);
    return (
        <div onClick={onClose} className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="notice-title"
                className="ui-card w-full sm:max-w-2xl rounded-b-none sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
            >
                <div className="relative p-6 md:p-7 bg-brand-sunset text-white overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center text-lg shrink-0"><FaBullhorn /></div>
                            <div className="min-w-0">
                                <span className="ui-badge bg-white/15 text-white ring-1 ring-white/20">Notice</span>
                                <h2 id="notice-title" className="mt-2 text-xl md:text-2xl font-extrabold tracking-tight">{notice.title}</h2>
                                {notice.createdAt && (
                                    <p className="text-xs text-white/75 font-medium mt-1">
                                        Published {new Date(notice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0" aria-label="Close notice"><FiX className="text-lg" /></button>
                    </div>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto ui-scrollbar flex-1">
                    <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {notice.message || notice.content || notice.description || 'No message content available.'}
                    </p>
                    {notice.targetRoles && notice.targetRoles.length > 0 && (
                        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-white/5">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Intended for</p>
                            <div className="flex flex-wrap gap-2">
                                {notice.targetRoles.map((role, i) => (
                                    <span key={i} className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{role}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 md:p-5 border-t border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02]">
                    <button onClick={onClose} className="ui-btn-dark w-full py-3">Close</button>
                </div>
            </div>
        </div>
    );
};

const gradeFor = (ratio) => (ratio >= 0.9 ? 'A+' : ratio >= 0.8 ? 'A' : ratio >= 0.7 ? 'B+' : ratio >= 0.6 ? 'B' : ratio >= 0.4 ? 'C' : 'FAIL');

export const ReportCardModal = ({ card, onClose, fallbackAttendance }) => {
    useEscape(onClose);
    const consolidated = card.exam?.type === 'Consolidated';
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-3 md:p-8 animate-fade-in" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Report card" className="ui-card w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in print:p-0 print:shadow-none print:static">
                <div className="px-5 md:px-6 py-3.5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0 print:hidden">
                    <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center"><FiAward /></span>
                        <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Official Academic Report</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="ui-btn-primary py-2"><FiPrinter /> <span className="hidden sm:inline">Print</span></button>
                        <button onClick={onClose} className="ui-btn-secondary px-3 py-2" aria-label="Close report"><FiX /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto ui-scrollbar p-4 md:p-12 bg-gray-50 dark:bg-ink-950 print:overflow-visible print:p-0">
                    <div className="border-[3px] border-brand-500 p-1 rounded-sm bg-white overflow-x-auto">
                        <div className="border border-brand-100 p-6 md:p-8 bg-white relative min-w-[640px]">
                            <div className="flex justify-between items-start mb-10 border-b-2 border-ink-900 pb-6">
                                <div>
                                    <img src={oasisFullLogo} alt="Oasis JEE Classes" className="h-14 mb-3" />
                                    <p className="text-[11px] font-bold text-brand-600 uppercase tracking-[0.3em]">Excellence in JEE/NEET Coaching</p>
                                </div>
                                <div className="text-right">
                                    <h1 className="text-3xl md:text-4xl font-extrabold text-ink-900 mb-1 tracking-tight">REPORT CARD</h1>
                                    <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">{card.exam?.name} - 2026</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-8 mb-12 bg-gray-50 p-8 rounded-2xl border border-gray-100">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-brand-500 uppercase tracking-widest block mb-1">Student Name</label>
                                        <p className="text-2xl font-extrabold text-ink-900">{card.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-brand-500 uppercase tracking-widest block mb-1">Roll Number</label>
                                        <p className="text-lg font-bold text-gray-700">{card.rollNo}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <div>
                                        <label className="text-[10px] font-bold text-brand-500 uppercase tracking-widest block mb-1">Father&apos;s Name</label>
                                        <p className="text-lg font-bold text-gray-700">{card.fatherName || 'Not Provided'}</p>
                                    </div>
                                    <div className="flex justify-end gap-10">
                                        <div>
                                            <label className="text-[10px] font-bold text-brand-500 uppercase tracking-widest block mb-1">Class</label>
                                            <p className="text-lg font-bold text-ink-900">Standard IX</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-brand-500 uppercase tracking-widest block mb-1">Section</label>
                                            <p className="text-lg font-bold text-ink-900">Oasis-A1</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-12">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-ink-900 text-white">
                                            <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-widest">Subject</th>
                                            {consolidated ? (
                                                <>
                                                    <th className="px-4 py-4 text-center font-bold text-xs uppercase tracking-widest whitespace-nowrap">Unit (20%)</th>
                                                    <th className="px-4 py-4 text-center font-bold text-xs uppercase tracking-widest whitespace-nowrap">Monthly (30%)</th>
                                                    <th className="px-4 py-4 text-center font-bold text-xs uppercase tracking-widest whitespace-nowrap">Final (50%)</th>
                                                    <th className="px-4 py-4 text-center font-bold text-xs uppercase tracking-widest whitespace-nowrap">Total</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-6 py-4 text-center font-bold text-xs uppercase tracking-widest">Full Marks</th>
                                                    <th className="px-6 py-4 text-center font-bold text-xs uppercase tracking-widest">Obtained Marks</th>
                                                </>
                                            )}
                                            <th className="px-6 py-4 text-right font-bold text-xs uppercase tracking-widest">Status / Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(card.subjectResults || []).map(sub => {
                                            const ratio = (sub.total || sub.obtained) / (sub.maxMarks || 100);
                                            return (
                                                <tr key={sub.subjectId} className="hover:bg-brand-50/40 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-800">{sub.subjectName}</td>
                                                    {consolidated ? (
                                                        <>
                                                            <td className="px-4 py-4 text-center font-semibold text-gray-600">{sub.unit || 0}</td>
                                                            <td className="px-4 py-4 text-center font-semibold text-gray-600">{sub.monthly || 0}</td>
                                                            <td className="px-4 py-4 text-center font-semibold text-gray-600">{sub.final || 0}</td>
                                                            <td className="px-4 py-4 text-center font-extrabold text-brand-600 text-lg">{sub.total || 0}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-6 py-4 text-center font-semibold text-gray-500">{sub.maxMarks || 100}</td>
                                                            <td className="px-6 py-4 text-center font-extrabold text-brand-600 text-lg">{sub.obtained || 0}</td>
                                                        </>
                                                    )}
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase ${ratio >= 0.4 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                            {gradeFor(ratio)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-brand-50/60">
                                            <th className="px-6 py-5 text-left font-extrabold text-ink-900 border-t-2 border-ink-900">OVERALL ASSESSMENT</th>
                                            {consolidated && (
                                                <>
                                                    <th className="border-t-2 border-ink-900"></th>
                                                    <th className="border-t-2 border-ink-900"></th>
                                                    <th className="border-t-2 border-ink-900"></th>
                                                </>
                                            )}
                                            <th className="px-6 py-5 text-center font-extrabold text-ink-900 border-t-2 border-ink-900">{card.totalMax}</th>
                                            <th className="px-6 py-5 text-center font-extrabold text-brand-600 text-2xl border-t-2 border-ink-900">{card.totalObtained}</th>
                                            <th className="px-6 py-5 text-right font-extrabold text-ink-900 border-t-2 border-ink-900">{card.percentage}%</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-16 text-center">
                                <div className="p-6 bg-gray-50 rounded-2xl">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Attendance</label>
                                    <p className="text-3xl font-extrabold text-gray-800">{card.attendancePercentage || fallbackAttendance}%</p>
                                </div>
                                <div className="p-6 bg-gray-50 rounded-2xl">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Conduct</label>
                                    <p className="text-3xl font-extrabold text-brand-600">{card.conduct || 'EXCELLENT'}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-end pb-8 pt-10 border-t border-gray-100">
                                <div className="text-center w-48">
                                    <div className="h-px bg-gray-300 mb-2"></div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Class Teacher</p>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                    <div className="w-16 h-1 bg-brand-500 mb-2"></div>
                                    <img src={oasisLogo} alt="Seal" className="w-12 h-12 opacity-20 grayscale mb-2" />
                                    <p className="text-[10px] font-bold text-ink-900 uppercase tracking-[0.2em]">Institute Seal</p>
                                </div>
                                <div className="text-center w-48">
                                    <div className="h-px bg-gray-300 mb-2"></div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Authorized Signature</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
