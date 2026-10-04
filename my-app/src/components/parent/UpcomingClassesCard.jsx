import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaVideo, FaRegClock, FaChalkboardTeacher } from 'react-icons/fa';
import config from '../../config';
import { notify } from '../../utils/notify';
import { authHeaders, errorMessage } from './parentUtils';
import { EmptyState, ListSkeleton, Panel, Chip } from './ParentUI';

const STATUS_STYLE = {
    live: 'bg-rose-500 text-white',
    scheduled: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
    completed: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-300',
    cancelled: 'bg-gray-100 text-gray-400 line-through dark:bg-white/5',
};

const dayLabel = (date) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Read-only view of the child's live classes (today + next 7 days)
const UpcomingClassesCard = ({ studentId }) => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) return undefined;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${config.API_URL}/live-classes/student/${studentId}`, { headers: authHeaders() });
                if (!cancelled) setClasses(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Error fetching live classes:', err);
                if (!cancelled) {
                    setClasses([]);
                    notify(errorMessage(err, 'Failed to load upcoming classes'));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [studentId]);

    const upcoming = classes
        .filter(c => c.status !== 'completed')
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
        .slice(0, 6);

    return (
        <Panel title="Upcoming live classes" subtitle="Online sessions for your ward" icon={FaVideo} action={<Chip>Next 7 days</Chip>}>
            {loading ? (
                <ListSkeleton rows={3} />
            ) : upcoming.length === 0 ? (
                <EmptyState icon={FaVideo} title="No live classes scheduled" hint="Scheduled online classes for your ward will appear here." />
            ) : (
                <div className="space-y-2 ui-stagger">
                    {upcoming.map(c => (
                        <div key={c._id} className={`p-3 rounded-2xl flex items-center gap-3 transition-colors ${c.status === 'live' ? 'bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/20' : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'}`}>
                            <div className="w-16 shrink-0 text-center rounded-xl bg-gray-50 dark:bg-white/5 py-1.5">
                                <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase">{dayLabel(c.dateTime)}</p>
                                <p className="text-xs font-extrabold text-gray-900 dark:text-white">
                                    {new Date(c.dateTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                                </p>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{c.title}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                    <span>{c.subjectId?.name || 'General'}</span>
                                    {c.teacherId?.name && <span className="flex items-center gap-1"><FaChalkboardTeacher /> {c.teacherId.name}</span>}
                                    {c.duration ? <span className="flex items-center gap-1"><FaRegClock /> {c.duration} min</span> : null}
                                </p>
                            </div>
                            <span className={`ui-badge shrink-0 ${STATUS_STYLE[c.status] || STATUS_STYLE.scheduled}`}>
                                {c.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                {c.status || 'scheduled'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </Panel>
    );
};

export default UpcomingClassesCard;
