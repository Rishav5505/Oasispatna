import React, { useState } from 'react';
import {
    FiUsers, FiBookOpen, FiHelpCircle, FiClipboard, FiVideo, FiCheckSquare, FiUploadCloud,
    FiLogIn, FiCheckCircle, FiPlus, FiArrowUpRight, FiCalendar, FiZap, FiX
} from 'react-icons/fi';
import { GradientBanner, StatCard } from '../ui/Motion';
import { greeting } from '../ui/motionUtils';
import { TodayClasses } from './TeacherTimetable';
import RecentActivity from './RecentActivity';
import { slotsForDay, todayName, useTeacherSchedule } from './teacherApi';

const TIPS = [
    'Open class with a 2-minute recap question — retrieval beats re-reading every time.',
    'For JEE numericals, have students predict the order of magnitude before solving.',
    'End each session by asking: "What is still unclear?" — it surfaces doubts early.',
    'Mix one tricky concept question into every DPP to build exam temperament.',
    'Short, frequent tests outperform one big test for long-term retention.',
    'Praise the method, not just the answer — it builds problem-solving confidence.',
    'Turn a common mistake from last test into today’s warm-up problem.',
];
const tipOfDay = () => {
    const start = new Date(new Date().getFullYear(), 0, 0);
    const day = Math.floor((Date.now() - start) / 86400000);
    return TIPS[day % TIPS.length];
};

const checkInOptions = (teacherData) => {
    const classes = teacherData?.classes || [];
    const names = classes.length ? classes.map(c => c.name) : ['Class 9', 'Class 10', 'Class 11', 'Class 12'];
    return [...names, 'Extra Class'];
};

