import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiBookOpen, FiPaperclip, FiUpload, FiClock, FiCheckCircle, FiAlertCircle, FiFileText, FiMessageSquare, FiSend } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { errorMessage, resolveFileUrl } from './helpers';
import { EmptyState, ErrorState, PageHeader, SkeletonCards } from './StudentUI';
import { Segmented } from './PracticeUI';
import { api } from './practiceApi';
import Modal from '../common/Modal';
import { useI18n } from '../../i18n/useI18n';

const MAX_BYTES = 10 * 1024 * 1024;

const statusOf = (hw) => {
    const sub = hw.mySubmission;
    if (sub) return sub.status; // submitted | late | graded | returned
    if (hw.dueDate && new Date(hw.dueDate) < new Date()) return 'overdue';
    return 'pending';
};

const BADGE = {
    pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    overdue: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    submitted: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
    late: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
    graded: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    returned: 'bg-ink-900 text-white dark:bg-white dark:text-ink-900',
};

const dueChip = (date, t) => {
    if (!date) return null;
    const d = new Date(date);
    const days = Math.ceil((d - new Date()) / 86400000);
    if (days < 0) return t('student.hw.overdueBy', { count: -days });
    if (days === 0) return t('student.hw.dueToday');
    if (days === 1) return t('student.hw.dueTomorrow');
    return t('student.hw.dueIn', { count: days });
};

