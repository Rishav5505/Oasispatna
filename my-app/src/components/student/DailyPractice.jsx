import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FiZap, FiCheckCircle, FiXCircle, FiSend, FiBookmark, FiChevronDown, FiChevronUp, FiTarget, FiAward, FiRefreshCw,
} from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { errorMessage } from './helpers';
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from './StudentUI';
import { ProgressRing } from './Widgets';
import { AnimatedNumber } from '../ui/Motion';
import { AnswerInput, RichText } from './PracticeUI';
import { api, questionToNote, answerLabel } from './practiceApi';
import { useI18n } from '../../i18n/useI18n';

const isAnswered = (a) => a && ((a.selectedOption !== undefined && a.selectedOption !== null) || (a.numericAnswer !== undefined && a.numericAnswer !== ''));

const DailyPractice = ({ onXpChange, onNavigate }) => {
    const { t } = useI18n();
    const [state, setState] = useState({ loading: true, error: '', empty: false, dpp: null, result: null });
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [open, setOpen] = useState({});
    const [bookmarked, setBookmarked] = useState({});
    const startedRef = useRef(Date.now());

    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true, error: '' }));
        try {
            const data = await api.get('/practice/dpp/today');
            startedRef.current = Date.now();
            setState({ loading: false, error: '', empty: false, dpp: data.dpp, result: data.attempted ? data.result : null });
        } catch (err) {
            if (err.response?.status === 404) setState({ loading: false, error: '', empty: true, dpp: null, result: null });
            else setState({ loading: false, error: errorMessage(err, t('student.dpp.loadError')), empty: false, dpp: null, result: null });
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    const { loading, error, empty, dpp, result } = state;
    const questions = dpp?.questions || [];
    const answeredCount = questions.filter(q => isAnswered(answers[q._id])).length;

    const submit = async () => {
        if (!dpp || submitting) return;
        setConfirm(false);
        setSubmitting(true);
        const payload = questions.filter(q => isAnswered(answers[q._id])).map(q => {
            const a = answers[q._id];
            return q.type === 'numerical'
                ? { questionId: q._id, numericAnswer: Number(a.numericAnswer) }
                : { questionId: q._id, selectedOption: a.selectedOption };
        });
        try {
            const res = await api.post(`/practice/dpp/${dpp._id}/submit`, {
                answers: payload,
                timeTaken: Math.round((Date.now() - startedRef.current) / 1000),
            });
            setState(s => ({ ...s, result: res }));
            toast.success(t('student.dpp.xpToast', { xp: res.xpEarned }), { icon: '⚡' });
            onXpChange?.();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            if (err.response?.status === 409) {
                toast(t('student.dpp.already'), { icon: 'ℹ️' });
                load();
            } else {
                toast.error(errorMessage(err, t('student.dpp.submitError')));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const bookmark = async (q, sol) => {
        try {
            await api.post('/practice/bookmarks', {
                kind: 'question',
                refId: q._id,
                title: (q.questionText || 'Question').slice(0, 120),
                content: questionToNote(q, sol || {}),
            });
            setBookmarked(b => ({ ...b, [q._id]: true }));
            toast.success(t('student.bookmarks.saved'));
        } catch (err) {
            toast.error(errorMessage(err, t('student.bookmarks.saveError')));
        }
    };

    const header = (
        <PageHeader
            icon={FiZap}
            title={t('student.heading.practice')}
            subtitle={t('student.dpp.subtitle')}
            action={dpp && !result && (
                <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 !py-2 !px-3">
                    {answeredCount}/{questions.length} {t('student.dpp.answered')}
                </span>
            )}
        />
    );

    if (loading) return <div className="space-y-6">{header}<SkeletonRows count={5} /></div>;
    if (error) return <div className="space-y-6">{header}<ErrorState message={error} onRetry={load} /></div>;
    if (empty) {
        return (
            <div className="space-y-6">
                {header}
                <EmptyState
                    icon={<FiZap />}
                    title={t('student.dpp.emptyTitle')}
                    message={t('student.dpp.emptyMsg')}
                    action={<button onClick={() => onNavigate?.('study')} className="ui-btn-primary"><FiTarget /> {t('student.dpp.emptyAction')}</button>}
                />
            </div>
        );
    }

    // ---------- RESULT ----------
    if (result) {
        const pct = result.total > 0 ? Math.max(0, Math.round((result.score / result.total) * 100)) : 0;
        const solMap = new Map((result.solutions || []).map(s => [String(s.questionId), s]));
        return (
            <div className="space-y-6">
                {header}
                <div className="ui-card overflow-hidden">
                    <div className="relative bg-brand-sunset text-white p-6 md:p-8 overflow-hidden">
                        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl animate-float-slow" />
                        <div className="relative flex flex-col sm:flex-row items-center gap-6">
                            <div className="rounded-full bg-white dark:bg-ink-900 p-2 shadow-card-hover">
                                <ProgressRing value={pct} size={128} stroke={12} tone={pct >= 70 ? 'green' : pct >= 40 ? 'brand' : 'red'}>
                                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white"><AnimatedNumber value={result.score} /></span>
                                    <span className="text-[11px] font-bold text-gray-400">/ {result.total}</span>
                                </ProgressRing>
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">{t('student.dpp.done')}</p>
                                <h3 className="text-2xl font-extrabold tracking-tight mt-1">{pct >= 70 ? t('student.dpp.great') : t('student.dpp.keepGoing')}</h3>
                                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                                    <span className="ui-badge bg-white text-brand-700 animate-scale-in"><FiZap /> +{result.xpEarned} XP</span>
                                    <span className="ui-badge bg-white/15 text-white border border-white/20"><FiCheckCircle /> {result.correct} {t('student.dpp.correct')}</span>
                                    <span className="ui-badge bg-white/15 text-white border border-white/20"><FiXCircle /> {result.wrong} {t('student.dpp.wrong')}</span>
                                    {result.streak > 0 && <span className="ui-badge bg-white/15 text-white border border-white/20"><FiAward /> {t('student.dpp.streak', { count: result.streak })}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                    {result.wrong > 0 && (
                        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-500/10 text-sm font-semibold text-amber-800 dark:text-amber-300 flex flex-wrap items-center gap-2">
                            {t('student.dpp.mistakesAdded')}
                            <button onClick={() => onNavigate?.('mistakes')} className="underline underline-offset-2 font-bold">{t('student.nav.mistakes')}</button>
                        </div>
                    )}
                </div>

                <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-400">{t('student.dpp.solutions')}</h3>
                <div className="space-y-4 ui-stagger">
                    {questions.map((q, i) => {
                        const s = solMap.get(String(q._id)) || {};
                        const expanded = open[q._id] ?? !s.isCorrect;
                        return (
                            <article key={q._id} className="ui-card p-5 md:p-6">
                                <div className="flex items-start gap-3">
                                    <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white ${s.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                        {s.isCorrect ? <FiCheckCircle /> : <FiXCircle />}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-400 mb-1">Q{i + 1} · {q.type === 'numerical' ? 'Numerical' : 'MCQ'}</p>
                                        <p className="font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words">{q.questionText}</p>
                                    </div>
                                    <button
                                        onClick={() => bookmark(q, s)}
                                        disabled={bookmarked[q._id]}
                                        className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-colors ${bookmarked[q._id] ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-brand-600'}`}
                                        aria-label={t('student.bookmarks.add')}
                                        title={t('student.bookmarks.add')}
                                    >
                                        <FiBookmark />
                                    </button>
                                </div>
                                <button onClick={() => setOpen(o => ({ ...o, [q._id]: !expanded }))} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400">
                                    {expanded ? <FiChevronUp /> : <FiChevronDown />} {expanded ? t('student.dpp.hideSolution') : t('student.dpp.showSolution')}
                                </button>
                                {expanded && (
                                    <div className="mt-4 space-y-4 animate-fade-in">
                                        <AnswerInput question={q} disabled value={q.type === 'numerical' ? { numericAnswer: answers[q._id]?.numericAnswer ?? '' } : { selectedOption: answers[q._id]?.selectedOption }} reveal={{ correctOption: s.correctOption, correctAnswer: s.correctAnswer }} idPrefix="dpp-sol" />
                                        {q.type !== 'numerical' && s.correctOption != null && (
                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t('student.dpp.correctAnswer')}: {answerLabel(q, s.correctOption)}</p>
                                        )}
                                        {s.solution ? (
                                            <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t('student.dpp.explanation')}</p>
                                                <RichText text={s.solution} />
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400">{t('student.dpp.noExplanation')}</p>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
                <button onClick={load} className="ui-btn-secondary"><FiRefreshCw /> {t('common.retry')}</button>
            </div>
        );
    }

    // ---------- ATTEMPT ----------
    return (
        <div className="space-y-6">
            {header}
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                <div className="h-full bg-brand-gradient transition-all duration-500" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
            </div>
            <div className="space-y-4 ui-stagger">
                {questions.map((q, i) => (
                    <article key={q._id} className="ui-card p-5 md:p-6">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-xs font-extrabold text-gray-400">Q{i + 1}</span>
                            <span className={`ui-badge ${q.type === 'numerical' ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'}`}>{q.type === 'numerical' ? 'Numerical' : 'MCQ'}</span>
                            {q.marks != null && <span className="ui-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">+{q.marks}</span>}
                            {isAnswered(answers[q._id]) && <FiCheckCircle className="ml-auto text-emerald-500" aria-label="answered" />}
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white mb-4 whitespace-pre-wrap break-words leading-relaxed">{q.questionText}</p>
                        <AnswerInput
                            question={q}
                            value={answers[q._id]}
                            onChange={(v) => setAnswers(prev => ({ ...prev, [q._id]: v }))}
                            idPrefix="dpp"
                        />
                    </article>
                ))}
            </div>
            <div className="sticky bottom-24 lg:bottom-6 z-20 ui-glass rounded-2xl border border-gray-100 dark:border-white/10 shadow-card p-3 flex items-center gap-3">
                <p className="flex-1 text-sm font-bold text-gray-600 dark:text-gray-300">{answeredCount}/{questions.length} {t('student.dpp.answered')}</p>
                <button onClick={() => setConfirm(true)} disabled={submitting || answeredCount === 0} className="ui-btn-primary disabled:opacity-50">
                    <FiSend /> {submitting ? t('student.common.submitting') : t('common.submit')}
                </button>
            </div>

            {confirm && (
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setConfirm(false)}>
                    <div className="ui-card p-7 max-w-sm w-full text-center animate-scale-in" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-gradient text-white flex items-center justify-center text-2xl mb-4 shadow-brand-glow"><FiSend /></div>
                        <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">{t('student.dpp.confirmTitle')}</h3>
                        <p className="text-sm text-gray-500 mb-6">{answeredCount < questions.length ? t('student.dpp.confirmLeft', { count: questions.length - answeredCount }) : t('student.dpp.confirmAll')}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirm(false)} className="ui-btn-secondary flex-1">{t('common.cancel')}</button>
                            <button onClick={submit} className="ui-btn-primary flex-1">{t('common.submit')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyPractice;
