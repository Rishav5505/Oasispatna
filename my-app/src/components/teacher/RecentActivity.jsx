import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiClipboard, FiVideo, FiPlayCircle, FiUploadCloud, FiHelpCircle, FiChevronRight, FiActivity } from 'react-icons/fi';
import { API, authHeaders, getTeacherId, timeAgo } from './teacherApi';
import { Spinner } from './TeacherUI';

const asArray = (r) => (r.status === 'fulfilled' && Array.isArray(r.value?.data) ? r.value.data : []);

const fetchActivity = async () => {
    const teacherId = getTeacherId();
    if (!teacherId) return null;
    const headers = authHeaders();
    const results = await Promise.allSettled([
        axios.get(`${API}/tests/teacher/${teacherId}`, { headers }),
        axios.get(`${API}/live-classes/teacher/${teacherId}`, { headers }),
        axios.get(`${API}/videos/teacher/${teacherId}`, { headers }),
        axios.get(`${API}/study-material/mine`, { headers }),
        axios.get(`${API}/doubts`, { headers }),
    ]);
    const [tests, lives, videos, materials, doubts] = results.map(asArray);

    const feed = [
        ...tests.map(t => ({
            key: `t-${t._id}`, tab: 'online-tests', icon: FiClipboard,
            title: `Test ${t.status === 'draft' ? 'drafted' : 'published'}: ${t.title}`,
            desc: `${t.subjectId?.name || 'Subject'} • ${t.classId?.name || 'Class'} • ${t.questions?.length || 0} Qs`,
            date: t.createdAt,
        })),
        ...lives.map(l => ({
            key: `l-${l._id}`, tab: 'live-classes', icon: FiVideo,
            title: `Live class ${l.status === 'cancelled' ? 'cancelled' : 'scheduled'}: ${l.title}`,
            desc: `${l.subjectId?.name || 'Subject'} • ${l.dateTime ? new Date(l.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}`,
            date: l.createdAt || l.dateTime,
        })),
        ...videos.map(v => ({
            key: `v-${v._id}`, tab: 'recorded-classes', icon: FiPlayCircle,
            title: `Video added: ${v.title}`,
            desc: `${v.subjectId?.name || 'Subject'} • ${v.classId?.name || 'Class'}`,
            date: v.createdAt,
        })),
        ...materials.map(m => ({
            key: `m-${m._id}`, tab: 'materials', icon: FiUploadCloud,
            title: `Notes uploaded: ${m.title}`,
            desc: `${m.subjectId?.name || 'Subject'}${m.classId?.name ? ` • ${m.classId.name}` : ''}`,
            date: m.createdAt,
        })),
    ]
        .filter(i => i.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8);

    const open = doubts.filter(d => d.status === 'open').length;
    return {
        feed,
        stats: { tests: tests.length, liveClasses: lives.length, videos: videos.length, materials: materials.length, pendingDoubts: open }
    };
};

/**
 * Real activity feed built from the teacher's own tests, live classes, videos and uploads,
 * plus a pending-doubts call-to-action. Reports counts to the parent via onStats.
 */
const RecentActivity = ({ onNavigate, onStats }) => {
    const [items, setItems] = useState([]);
    const [pendingDoubts, setPendingDoubts] = useState(0);
    const [loading, setLoading] = useState(() => Boolean(getTeacherId()));

    useEffect(() => {
        let cancelled = false;
        fetchActivity().then(data => {
            if (cancelled || !data) return;
            setItems(data.feed);
            setPendingDoubts(data.stats.pendingDoubts);
            setLoading(false);
            onStats?.(data.stats);
        });
        return () => { cancelled = true; };
    }, [onStats]);

    return (
        <div className="ui-card p-5 md:p-6 h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2"><FiActivity className="text-brand-500" /> Recent activity</h3>
                {!loading && items.length > 0 && <span className="text-[11px] font-semibold text-gray-400">Last {items.length}</span>}
            </div>

            {!loading && pendingDoubts > 0 && (
                <button
                    type="button"
                    onClick={() => onNavigate?.('doubts')}
                    className="group w-full mb-4 flex items-center gap-4 p-3.5 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-left hover:shadow-brand-soft transition-all animate-fade-up"
                >
                    <div className="w-11 h-11 bg-brand-gradient text-white rounded-xl flex items-center justify-center shrink-0 animate-glow"><FiHelpCircle /></div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{pendingDoubts} pending doubt{pendingDoubts > 1 ? 's' : ''}</h4>
                        <p className="text-xs text-gray-500">Students are waiting for your guidance</p>
                    </div>
                    <FiChevronRight className="text-brand-500 group-hover:translate-x-1 transition-transform" />
                </button>
            )}

            {loading ? (
                <Spinner label="Fetching your activity..." rows={4} />
            ) : items.length === 0 ? (
                <div className="text-center py-10">
                    <div className="mx-auto w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center text-xl mb-3"><FiActivity /></div>
                    <p className="text-sm text-gray-500">No activity yet — create a test, schedule a class or upload notes to get started.</p>
                </div>
            ) : (
                <ol className="relative ui-stagger">
                    {items.map((act, idx) => (
                        <li key={act.key} className="relative">
                            {idx < items.length - 1 && <span className="absolute left-[1.6rem] top-12 bottom-0 w-px bg-gray-100 dark:bg-white/5" />}
                            <button
                                type="button"
                                onClick={() => onNavigate?.(act.tab)}
                                className="group w-full flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-brand-50/50 dark:hover:bg-white/5 transition-all text-left"
                            >
                                <div className="relative w-10 h-10 bg-white dark:bg-ink-800 border border-gray-100 dark:border-white/10 text-brand-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-brand-gradient group-hover:text-white group-hover:border-transparent transition-all">
                                    <act.icon />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{act.title}</h4>
                                    <p className="text-xs text-gray-400 truncate">{act.desc}</p>
                                </div>
                                <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">{timeAgo(act.date)}</span>
                            </button>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
};

export default RecentActivity;
