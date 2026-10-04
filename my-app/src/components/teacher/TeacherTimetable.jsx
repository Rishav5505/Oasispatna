import React, { useEffect, useState } from 'react';
import { FiCalendar, FiClock, FiMapPin, FiUsers, FiRefreshCw, FiArrowRight, FiCoffee } from 'react-icons/fi';
import {
    DAYS, todayName, fmtTime, slotSubject, slotBatch, slotsForDay,
    findCurrentAndNext, useTeacherSchedule, toMinutes
} from './teacherApi';
import { EmptyState, PageHeader } from './TeacherUI';

const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

// Re-render every minute so Now / Next markers stay accurate.
const useMinuteTick = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(id);
    }, []);
};

const LiveDot = ({ className = '' }) => (
    <span className={`relative flex w-2.5 h-2.5 ${className}`}>
        <span className="absolute inline-flex w-full h-full rounded-full bg-current opacity-60 animate-ping" />
        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-current" />
    </span>
);

const SlotCard = ({ slot, isCurrent, isNext, compact = false }) => (
    <div
        className={`group relative rounded-2xl border p-3 md:p-3.5 transition-all duration-300 hover:-translate-y-0.5 ${isCurrent
            ? 'bg-brand-gradient border-transparent text-white shadow-brand-glow'
            : isNext
                ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30 text-gray-800 dark:text-gray-100'
                : 'bg-white dark:bg-ink-800 border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-100 hover:border-brand-200 hover:shadow-card'
            }`}
    >
        <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-[11px] font-semibold tabular-nums ${isCurrent ? 'text-white/85' : 'text-gray-400'}`}>
                {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
            </span>
            {isCurrent && <span className="flex items-center gap-1.5 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase"><LiveDot className="text-white" />Now</span>}
            {isNext && !isCurrent && <span className="text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full uppercase">Next</span>}
        </div>
        <p className={`font-bold ${compact ? 'text-sm' : 'text-sm md:text-base'} leading-tight`}>{slotSubject(slot)}</p>
        <div className={`flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] font-medium ${isCurrent ? 'text-white/80' : 'text-gray-400'}`}>
            {slotBatch(slot) && <span className="flex items-center gap-1"><FiUsers /> {slotBatch(slot)}</span>}
            {slot.room && <span className="flex items-center gap-1"><FiMapPin /> {slot.room}</span>}
        </div>
    </div>
);

/**
 * Vertical "Today" timeline for the overview. Pass `schedule` ({ slots, loading, error })
 * from a parent that already called useTeacherSchedule.
 */
export const TodayClasses = ({ onOpenTimetable, schedule }) => {
    useMinuteTick();
    const { slots = [], loading, error } = schedule || {};
    const today = todayName();
    const todays = slotsForDay(slots, today);
    const { currentId, nextId } = findCurrentAndNext(slots);
    const now = nowMinutes();

    return (
        <div className="ui-card p-5 md:p-6 h-full">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        <FiClock className="text-brand-500" /> Today
                    </h3>
                    <p className="text-xs text-gray-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                </div>
                <button type="button" onClick={onOpenTimetable} className="group text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    Full timetable <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="flex gap-4">
                            <div className="ui-skeleton w-14 h-4 mt-1" />
                            <div className="ui-skeleton flex-1 h-16" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <p className="text-sm text-gray-400 text-center py-8">{error}</p>
            ) : todays.length === 0 ? (
                <div className="flex flex-col items-center text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center text-xl mb-3"><FiCoffee /></div>
                    <p className="font-bold text-gray-800 dark:text-gray-100">No classes on {today}</p>
                    <p className="text-sm text-gray-500">Enjoy the breather — or plan your next test.</p>
                </div>
            ) : (
                <ol className="relative">
                    {todays.map((s, idx) => {
                        const isCurrent = s._id === currentId;
                        const isNext = s._id === nextId && !isCurrent;
                        const isDone = !isCurrent && toMinutes(s.endTime) <= now;
                        const last = idx === todays.length - 1;
                        return (
                            <li key={s._id} className="relative flex gap-3 md:gap-4 pb-4 last:pb-0 animate-fade-up" style={{ animationDelay: `${idx * 70}ms` }}>
                                <div className="w-16 shrink-0 text-right pt-3">
                                    <p className={`text-xs font-bold tabular-nums ${isCurrent ? 'text-brand-600' : isDone ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}`}>{fmtTime(s.startTime)}</p>
                                    <p className="text-[10px] text-gray-400 tabular-nums">{fmtTime(s.endTime)}</p>
                                </div>
                                <div className="relative flex flex-col items-center pt-3.5">
                                    {isCurrent ? (
                                        <span className="relative flex w-3.5 h-3.5 z-10">
                                            <span className="absolute inline-flex w-full h-full rounded-full bg-brand-500 opacity-60 animate-ping" />
                                            <span className="relative inline-flex w-3.5 h-3.5 rounded-full bg-brand-500 ring-4 ring-brand-100 dark:ring-brand-500/20" />
                                        </span>
                                    ) : (
                                        <span className={`w-3 h-3 rounded-full z-10 ring-4 ring-white dark:ring-ink-900 ${isDone ? 'bg-gray-300 dark:bg-gray-600' : isNext ? 'bg-brand-400' : 'bg-gray-200 dark:bg-white/20 border-2 border-brand-300'}`} />
                                    )}
                                    {!last && <span className={`absolute top-6 bottom-[-0.25rem] w-0.5 ${isDone ? 'bg-gray-200 dark:bg-white/10' : 'bg-gradient-to-b from-brand-200 to-gray-100 dark:from-brand-500/30 dark:to-white/5'}`} />}
                                </div>
                                <div className={`flex-1 min-w-0 ${isDone ? 'opacity-60' : ''}`}>
                                    <SlotCard slot={s} compact isCurrent={isCurrent} isNext={isNext} />
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
};

const TeacherTimetable = () => {
    useMinuteTick();
    const { slots, loading, error, reload } = useTeacherSchedule();
    const today = todayName();
    const [mobileDay, setMobileDay] = useState(today);
    const { currentId, nextId } = findCurrentAndNext(slots);

    // Hide Sunday column unless something is scheduled on it
    const visibleDays = DAYS.filter(d => d !== 'Sunday' || slots.some(s => s.day === 'Sunday'));
    const totalHours = slots.reduce((sum, s) => {
        const d = toMinutes(s.endTime) - toMinutes(s.startTime);
        return sum + (d > 0 ? d : 0);
    }, 0);

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiCalendar}
                eyebrow="Me"
                title="My Timetable"
                subtitle={`${slots.length} classes / week${totalHours > 0 ? ` • ${Math.round(totalHours / 6) / 10} teaching hours` : ''}`}
                actions={
                    <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-gradient" /> Now</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-50 border border-brand-300" /> Next</span>
                        <button type="button" onClick={reload} className="ui-btn-secondary !px-3" aria-label="Refresh timetable" title="Refresh">
                            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                }
            />

            {loading ? (
                <div className="ui-card p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => <div key={i} className="ui-skeleton h-20" />)}
                </div>
            ) : error ? (
                <EmptyState icon={FiClock} title="Couldn't load your timetable" hint={error} action={<button type="button" onClick={reload} className="ui-btn-primary">Retry</button>} />
            ) : slots.length === 0 ? (
                <EmptyState icon={FiCalendar} title="No timetable assigned yet" hint="Your weekly schedule will appear here once the administration publishes it." />
            ) : (
                <>
                    {/* Desktop weekly grid */}
                    <div className="hidden md:block ui-card p-3 overflow-x-auto ui-scrollbar">
                        <div className="grid gap-2 min-w-[760px]" style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
                            {visibleDays.map(day => {
                                const daySlots = slotsForDay(slots, day);
                                const isToday = day === today;
                                return (
                                    <div key={day} className={`rounded-2xl p-2 transition-colors ${isToday ? 'bg-brand-50/70 dark:bg-brand-500/5 ring-1 ring-brand-100 dark:ring-brand-500/20' : ''}`}>
                                        <div className={`text-center py-2 mb-2 rounded-xl text-xs font-bold uppercase tracking-wider ${isToday ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-50 dark:bg-white/5 text-gray-500'}`}>
                                            {day.slice(0, 3)}{isToday && <span className="ml-1 font-semibold normal-case opacity-90">· today</span>}
                                        </div>
                                        <div className="space-y-2 ui-stagger">
                                            {daySlots.length === 0 ? (
                                                <p className="text-center text-[11px] font-semibold text-gray-300 dark:text-gray-600 py-6">Free</p>
                                            ) : daySlots.map(s => (
                                                <SlotCard key={s._id} slot={s} compact isCurrent={s._id === currentId} isNext={s._id === nextId} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mobile day list */}
                    <div className="md:hidden space-y-4">
                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                            {visibleDays.map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => setMobileDay(day)}
                                    className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${mobileDay === day ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-white dark:bg-ink-900 text-gray-500 border border-gray-100 dark:border-white/5'}`}
                                >
                                    {day.slice(0, 3)}{day === today ? ' •' : ''}
                                </button>
                            ))}
                        </div>
                        {slotsForDay(slots, mobileDay).length === 0 ? (
                            <p className="ui-card text-center text-sm font-semibold text-gray-400 py-10">No classes on {mobileDay}</p>
                        ) : (
                            <div key={mobileDay} className="space-y-3 ui-stagger">
                                {slotsForDay(slots, mobileDay).map(s => (
                                    <SlotCard key={s._id} slot={s} isCurrent={s._id === currentId} isNext={s._id === nextId} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default TeacherTimetable;
