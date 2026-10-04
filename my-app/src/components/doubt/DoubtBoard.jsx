import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import config from '../../config';
import { FiMessageCircle, FiCornerUpLeft, FiX, FiCheckCircle, FiImage, FiUser, FiSearch, FiSend } from 'react-icons/fi';
import { notify } from '../../utils/notify';
import { authHeaders, errMsg, fileHref, idOf, timeAgo } from '../teacher/teacherApi';
import { Avatar, Badge, EmptyState, PageHeader, Segmented, Spinner } from '../teacher/TeacherUI';

const isResolved = (d) => d.status === 'resolved' || d.status === 'closed';

const DoubtBoard = () => {
    const [doubts, setDoubts] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [selectedDoubt, setSelectedDoubt] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'resolved' | 'all'
    const [subjectFilter, setSubjectFilter] = useState('');
    const [search, setSearch] = useState('');

    const fetchDoubts = useCallback(async () => {
        try {
            const res = await axios.get(`${config.API_URL}/doubts`, { headers: authHeaders() });
            setDoubts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching doubts:', err);
            notify(errMsg(err, 'Failed to load doubts'));
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchDoubts();
    }, [fetchDoubts]);

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;
        setLoading(true);
        try {
            await axios.post(`${config.API_URL}/doubts/${selectedDoubt._id}/reply`, {
                message: replyMessage
            }, { headers: authHeaders() });
            setReplyMessage('');
            setSelectedDoubt(null);
            fetchDoubts();
            notify('Reply sent and doubt marked as resolved!');
        } catch (err) {
            console.error('Error replying to doubt:', err);
            notify(errMsg(err, 'Failed to send reply'));
        } finally {
            setLoading(false);
        }
    };

    const subjectOptions = useMemo(() => {
        const map = new Map();
        doubts.forEach(d => {
            const id = idOf(d.subjectId);
            if (id && !map.has(id)) map.set(id, d.subjectId?.name || 'Subject');
        });
        return [...map.entries()].map(([id, name]) => ({ id, name }));
    }, [doubts]);

    const openCount = doubts.filter(d => !isResolved(d)).length;
    const resolvedCount = doubts.length - openCount;

    const q = search.trim().toLowerCase();
    const visible = doubts.filter(d => {
        if (statusFilter === 'open' && isResolved(d)) return false;
        if (statusFilter === 'resolved' && !isResolved(d)) return false;
        if (subjectFilter && idOf(d.subjectId) !== subjectFilter) return false;
        if (q && ![d.title, d.description, d.studentId?.name].some(v => String(v || '').toLowerCase().includes(q))) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiMessageCircle}
                eyebrow="Classroom"
                title="Doubts"
                subtitle="Answer student questions — replying marks a doubt as resolved."
                actions={
                    <div className="flex gap-2">
                        <span className={`ui-badge ${openCount ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                            {openCount ? `${openCount} awaiting reply` : 'All caught up'}
                        </span>
                        <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">{resolvedCount} resolved</span>
                    </div>
                }
            />

            {/* Filters */}
            <div className="ui-card p-3 flex flex-col lg:flex-row gap-3 lg:items-center">
                <Segmented
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[['open', 'Open', openCount], ['resolved', 'Resolved', resolvedCount], ['all', 'All', doubts.length]]}
                />
                <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} aria-label="Filter by subject" className="ui-input lg:w-48 !py-2.5">
                    <option value="">All subjects</option>
                    {subjectOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, question or student…" aria-label="Search doubts" className="ui-input pl-10 !py-2.5" />
                </div>
            </div>

            {fetching ? (
                <div className="ui-card p-5"><Spinner label="Loading doubts..." rows={4} /></div>
            ) : visible.length === 0 ? (
                <EmptyState
                    icon={doubts.length && statusFilter === 'open' && !q && !subjectFilter ? FiCheckCircle : FiMessageCircle}
                    title={doubts.length === 0 ? 'No doubts raised yet' : statusFilter === 'open' && !q && !subjectFilter ? 'All caught up — no open doubts!' : 'No doubts match your filters'}
                />
            ) : (
                <div key={statusFilter} className="space-y-4 ui-stagger">
                    {visible.map(doubt => {
                        const resolved = isResolved(doubt);
                        const replying = selectedDoubt?._id === doubt._id;
                        const studentName = doubt.studentId?.name || 'Student';
                        return (
                            <article key={doubt._id} className={`ui-card overflow-hidden ${replying ? 'ring-2 ring-brand-400/40 !border-brand-200' : ''}`}>
                                <header className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02]">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{doubt.title}</h3>
                                        <p className="text-[11px] text-gray-400">{doubt.subjectId?.name || 'Subject'}{doubt.createdAt ? ` · ${timeAgo(doubt.createdAt)}` : ''}</p>
                                    </div>
                                    {resolved
                                        ? <Badge tone="green"><FiCheckCircle /> {doubt.status}</Badge>
                                        : <Badge tone="amber" dot>{doubt.status || 'open'}</Badge>}
                                </header>

                                <div className="p-4 md:p-5 space-y-4">
                                    {/* Student bubble */}
                                    <div className="flex items-end gap-2.5 max-w-[92%] md:max-w-[80%]">
                                        <Avatar name={studentName} size="sm" />
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold text-gray-400 mb-1 ml-1">{studentName}</p>
                                            <div className="rounded-2xl rounded-bl-md bg-gray-100 dark:bg-white/5 px-4 py-3">
                                                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">{doubt.description}</p>
                                                {doubt.imageUrl && (
                                                    <a href={fileHref(doubt.imageUrl)} target="_blank" rel="noopener noreferrer" className="block mt-3 group/img">
                                                        <img src={fileHref(doubt.imageUrl)} alt="Attached by student" loading="lazy" className="max-h-48 rounded-xl border border-gray-200 dark:border-white/10 object-contain bg-white group-hover/img:opacity-90 transition" />
                                                        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-600"><FiImage /> Open full image</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Faculty replies */}
                                    {doubt.replies?.map((r, i) => (
                                        <div key={r._id || i} className="flex items-end justify-end gap-2.5 ml-auto max-w-[92%] md:max-w-[80%]">
                                            <div className="min-w-0 text-right">
                                                <p className="text-[11px] font-semibold text-gray-400 mb-1 mr-1">Faculty reply{r.createdAt ? ` · ${timeAgo(r.createdAt)}` : ''}</p>
                                                <div className="rounded-2xl rounded-br-md bg-brand-gradient text-white px-4 py-3 text-left shadow-brand-soft">
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{r.message}</p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 w-9 h-9 rounded-full bg-ink-900 text-white flex items-center justify-center text-sm"><FiUser /></div>
                                        </div>
                                    ))}
                                </div>

                                {!resolved && (
                                    replying ? (
                                        <form onSubmit={handleReply} className="border-t border-gray-100 dark:border-white/5 p-3 md:p-4 bg-brand-50/30 dark:bg-white/[0.02] animate-fade-up">
                                            <textarea
                                                required
                                                autoFocus
                                                rows="4"
                                                placeholder={`Explain the solution to ${studentName}…`}
                                                aria-label="Your reply"
                                                className="ui-input resize-none"
                                                value={replyMessage}
                                                onChange={(e) => setReplyMessage(e.target.value)}
                                            />
                                            <div className="flex items-center justify-between gap-2 mt-2.5">
                                                <p className="text-[11px] text-gray-400 hidden sm:block">Sending will mark this doubt as resolved.</p>
                                                <div className="flex gap-2 ml-auto">
                                                    <button type="button" onClick={() => { setSelectedDoubt(null); }} className="ui-btn-secondary !py-2 text-xs"><FiX /> Cancel</button>
                                                    <button type="submit" disabled={loading} className="ui-btn-primary !py-2 text-xs"><FiSend /> {loading ? 'Sending…' : 'Send & resolve'}</button>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="border-t border-gray-100 dark:border-white/5 px-3 md:px-4 py-3 flex justify-end">
                                            <button type="button" onClick={() => setSelectedDoubt(doubt)} className="ui-btn-dark !py-2 text-xs group">
                                                <FiCornerUpLeft className="group-hover:-translate-x-0.5 transition-transform" /> Reply
                                            </button>
                                        </div>
                                    )
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DoubtBoard;
