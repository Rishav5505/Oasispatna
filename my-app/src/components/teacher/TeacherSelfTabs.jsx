import React, { useEffect, useState } from 'react';
import {
    FiClock, FiCheckCircle, FiCalendar, FiVolume2, FiChevronRight, FiCamera, FiCheck, FiX,
    FiMail, FiPhone, FiBookOpen, FiUsers, FiLoader, FiList
} from 'react-icons/fi';
import { Avatar, Badge, EmptyState, Modal, PageHeader, ProgressRing } from './TeacherUI';
import { CheckInWidget } from './TeacherOverview';

/* ---------------- My attendance ---------------- */
const LiveClock = () => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return <span className="tabular-nums">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>;
};

export const MyAttendanceTab = ({ teacherData, todayAttendance, history, checkInClass, setCheckInClass, onCheckIn }) => {
    const now = new Date();
    const monthDays = new Set(
        history
            .filter(r => { const d = new Date(r.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
            .map(r => new Date(r.date).toDateString())
    ).size;
    const monthPct = Math.round((monthDays / now.getDate()) * 100);

    return (
        <div className="space-y-6">
            <PageHeader icon={FiClock} eyebrow="Me" title="My attendance" subtitle="Punch in for each session and review your work log." />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-brand-sunset text-white p-6 md:p-8 shadow-brand-glow animate-fade-up">
                    <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl animate-float-slow" />
                    <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                            <p className="mt-2 text-4xl md:text-5xl font-extrabold tracking-tight"><LiveClock /></p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {todayAttendance.length > 0 ? (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/90 text-xs font-bold"><FiCheckCircle /> {todayAttendance.length} session{todayAttendance.length > 1 ? 's' : ''} marked today</span>
                                ) : (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-bold"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Not checked in yet</span>
                                )}
                            </div>
                        </div>
                        <CheckInWidget
                            variant="panel"
                            teacherData={teacherData}
                            todayAttendance={todayAttendance}
                            value={checkInClass}
                            onChange={setCheckInClass}
                            onCheckIn={onCheckIn}
                        />
                    </div>
                </div>

                <div className="ui-card p-5 md:p-6 flex items-center gap-5 animate-fade-up">
                    <div className="text-gray-900 dark:text-white"><ProgressRing value={monthPct} size={96} stroke={9} sublabel="month" /></div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">This month</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{monthDays} <span className="text-sm font-semibold text-gray-400">/ {now.getDate()} days</span></p>
                        <p className="text-xs text-gray-500 mt-1">{history.length} check-ins logged overall</p>
                    </div>
                </div>
            </div>

            {todayAttendance.length > 0 && (
                <div className="ui-card p-5 animate-fade-up">
                    <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><FiCheckCircle className="text-emerald-500" /> Today's sessions</h4>
                    <div className="flex flex-wrap gap-2.5 ui-stagger">
                        {todayAttendance.map(log => (
                            <div key={log._id} className="flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                                <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">{log.className?.charAt(0) || 'C'}</span>
                                <div className="leading-tight">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{log.className || 'General Session'}</p>
                                    <p className="text-[11px] text-gray-500 tabular-nums">{new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="ui-card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <h3 className="font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2"><FiList className="text-brand-500" /> Attendance log</h3>
                    <Badge tone="grey">{history.length} records</Badge>
                </div>
                <div className="overflow-x-auto ui-scrollbar max-h-[60vh]">
                    <table className="w-full text-left min-w-[560px]">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-ink-800 z-10">
                            <tr className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Session / class</th>
                                <th className="px-5 py-3">Check-in</th>
                                <th className="px-5 py-3">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                            {history.map(record => (
                                <tr key={record._id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.03] transition-colors">
                                    <td className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        <span className="flex items-center gap-2"><FiCalendar className="text-gray-300" /> {new Date(record.date).toLocaleDateString()}</span>
                                    </td>
                                    <td className="px-5 py-3"><Badge tone="green">{record.className || 'General'}</Badge></td>
                                    <td className="px-5 py-3 text-xs text-gray-500 tabular-nums">{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '—'}</td>
                                    <td className="px-5 py-3 text-xs text-gray-400">{record.remarks || '—'}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr><td colSpan="4" className="text-center py-10 text-sm text-gray-400">No records yet — your first check-in will appear here.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

/* ---------------- Notices ---------------- */
const isFresh = (d) => d && Date.now() - new Date(d).getTime() < 3 * 86400000;

export const NoticesTab = ({ notices, onOpen }) => (
    <div className="space-y-6 max-w-4xl">
        <PageHeader icon={FiVolume2} eyebrow="Me" title="Notice board" subtitle="Latest announcements from the administration." />
        {notices.length === 0 ? (
            <EmptyState icon={FiVolume2} title="No new notices" hint="Announcements from the institute will appear here." />
        ) : (
            <div className="space-y-3 ui-stagger">
                {notices.map(notice => (
                    <button
                        key={notice._id}
                        type="button"
                        onClick={() => onOpen(notice)}
                        className="group w-full text-left ui-card ui-card-hover p-5 pl-6 relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gradient group-hover:w-1.5 transition-all" />
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform"><FiVolume2 /></div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">{notice.title}</h3>
                                    {isFresh(notice.createdAt) && <Badge tone="brand" dot>New</Badge>}
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{notice.content || 'Click to view details…'}</p>
                                <p className="text-[11px] text-gray-400 mt-2">{new Date(notice.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <FiChevronRight className="text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all mt-3" />
                        </div>
                    </button>
                ))}
            </div>
        )}
    </div>
);

export const NoticeModal = ({ notice, onClose }) => (
    <Modal
        open={Boolean(notice)}
        onClose={onClose}
        icon={FiVolume2}
        title={notice?.title || ''}
        subtitle={notice ? new Date(notice.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
        bodyClassName="p-6 md:p-8"
        footer={<div className="flex justify-end"><button type="button" onClick={onClose} className="ui-btn-dark">Close</button></div>}
    >
        {notice && (
            <>
                <Badge tone="brand" className="mb-4">Official circular</Badge>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap text-base">{notice.content}</p>
                <div className="mt-8 pt-5 border-t border-gray-100 dark:border-white/5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-500"><FiVolume2 /></div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sent by</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Institute Administration</p>
                    </div>
                </div>
            </>
        )}
    </Modal>
);

/* ---------------- Profile ---------------- */
export const ProfileTab = ({ profile, teacherData, photoPreview, uploadingPhoto, onPhotoChange, onPhotoSave, onPhotoCancel }) => (
    <div className="max-w-3xl space-y-6">
        <PageHeader icon={FiUsers} eyebrow="Me" title="My profile" subtitle="Your faculty details and teaching assignments." />
        <div className="ui-card overflow-hidden animate-fade-up">
            <div className="relative h-32 md:h-40 bg-brand-sunset">
                <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            </div>
            <div className="px-5 md:px-8 pb-6 md:pb-8">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14">
                    <div className="relative group w-28 h-28">
                        <Avatar name={profile.name} photo={photoPreview || profile.profilePhoto} size="xl" className="!ring-4 shadow-card-hover" />
                        <label className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer">
                            <FiCamera className="text-xl mb-1" /> Change
                            <input type="file" className="sr-only" onChange={onPhotoChange} accept="image/*" aria-label="Upload profile photo" />
                        </label>
                    </div>
                    <div className="flex-1 min-w-0 sm:pb-2">
                        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white truncate">{profile.name}</h2>
                        <p className="text-sm text-gray-500">Faculty · Oasis JEE Classes</p>
                    </div>
                    {photoPreview && (
                        <div className="flex gap-2 sm:pb-2 animate-scale-in">
                            <button type="button" onClick={onPhotoSave} disabled={uploadingPhoto} className="ui-btn-primary !py-2 text-xs">
                                {uploadingPhoto ? <FiLoader className="animate-spin" /> : <FiCheck />} Save photo
                            </button>
                            <button type="button" onClick={onPhotoCancel} className="ui-btn-secondary !py-2 text-xs"><FiX /> Cancel</button>
                        </div>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                        <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5"><FiBookOpen /> Subjects</p>
                        <div className="flex flex-wrap gap-1.5">
                            {teacherData.subjects.length ? teacherData.subjects.map(s => <Badge key={s._id} tone="brand">{s.name}</Badge>) : <span className="text-xs text-gray-400">None assigned</span>}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                        <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5"><FiUsers /> Batches</p>
                        <div className="flex flex-wrap gap-1.5">
                            {teacherData.batches.length ? teacherData.batches.map(b => <Badge key={b._id} tone="dark">{b.name}</Badge>) : <span className="text-xs text-gray-400">None assigned</span>}
                        </div>
                    </div>
                </div>

                <div className="mt-4 divide-y divide-gray-100 dark:divide-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    {[{ icon: FiMail, label: 'Email', val: profile.email }, { icon: FiPhone, label: 'Phone', val: profile.phone }].map((row) => (
                        <div key={row.label} className="flex items-center gap-3 px-4 py-3.5">
                            <span className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><row.icon /></span>
                            <span className="text-xs font-bold text-gray-500 w-14">{row.label}</span>
                            <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100 text-right break-all">{row.val || '—'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);
