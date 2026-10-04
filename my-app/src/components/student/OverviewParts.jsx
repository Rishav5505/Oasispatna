import React from 'react';
import {
    FiUser, FiPhone, FiMail, FiCamera, FiCalendar, FiClock, FiEdit2, FiX, FiSave, FiCheck, FiAlertCircle,
    FiBarChart2, FiFileText, FiAward, FiDownload, FiPrinter, FiCreditCard, FiChevronRight, FiBookOpen, FiActivity,
} from 'react-icons/fi';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import { Bar } from 'react-chartjs-2';
import { QRCodeSVG } from 'qrcode.react';
import oasisLogo from '../../assets/oasis_logo.png';
import { AnimatedNumber } from '../ui/Motion';
import { ProgressRing, AnimatedBar, CardHeader } from './Widgets';
import { EmptyState } from './StudentUI';
import { resolveFileUrl } from './helpers';

const fmtDate = (d, opts) => (d ? new Date(d).toLocaleDateString(undefined, opts) : '');
const isFresh = (d) => new Date(d) > new Date(Date.now() - 604800000);
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/* ------------------------------------------------------------------ Profile */

const FIELDS = [
    { key: 'name', label: 'Full Name', icon: FiUser, editable: true },
    { key: 'phone', label: 'Phone', icon: FiPhone, editable: true },
    { key: 'email', label: 'Email', icon: FiMail, editable: true },
    { key: 'fatherName', label: "Father's Name", icon: FiUser, editable: true },
    { key: 'motherName', label: "Mother's Name", icon: FiUser, editable: true },
    { key: 'dob', label: 'Date of Birth', icon: FiCalendar, editable: true, date: true },
    { key: 'admissionDate', label: 'Admission Date', icon: FiClock, editable: false, date: true },
];

const Field = ({ label, children, required }) => (
    <label className="block">
        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">{label}{required && <span className="text-brand-600"> *</span>}</span>
        {children}
    </label>
);

export const ProfileCard = ({ editForm, setEditForm, editMode, setEditMode, onToggleEdit, onSave, photoFile, setPhotoFile, hasPhoto, completion, deadline }) => (
    <div className="ui-card p-6 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center gap-5 mb-6">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <ProgressRing value={completion} size={72} stroke={7} tone={completion >= 100 ? 'green' : 'brand'}>
                    <span className="text-sm font-extrabold text-gray-900 dark:text-white">{completion}%</span>
                </ProgressRing>
                <div className="min-w-0">
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {completion >= 100 ? 'Your profile is complete' : 'Complete your profile'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {completion >= 100 ? 'Looking sharp! Keep your details up to date.' : <>Keep your information up to date &middot; complete by <span className="font-semibold text-gray-700 dark:text-gray-300">{deadline}</span></>}
                    </p>
                </div>
            </div>
            <button onClick={onToggleEdit} className={editMode ? 'ui-btn-secondary' : 'ui-btn-primary'}>
                {editMode ? <><FiX /> Cancel</> : <><FiEdit2 /> Edit Profile</>}
            </button>
        </div>

        {editMode ? (
            <div className="animate-fade-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Full Name" required>
                        <input type="text" required className="ui-input dark:text-white" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </Field>
                    <Field label="Phone" required>
                        <input type="tel" required className="ui-input dark:text-white" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </Field>
                    <Field label="Email" required>
                        <input type="email" required className="ui-input dark:text-white" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </Field>
                    <Field label="Father's Name">
                        <input type="text" className="ui-input dark:text-white" value={editForm.fatherName} onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })} />
                    </Field>
                    <Field label="Mother's Name">
                        <input type="text" className="ui-input dark:text-white" value={editForm.motherName} onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })} />
                    </Field>
                    <Field label="Date of Birth">
                        <input type="date" className="ui-input dark:text-white" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} />
                    </Field>
                    <Field label="Admission Date">
                        <input type="date" className="ui-input dark:text-white" value={editForm.admissionDate} onChange={(e) => setEditForm({ ...editForm, admissionDate: e.target.value })} />
                    </Field>
                    <div className="sm:col-span-2">
                        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Profile Photo</span>
                        <label htmlFor="edit-photo-upload" className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-white/5 cursor-pointer transition-colors">
                            <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><FiCamera /></span>
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{photoFile ? photoFile.name : 'Click to upload a photo'}</span>
                                <span className="block text-xs text-gray-400">PNG, JPG up to 5MB</span>
                            </span>
                            <span className="ui-btn-secondary !py-2 !px-3 text-xs">Choose file</span>
                        </label>
                        <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} className="hidden" id="edit-photo-upload" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-white/5">
                    <button onClick={() => setEditMode(false)} className="ui-btn-secondary">Cancel</button>
                    <button onClick={onSave} className="ui-btn-primary"><FiSave /> Save Changes</button>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
                {FIELDS.map(f => {
                    const val = editForm[f.key];
                    const filled = !!(val && String(val).trim());
                    const Icon = f.icon;
                    const Tag = f.editable ? 'button' : 'div';
                    return (
                        <Tag
                            key={f.key}
                            type={f.editable ? 'button' : undefined}
                            onClick={f.editable ? () => setEditMode(true) : undefined}
                            className={`group text-left rounded-2xl p-4 border transition-all ${filled ? 'bg-gray-50/70 dark:bg-white/5 border-gray-100 dark:border-white/5' : 'bg-amber-50/60 dark:bg-amber-500/5 border-amber-200/70 dark:border-amber-500/20'} ${f.editable ? 'hover:border-brand-200 hover:bg-white dark:hover:bg-white/10 hover:shadow-card' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${filled ? 'bg-white dark:bg-white/10 text-brand-600 shadow-sm' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600'}`}><Icon /></span>
                                {filled ? <FiCheck className="text-emerald-500" aria-label="Completed" /> : <FiAlertCircle className="text-amber-500" aria-label="Missing" />}
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{f.label}</p>
                            <p className={`text-sm font-semibold mt-0.5 break-words ${filled ? 'text-gray-900 dark:text-gray-100' : 'text-amber-700 dark:text-amber-400'}`}>
                                {filled ? (f.date ? fmtDate(val) : val) : 'Not provided'}
                            </p>
                        </Tag>
                    );
                })}
                <div className="rounded-2xl p-4 border bg-gray-50/70 dark:bg-white/5 border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-white dark:bg-white/10 text-brand-600 shadow-sm"><FiCamera /></span>
                        {hasPhoto ? <FiCheck className="text-emerald-500" /> : <FiAlertCircle className="text-amber-500" />}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Profile Photo</p>
                    <p className="text-sm font-semibold mt-0.5 text-gray-900 dark:text-gray-100">{hasPhoto ? 'Uploaded' : 'Not uploaded'}</p>
                </div>
            </div>
        )}
    </div>
);

