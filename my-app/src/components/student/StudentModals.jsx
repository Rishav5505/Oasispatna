import React from 'react';
import { FiX, FiChevronRight, FiBell, FiPrinter, FiAward } from 'react-icons/fi';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import oasisLogo from '../../assets/oasis_logo.png';
import oasisFullLogo from '../../assets/oasis_full_logo.png';

const Backdrop = ({ onClick, className = 'z-[100]', children }) => (
    <div className={`fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in ${className}`} onClick={onClick}>
        {children}
    </div>
);

/* Class / batch picker */
export const SelectionModal = ({ open, onClose, icon, title, subtitle, options, itemHint, onSelect, emptyTitle, emptyHint, footer }) => {
    if (!open) return null;
    const Icon = icon;
    return (
        <Backdrop onClick={onClose}>
            <div className="ui-card w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
                <div className="relative bg-brand-sunset text-white px-7 pt-8 pb-7 overflow-hidden">
                    <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                    <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center" aria-label="Close">
                        <FiX />
                    </button>
                    <div className="relative w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl mb-4"><Icon /></div>
                    <h2 className="relative text-2xl font-extrabold tracking-tight">{title}</h2>
                    <p className="relative text-sm text-white/80 mt-1">{subtitle}</p>
                </div>
                <div className="p-5 overflow-y-auto ui-scrollbar space-y-2 ui-stagger">
                    {options.length > 0 ? options.map(o => (
                        <button
                            key={o._id}
                            onClick={() => onSelect(o._id)}
                            className="group w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/5 hover:bg-brand-gradient hover:border-transparent hover:shadow-brand-soft hover:-translate-y-0.5 transition-all"
                        >
                            <div className="text-left">
                                <p className="font-bold text-gray-900 dark:text-white group-hover:text-white">{o.name}</p>
                                <p className="text-xs text-gray-400 group-hover:text-white/80">{itemHint}</p>
                            </div>
                            <FiChevronRight className="text-gray-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </button>
                    )) : (
                        <div className="text-center p-8 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
                            <p className="font-bold text-gray-600 dark:text-gray-300">{emptyTitle}</p>
                            <p className="text-xs text-gray-400 mt-1">{emptyHint}</p>
                        </div>
                    )}
                </div>
                {footer && <p className="px-6 pb-5 text-center text-xs text-gray-400">{footer}</p>}
            </div>
        </Backdrop>
    );
};

