import React, { useEffect, useState } from 'react';
import {
    FiBookOpen, FiCheckCircle, FiXCircle, FiRotateCcw, FiEye, FiTrash2, FiBookmark, FiAward, FiFilter,
} from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { errorMessage } from './helpers';
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from './StudentUI';
import { AnswerInput, RichText, Segmented } from './PracticeUI';
import { api, answerLabel, questionToNote } from './practiceApi';
import { useI18n } from '../../i18n/useI18n';

const hasValue = (v) => v && ((v.selectedOption !== undefined && v.selectedOption !== null) || (v.numericAnswer !== undefined && v.numericAnswer !== ''));

const MistakeCard = ({ m, onChanged, onDelete, revealData, onReveal }) => {
    const { t } = useI18n();
    const q = m.questionRef || {};
    const [retrying, setRetrying] = useState(false);
    const [answer, setAnswer] = useState(null);
    const [busy, setBusy] = useState(false);
    const [outcome, setOutcome] = useState(null); // retry response
    const [confirmDel, setConfirmDel] = useState(false);
    const [saved, setSaved] = useState(false);

    const revealed = outcome || revealData; // {correctOption, correctAnswer, solution}
    const mastered = (outcome?.status || m.status) === 'mastered';

    const submitRetry = async () => {
        if (!hasValue(answer) || busy) return;
        setBusy(true);
        try {
            const body = q.type === 'numerical' ? { numericAnswer: Number(answer.numericAnswer) } : { selectedOption: answer.selectedOption };
            const res = await api.post(`/practice/mistakes/${m._id}/retry`, body);
            setOutcome(res);
            if (res.isCorrect) {
                toast.success(res.status === 'mastered' ? t('student.mistakes.masteredToast') : t('student.mistakes.correctToast'));
            } else {
                toast.error(t('student.mistakes.wrongToast'));
            }
            onChanged?.(m._id, res.status);
        } catch (err) {
            toast.error(errorMessage(err, t('student.common.actionError')));
        } finally {
            setBusy(false);
        }
    };

    const saveBookmark = async () => {
        try {
            await api.post('/practice/bookmarks', {
                kind: 'question',
                refId: m._id,
                title: (q.questionText || 'Question').slice(0, 120),
                content: questionToNote(q, revealed || {}),
                subjectId: m.subjectId?._id || undefined,
            });
            setSaved(true);
            toast.success(t('student.bookmarks.saved'));
        } catch (err) {
            toast.error(errorMessage(err, t('student.bookmarks.saveError')));
        }
    };

    return (
        <article className={`ui-card overflow-hidden relative ${mastered ? 'animate-scale-in' : ''}`}>
            <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${mastered ? 'bg-emerald-500' : 'bg-rose-400'}`} aria-hidden="true" />
            <div className="p-5 md:p-6 pl-6 md:pl-7">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    {m.subjectId?.name && <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{m.subjectId.name}</span>}
                    {m.chapter && <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">{m.chapter}</span>}
                    <span className="ui-badge bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">{m.source === 'dpp' ? t('student.mistakes.fromDpp') : (m.testId?.title || t('student.mistakes.fromTest'))}</span>
                    <span className={`ui-badge ${mastered ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                        {mastered ? <><FiAward /> {t('student.mistakes.mastered')}</> : t('student.mistakes.open')}
                    </span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words leading-relaxed">{q.questionText}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('student.mistakes.yourAnswer')}: <span className="font-bold text-rose-600 dark:text-rose-400">{answerLabel(q, m.yourAnswer)}</span>
                    {m.attempts > 0 && <> · {t('student.mistakes.attempts', { count: m.attempts + (outcome ? 1 : 0) })}</>}
                </p>

                {(retrying || revealed) && (
                    <div className="mt-4 animate-fade-in">
                        <AnswerInput
                            question={q}
                            value={answer}
                            onChange={outcome ? undefined : setAnswer}
                            disabled={!!outcome || !retrying}
                            reveal={revealed ? { correctOption: revealed.correctOption, correctAnswer: revealed.correctAnswer } : null}
                            idPrefix={`mistake-${m._id}`}
                        />
                    </div>
                )}

                {outcome && (
                    <div className={`mt-4 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm font-bold ${outcome.isCorrect ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                        {outcome.isCorrect ? <FiCheckCircle /> : <FiXCircle />}
                        {outcome.isCorrect ? (outcome.status === 'mastered' ? t('student.mistakes.masteredToast') : t('student.mistakes.correctOnceMore')) : t('student.mistakes.wrongToast')}
                    </div>
                )}

                {revealed?.solution && (
                    <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-white/5 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t('student.dpp.explanation')}</p>
                        <RichText text={revealed.solution} />
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-5">
                    {!mastered && !retrying && !outcome && (
                        <button onClick={() => setRetrying(true)} className="ui-btn-primary !py-2 text-xs"><FiRotateCcw /> {t('student.mistakes.retry')}</button>
                    )}
                    {retrying && !outcome && (
                        <>
                            <button onClick={submitRetry} disabled={!hasValue(answer) || busy} className="ui-btn-primary !py-2 text-xs disabled:opacity-50">{busy ? t('student.common.checking') : t('student.mistakes.check')}</button>
                            <button onClick={() => { setRetrying(false); setAnswer(null); }} className="ui-btn-secondary !py-2 text-xs">{t('common.cancel')}</button>
                        </>
                    )}
                    {outcome && !mastered && (
                        <button onClick={() => { setOutcome(null); setAnswer(null); setRetrying(true); }} className="ui-btn-secondary !py-2 text-xs"><FiRotateCcw /> {t('student.mistakes.tryAgain')}</button>
                    )}
                    {!revealed && (
                        <button onClick={() => onReveal(m._id)} className="ui-btn-secondary !py-2 text-xs"><FiEye /> {t('student.mistakes.reveal')}</button>
                    )}
                    <button onClick={saveBookmark} disabled={saved} className="ui-btn-secondary !py-2 text-xs disabled:opacity-60"><FiBookmark /> {saved ? t('student.bookmarks.savedShort') : t('student.bookmarks.add')}</button>
                    <div className="ml-auto">
                        {confirmDel ? (
                            <span className="inline-flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500">{t('student.mistakes.deleteConfirm')}</span>
                                <button onClick={() => onDelete(m._id)} className="ui-btn-dark !py-1.5 !px-3 text-xs !bg-rose-600">{t('common.delete')}</button>
                                <button onClick={() => setConfirmDel(false)} className="ui-btn-secondary !py-1.5 !px-3 text-xs">{t('common.cancel')}</button>
                            </span>
                        ) : (
                            <button onClick={() => setConfirmDel(true)} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label={t('common.delete')}><FiTrash2 /></button>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
};

const MistakeNotebook = () => {
    const { t } = useI18n();
    const [status, setStatus] = useState('open');
    const [subjectId, setSubjectId] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');
    const [revealMap, setRevealMap] = useState({});

    useEffect(() => {
        api.get('/public/subjects').then(d => setSubjects(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    const [nonce, setNonce] = useState(0);
    useEffect(() => {
        let cancelled = false;
        const params = {};
        if (status) params.status = status;
        if (subjectId) params.subjectId = subjectId;
        api.get('/practice/mistakes', params)
            .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []); })
            .catch((err) => { if (!cancelled) setError(errorMessage(err, t('student.mistakes.loadError'))); });
        return () => { cancelled = true; };
    }, [status, subjectId, nonce, t]);

    const resetList = () => { setItems(null); setError(''); };
    const load = () => { resetList(); setNonce(n => n + 1); };
    const changeStatus = (v) => { if (v !== status) { resetList(); setStatus(v); } };
    const changeSubject = (v) => { if (v !== subjectId) { resetList(); setSubjectId(v); } };

    const reveal = async (id) => {
        try {
            const params = { reveal: 1 };
            if (status) params.status = status;
            if (subjectId) params.subjectId = subjectId;
            const data = await api.get('/practice/mistakes', params);
            const map = {};
            (data || []).forEach(m => { map[m._id] = { correctOption: m.questionRef?.correctOption, correctAnswer: m.questionRef?.correctAnswer, solution: m.questionRef?.solution }; });
            setRevealMap(prev => ({ ...prev, ...map }));
            if (!map[id]) toast.error(t('student.common.actionError'));
        } catch (err) {
            toast.error(errorMessage(err, t('student.common.actionError')));
        }
    };

    const remove = async (id) => {
        try {
            await api.del(`/practice/mistakes/${id}`);
            setItems(prev => (prev || []).filter(m => m._id !== id));
            toast.success(t('student.mistakes.deleted'));
        } catch (err) {
            toast.error(errorMessage(err, t('student.common.actionError')));
        }
    };

    const openCount = (items || []).filter(m => m.status === 'open').length;

    return (
        <div className="space-y-6">
            <PageHeader icon={FiBookOpen} title={t('student.nav.mistakes')} subtitle={t('student.mistakes.subtitle')} />

            <div className="ui-card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <Segmented
                    value={status}
                    onChange={changeStatus}
                    options={[
                        { value: 'open', label: t('student.mistakes.toFix') },
                        { value: 'mastered', label: t('student.mistakes.mastered') },
                        { value: '', label: t('common.all') },
                    ]}
                />
                <label className="flex items-center gap-2 sm:ml-auto">
                    <FiFilter className="text-gray-400 shrink-0" />
                    <span className="sr-only">{t('student.common.subject')}</span>
                    <select value={subjectId} onChange={(e) => changeSubject(e.target.value)} className="ui-input !py-2 dark:text-white sm:w-56">
                        <option value="">{t('student.common.allSubjects')}</option>
                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </label>
            </div>

            {error ? <ErrorState message={error} onRetry={load} /> : items === null ? <SkeletonRows count={4} /> : items.length === 0 ? (
                <EmptyState
                    icon={<FiAward />}
                    title={status === 'open' ? t('student.mistakes.emptyOpenTitle') : t('student.mistakes.emptyTitle')}
                    message={t('student.mistakes.emptyMsg')}
                />
            ) : (
                <>
                    {status === '' && <p className="text-xs font-semibold text-gray-400">{t('student.mistakes.summary', { open: openCount, total: items.length })}</p>}
                    <div className="space-y-4 ui-stagger">
                        {items.map(m => (
                            <MistakeCard key={m._id} m={m} revealData={revealMap[m._id]} onReveal={reveal} onDelete={remove} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default MistakeNotebook;
