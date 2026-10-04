import React, { useCallback, useEffect, useState } from 'react';
import { FiList, FiCheckCircle, FiChevronDown, FiChevronUp, FiUsers } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { errorMessage } from './helpers';
import { EmptyState, ErrorState, PageHeader, SkeletonCards } from './StudentUI';
import { AnimatedBar, ProgressRing } from './Widgets';
import { Segmented } from './PracticeUI';
import { api } from './practiceApi';
import { useI18n } from '../../i18n/useI18n';

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

const SyllabusTracker = () => {
    const { t } = useI18n();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [open, setOpen] = useState({});
    const [saving, setSaving] = useState(null);

    const load = useCallback(async () => {
        setError('');
        try {
            const res = await api.get('/practice/syllabus/me');
            setData(Array.isArray(res) ? res : []);
        } catch (err) {
            setError(errorMessage(err, t('student.syllabus.loadError')));
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    const setStatus = async (subjectIdx, chapter, status) => {
        if (chapter.myStatus === status) return;
        const prev = chapter.myStatus;
        const apply = (st) => setData(d => d.map((s, i) => {
            if (i !== subjectIdx) return s;
            const chapters = s.chapters.map(c => (c._id === chapter._id ? { ...c, myStatus: st } : c));
            return { ...s, chapters, percentDone: pct(chapters.filter(c => c.myStatus === 'done').length, chapters.length) };
        }));
        apply(status);
        setSaving(chapter._id);
        try {
            await api.put(`/practice/syllabus/progress/${chapter._id}`, { status });
            if (status === 'done') toast.success(t('student.syllabus.doneToast', { name: chapter.name }));
        } catch (err) {
            apply(prev);
            toast.error(errorMessage(err, t('student.common.actionError')));
        } finally {
            setSaving(null);
        }
    };

    const header = <PageHeader icon={FiList} title={t('student.nav.syllabus')} subtitle={t('student.syllabus.subtitle')} />;

    if (error) return <div className="space-y-6">{header}<ErrorState message={error} onRetry={load} /></div>;
    if (data === null) return <div className="space-y-6">{header}<SkeletonCards count={3} height="h-48" /></div>;
    if (data.length === 0) {
        return <div className="space-y-6">{header}<EmptyState icon={<FiList />} title={t('student.syllabus.emptyTitle')} message={t('student.syllabus.emptyMsg')} /></div>;
    }

    const allCh = data.flatMap(s => s.chapters);
    const overallDone = pct(allCh.filter(c => c.myStatus === 'done').length, allCh.length);
    const overallTaught = pct(allCh.filter(c => c.taughtInClass).length, allCh.length);
    const statusOpts = [
        { value: 'not_started', label: t('student.syllabus.notStarted') },
        { value: 'in_progress', label: t('student.syllabus.inProgress') },
        { value: 'done', label: t('student.syllabus.done') },
    ];

    return (
        <div className="space-y-6">
            {header}
            <div className="ui-card p-6 flex flex-wrap items-center justify-around gap-6">
                <ProgressRing value={overallDone} tone="brand" label={t('student.syllabus.myProgress')} sublabel={t('student.syllabus.chaptersDone', { done: allCh.filter(c => c.myStatus === 'done').length, total: allCh.length })} />
                <ProgressRing value={overallTaught} tone="dark" label={t('student.syllabus.taught')} sublabel={t('student.syllabus.taughtHint')} />
            </div>

            <div className="space-y-4 ui-stagger">
                {data.map((s, si) => {
                    const expanded = open[s.subjectId] ?? si === 0;
                    return (
                        <section key={s.subjectId || si} className="ui-card overflow-hidden">
                            <button
                                onClick={() => setOpen(o => ({ ...o, [s.subjectId]: !expanded }))}
                                className="w-full text-left p-5 md:p-6 flex items-center gap-4 hover:bg-brand-50/30 dark:hover:bg-white/[0.02] transition-colors"
                                aria-expanded={expanded}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white truncate">{s.subjectName}</h3>
                                        <span className="text-sm font-extrabold text-brand-600 dark:text-brand-400 tabular-nums">{s.percentDone}%</span>
                                    </div>
                                    <AnimatedBar value={s.percentDone} />
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex-1"><AnimatedBar value={s.percentTaught} className="h-1.5" barClass="bg-ink-900 dark:bg-white/70" /></div>
                                        <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">{t('student.syllabus.taughtPct', { pct: s.percentTaught })}</span>
                                    </div>
                                </div>
                                {expanded ? <FiChevronUp className="text-gray-400 shrink-0" /> : <FiChevronDown className="text-gray-400 shrink-0" />}
                            </button>
                            {expanded && (
                                <ul className="border-t border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5 animate-fade-in">
                                    {s.chapters.map((c, ci) => (
                                        <li key={c._id} className="px-5 md:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-extrabold ${c.myStatus === 'done' ? 'bg-emerald-500 text-white' : c.myStatus === 'in_progress' ? 'bg-amber-400 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                                                    {c.myStatus === 'done' ? <FiCheckCircle /> : ci + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white break-words">{c.name}</p>
                                                    {c.taughtInClass && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400"><FiUsers /> {t('student.syllabus.taughtFlag')}</span>}
                                                </div>
                                            </div>
                                            <div className={saving === c._id ? 'opacity-60 pointer-events-none' : ''}>
                                                <Segmented size="sm" value={c.myStatus} onChange={(v) => setStatus(si, c, v)} options={statusOpts} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

export default SyllabusTracker;
