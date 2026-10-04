import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiEdit3, FiClock, FiCheckCircle, FiAward, FiPaperclip, FiExternalLink, FiAlertTriangle, FiRefreshCw, FiMessageCircle } from 'react-icons/fi';
import config from '../../config';
import { useI18n } from '../../i18n/useI18n';
import { StatCard } from '../ui/Motion';
import { Panel, EmptyState, ListSkeleton, Chip } from './ParentUI';
import { authHeaders, resolveFileUrl, daysUntil } from './parentUtils';

// Derived status for a homework row (read-only parent view)
const statusOf = (hw) => {
    const sub = hw.mySubmission;
    if (sub) {
        if (sub.status === 'graded') return 'graded';
        if (sub.status === 'returned') return 'returned';
        if (sub.status === 'late') return 'late';
        return 'submitted';
    }
    const d = daysUntil(hw.dueDate);
    return d !== null && d < 0 ? 'missed' : 'notSubmitted';
};

const BADGE = {
    graded: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    submitted: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
    late: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    returned: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    notSubmitted: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300',
    missed: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
};

const FILTERS = {
    all: () => true,
    pending: (s) => s === 'notSubmitted' || s === 'missed' || s === 'returned',
    submitted: (s) => s === 'submitted' || s === 'late',
    graded: (s) => s === 'graded',
};

// Mount with key={studentId} so switching child resets state.
const HomeworkTab = ({ studentId, childName }) => {
    const { t, lang } = useI18n();
    const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
    const [list, setList] = useState(null);
    const [error, setError] = useState(false);
    const [reload, setReload] = useState(0);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        let cancelled = false;
        axios.get(`${config.API_URL}/homework/student/${studentId}`, { headers: authHeaders() })
            .then(({ data }) => { if (!cancelled) { setList(Array.isArray(data) ? data : []); setError(false); } })
            .catch(() => { if (!cancelled) { setError(true); setList(prev => prev || []); } });
        return () => { cancelled = true; };
    }, [studentId, reload]);

    const rows = useMemo(() => (list || []).map(hw => ({ hw, status: statusOf(hw) })), [list]);
    const shown = rows.filter(r => FILTERS[filter](r.status));
    const graded = rows.filter(r => r.status === 'graded' && r.hw.mySubmission?.marks != null && Number(r.hw.maxMarks) > 0);
    const avgPct = graded.length
        ? Math.round(graded.reduce((s, r) => s + (Number(r.hw.mySubmission.marks) / Number(r.hw.maxMarks)) * 100, 0) / graded.length)
        : null;
    const pendingCount = rows.filter(r => FILTERS.pending(r.status)).length;
    const submittedCount = rows.filter(r => r.hw.mySubmission).length;
    const fmt = (d) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

    if (list === null) {
        return <Panel title={t('parent.hw.title')} icon={FiEdit3}><ListSkeleton rows={4} /></Panel>;
    }

    if (error && rows.length === 0) {
        return (
            <EmptyState
                icon={FiAlertTriangle}
                title={t('parent.hw.error')}
                action={<button onClick={() => setReload(r => r + 1)} className="ui-btn-secondary"><FiRefreshCw /> {t('common.retry')}</button>}
            />
        );
    }

    return (
        <>
            {rows.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ui-stagger">
                    <StatCard icon={FiEdit3} label={t('parent.hw.stat.total')} value={rows.length} tone="dark" />
                    <StatCard icon={FiClock} label={t('parent.hw.stat.pending')} value={pendingCount} tone={pendingCount > 0 ? 'amber' : 'green'} />
                    <StatCard icon={FiCheckCircle} label={t('parent.hw.stat.submitted')} value={submittedCount} tone="brand" />
                    {avgPct !== null && <StatCard icon={FiAward} label={t('parent.hw.stat.avg')} value={avgPct} suffix="%" tone="green" />}
                </div>
            )}

            <Panel
                title={t('parent.hw.title')}
                subtitle={t('parent.hw.subtitle', { name: childName || '' })}
                icon={FiEdit3}
            >
                {rows.length === 0 ? (
                    <EmptyState icon={FiEdit3} title={t('parent.hw.empty')} hint={t('parent.hw.emptyHint')} />
                ) : (
                    <>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 mb-4" role="tablist">
                            {Object.keys(FILTERS).map(f => (
                                <button
                                    key={f}
                                    role="tab"
                                    aria-selected={filter === f}
                                    onClick={() => setFilter(f)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${filter === f ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900 shadow-card' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-700'}`}
                                >
                                    {t(`parent.hw.filter.${f}`)}
                                </button>
                            ))}
                        </div>
                        {shown.length === 0 ? (
                            <EmptyState icon={FiCheckCircle} title={t('parent.hw.emptyFilter')} />
                        ) : (
                            <ul className="space-y-3 ui-stagger">
                                {shown.map(({ hw, status }) => {
                                    const sub = hw.mySubmission;
                                    const d = daysUntil(hw.dueDate);
                                    return (
                                        <li key={hw._id} className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] p-4 hover:bg-white dark:hover:bg-white/[0.04] hover:shadow-card transition-all">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {hw.subjectId?.name && <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">{hw.subjectId.name}</span>}
                                                        <span className={`ui-badge ${BADGE[status]}`}>{t(`parent.hw.status.${status}`)}</span>
                                                    </div>
                                                    <h4 className="mt-2 font-extrabold text-gray-900 dark:text-white leading-snug">{hw.title}</h4>
                                                    {hw.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{hw.description}</p>}
                                                    <p className="mt-2 text-xs text-gray-500 font-semibold flex flex-wrap items-center gap-2">
                                                        <Chip tone={!sub && d !== null && d < 0 ? 'red' : !sub && d !== null && d <= 1 ? 'amber' : 'gray'} icon={FiClock}>{t('parent.hw.due', { date: fmt(hw.dueDate) })}</Chip>
                                                        {hw.teacherId?.name && <span>{t('parent.hw.by', { name: hw.teacherId.name })}</span>}
                                                    </p>
                                                </div>
                                                {sub?.marks != null && (
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{t('parent.hw.marks')}</p>
                                                        <p className="text-xl font-extrabold text-gray-900 dark:text-white">{sub.marks}<span className="text-sm text-gray-400">/{hw.maxMarks ?? '—'}</span></p>
                                                    </div>
                                                )}
                                            </div>
                                            {sub?.remark && (
                                                <div className="mt-3 p-3 rounded-xl bg-brand-50/70 dark:bg-brand-500/10 text-sm text-gray-700 dark:text-gray-200 flex gap-2">
                                                    <FiMessageCircle className="text-brand-500 mt-0.5 shrink-0" />
                                                    <span><b className="text-xs uppercase tracking-wider text-brand-700 dark:text-brand-300">{t('parent.hw.remark')}:</b> {sub.remark}</span>
                                                </div>
                                            )}
                                            {(hw.attachmentUrl || sub?.fileUrl) && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {hw.attachmentUrl && (
                                                        <a href={resolveFileUrl(hw.attachmentUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 px-2.5 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10">
                                                            <FiPaperclip /> {t('parent.hw.attachment')}
                                                        </a>
                                                    )}
                                                    {sub?.fileUrl && (
                                                        <a href={resolveFileUrl(sub.fileUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-lg ring-1 ring-gray-200 dark:ring-white/10 hover:bg-gray-100 dark:hover:bg-white/5">
                                                            <FiExternalLink /> {t('parent.hw.submission')}
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}
            </Panel>
        </>
    );
};

export default HomeworkTab;