/** Teacher self check-in control. variant 'banner' sits on the gradient hero. */
export const CheckInWidget = ({ teacherData, todayAttendance, value, onChange, onCheckIn, variant = 'banner' }) => {
    const [expanded, setExpanded] = useState(false);
    const done = todayAttendance.length;
    const onDark = variant === 'banner';
    const options = checkInOptions(teacherData);

    if (onDark && !expanded) {
        return done > 0 ? (
            <div className="flex flex-col items-stretch sm:items-end gap-2">
                <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3">
                    <span className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg"><FiCheckCircle /></span>
                    <div className="leading-tight">
                        <p className="text-sm font-extrabold">Checked in</p>
                        <p className="text-xs text-white/75">{done} session{done > 1 ? 's' : ''} today</p>
                    </div>
                </div>
                <button type="button" onClick={() => setExpanded(true)} className="text-xs font-bold text-white/85 hover:text-white flex items-center justify-center sm:justify-end gap-1">
                    <FiPlus /> Add another session
                </button>
            </div>
        ) : (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full sm:w-auto group flex items-center justify-center gap-3 bg-white text-brand-700 px-6 py-4 rounded-2xl font-extrabold text-sm shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all animate-glow"
            >
                <FiLogIn className="text-lg group-hover:translate-x-0.5 transition-transform" />
                Check in for today
            </button>
        );
    }

    return (
        <div className={`${onDark ? 'bg-white/15 backdrop-blur-md border border-white/25 text-white' : 'ui-card text-gray-900 dark:text-white shadow-card-hover'} rounded-2xl p-4 w-full sm:w-80 animate-scale-in`}>
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-extrabold flex items-center gap-2"><FiLogIn /> Session check-in</p>
                {onDark && (
                    <button type="button" onClick={() => setExpanded(false)} aria-label="Cancel check-in" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/15"><FiX /></button>
                )}
            </div>
            <select
                aria-label="Class for check-in"
                className={onDark ? 'w-full px-3 py-2.5 rounded-xl bg-white/90 text-gray-800 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-white/30' : 'ui-input'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">Select class / session…</option>
                {options.map((name, idx) => <option key={`${name}-${idx}`} value={name}>{name}</option>)}
            </select>
            <button
                type="button"
                onClick={async () => { await onCheckIn(); setExpanded(false); }}
                disabled={!value}
                className={`mt-3 w-full ${onDark ? 'inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-ink-950 text-white font-bold text-sm hover:bg-black active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed' : 'ui-btn-primary py-3'}`}
            >
                <FiCheckCircle /> Punch in
            </button>
        </div>
    );
};

const QUICK_ACTIONS = [
    { id: 'live-classes', icon: FiVideo, label: 'Start live class', hint: 'Schedule or go live' },
    { id: 'online-tests', icon: FiClipboard, label: 'Create test', hint: 'Manual, paper or AI' },
    { id: 'attendance', icon: FiCheckSquare, label: 'Mark attendance', hint: 'Tap or QR scan' },
    { id: 'materials', icon: FiUploadCloud, label: 'Upload notes', hint: 'PDF or images' },
];

const TeacherOverview = ({ user, teacherData, todayAttendance, checkInClass, setCheckInClass, onCheckIn, activityStats, onStats, onNavigate }) => {
    const schedule = useTeacherSchedule();
    const todayCount = slotsForDay(schedule.slots, todayName()).length;
    const pending = activityStats?.pendingDoubts;
    const firstName = user?.name?.split(' ')[0] || 'Educator';

    return (
        <div className="space-y-6 md:space-y-8">
            <GradientBanner
                title={`${greeting()}, ${firstName} 👋`}
                subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                right={
                    <CheckInWidget
                        teacherData={teacherData}
                        todayAttendance={todayAttendance}
                        value={checkInClass}
                        onChange={setCheckInClass}
                        onCheckIn={onCheckIn}
                    />
                }
            >
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onNavigate('timetable')} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-xs font-bold transition">
                        <FiCalendar /> {schedule.loading ? 'Loading schedule…' : `${todayCount} class${todayCount === 1 ? '' : 'es'} today`}
                    </button>
                    <button type="button" onClick={() => onNavigate('doubts')} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-xs font-bold transition">
                        {pending > 0 && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                        <FiHelpCircle /> {pending === undefined ? 'Checking doubts…' : `${pending} pending doubt${pending === 1 ? '' : 's'}`}
                    </button>
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/20 border border-white/10 text-xs font-bold">
                        <FiUsers /> {teacherData.batches.length} batch{teacherData.batches.length === 1 ? '' : 'es'}
                    </span>
                </div>
            </GradientBanner>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 ui-stagger">
                <StatCard icon={FiUsers} label="Active batches" value={teacherData.batches.length || 0} hint={`${teacherData.classes?.length || 0} classes assigned`} tone="brand" />
                <StatCard icon={FiBookOpen} label="Subjects" value={teacherData.subjects.length || 0} hint={teacherData.subjects.slice(0, 2).map(s => s.name).join(', ') || 'None assigned'} tone="dark" />
                <StatCard
                    icon={FiHelpCircle}
                    label="Pending doubts"
                    value={pending ?? '–'}
                    hint={pending ? 'Tap to resolve' : pending === 0 ? 'All caught up' : ''}
                    tone={pending ? 'amber' : 'green'}
                    onClick={() => onNavigate('doubts')}
                />
                <StatCard
                    icon={FiClipboard}
                    label="Tests created"
                    value={activityStats?.tests ?? '–'}
                    hint={activityStats ? `${activityStats.liveClasses} live · ${activityStats.videos} videos` : ''}
                    tone="brand"
                    onClick={() => onNavigate('online-tests')}
                />
            </div>

            <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400 mb-3">Quick actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 ui-stagger">
                    {QUICK_ACTIONS.map(a => (
                        <button
                            key={a.id}
                            type="button"
                            onClick={() => onNavigate(a.id)}
                            className="group ui-card ui-card-hover p-4 text-left flex items-center gap-3 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                        >
                            <span className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center text-lg shrink-0 group-hover:bg-brand-gradient group-hover:text-white group-hover:rotate-6 transition-all duration-300">
                                <a.icon />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{a.label}</span>
                                <span className="block text-[11px] text-gray-400 truncate">{a.hint}</span>
                            </span>
                            <FiArrowUpRight className="hidden sm:block text-gray-300 group-hover:text-brand-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
                <div className="lg:col-span-5 space-y-5 md:space-y-6">
                    <TodayClasses schedule={schedule} onOpenTimetable={() => onNavigate('timetable')} />
                    <div className="relative overflow-hidden rounded-3xl bg-brand-dark text-white p-5 md:p-6 animate-fade-up">
                        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-500/25 blur-2xl animate-float-slow" />
                        <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2"><FiZap /> Teaching tip of the day</p>
                        <p className="relative mt-2 text-sm md:text-base font-semibold leading-relaxed text-white/90">{tipOfDay()}</p>
                    </div>
                </div>
                <div className="lg:col-span-7">
                    <RecentActivity onNavigate={onNavigate} onStats={onStats} />
                </div>
            </div>
        </div>
    );
};

export default TeacherOverview;