/* --------------------------------------------------------------- Attendance */

export const AttendanceCard = ({ subjects, selectedSubject, setSelectedSubject, records, total, present, percentage }) => (
    <div className="ui-card p-6">
        <CardHeader
            icon={FiActivity}
            title="Attendance Overview"
            subtitle="Your class-wise attendance record"
            action={(
                <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="ui-input !w-auto !py-2 !px-3 text-sm font-semibold text-brand-700 dark:text-brand-300 cursor-pointer"
                    aria-label="Filter by subject"
                >
                    {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
            )}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 ui-stagger">
            {[
                { label: 'Total', value: total, cls: 'bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white' },
                { label: 'Present', value: present, cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                { label: 'Absent', value: total - present, cls: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' },
                { label: 'Rate', value: percentage, suffix: '%', cls: percentage >= 75 ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600' },
            ].map(s => (
                <div key={s.label} className={`rounded-2xl p-4 ${s.cls}`}>
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{s.label}</p>
                    <p className="text-2xl font-extrabold mt-1"><AnimatedNumber value={s.value} suffix={s.suffix} /></p>
                </div>
            ))}
        </div>

        <div className="mb-3">
            <AnimatedBar value={percentage} barClass={percentage >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-rose-400 to-rose-600'} />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{percentage >= 75 ? 'Great going — you are above the 75% mark.' : 'Below 75% — try not to miss upcoming classes.'}</p>
        </div>

        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-6 mb-3">Recent logs</h3>
        <div className="max-h-72 overflow-y-auto ui-scrollbar pr-1 space-y-2">
            {records.length > 0 ? records.map(a => {
                const ok = a.status === 'present';
                return (
                    <div key={a._id} className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 dark:border-white/5 hover:bg-brand-50/40 dark:hover:bg-white/5 transition-colors">
                        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center leading-none ${ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'}`}>
                            <span className="text-base font-extrabold">{new Date(a.date).getDate()}</span>
                            <span className="text-[9px] font-bold uppercase">{fmtDate(a.date, { month: 'short' })}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.subjectId?.name || 'Class session'}</p>
                            <p className="text-xs text-gray-400">{fmtDate(a.date, { weekday: 'short', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span className={`ui-badge ${ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>{a.status}</span>
                    </div>
                );
            }) : (
                <EmptyState compact icon={<FiCalendar />} title="No records found" message="Your attendance will show up here once classes are marked." />
            )}
        </div>
    </div>
);

/* ------------------------------------------------------------------ Reports */

const groupMarksByExam = (marks) => Object.values(marks.reduce((acc, m) => {
    const examId = m.examId?._id || 'unknown';
    if (!acc[examId]) acc[examId] = { exam: m.examId, subjectResults: [], totalObtained: 0, totalMax: 0 };
    acc[examId].subjectResults.push({
        subjectId: m.subjectId?._id,
        subjectName: m.subjectId?.name || 'Subject',
        obtained: m.marks,
        maxMarks: m.maxMarks || 100,
    });
    acc[examId].totalObtained += m.marks;
    acc[examId].totalMax += (m.maxMarks || 100);
    return acc;
}, {}));

export const AcademicReports = ({ cumulativeSummary, marks, onViewSummary, onViewExam }) => {
    const exams = groupMarksByExam(marks);
    return (
        <div className="ui-card p-6">
            <CardHeader icon={FiAward} title="Academic Reports" subtitle="Official performance records" />

            {cumulativeSummary && cumulativeSummary.isPublished && (
                <div className="relative overflow-hidden rounded-3xl bg-brand-sunset text-white p-6 mb-5 shadow-brand-glow">
                    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <ProgressRing value={cumulativeSummary.percentage} size={76} stroke={7} tone="amber">
                                <span className="text-sm font-extrabold text-white">{cumulativeSummary.percentage}%</span>
                            </ProgressRing>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Academic Session 2025-26</p>
                                <h3 className="text-xl font-extrabold tracking-tight">Final Cumulative Record</h3>
                                <p className="text-sm text-white/80">Aggregate score across all exams</p>
                            </div>
                        </div>
                        <button onClick={onViewSummary} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-brand-700 font-bold text-sm hover:bg-brand-50 active:scale-95 transition-all shadow-lg">
                            View Final Transcript <FiChevronRight />
                        </button>
                    </div>
                </div>
            )}

            {exams.length > 0 ? (
                <div className="space-y-3 ui-stagger">
                    {exams.map((summary, idx) => {
                        const pct = summary.totalMax ? (summary.totalObtained / summary.totalMax) * 100 : 0;
                        return (
                            <div key={summary.exam?._id || idx} className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-brand-200 hover:shadow-card transition-all">
                                <div className="w-12 h-12 shrink-0 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft group-hover:scale-105 transition-transform">
                                    <FiFileText className="text-lg" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{summary.exam?.name || 'Academic Assessment'}</h3>
                                        {summary.exam?.type && <span className="hidden sm:inline ui-badge bg-gray-100 dark:bg-white/5 text-gray-500">{summary.exam.type}</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                        <AnimatedBar value={pct} className="h-1.5 flex-1" />
                                        <span className="text-xs font-bold text-gray-500 whitespace-nowrap">{summary.totalObtained}/{summary.totalMax}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 hidden sm:block">
                                    <p className="text-xl font-extrabold text-brand-600">{pct.toFixed(1)}%</p>
                                </div>
                                <button
                                    onClick={() => onViewExam(summary, pct)}
                                    className="shrink-0 ui-btn-dark !px-3 sm:!px-4 !py-2 text-xs"
                                    aria-label={`View report for ${summary.exam?.name || 'exam'}`}
                                >
                                    <span className="sm:hidden font-extrabold">{pct.toFixed(0)}%</span>
                                    <span className="hidden sm:inline">View report</span>
                                    <FiChevronRight className="hidden sm:inline" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState compact icon={<FiBookOpen />} title="No academic reports yet" message="Your exam results will appear here once published." />
            )}
        </div>
    );
};

/* ----------------------------------------------------------- Marks bar chart */

const barGradient = (context) => {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return '#f37021';
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    g.addColorStop(0, '#fbad78');
    g.addColorStop(1, '#e15814');
    return g;
};

export const MarksChart = ({ marks }) => (
    <div className="ui-card p-6 h-full">
        <CardHeader icon={FiBarChart2} title="Exam Performance" subtitle="Subject-wise score (%) in published exams" />
        <div className="h-64">
            {marks.length > 0 ? (
                <Bar
                    data={{
                        labels: marks.map(m => m.subjectId?.name || 'Subject'),
                        datasets: [{
                            label: 'Score %',
                            data: marks.map(m => Math.round(((Number(m.marks) || 0) / (Number(m.maxMarks) || 100)) * 100)),
                            backgroundColor: barGradient,
                            hoverBackgroundColor: '#111114',
                            borderRadius: 10,
                            borderSkipped: false,
                            maxBarThickness: 44,
                        }],
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 1100, easing: 'easeOutQuart' },
                        plugins: {
                            legend: { display: false },
                            tooltip: { backgroundColor: '#111114', padding: 10, cornerRadius: 10, displayColors: false, callbacks: { label: (i) => `${i.parsed.y}%` } },
                        },
                        scales: {
                            y: { beginAtZero: true, max: 100, grid: { color: 'rgba(148,163,184,0.15)' }, border: { display: false }, ticks: { color: '#9ca3af', callback: (v) => `${v}%` } },
                            x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { weight: 600 } } },
                        },
                    }}
                />
            ) : (
                <EmptyState compact icon={<FiBarChart2 />} title="No performance data yet" message="Scores appear once your teachers publish exam marks." />
            )}
        </div>
    </div>
);

/* --------------------------------------------------------------------- Fees */

export const FeesCard = ({ fees, onReceipt }) => {
    const total = Number(fees.totalFees) || 0;
    const paid = Number(fees.paidFees) || 0;
    const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
    const pending = Number(fees.pendingFees) || 0;
    return (
        <div className="ui-card p-6">
            <CardHeader icon={FiCreditCard} title="Fee Details" subtitle={pending > 0 ? 'Payment pending' : 'All dues cleared'} />
            <div className="flex items-center gap-5 mb-5">
                <ProgressRing value={paidPct} size={96} stroke={9} tone={pending > 0 ? 'brand' : 'green'}>
                    <span className="text-lg font-extrabold text-gray-900 dark:text-white"><AnimatedNumber value={paidPct} suffix="%" /></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Paid</span>
                </ProgressRing>
                <div className="flex-1 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-gray-900 dark:text-white">{rupee(fees.totalFees)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-bold text-emerald-600">{rupee(fees.paidFees)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Pending</span><span className={`font-bold ${pending > 0 ? 'text-rose-600' : 'text-gray-400'}`}>{rupee(fees.pendingFees)}</span></div>
                </div>
            </div>
            <div className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${pending > 0 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                <span className="flex items-center gap-2 font-semibold"><FiCalendar /> Due date</span>
                <span className="font-bold">{fees.dueDate ? fmtDate(fees.dueDate) : 'N/A'}</span>
            </div>

            {fees.payments && fees.payments.length > 0 && (
                <div className="mt-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Recent payments</h3>
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {fees.payments.slice(0, 3).map((payment, index) => (
                            <div key={index} className="flex items-center justify-between py-2.5 text-sm">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{rupee(payment.amount)}</p>
                                    <p className="text-xs text-gray-400">{fmtDate(payment.date)}</p>
                                </div>
                                <button onClick={() => onReceipt(payment)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-700 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300 hover:bg-brand-100 transition-colors">
                                    <FiDownload /> Receipt
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------ Announcements */

export const AnnouncementsCard = ({ notices, onSelect, onViewAll }) => (
    <div className="ui-card p-6">
        <CardHeader icon={HiOutlineSpeakerphone} title="Announcements" subtitle="Latest from Oasis" />
        <div className="space-y-3">
            {notices.length === 0 && <EmptyState compact icon={<HiOutlineSpeakerphone />} title="No announcements" />}
            {notices.slice(0, 2).map(notice => {
                const fresh = isFresh(notice.createdAt);
                return (
                    <button key={notice._id} onClick={() => onSelect(notice)} className="group w-full text-left p-4 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-brand-200 hover:bg-brand-50/40 dark:hover:bg-white/5 transition-all">
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-700 transition-colors line-clamp-1">{notice.title}</h3>
                            {fresh && (
                                <span className="ui-badge bg-brand-500 text-white shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />New</span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{notice.content || notice.description}</p>
                        <p className="mt-2 text-xs font-semibold text-gray-400 flex items-center gap-1"><FiClock /> {fmtDate(notice.createdAt, { month: 'short', day: 'numeric' })}</p>
                    </button>
                );
            })}
            {notices.length > 2 && (
                <button onClick={onViewAll} className="w-full py-2 text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1">
                    View all {notices.length} notices <FiChevronRight />
                </button>
            )}
        </div>
    </div>
);

/* --------------------------------------------------------- Study materials */

export const MaterialsCard = ({ materials }) => (
    <div className="ui-card p-6">
        <CardHeader icon={FiBookOpen} title="Study Materials" subtitle="Notes & DPPs from your teachers" />
        <div className="space-y-2">
            {materials.length === 0 && (
                <EmptyState compact icon={<FiDownload />} title="No materials available" message="Notes and DPPs shared by your teachers will appear here." />
            )}
            {materials.slice(0, 3).map(material => (
                <div key={material._id} className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-brand-50/40 dark:hover:bg-white/5 transition-colors">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 group-hover:bg-brand-gradient group-hover:text-white flex items-center justify-center transition-all"><FiFileText /></span>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{material.title}</h3>
                        <p className="text-xs text-gray-500 truncate">{material.description}</p>
                    </div>
                    <a
                        href={resolveFileUrl(material.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        title="Download / open"
                        aria-label={`Download ${material.title}`}
                        className="w-9 h-9 shrink-0 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 hover:bg-brand-600 hover:text-white flex items-center justify-center transition-all"
                    >
                        <FiDownload />
                    </a>
                </div>
            ))}
        </div>
    </div>
);

/* ------------------------------------------------------------ Digital ID */

export const DigitalIdCard = ({ student, profile, user, photoUrl, onPrint }) => (
    <div className="ui-card p-6 flex flex-col h-full">
        <CardHeader
            icon={FiCreditCard}
            title="Digital ID Card"
            action={(
                <button onClick={onPrint} className="ui-btn-secondary !px-3 !py-2 text-xs"><FiPrinter /> Print</button>
            )}
        />
        <div className="relative flex-1 [perspective:1000px]">
            <div id="digital-id-card" className="group relative h-full overflow-hidden rounded-3xl bg-brand-sunset p-[1px] shadow-brand-glow">
                <div className="relative h-full rounded-[calc(1.5rem-1px)] bg-ink-950/80 backdrop-blur-xl p-6 text-white flex flex-col items-center text-center overflow-hidden">
                    <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-brand-500/40 blur-3xl animate-float-slow" />
                    <div className="absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-brand-700/30 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                    <div className="relative w-full flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <img src={oasisLogo} alt="Oasis" className="w-8 h-8 object-contain bg-white rounded-lg p-1" />
                            <span className="text-xs font-extrabold tracking-wider">OASIS JEE</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-white/10 border border-white/15">Student</span>
                    </div>

                    <div className="relative w-24 h-24 rounded-full p-1 bg-brand-gradient shadow-brand-glow mb-3">
                        <img
                            src={photoUrl}
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=' + (student.name || 'Student'); }}
                            alt="Student"
                            className="w-full h-full rounded-full object-cover bg-ink-800 border-2 border-ink-950"
                        />
                    </div>

                    <h3 className="relative text-xl font-extrabold tracking-tight">{student.name || profile.name || 'Student Name'}</h3>
                    <p className="relative text-brand-300 text-[11px] font-bold uppercase tracking-[0.25em] mb-4">Oasis JEE Student</p>

                    <div className="relative w-full grid grid-cols-3 gap-2 text-left mb-4">
                        {[['ID No.', user?.id?.slice(-8).toUpperCase(), true], ['Class', student.classId?.name || 'N/A'], ['Batch', student.batchId?.name || 'N/A']].map(([k, v, mono]) => (
                            <div key={k} className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 min-w-0">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{k}</p>
                                <p className={`text-xs font-bold truncate ${mono ? 'font-mono' : ''}`}>{v}</p>
                            </div>
                        ))}
                    </div>

                    <div className="relative mt-auto">
                        <div className="mx-auto w-fit bg-white rounded-2xl p-2 shadow-lg">
                            <QRCodeSVG
                                value={`OASIS-STUDENT:${student._id || user?.id || ''}`}
                                size={84}
                                level="M"
                                bgColor="#ffffff"
                                fgColor="#000000"
                                title="Student ID QR code"
                            />
                        </div>
                        <p className="text-[9px] text-white/50 uppercase tracking-[0.25em] mt-2">Scan to verify</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