/* Slide-in notifications */
export const NotificationDrawer = ({ open, onClose, notices, notifications, onSelectNotice }) => {
    if (!open) return null;
    return (
        <>
            <div className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <aside className="fixed top-0 right-0 h-full w-full max-w-sm z-[96] bg-white dark:bg-ink-900 shadow-2xl border-l border-gray-100 dark:border-white/5 overflow-y-auto ui-scrollbar animate-slide-in-right" role="dialog" aria-label="Notifications">
                <div className="sticky top-0 z-10 ui-glass px-6 py-5 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                    <div>
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">Notifications</h2>
                        <p className="text-xs text-gray-400">Recent alerts &amp; updates</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 flex items-center justify-center" aria-label="Close notifications">
                        <FiX />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    <section>
                        <h3 className="px-2 mb-2 text-[11px] font-bold uppercase tracking-widest text-brand-600">Official announcements</h3>
                        {notices.length > 0 ? (
                            <div className="space-y-2 ui-stagger">
                                {notices.slice(0, 5).map(notice => (
                                    <button key={notice._id} onClick={() => onSelectNotice(notice)} className="w-full text-left flex items-start gap-3 p-3 rounded-2xl hover:bg-brand-50/60 dark:hover:bg-white/5 transition-colors">
                                        <span className="w-9 h-9 shrink-0 rounded-xl bg-brand-gradient text-white flex items-center justify-center"><HiOutlineSpeakerphone /></span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-bold text-gray-900 dark:text-white leading-tight">{notice.title}</span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{notice.content || notice.description}</span>
                                            <span className="block text-[11px] font-semibold text-gray-400 mt-1">{new Date(notice.createdAt).toLocaleDateString()}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : <p className="text-center text-xs text-gray-400 py-4">No active announcements</p>}
                    </section>

                    <section>
                        <h3 className="px-2 mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">Personal alerts</h3>
                        {notifications.length > 0 ? (
                            <div className="space-y-2">
                                {notifications.map((notif, idx) => (
                                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-2xl border ${notif.read ? 'border-gray-100 dark:border-white/5' : 'border-brand-100 bg-brand-50/50 dark:bg-brand-500/5 dark:border-brand-500/20'}`}>
                                        <span className={`relative w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${notif.read ? 'bg-gray-100 dark:bg-white/5 text-gray-500' : 'bg-ink-900 text-white'}`}>
                                            <FiBell />
                                            {!notif.read && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white dark:border-ink-900" />}
                                        </span>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{notif.title || 'Notification'}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.message || notif.content || 'New update received'}</p>
                                            <p className="text-[11px] font-semibold text-gray-400 mt-1">{(notif.createdAt || notif.date) ? new Date(notif.createdAt || notif.date).toLocaleDateString() : 'Just now'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <div className="w-14 h-14 mx-auto rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center text-2xl mb-3"><FiBell /></div>
                                <p className="text-sm font-semibold text-gray-500">You&rsquo;re all caught up</p>
                            </div>
                        )}
                    </section>
                </div>
            </aside>
        </>
    );
};

/* Notice detail */
export const NoticeModal = ({ notice, onClose }) => {
    if (!notice) return null;
    return (
        <Backdrop onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="ui-card w-full max-w-2xl overflow-hidden animate-scale-in" role="dialog" aria-modal="true" aria-label={notice.title}>
                <div className="relative p-7 bg-brand-sunset text-white overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <span className="relative ui-badge bg-white/15 border border-white/20 text-white mb-3"><HiOutlineSpeakerphone /> Official notice</span>
                    <h2 className="relative text-2xl font-extrabold tracking-tight pr-10">{notice.title}</h2>
                    <p className="relative text-sm text-white/80 mt-1">{new Date(notice.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center" aria-label="Close">
                        <FiX />
                    </button>
                </div>
                <div className="p-7 max-h-[55vh] overflow-y-auto ui-scrollbar">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-base">{notice.content || notice.description}</p>
                </div>
                <div className="px-7 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex justify-end">
                    <button onClick={onClose} className="ui-btn-dark">Close</button>
                </div>
            </div>
        </Backdrop>
    );
};

const gradeOf = (ratio) => (ratio >= 0.9 ? 'A+' : ratio >= 0.8 ? 'A' : ratio >= 0.7 ? 'B+' : ratio >= 0.6 ? 'B' : ratio >= 0.4 ? 'C' : 'FAIL');

/* Printable report card */
export const ReportCardModal = ({ report, onClose, attendancePct }) => {
    if (!report) return null;
    const consolidated = report.exam?.type === 'Consolidated';
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-3 md:p-10 animate-fade-in">
            <div className="ui-card w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in print:p-0 print:shadow-none print:static">
                <div className="px-5 md:px-7 py-3.5 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0 print:hidden">
                    <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center"><FiAward /></span>
                        <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">Academic Report Preview</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="ui-btn-primary !py-2 text-xs"><FiPrinter /> Print</button>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 hover:text-red-500 hover:border-red-200 flex items-center justify-center" aria-label="Close report">
                            <FiX />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto ui-scrollbar p-4 md:p-12 bg-white print:overflow-visible print:p-0">
                    <div className="border-4 border-brand-600 p-1 relative min-h-[1000px]">
                        <div className="border border-brand-200 p-5 md:p-8 h-full bg-white relative">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-10 border-b-2 border-brand-600 pb-8">
                                <div>
                                    <img src={oasisFullLogo} alt="Logo" className="h-14 mb-3" />
                                    <p className="text-[11px] font-black text-brand-600 uppercase tracking-[0.3em]">Excellence in JEE/NEET Coaching</p>
                                </div>
                                <div className="sm:text-right">
                                    <h1 className="text-3xl md:text-4xl font-black text-ink-900 mb-1">REPORT CARD</h1>
                                    <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">{report.exam?.name} - 2026</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-8 mb-12 bg-brand-50/40 p-6 md:p-10 rounded-3xl border border-brand-100">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Student Name</p>
                                        <p className="text-xl md:text-2xl font-black text-ink-900">{report.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Roll Number</p>
                                        <p className="text-lg font-bold text-gray-700">{report.rollNo}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <div>
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Father&apos;s Name</p>
                                        <p className="text-lg font-bold text-gray-700">{report.fatherName || 'Not Provided'}</p>
                                    </div>
                                    <div className="flex justify-end gap-8">
                                        <div>
                                            <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Class</p>
                                            <p className="text-lg font-bold text-brand-600">Standard IX</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Section</p>
                                            <p className="text-lg font-bold text-brand-600">Oasis-A1</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-12 overflow-x-auto">
                                <table className="w-full border-collapse min-w-[520px]">
                                    <thead>
                                        <tr className="bg-ink-900 text-white">
                                            <th className="px-5 py-4 text-left font-black text-xs uppercase tracking-widest">Subject</th>
                                            {consolidated ? (
                                                <>
                                                    <th className="px-3 py-4 text-center font-black text-xs uppercase tracking-widest whitespace-nowrap">Unit (20%)</th>
                                                    <th className="px-3 py-4 text-center font-black text-xs uppercase tracking-widest whitespace-nowrap">Monthly (30%)</th>
                                                    <th className="px-3 py-4 text-center font-black text-xs uppercase tracking-widest whitespace-nowrap">Final (50%)</th>
                                                    <th className="px-3 py-4 text-center font-black text-xs uppercase tracking-widest whitespace-nowrap">Total</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-5 py-4 text-center font-black text-xs uppercase tracking-widest">Full Marks</th>
                                                    <th className="px-5 py-4 text-center font-black text-xs uppercase tracking-widest">Obtained</th>
                                                </>
                                            )}
                                            <th className="px-5 py-4 text-right font-black text-xs uppercase tracking-widest">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(report.subjectResults || []).map((sub, i) => {
                                            const ratio = (sub.total || sub.obtained) / (sub.maxMarks || 100);
                                            return (
                                                <tr key={sub.subjectId || i} className="hover:bg-brand-50/40 transition-colors">
                                                    <td className="px-5 py-4 font-bold text-gray-800">{sub.subjectName}</td>
                                                    {consolidated ? (
                                                        <>
                                                            <td className="px-3 py-4 text-center font-bold text-gray-600">{sub.unit || 0}</td>
                                                            <td className="px-3 py-4 text-center font-bold text-gray-600">{sub.monthly || 0}</td>
                                                            <td className="px-3 py-4 text-center font-bold text-gray-600">{sub.final || 0}</td>
                                                            <td className="px-3 py-4 text-center font-black text-brand-600 text-lg">{sub.total || 0}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-5 py-4 text-center font-bold text-gray-500">{sub.maxMarks || 100}</td>
                                                            <td className="px-5 py-4 text-center font-black text-brand-600 text-lg">{sub.obtained || 0}</td>
                                                        </>
                                                    )}
                                                    <td className="px-5 py-4 text-right">
                                                        <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase ${ratio >= 0.4 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{gradeOf(ratio)}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-brand-50/60">
                                            <th className="px-5 py-5 text-left font-black text-ink-900 border-t-2 border-brand-600">OVERALL</th>
                                            {consolidated && (
                                                <>
                                                    <th className="border-t-2 border-brand-600"></th>
                                                    <th className="border-t-2 border-brand-600"></th>
                                                    <th className="border-t-2 border-brand-600"></th>
                                                </>
                                            )}
                                            <th className="px-5 py-5 text-center font-black text-ink-900 border-t-2 border-brand-600">{report.totalMax}</th>
                                            <th className="px-5 py-5 text-center font-black text-brand-600 text-2xl border-t-2 border-brand-600">{report.totalObtained}</th>
                                            <th className="px-5 py-5 text-right font-black text-ink-900 border-t-2 border-brand-600">{report.percentage}%</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-16 text-center">
                                <div className="p-6 bg-gray-50 rounded-2xl">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Attendance</p>
                                    <p className="text-3xl font-black text-gray-800">{report.attendancePercentage || attendancePct}%</p>
                                </div>
                                <div className="p-6 bg-gray-50 rounded-2xl">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Conduct</p>
                                    <p className="text-3xl font-black text-brand-600">{report.conduct || 'GOOD'}</p>
                                </div>
                            </div>

                            <div className="mt-auto flex justify-between items-end pb-10 pt-10 border-t border-gray-100 gap-4">
                                <div className="text-center w-40">
                                    <div className="h-0.5 bg-gray-200 mb-2"></div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Class Teacher</p>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                    <div className="w-16 h-1 bg-brand-600 mb-2"></div>
                                    <img src={oasisLogo} alt="Seal" className="w-12 h-12 opacity-20 grayscale mb-2" />
                                    <p className="text-[10px] font-black text-ink-900 uppercase tracking-[0.2em]">Institute Seal</p>
                                </div>
                                <div className="text-center w-40">
                                    <div className="h-0.5 bg-gray-200 mb-2"></div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authorized Signature</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
