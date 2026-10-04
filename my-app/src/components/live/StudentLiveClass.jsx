import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import config from '../../config';
import { FiVideo, FiUser, FiClock, FiCalendar, FiExternalLink } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { authHeaders, errorMessage } from '../student/helpers';
import { SkeletonCards, EmptyState, ErrorState, PageHeader } from '../student/StudentUI';

const JOIN_EARLY_MS = 10 * 60 * 1000; // allow joining 10 minutes before start
const DEFAULT_DURATION_MIN = 60;

// Derives a display status using the class's start time + duration (minutes)
const getLiveState = (lc, now) => {
    if (lc.status === 'cancelled') return 'cancelled';
    if (lc.status === 'completed') return 'ended';
    const start = new Date(lc.dateTime).getTime();
    const end = start + (Number(lc.duration) || DEFAULT_DURATION_MIN) * 60000;
    if (lc.status === 'live' && now < end + 30 * 60000) return 'live';
    if (now >= start && now < end) return 'live';
    if (now >= end) return 'ended';
    if (start - now <= JOIN_EARLY_MS) return 'soon';
    return 'scheduled';
};

const dayKey = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

const dayLabel = (d) => {
    const date = new Date(d);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (dayKey(date) === dayKey(today)) return 'Today';
    if (dayKey(date) === dayKey(tomorrow)) return 'Tomorrow';
    return date.toLocaleDateString('en-IN', { weekday: 'long' });
};

