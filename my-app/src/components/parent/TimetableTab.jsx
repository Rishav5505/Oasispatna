import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaCalendarWeek, FaChalkboardTeacher, FaDoorOpen, FaRegClock } from 'react-icons/fa';
import config from '../../config';
import { notify } from '../../utils/notify';
import { authHeaders, DAYS, todayName, errorMessage } from './parentUtils';
import { EmptyState, SkeletonBlock, Panel, Chip } from './ParentUI';

const toMinutes = (t = '') => {
    const [h, m] = String(t).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

const formatTime = (t) => {
    if (!t) return '--';
    const [h, m] = String(t).split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

const SlotCard = ({ slot, isToday }) => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const isNow = isToday && nowMin >= toMinutes(slot.startTime) && nowMin < toMinutes(slot.endTime);
    return (
        <div className={`rounded-2xl p-3 transition-all hover:-translate-y-0.5 ${isNow
            ? 'bg-brand-gradient text-white shadow-brand-glow'
            : isToday
                ? 'bg-white dark:bg-ink-800 ring-1 ring-brand-200 dark:ring-brand-500/30 shadow-card'
                : 'bg-white dark:bg-white/[0.03] ring-1 ring-gray-100 dark:ring-white/5'}`}
        >
            <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isNow ? 'text-white/90' : 'text-brand-600 dark:text-brand-400'}`}>
                <FaRegClock /> {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                {isNow && <span className="ml-auto flex items-center gap-1 bg-white/25 px-1.5 py-0.5 rounded-md"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Now</span>}
            </p>
            <p className={`font-extrabold mt-1 text-sm ${isNow ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {slot.subject?.name || 'Class'}
            </p>
            <div className={`mt-1 space-y-0.5 text-[11px] font-semibold ${isNow ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                {slot.teacher?.name && <p className="flex items-center gap-1.5 truncate"><FaChalkboardTeacher className="shrink-0" /> {slot.teacher.name}</p>}
                {slot.room && <p className="flex items-center gap-1.5 truncate"><FaDoorOpen className="shrink-0" /> {slot.room}</p>}
            </div>
        </div>
    );
};

const TimetableTab = ({ studentId, childName }) => {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mobileDay, setMobileDay] = useState(todayName());
    const today = todayName();

    useEffect(() => {
        if (!studentId) return undefined;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${config.API_URL}/schedule/student/${studentId}`, { headers: authHeaders() });
                if (!cancelled) setSlots(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Error fetching timetable:', err);
                if (!cancelled) {
                    setSlots([]);
                    notify(errorMessage(err, 'Failed to load timetable'));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [studentId]);

    const byDay = useMemo(() => {
        const map = Object.fromEntries(DAYS.map(d => [d, []]));
        slots.forEach(s => { if (map[s.day]) map[s.day].push(s); });
        Object.values(map).forEach(list => list.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)));
        return map;
    }, [slots]);

    // Hide Sunday unless something is scheduled on it
    const visibleDays = DAYS.filter(d => d !== 'Sunday' || byDay.Sunday.length > 0);

    return (
        <Panel
            title="Weekly timetable"
            subtitle={`Class schedule for ${childName || 'your ward'}`}
            icon={FaCalendarWeek}
            action={<Chip tone="brand" icon={FaCalendarWeek} className="hidden sm:inline-flex">Today: {today}</Chip>}
        >
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-48" />)}
                    </div>
                ) : slots.length === 0 ? (
                    <EmptyState icon={FaCalendarWeek} title="No timetable published yet" hint="The institute will publish the weekly class schedule here." />
                ) : (
                    <>
                        {/* Desktop: weekly grid */}
                        <div className="hidden md:block overflow-x-auto">
                            <div className="grid gap-3 min-w-[760px]" style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
                                {visibleDays.map(day => {
                                    const isToday = day === today;
                                    return (
                                        <div key={day} className={`rounded-2xl p-2.5 min-h-[200px] ${isToday ? 'bg-brand-50/70 dark:bg-brand-500/10 ring-2 ring-brand-400' : 'bg-gray-50/70 dark:bg-white/[0.02]'}`}>
                                            <div className="flex items-center justify-between mb-3 px-1">
                                                <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>{day.slice(0, 3)}</p>
                                                {isToday && <span className="text-[9px] font-bold uppercase bg-brand-gradient text-white px-2 py-0.5 rounded-full">Today</span>}
                                            </div>
                                            <div className="space-y-2">
                                                {byDay[day].length > 0
                                                    ? byDay[day].map(slot => <SlotCard key={slot._id} slot={slot} isToday={isToday} />)
                                                    : <p className="text-[11px] text-gray-300 dark:text-gray-600 font-semibold text-center py-6">No classes</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mobile: day picker + list */}
                        <div className="md:hidden">
                            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1">
                                {visibleDays.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setMobileDay(day)}
                                        className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${mobileDay === day
                                            ? 'bg-brand-gradient text-white shadow-brand-soft'
                                            : day === today
                                                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}
                                    >
                                        {day.slice(0, 3)}{day === today ? ' •' : ''}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-3 mt-2">
                                {(byDay[mobileDay] || []).length > 0
                                    ? byDay[mobileDay].map(slot => <SlotCard key={slot._id} slot={slot} isToday={mobileDay === today} />)
                                    : <EmptyState icon={FaCalendarWeek} title={`No classes on ${mobileDay}`} />}
                            </div>
                        </div>
                    </>
                )}
        </Panel>
    );
};

export default TimetableTab;
