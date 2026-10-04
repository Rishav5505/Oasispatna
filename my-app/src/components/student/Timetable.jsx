import React, { useState, useEffect, useMemo } from 'react';
import { FiCalendar, FiUser, FiMapPin, FiClock, FiChevronRight, FiSun } from 'react-icons/fi';
import { DAYS, todayName, toMinutes, formatTime12, findCurrentAndNext } from './helpers';
import { SkeletonRows, EmptyState, ErrorState, PageHeader } from './StudentUI';

// Re-render every minute so "Now"/"Next" highlights stay accurate
const useMinuteClock = () => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(t);
    }, []);
    return now;
};

const SlotCard = ({ slot, isCurrent, isNext, compact = false }) => (
    <div className={`rounded-2xl border p-3 transition-all duration-300 hover:-translate-y-0.5 ${isCurrent
        ? 'bg-brand-gradient border-transparent text-white shadow-brand-glow'
        : isNext
            ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30 text-gray-900 dark:text-white'
            : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-900 dark:text-white hover:shadow-card'
        }`}>
        <div className="flex items-start justify-between gap-2">
            <p className={`font-bold leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>{slot.subject?.name || 'Class'}</p>
            {isCurrent && <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-white/25 px-2 py-0.5 rounded-full shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Now</span>}
            {isNext && <span className="text-[9px] font-bold uppercase tracking-widest bg-brand-500 text-white px-2 py-0.5 rounded-full shrink-0">Next</span>}
        </div>
        {!compact && (
            <p className={`text-xs font-semibold mt-1.5 flex items-center gap-1.5 ${isCurrent ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                <FiClock className="shrink-0" /> {formatTime12(slot.startTime)} – {formatTime12(slot.endTime)}
            </p>
        )}
        {slot.teacher?.name && (
            <p className={`text-[11px] font-medium mt-1 flex items-center gap-1.5 truncate ${isCurrent ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                <FiUser className="shrink-0" /> {slot.teacher.name}
            </p>
        )}
        {slot.room && (
            <p className={`text-[11px] font-medium mt-0.5 flex items-center gap-1.5 ${isCurrent ? 'text-white/90' : 'text-gray-400'}`}>
                <FiMapPin className="shrink-0" /> {slot.room}
            </p>
        )}
    </div>
);

const Timetable = ({ schedule = [], loading, error, onRetry }) => {
    const now = useMinuteClock();
    const today = todayName(now);
    const [mobileDay, setMobileDay] = useState(today);

    const days = useMemo(() => {
        const hasSunday = schedule.some(s => s.day === 'Sunday');
        return hasSunday ? DAYS : DAYS.slice(0, 6);
    }, [schedule]);

    // unique time slots (rows of desktop grid)
    const timeRows = useMemo(() => {
        const map = new Map();
        schedule.forEach(s => {
            const key = `${s.startTime}-${s.endTime}`;
            if (!map.has(key)) map.set(key, { key, startTime: s.startTime, endTime: s.endTime });
        });
        return [...map.values()].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    }, [schedule]);

    const todaySlots = schedule.filter(s => s.day === today);
    const { currentId, nextId } = findCurrentAndNext(todaySlots, now);

    const slotsForDay = (day) => schedule
        .filter(s => s.day === day)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiCalendar}
                title="Weekly Timetable"
                subtitle="Your batch's class schedule for the week"
                action={<span className="ui-badge bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 !py-2 !px-4"><span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Today: {today}</span>}
            />

            {loading ? (
                <SkeletonRows count={5} />
            ) : error ? (
                <ErrorState message={error} onRetry={onRetry} />
            ) : schedule.length === 0 ? (
                <EmptyState
                    icon={<FiCalendar />}
                    title="No timetable yet"
                    message="Your batch timetable hasn't been published. Make sure you have selected your batch, or check back later."
                />
            ) : (
                <>
                    {/* Desktop weekly grid */}
                    <div className="hidden md:block ui-card overflow-x-auto ui-scrollbar">
                        <table className="w-full border-collapse min-w-[760px]">
                            <thead>
                                <tr className="bg-gray-50/80 dark:bg-white/5">
                                    <th className="p-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest w-32">Time</th>
                                    {days.map(day => (
                                        <th key={day} className="p-3 text-center">
                                            <span className={`inline-flex flex-col items-center px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest ${day === today ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900 shadow-card' : 'text-gray-500'}`}>
                                                {day.slice(0, 3)}
                                                {day === today && <span className="text-brand-400 dark:text-brand-600 text-[9px] mt-0.5">Today</span>}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {timeRows.map(row => (
                                    <tr key={row.key} className="border-t border-gray-100 dark:border-white/5">
                                        <td className="p-4 align-top">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">{formatTime12(row.startTime)}</p>
                                            <p className="text-[11px] font-medium text-gray-400">to {formatTime12(row.endTime)}</p>
                                        </td>
                                        {days.map(day => {
                                            const cell = schedule.filter(s => s.day === day && s.startTime === row.startTime && s.endTime === row.endTime);
                                            return (
                                                <td key={day} className={`p-2 align-top ${day === today ? 'bg-brand-50/50 dark:bg-brand-500/5' : ''}`}>
                                                    <div className="space-y-2">
                                                        {cell.map(slot => (
                                                            <SlotCard
                                                                key={slot._id}
                                                                slot={slot}
                                                                compact
                                                                isCurrent={slot._id === currentId}
                                                                isNext={slot._id === nextId}
                                                            />
                                                        ))}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile day-wise list */}
                    <div className="md:hidden space-y-4">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                            {days.map(day => (
                                <button
                                    key={day}
                                    onClick={() => setMobileDay(day)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all active:scale-95 ${mobileDay === day
                                        ? 'bg-brand-gradient text-white border-transparent shadow-brand-soft'
                                        : day === today
                                            ? 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30'
                                            : 'bg-white dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/10'
                                        }`}
                                >
                                    {day.slice(0, 3)}{day === today ? ' •' : ''}
                                </button>
                            ))}
                        </div>
                        {slotsForDay(mobileDay).length > 0 ? (
                            <div key={mobileDay} className="space-y-3 ui-stagger">
                                {slotsForDay(mobileDay).map(slot => (
                                    <SlotCard
                                        key={slot._id}
                                        slot={slot}
                                        isCurrent={mobileDay === today && slot._id === currentId}
                                        isNext={mobileDay === today && slot._id === nextId}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState compact icon={<FiCalendar />} title={`No classes on ${mobileDay}`} message="Enjoy your free day — revise what you learnt!" />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// Vertical "Today" timeline for the overview
export const TodayClasses = ({ schedule = [], loading, onViewAll, extraEvents = [] }) => {
    const now = useMinuteClock();
    const today = todayName(now);
    const slots = schedule
        .filter(s => s.day === today)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    const { currentId, nextId } = findCurrentAndNext(slots, now);
    const nowMin = now.getHours() * 60 + now.getMinutes();

    return (
        <div className="ui-card p-6 h-full flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center text-lg"><FiSun /></div>
                    <div>
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">Today</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                    </div>
                </div>
                {slots.length > 0 && <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{slots.length} class{slots.length === 1 ? '' : 'es'}</span>}
            </div>

            {loading ? (
                <SkeletonRows count={3} />
            ) : slots.length === 0 && extraEvents.length === 0 ? (
                <EmptyState compact icon={<FiCalendar />} title="No classes today" message="Use the time for self-study and practice tests." />
            ) : (
                <ol className="relative flex-1 ml-2 space-y-1">
                    <span className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-300 via-gray-200 to-transparent dark:via-white/10" aria-hidden="true" />
                    {extraEvents.map(ev => (
                        <li key={ev.key} className="relative pl-8 py-2">
                            <span className="absolute left-0 top-3.5 w-4 h-4 rounded-full bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-500/20" />
                            <p className="text-xs font-bold text-rose-600">{ev.time}</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{ev.title}</p>
                            {ev.subtitle && <p className="text-xs text-gray-500">{ev.subtitle}</p>}
                        </li>
                    ))}
                    {slots.map(slot => {
                        const isCurrent = slot._id === currentId;
                        const isNext = slot._id === nextId;
                        const done = toMinutes(slot.endTime) <= nowMin;
                        return (
                            <li key={slot._id} className="relative pl-8 py-1.5">
                                <span className={`absolute left-0 top-4 w-4 h-4 rounded-full border-2 ${isCurrent
                                    ? 'bg-brand-500 border-white dark:border-ink-900 animate-glow'
                                    : isNext
                                        ? 'bg-white dark:bg-ink-900 border-brand-500'
                                        : done
                                            ? 'bg-gray-300 dark:bg-white/20 border-white dark:border-ink-900'
                                            : 'bg-white dark:bg-ink-900 border-gray-300 dark:border-white/20'}`}
                                />
                                <div className={`rounded-2xl px-4 py-3 transition-all ${isCurrent ? 'bg-brand-gradient text-white shadow-brand-soft' : isNext ? 'bg-brand-50 dark:bg-brand-500/10' : ''} ${done && !isCurrent ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-xs font-bold ${isCurrent ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>{formatTime12(slot.startTime)} – {formatTime12(slot.endTime)}</p>
                                        {isCurrent && <span className="text-[9px] font-bold uppercase tracking-widest bg-white/25 px-2 py-0.5 rounded-full">Live now</span>}
                                        {isNext && <span className="text-[9px] font-bold uppercase tracking-widest bg-brand-500 text-white px-2 py-0.5 rounded-full">Up next</span>}
                                        {done && !isCurrent && <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Done</span>}
                                    </div>
                                    <p className={`text-sm font-bold mt-0.5 ${isCurrent ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{slot.subject?.name || 'Class'}</p>
                                    {(slot.teacher?.name || slot.room) && (
                                        <p className={`text-xs mt-0.5 truncate ${isCurrent ? 'text-white/80' : 'text-gray-400'}`}>
                                            {[slot.teacher?.name, slot.room].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
            {onViewAll && (
                <button onClick={onViewAll} className="mt-4 w-full inline-flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm font-bold text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5 transition-colors">
                    View full timetable <FiChevronRight />
                </button>
            )}
        </div>
    );
};

export default Timetable;