const badge = {
    live: { text: 'Live Now', cls: 'bg-red-500 text-white border-red-500' },
    soon: { text: 'Starting Soon', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30' },
    scheduled: { text: 'Scheduled', cls: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10' },
    ended: { text: 'Ended', cls: 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-white/5 dark:border-white/10' },
    cancelled: { text: 'Cancelled', cls: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20' },
};

const StudentLiveClass = ({ studentId }) => {
    const [liveClasses, setLiveClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    const fetchLiveClasses = useCallback(async () => {
        setError('');
        try {
            const res = await axios.get(`${config.API_URL}/live-classes/student/${studentId}`, { headers: authHeaders() });
            setLiveClasses(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching live classes:', err);
            const msg = errorMessage(err, 'Failed to load live classes');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        if (studentId) fetchLiveClasses();
    }, [studentId, fetchLiveClasses]);

    const groups = useMemo(() => {
        const sorted = [...liveClasses].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        const map = new Map();
        sorted.forEach(lc => {
            const key = dayKey(lc.dateTime);
            if (!map.has(key)) map.set(key, { key, date: lc.dateTime, items: [] });
            map.get(key).items.push(lc);
        });
        return [...map.values()];
    }, [liveClasses]);

    const handleJoin = async (liveClass) => {
        // Open synchronously so popup blockers don't interfere, then record attendance
        const win = window.open(liveClass.meetingLink, '_blank');
        if (win) win.opener = null;
        try {
            await axios.post(`${config.API_URL}/live-classes/join`, {
                studentId,
                liveClassId: liveClass._id,
                subjectId: liveClass.subjectId?._id
            }, { headers: authHeaders() });
            toast.success('Attendance marked for this session');
        } catch (err) {
            console.error('Error marking attendance:', err);
        }
        if (!win) window.location.href = liveClass.meetingLink;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="ui-skeleton h-12 w-72"></div>
                <SkeletonCards count={3} height="h-64" />
            </div>
        );
    }

    const liveCount = liveClasses.filter(lc => getLiveState(lc, now) === 'live').length;

    return (
        <div className="space-y-8">
            <PageHeader
                icon={FiVideo}
                title="Live Classes"
                subtitle="Today and the next 7 days"
                action={(
                    <div className="flex flex-wrap gap-2">
                        {liveCount > 0 && (
                            <span className="ui-badge bg-red-500 text-white !py-2 !px-3 animate-glow"><span className="w-2 h-2 rounded-full bg-white animate-pulse" />{liveCount} live now</span>
                        )}
                        <span className="ui-badge bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 !py-2 !px-3">
                            <FiCalendar /> {new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </div>
                )}
            />

            {error && liveClasses.length === 0 ? (
                <ErrorState message={error} onRetry={() => { setLoading(true); fetchLiveClasses(); }} />
            ) : groups.length === 0 ? (
                <EmptyState
                    icon={<FiVideo />}
                    title="No upcoming sessions"
                    message="You're all caught up! No live sessions are scheduled for today or the coming week."
                />
            ) : groups.map(group => (
                <section key={group.key}>
                    <h3 className="flex items-center gap-3 mb-4">
                        <span className="text-base font-extrabold text-gray-900 dark:text-white">{dayLabel(group.date)}</span>
                        <span className="text-sm font-semibold text-gray-400">{new Date(group.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        <span className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                        <span className="text-xs font-bold text-gray-400">{group.items.length} session{group.items.length === 1 ? '' : 's'}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 ui-stagger">
                        {group.items.map(lc => {
                            const state = getLiveState(lc, now);
                            const b = badge[state];
                            const canJoin = state === 'live' || state === 'soon';
                            const isLive = state === 'live';
                            const start = new Date(lc.dateTime);
                            return (
                                <div
                                    key={lc._id}
                                    className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 ${isLive
                                        ? 'bg-brand-dark text-white shadow-brand-glow ring-2 ring-red-500/60 animate-glow'
                                        : `ui-card ui-card-hover ${state === 'ended' || state === 'cancelled' ? 'opacity-60' : ''}`}`}
                                >
                                    <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl transition-all duration-500 group-hover:scale-125 ${isLive ? 'bg-red-500/30' : 'bg-brand-500/10'}`} />

                                    <div className="relative flex justify-between items-start mb-5 gap-2">
                                        <span className={`ui-badge border ${b.cls}`}>
                                            {isLive && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                                            {b.text}
                                        </span>
                                        {lc.subjectId?.name && (
                                            <span className={`ui-badge truncate ${isLive ? 'bg-white/10 text-brand-300' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'}`}>{lc.subjectId.name}</span>
                                        )}
                                    </div>

                                    <div className="relative flex items-start gap-4 mb-5">
                                        <div className={`shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center leading-none ${isLive ? 'bg-white/10' : 'bg-gray-50 dark:bg-white/5'}`}>
                                            <span className={`text-base font-extrabold ${isLive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')}</span>
                                            <span className={`text-[10px] font-bold uppercase mt-0.5 ${isLive ? 'text-white/60' : 'text-gray-400'}`}>{start.getHours() >= 12 ? 'PM' : 'AM'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className={`text-lg font-extrabold leading-snug line-clamp-2 ${isLive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{lc.title}</h3>
                                            <p className={`text-sm mt-1 flex items-center gap-1.5 ${isLive ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                                                <FiUser className="shrink-0" /> Prof. {lc.teacherId?.name || 'TBA'}
                                            </p>
                                            <p className={`text-xs mt-1 flex items-center gap-1.5 ${isLive ? 'text-white/60' : 'text-gray-400'}`}>
                                                <FiClock className="shrink-0" /> {Number(lc.duration) || DEFAULT_DURATION_MIN} mins
                                            </p>
                                        </div>
                                    </div>

                                    {canJoin ? (
                                        <button
                                            onClick={() => handleJoin(lc)}
                                            className={`relative w-full ${isLive ? 'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all shadow-lg' : 'ui-btn-primary !py-3'}`}
                                        >
                                            <FiExternalLink /> {isLive ? 'Join live now' : 'Join session'}
                                        </button>
                                    ) : (
                                        <div className="relative w-full text-center py-3 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-white/5 text-gray-400">
                                            {state === 'ended' ? 'Session ended' : state === 'cancelled' ? 'Session cancelled' : `Starts ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default StudentLiveClass;