const Homework = ({ studentId }) => {
    const { t } = useI18n();
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('todo');
    const [active, setActive] = useState(null);
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (!studentId) { setItems([]); return; }
        setError('');
        try {
            const d = await api.get(`/homework/student/${studentId}`);
            setItems(Array.isArray(d) ? d : []);
        } catch (err) {
            setError(errorMessage(err, t('student.hw.loadError')));
        }
    }, [studentId, t]);
    useEffect(() => { load(); }, [load]);

    const list = useMemo(() => {
        const all = items || [];
        if (filter === 'todo') return all.filter(h => ['pending', 'overdue', 'returned'].includes(statusOf(h))).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        if (filter === 'done') return all.filter(h => ['submitted', 'late', 'graded'].includes(statusOf(h)));
        return all;
    }, [items, filter]);

    const openSubmit = (hw) => {
        setActive(hw);
        setText(hw.mySubmission?.text || '');
        setFile(null);
    };

    const submit = async () => {
        if (!active) return;
        if (!text.trim() && !file) { toast.error(t('student.hw.needContent')); return; }
        setBusy(true);
        const fd = new FormData();
        if (text.trim()) fd.append('text', text.trim());
        if (file) fd.append('file', file);
        try {
            const sub = await api.upload(`/homework/${active._id}/submit`, fd);
            toast.success(sub.status === 'late' ? t('student.hw.submittedLate') : t('student.hw.submitted'));
            setItems(prev => prev.map(h => (h._id === active._id ? { ...h, mySubmission: sub } : h)));
            setActive(null);
        } catch (err) {
            toast.error(errorMessage(err, t('student.hw.submitError')));
        } finally {
            setBusy(false);
        }
    };

    const todoCount = (items || []).filter(h => ['pending', 'overdue', 'returned'].includes(statusOf(h))).length;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiBookOpen}
                title={t('student.heading.homework')}
                subtitle={t('student.hw.subtitle')}
                action={items && <span className="ui-badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 !py-2 !px-3"><FiClock /> {t('student.hw.todoCount', { count: todoCount })}</span>}
            />
            <Segmented
                value={filter}
                onChange={setFilter}
                options={[{ value: 'todo', label: t('student.hw.todo') }, { value: 'done', label: t('student.hw.done') }, { value: 'all', label: t('common.all') }]}
            />

            {error ? <ErrorState message={error} onRetry={load} /> : items === null ? <SkeletonCards count={3} height="h-48" /> : list.length === 0 ? (
                <EmptyState icon={<FiCheckCircle />} title={filter === 'todo' ? t('student.hw.emptyTodo') : t('student.hw.empty')} message={t('student.hw.emptyMsg')} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 ui-stagger">
                    {list.map(hw => {
                        const st = statusOf(hw);
                        const sub = hw.mySubmission;
                        const canSubmit = !sub || sub.status !== 'graded';
                        return (
                            <article key={hw._id} className="ui-card ui-card-hover p-5 flex flex-col">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className={`ui-badge ${BADGE[st]}`}>{st === 'overdue' && <FiAlertCircle />}{t(`student.hw.status.${st}`)}</span>
                                    {hw.subjectId?.name && <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">{hw.subjectId.name}</span>}
                                </div>
                                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white leading-snug break-words">{hw.title}</h3>
                                {hw.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap line-clamp-4 break-words">{hw.description}</p>}
                                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-semibold text-gray-500">
                                    <span className="inline-flex items-center gap-1"><FiClock /> {new Date(hw.dueDate).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    {!sub && <span className={`ui-badge ${st === 'overdue' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}>{dueChip(hw.dueDate, t)}</span>}
                                    {hw.teacherId?.name && <span>· {hw.teacherId.name}</span>}
                                </div>
                                {hw.attachmentUrl && (
                                    <a href={resolveFileUrl(hw.attachmentUrl)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"><FiPaperclip /> {t('student.hw.attachment')}</a>
                                )}

                                {sub && (
                                    <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-white/5 p-3 text-xs space-y-1.5">
                                        <p className="font-semibold text-gray-500">{t('student.hw.submittedOn', { date: new Date(sub.submittedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}</p>
                                        {sub.fileUrl && <a href={resolveFileUrl(sub.fileUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-brand-600 dark:text-brand-400"><FiFileText /> {t('student.hw.myFile')}</a>}
                                        {sub.marks != null && (
                                            <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{sub.marks}<span className="text-xs text-gray-400"> / {hw.maxMarks}</span></p>
                                        )}
                                        {sub.remark && <p className="flex gap-1.5 text-gray-700 dark:text-gray-200"><FiMessageSquare className="mt-0.5 shrink-0 text-brand-500" /> <span className="break-words">{sub.remark}</span></p>}
                                    </div>
                                )}

                                <div className="mt-auto pt-4">
                                    {canSubmit ? (
                                        <button onClick={() => openSubmit(hw)} className={sub ? 'ui-btn-secondary w-full' : 'ui-btn-primary w-full'}>
                                            <FiUpload /> {sub ? (st === 'returned' ? t('student.hw.resubmit') : t('student.hw.update')) : t('student.hw.submit')}
                                        </button>
                                    ) : (
                                        <p className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5"><FiCheckCircle /> {t('student.hw.gradedNote')}</p>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <Modal
                open={!!active}
                onClose={() => !busy && setActive(null)}
                title={active?.title || t('student.hw.submit')}
                footer={(
                    <>
                        <button onClick={() => setActive(null)} disabled={busy} className="ui-btn-secondary">{t('common.cancel')}</button>
                        <button onClick={submit} disabled={busy} className="ui-btn-primary"><FiSend /> {busy ? t('student.common.submitting') : t('common.submit')}</button>
                    </>
                )}
            >
                <div className="space-y-4">
                    {active && new Date(active.dueDate) < new Date() && (
                        <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold px-3 py-2">{t('student.hw.lateWarning')}</p>
                    )}
                    <label className="block">
                        <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('student.hw.answer')}</span>
                        <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} className="ui-input dark:text-white resize-y" placeholder={t('student.hw.answerPh')} />
                    </label>
                    <div>
                        <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('student.hw.file')}</span>
                        <label className="relative block rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-brand-300 p-5 text-center cursor-pointer transition-colors">
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="sr-only"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f && f.size > MAX_BYTES) { toast.error(t('student.ai.tooBig')); return; }
                                    setFile(f || null);
                                }}
                            />
                            <FiUpload className="mx-auto text-brand-500 text-xl mb-1" />
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 break-all">{file ? file.name : t('student.hw.filePh')}</span>
                        </label>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Homework;
