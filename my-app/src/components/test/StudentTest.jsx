import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import config from '../../config';
import {
    FiClock, FiAward, FiChevronRight, FiChevronLeft, FiCheckCircle, FiAlertCircle, FiFileText, FiX, FiXCircle,
    FiMinusCircle, FiInfo, FiArrowLeft, FiPlay, FiList, FiSend, FiEdit3, FiFlag, FiRotateCcw, FiCheck, FiLock, FiTrendingUp, FiLayers,
} from 'react-icons/fi';
import { notify, toast } from '../../utils/notify';
import { authHeaders, errorMessage, resolveFileUrl } from '../student/helpers';
import { SkeletonCards, EmptyState, ErrorState, PageHeader } from '../student/StudentUI';
import TestLeaderboard from '../student/TestLeaderboard';
import { ProgressRing } from '../student/Widgets';
import { AnimatedNumber } from '../ui/Motion';
import { useI18n } from '../../i18n/useI18n';

// Sections for a mock test: [{name, indexes:[...]}] (only when the test defines them)
const sectionsOf = (test) => {
    const qs = test?.questions || [];
    const secs = Array.isArray(test?.sections) ? test.sections : [];
    return secs
        .map(s => ({ name: s.name || 'Section', indexes: (s.questionIndexes || []).filter(i => Number.isInteger(i) && i >= 0 && i < qs.length) }))
        .filter(s => s.indexes.length > 0);
};

const isNumerical = (q) => q?.type === 'numerical';

const hasAnswer = (a) => a && (
    (a.selectedOption !== undefined && a.selectedOption !== null) ||
    (a.numericalAnswer !== undefined && a.numericalAnswer !== null && a.numericalAnswer !== '') ||
    (a.numericAnswer !== undefined && a.numericAnswer !== null)
);

const formatTime = (seconds) => {
    const s = Math.max(0, seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const mm = hrs > 0 ? String(mins).padStart(2, '0') : String(mins);
    return `${hrs > 0 ? `${hrs}:` : ''}${mm}:${String(secs).padStart(2, '0')}`;
};

// Fills correct/wrong/unattempted from stored answers when the API didn't send them
const withBreakdown = (result, test) => {
    if (!result) return result;
    if (result.correct != null && result.wrong != null && result.unattempted != null) return result;
    const answers = Array.isArray(result.answers) ? result.answers : [];
    const correct = answers.filter(a => a.isCorrect).length;
    const wrong = answers.filter(a => !a.isCorrect && hasAnswer(a)).length;
    const totalQ = test?.questions?.length || answers.length;
    return { ...result, correct, wrong, unattempted: Math.max(0, totalQ - correct - wrong) };
};

const testWindowState = (test) => {
    const now = Date.now();
    if (test.startTime && new Date(test.startTime).getTime() > now) return 'upcoming';
    if (test.endTime && new Date(test.endTime).getTime() < now) return 'closed';
    return 'open';
};

const StudentTest = ({ studentId, onXpChange }) => {
    const { t: tr } = useI18n();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [briefingTest, setBriefingTest] = useState(null); // instructions screen before starting
    const [activeTest, setActiveTest] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [testResult, setTestResult] = useState(null);
    const [resultTest, setResultTest] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [loadingResultId, setLoadingResultId] = useState(null);
    const [showPdf, setShowPdf] = useState(false);
    const [confirmSubmit, setConfirmSubmit] = useState(false);
    const [visited, setVisited] = useState(() => new Set([0])); // UI-only palette state
    const [marked, setMarked] = useState(() => new Set()); // UI-only 'mark for review'

    const answersRef = useRef(answers);
    const startedAtRef = useRef(null);
    const submittingRef = useRef(false);
    useEffect(() => { answersRef.current = answers; }, [answers]);

    const fetchTests = useCallback(async () => {
        setError('');
        try {
            const res = await axios.get(`${config.API_URL}/tests/student/${studentId}`, { headers: authHeaders() });
            setTests(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching tests:', err);
            const msg = errorMessage(err, 'Failed to load tests');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        if (studentId) fetchTests();
    }, [studentId, fetchTests]);

    const loadResult = useCallback(async (test, submitResponse = null) => {
        const res = await axios.get(`${config.API_URL}/tests/result/${test._id}/${studentId}`, { headers: authHeaders() });
        const merged = { ...res.data };
        if (submitResponse) {
            ['correct', 'wrong', 'unattempted', 'xpEarned'].forEach(k => {
                if (submitResponse[k] != null) merged[k] = submitResponse[k];
            });
            if (!merged.sectionScores?.length && submitResponse.sectionScores?.length) merged.sectionScores = submitResponse.sectionScores;
            if (merged.percentile == null && submitResponse.percentile != null) merged.percentile = submitResponse.percentile;
        }
        setResultTest(test);
        setTestResult(withBreakdown(merged, test));
    }, [studentId]);

    const handleViewResult = async (test) => {
        setLoadingResultId(test._id);
        try {
            await loadResult(test);
        } catch (err) {
            console.error('Error fetching result:', err);
            toast.error(errorMessage(err, 'Could not load your result'));
        } finally {
            setLoadingResultId(null);
        }
    };

    const handleSubmitTest = useCallback(async () => {
        if (!activeTest || submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        setConfirmSubmit(false);
        const test = activeTest;
        const payloadAnswers = answersRef.current.filter(hasAnswer).map(a => (
            a.numericalAnswer !== undefined && a.numericalAnswer !== null
                ? { questionId: a.questionId, numericAnswer: a.numericalAnswer }
                : { questionId: a.questionId, selectedOption: a.selectedOption }
        ));
        const timeTaken = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : undefined;

        try {
            const res = await axios.post(`${config.API_URL}/tests/submit`, {
                studentId,
                testId: test._id,
                answers: payloadAnswers,
                timeTaken
            }, { headers: authHeaders() });

            setActiveTest(null);
            notify('Test submitted successfully!');
            if (res.data?.xpEarned > 0) {
                toast.success(tr('student.test.xpToast', { xp: res.data.xpEarned }), { icon: '⚡' });
                onXpChange?.();
            }
            try {
                await loadResult(test, res.data);
            } catch (resultErr) {
                console.error('Error fetching result:', resultErr);
                setResultTest(test);
                setTestResult(withBreakdown({ ...res.data }, test));
            }
        } catch (err) {
            console.error('Error submitting test:', err);
            const msg = errorMessage(err, '');
            if (err.response?.status === 400 && /already submitted/i.test(msg)) {
                toast('You have already submitted this test. Showing your result.', { icon: 'ℹ️' });
                setActiveTest(null);
                try {
                    await loadResult(test);
                } catch {
                    fetchTests();
                }
            } else if (err.response?.status === 400) {
                toast.error(msg || 'This test cannot be submitted right now.');
                setActiveTest(null);
                fetchTests();
            } else {
                toast.error(msg || 'Failed to submit test. Please check your connection and try again.');
            }
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    }, [activeTest, studentId, loadResult, fetchTests, tr, onXpChange]);

    // Keep a ref to the latest submit handler so the timer can auto-submit without re-subscribing
    const submitRef = useRef(handleSubmitTest);
    useEffect(() => { submitRef.current = handleSubmitTest; }, [handleSubmitTest]);

    useEffect(() => {
        if (!activeTest) return undefined;
        const deadline = startedAtRef.current + activeTest.duration * 60 * 1000;
        const tick = () => {
            const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                clearInterval(timer);
                toast('Time is up! Submitting your answers…', { icon: '⏰' });
                submitRef.current();
            }
        };
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [activeTest]);

    const handleStartTest = (test) => {
        startedAtRef.current = Date.now();
        setBriefingTest(null);
        setActiveTest(test);
        setTimeLeft(test.duration * 60);
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setTestResult(null);
        setConfirmSubmit(false);
        setVisited(new Set([0]));
        setMarked(new Set());
    };

    const setAnswer = (questionId, patch) => {
        setAnswers(prev => {
            const exists = prev.some(a => a.questionId === questionId);
            if (exists) return prev.map(a => (a.questionId === questionId ? { questionId, ...patch } : a));
            return [...prev, { questionId, ...patch }];
        });
    };

    const handleOptionSelect = (questionId, optionIndex) => setAnswer(questionId, { selectedOption: optionIndex });

    const handleNumericalChange = (questionId, value) => {
        if (value === '') {
            setAnswers(prev => prev.filter(a => a.questionId !== questionId));
            return;
        }
        const num = Number(value);
        setAnswer(questionId, { numericalAnswer: Number.isFinite(num) ? num : undefined, raw: value });
    };

    const clearAnswer = (questionId) => setAnswers(prev => prev.filter(a => a.questionId !== questionId));

    // UI-only navigation helpers (palette status), do not affect submission
    const goTo = (idx) => {
        setCurrentQuestionIndex(idx);
        setVisited(prev => (prev.has(idx) ? prev : new Set(prev).add(idx)));
    };
    const toggleMarked = (questionId) => setMarked(prev => {
        const next = new Set(prev);
        if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
        return next;
    });

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="ui-skeleton h-12 w-72"></div>
                <SkeletonCards count={3} height="h-72" />
            </div>
        );
    }

    // ---------- RESULT VIEW ----------
    if (testResult) {
        const pct = testResult.totalMarks ? Math.round((testResult.score / testResult.totalMarks) * 100) : 0;
        const tone = pct >= 75 ? 'green' : pct >= 40 ? 'brand' : 'red';
        const headline = pct >= 90 ? 'Outstanding! 🏆' : pct >= 75 ? 'Great job! 🎉' : pct >= 40 ? 'Good effort! 💪' : 'Keep practising! 📚';
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="ui-card overflow-hidden">
                    <div className="relative bg-brand-sunset text-white px-6 pt-8 pb-24 text-center overflow-hidden">
                        <div className="absolute -top-20 -left-10 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-float-slow" />
                        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                        <p className="relative text-xs font-bold uppercase tracking-[0.25em] text-white/70">Result</p>
                        <h2 className="relative text-2xl md:text-3xl font-extrabold tracking-tight mt-1">{resultTest?.title || 'Test Completed!'}</h2>
                        <p className="relative text-white/80 mt-1">{headline}</p>
                    </div>
                    <div className="-mt-20 flex justify-center">
                        <div className={`rounded-full bg-white dark:bg-ink-900 p-3 shadow-card-hover ${pct >= 90 ? 'animate-glow' : ''}`}>
                            <ProgressRing value={pct} size={168} stroke={14} tone={tone}>
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight"><AnimatedNumber value={pct} suffix="%" /></span>
                                <span className="text-xs font-bold text-gray-400">{testResult.score}/{testResult.totalMarks} marks</span>
                            </ProgressRing>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ui-stagger">
                            <div className="rounded-2xl bg-ink-900 text-white p-4 text-center">
                                <FiAward className="mx-auto text-brand-400 mb-1" />
                                <p className="text-2xl font-extrabold text-brand-400">
                                    {testResult.rank ? `#${testResult.rank}` : '—'}
                                    {testResult.totalStudents ? <span className="text-sm text-white/50 font-bold"> /{testResult.totalStudents}</span> : null}
                                </p>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Rank</p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-center">
                                <FiCheckCircle className="mx-auto text-emerald-500 mb-1" />
                                <p className="text-2xl font-extrabold text-emerald-600"><AnimatedNumber value={testResult.correct ?? 0} /></p>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Correct</p>
                            </div>
                            <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 p-4 text-center">
                                <FiXCircle className="mx-auto text-rose-500 mb-1" />
                                <p className="text-2xl font-extrabold text-rose-600"><AnimatedNumber value={testResult.wrong ?? 0} /></p>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Wrong</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4 text-center">
                                <FiMinusCircle className="mx-auto text-gray-400 mb-1" />
                                <p className="text-2xl font-extrabold text-gray-700 dark:text-gray-200"><AnimatedNumber value={testResult.unattempted ?? 0} /></p>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Skipped</p>
                            </div>
                        </div>

                        {testResult.percentile != null && (
                            <div className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white p-5 flex items-center gap-4 shadow-brand-soft animate-scale-in">
                                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                                <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center text-2xl"><FiTrendingUp /></div>
                                <div className="relative min-w-0 flex-1">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">{tr('student.test.percentile')}</p>
                                    <p className="text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums"><AnimatedNumber value={Number(testResult.percentile) || 0} decimals={2} /></p>
                                    <p className="text-xs text-white/80">{tr('student.test.percentileHint', { pct: Number(testResult.percentile).toFixed(2) })}</p>
                                </div>
                                {testResult.xpEarned > 0 && <span className="relative ui-badge bg-white text-brand-700">+{testResult.xpEarned} XP</span>}
                            </div>
                        )}

                        {Array.isArray(testResult.sectionScores) && testResult.sectionScores.length > 0 && (
                            <div>
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">{tr('student.test.sectionScores')}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 ui-stagger">
                                    {testResult.sectionScores.map(sec => {
                                        const sp = sec.max > 0 ? Math.max(0, Math.round((sec.score / sec.max) * 100)) : 0;
                                        return (
                                            <div key={sec.name} className="rounded-2xl border border-gray-100 dark:border-white/10 p-4">
                                                <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{sec.name}</p>
                                                <p className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 tabular-nums mt-1">{sec.score}<span className="text-sm text-gray-400"> / {sec.max}</span></p>
                                                <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden mt-2"><div className="h-full bg-brand-gradient rounded-full transition-all duration-700" style={{ width: `${sp}%` }} /></div>
                                                <p className="text-[11px] font-semibold text-gray-500 mt-2"><span className="text-emerald-600">{sec.correct} ✓</span> · <span className="text-rose-600">{sec.wrong} ✗</span></p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {resultTest?._id && <TestLeaderboard testId={resultTest._id} />}

                        <button
                            onClick={() => { setTestResult(null); setResultTest(null); fetchTests(); }}
                            className="ui-btn-dark w-full !py-3.5"
                        >
                            <FiArrowLeft /> Back to tests
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ---------- INSTRUCTIONS (before start) ----------
    if (briefingTest) {
        const t = briefingTest;
        const numCount = (t.questions || []).filter(isNumerical).length;
        const mcqCount = (t.questions || []).length - numCount;
        const neg = Number(t.negativeMarks) || 0;
        return (
            <div className="max-w-2xl mx-auto ui-card overflow-hidden">
                <div className="relative bg-brand-dark text-white p-6 md:p-8 overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-brand-500/30 blur-3xl" />
                    <button onClick={() => setBriefingTest(null)} className="relative inline-flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white mb-5">
                        <FiArrowLeft /> Back to tests
                    </button>
                    {t.subjectId?.name && <span className="relative ui-badge bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-3">{t.subjectId.name}</span>}
                    <h2 className="relative text-2xl md:text-3xl font-extrabold tracking-tight">{t.title}</h2>
                    <div className="relative grid grid-cols-3 gap-3 mt-6">
                        {[[t.duration, 'Minutes', FiClock], [t.questions?.length || 0, 'Questions', FiList], [t.totalMarks, 'Marks', FiAward]].map(([v, l, StatIcon]) => (
                            <div key={l} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                                {StatIcon && <StatIcon className="mx-auto text-brand-400 mb-1" />}
                                <p className="text-2xl font-extrabold">{v}</p>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">{l}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className={`rounded-2xl p-4 mb-6 flex gap-3 ${neg > 0 ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
                        <FiAlertCircle className={`mt-0.5 shrink-0 ${neg > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                        <div>
                            <p className={`font-bold text-sm ${neg > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                {neg > 0 ? `Negative marking: −${neg} mark${neg === 1 ? '' : 's'} for each wrong answer` : 'No negative marking in this test'}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Unanswered questions carry 0 marks.</p>
                        </div>
                    </div>

                    {sectionsOf(t).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {sectionsOf(t).map(sec => (
                                <span key={sec.name} className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 !py-2 !px-3"><FiLayers /> {sec.name} · {sec.indexes.length} Q</span>
                            ))}
                        </div>
                    )}
                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300 mb-8">
                        <li className="flex gap-3"><FiInfo className="text-brand-500 mt-0.5 shrink-0" /> {mcqCount} multiple-choice question{mcqCount === 1 ? '' : 's'}{numCount > 0 ? ` and ${numCount} numerical question${numCount === 1 ? '' : 's'} (type your answer as a number)` : ''}.</li>
                        <li className="flex gap-3"><FiInfo className="text-brand-500 mt-0.5 shrink-0" /> The timer starts as soon as you begin and the test auto-submits when time runs out.</li>
                        <li className="flex gap-3"><FiInfo className="text-brand-500 mt-0.5 shrink-0" /> Use &ldquo;Mark for review&rdquo; to flag questions you want to revisit.</li>
                        <li className="flex gap-3"><FiInfo className="text-brand-500 mt-0.5 shrink-0" /> You can attempt this test only once.</li>
                    </ul>

                    <button onClick={() => handleStartTest(t)} className="ui-btn-primary w-full !py-4 text-base">
                        <FiPlay /> Start test now
                    </button>
                </div>
            </div>
        );
    }

    // ---------- ACTIVE TEST (focused exam mode) ----------
    if (activeTest) {
        const questions = activeTest.questions || [];
        const currentQuestion = questions[currentQuestionIndex];
        const currentAnswer = answers.find(a => a.questionId === currentQuestion?._id);
        const selectedOption = currentAnswer?.selectedOption;
        const hasPdf = !!activeTest.questionPaperUrl;
        const answeredCount = answers.filter(hasAnswer).length;
        const markedCount = questions.filter(q => marked.has(q._id)).length;
        const lowTime = timeLeft < 300;
        const isMarked = currentQuestion && marked.has(currentQuestion._id);
        const sections = sectionsOf(activeTest);
        const curSec = sections.findIndex(sec => sec.indexes.includes(currentQuestionIndex));
        const paletteIndexes = sections.length && curSec >= 0 ? sections[curSec].indexes : questions.map((_, i) => i);
        const qNeg = currentQuestion && currentQuestion.negativeMarks != null ? Number(currentQuestion.negativeMarks) : Number(activeTest.negativeMarks) || 0;

        if (!currentQuestion) {
            return <EmptyState icon={<FiAlertCircle />} title="This test has no questions" action={<button onClick={() => setActiveTest(null)} className="ui-btn-dark">Go back</button>} />;
        }

        const statusOf = (q, idx) => {
            const answered = hasAnswer(answers.find(a => a.questionId === q._id));
            if (marked.has(q._id)) return answered ? 'marked-answered' : 'marked';
            if (answered) return 'answered';
            if (visited.has(idx)) return 'skipped';
            return 'unvisited';
        };
        const PALETTE = {
            answered: 'bg-emerald-500 text-white border-emerald-500',
            marked: 'bg-amber-400 text-white border-amber-400',
            'marked-answered': 'bg-amber-400 text-white border-amber-400',
            skipped: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30',
            unvisited: 'bg-white text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10',
        };

        const palette = (
            <div className="ui-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{sections.length && curSec >= 0 ? sections[curSec].name : 'Question palette'}</h3>
                    <span className="text-xs font-bold text-gray-400">{sections.length && curSec >= 0 ? `${paletteIndexes.filter(i => hasAnswer(answers.find(a => a.questionId === questions[i]._id))).length}/${paletteIndexes.length}` : `${answeredCount}/${questions.length}`}</span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-72 overflow-y-auto ui-scrollbar p-1">
                    {paletteIndexes.map((idx) => {
                        const q = questions[idx];
                        const st = statusOf(q, idx);
                        return (
                            <button
                                key={q._id || idx}
                                onClick={() => goTo(idx)}
                                className={`relative aspect-square rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 ${PALETTE[st]} ${idx === currentQuestionIndex ? 'ring-2 ring-offset-2 ring-ink-900 dark:ring-white dark:ring-offset-ink-900' : ''}`}
                                aria-label={`Question ${idx + 1}: ${st.replace('-', ' ')}`}
                            >
                                {idx + 1}
                                {st === 'marked-answered' && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-ink-900" />}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500" /> Answered</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-400" /> Marked ({markedCount})</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-rose-50 border border-rose-200" /> Not answered</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white border border-gray-200" /> Not visited</span>
                </div>
                <button onClick={() => setConfirmSubmit(true)} disabled={submitting} className="ui-btn-primary w-full mt-5">
                    <FiSend /> {submitting ? 'Submitting…' : 'Submit test'}
                </button>
            </div>
        );

        return (
            <div className="fixed inset-0 z-[80] bg-gray-50 dark:bg-ink-950 overflow-y-auto ui-scrollbar animate-fade-in" role="dialog" aria-modal="true" aria-label="Exam mode">
                {/* PDF Modal/Overlay */}
                {hasPdf && showPdf && (
                    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-10 animate-fade-in">
                        <div className="ui-card w-full h-full max-w-6xl flex flex-col overflow-hidden animate-scale-in">
                            <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 dark:border-white/10">
                                <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FiFileText className="text-brand-600" /> Question Paper
                                </h3>
                                <button onClick={() => setShowPdf(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-red-500 hover:rotate-90 transition-all flex items-center justify-center" aria-label="Close question paper">
                                    <FiX className="text-lg" />
                                </button>
                            </div>
                            <div className="flex-1 bg-gray-100 dark:bg-ink-950 p-2 overflow-hidden">
                                <iframe src={resolveFileUrl(activeTest.questionPaperUrl)} className="w-full h-full rounded-xl border-0" title="Question Paper" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit confirmation */}
                {confirmSubmit && (
                    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                        <div className="ui-card p-7 max-w-sm w-full text-center animate-scale-in" role="dialog" aria-modal="true" aria-label="Submit test?">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-gradient text-white flex items-center justify-center text-2xl mb-4 shadow-brand-glow"><FiSend /></div>
                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Submit test?</h3>
                            <div className="grid grid-cols-3 gap-2 my-4 text-center">
                                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 py-2"><p className="text-lg font-extrabold text-emerald-600">{answeredCount}</p><p className="text-[10px] font-bold uppercase text-gray-500">Answered</p></div>
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 py-2"><p className="text-lg font-extrabold text-amber-600">{markedCount}</p><p className="text-[10px] font-bold uppercase text-gray-500">Marked</p></div>
                                <div className="rounded-xl bg-gray-50 dark:bg-white/5 py-2"><p className="text-lg font-extrabold text-gray-700 dark:text-gray-200">{questions.length - answeredCount}</p><p className="text-[10px] font-bold uppercase text-gray-500">Left</p></div>
                            </div>
                            <p className="text-sm text-gray-500 mb-6">
                                {answeredCount < questions.length ? 'Unanswered questions will get 0 marks.' : 'All questions answered — nice!'}
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmSubmit(false)} className="ui-btn-secondary flex-1">Keep going</button>
                                <button onClick={handleSubmitTest} disabled={submitting} className="ui-btn-primary flex-1">
                                    {submitting ? 'Submitting…' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sticky exam bar */}
                <header className="sticky top-0 z-10 ui-glass border-b border-gray-100 dark:border-white/10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                    <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
                        <div className="w-9 h-9 shrink-0 rounded-xl bg-brand-gradient text-white flex items-center justify-center"><FiEdit3 /></div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm md:text-base font-extrabold text-gray-900 dark:text-white truncate">{activeTest.title}</h3>
                            <p className="text-[11px] font-semibold text-gray-400">Q {currentQuestionIndex + 1} of {questions.length} · {answeredCount} answered</p>
                        </div>
                        {hasPdf && (
                            <button onClick={() => setShowPdf(true)} className="ui-btn-secondary !px-3 !py-2 text-xs">
                                <FiFileText /> <span className="hidden sm:inline">View paper</span>
                            </button>
                        )}
                        <div
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl font-extrabold tabular-nums transition-colors ${lowTime ? 'bg-red-600 text-white animate-pulse shadow-[0_0_0_4px_rgba(220,38,38,0.2)]' : 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'}`}
                            role="timer"
                            aria-live={lowTime ? 'polite' : 'off'}
                            aria-label={`Time left ${formatTime(timeLeft)}`}
                        >
                            <FiClock />
                            <span className="text-base md:text-lg">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                    <div className="h-1 bg-gray-100 dark:bg-white/5">
                        <div className="h-full bg-brand-gradient transition-all duration-500" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
                    </div>
                </header>

                {sections.length > 0 && (
                    <div className="max-w-6xl mx-auto px-4 md:px-6 pt-5">
                        <div className="flex gap-2 overflow-x-auto ui-scrollbar pb-1" role="tablist" aria-label={tr('student.test.sections')}>
                            {sections.map((sec, si) => {
                                const done = sec.indexes.filter(i => hasAnswer(answers.find(a => a.questionId === questions[i]._id))).length;
                                const on = si === curSec;
                                return (
                                    <button
                                        key={sec.name + si}
                                        role="tab"
                                        aria-selected={on}
                                        onClick={() => goTo(sec.indexes[0])}
                                        className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-extrabold transition-all active:scale-95 ${on ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-brand-200'}`}
                                    >
                                        <FiLayers /> {sec.name}
                                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${on ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10'}`}>{done}/{sec.indexes.length}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 pb-16">
                    <div key={currentQuestionIndex} className="ui-card p-6 md:p-10 min-h-[420px] flex flex-col animate-fade-in">
                        <div className="flex flex-wrap items-center gap-2 mb-5">
                            <span className="text-xs font-extrabold text-gray-400">Question {currentQuestionIndex + 1}</span>
                            <span className={`ui-badge ${isNumerical(currentQuestion) ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'}`}>
                                {isNumerical(currentQuestion) ? 'Numerical' : 'MCQ'}
                            </span>
                            <span className="ui-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">+{currentQuestion.marks || 1}</span>
                            {qNeg > 0 && <span className="ui-badge bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">−{qNeg}</span>}
                            {curSec >= 0 && <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">{sections[curSec].name}</span>}
                            {isMarked && <span className="ui-badge bg-amber-100 text-amber-700"><FiFlag /> Marked</span>}
                        </div>
                        <h4 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white mb-8 leading-relaxed whitespace-pre-wrap">
                            {hasPdf && (currentQuestion.questionText || '').startsWith('Question ')
                                ? `Refer to Question ${currentQuestionIndex + 1} in the Question Paper`
                                : currentQuestion.questionText}
                        </h4>

                        {isNumerical(currentQuestion) ? (
                            <div className="mb-auto max-w-sm">
                                <label htmlFor={`num-${currentQuestion._id}`} className="block text-xs font-bold text-gray-500 mb-2">Your answer</label>
                                <input
                                    id={`num-${currentQuestion._id}`}
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    value={currentAnswer?.raw ?? (currentAnswer?.numericalAnswer ?? '')}
                                    onChange={(e) => handleNumericalChange(currentQuestion._id, e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    placeholder="Enter a number"
                                    className="ui-input !text-2xl !font-extrabold !py-4 tabular-nums dark:text-white"
                                />
                                <p className="text-xs text-gray-400 mt-2">Decimals allowed. Answers within ±0.01 are accepted.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-auto">
                                {(currentQuestion.options || []).map((option, idx) => {
                                    const optionLetter = String.fromCharCode(65 + idx);
                                    const isDuplicate = option === optionLetter;
                                    const selected = selectedOption === idx;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionSelect(currentQuestion._id, idx)}
                                            aria-pressed={selected}
                                            className={`group flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${selected
                                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 shadow-brand-soft'
                                                : 'border-gray-100 dark:border-white/10 hover:border-brand-200 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                        >
                                            <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-extrabold transition-all ${selected ? 'bg-brand-gradient text-white scale-110' : 'bg-gray-100 dark:bg-white/10 text-gray-500 group-hover:bg-white'}`}>
                                                {selected ? <FiCheck /> : optionLetter}
                                            </span>
                                            <span className={`font-semibold ${selected ? 'text-brand-900 dark:text-brand-200' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {isDuplicate ? `Option ${optionLetter}` : option}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-8">
                            <button onClick={() => toggleMarked(currentQuestion._id)} className={`ui-btn-secondary !py-2 text-xs ${isMarked ? '!border-amber-300 !text-amber-700 !bg-amber-50' : ''}`}>
                                <FiFlag /> {isMarked ? 'Unmark review' : 'Mark for review'}
                            </button>
                            {hasAnswer(currentAnswer) && (
                                <button onClick={() => clearAnswer(currentQuestion._id)} className="ui-btn-secondary !py-2 text-xs hover:!text-red-600 hover:!border-red-200">
                                    <FiRotateCcw /> Clear response
                                </button>
                            )}
                        </div>

                        <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-white/10 gap-3">
                            <button
                                disabled={currentQuestionIndex === 0}
                                onClick={() => goTo(currentQuestionIndex - 1)}
                                className="ui-btn-secondary disabled:opacity-40"
                            >
                                <FiChevronLeft /> Previous
                            </button>

                            {currentQuestionIndex === questions.length - 1 ? (
                                <button onClick={() => setConfirmSubmit(true)} disabled={submitting} className="ui-btn-primary">
                                    {submitting ? 'Submitting…' : 'Finish test'} <FiSend />
                                </button>
                            ) : (
                                <button onClick={() => goTo(currentQuestionIndex + 1)} className="ui-btn-dark">
                                    {hasAnswer(currentAnswer) ? 'Save & next' : 'Next'} <FiChevronRight />
                                </button>
                            )}
                        </div>
                    </div>

                    <aside className="lg:sticky lg:top-24 self-start">{palette}</aside>
                </div>
            </div>
        );
    }

    // ---------- TEST LIST ----------
    const attemptedCount = tests.filter(t => t.attempted).length;
    const openCount = tests.filter(t => !t.attempted && testWindowState(t) === 'open').length;
    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiEdit3}
                title="Online Tests"
                subtitle="Test your knowledge with these challenges"
                action={tests.length > 0 && (
                    <div className="flex gap-2">
                        <span className="ui-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 !py-2 !px-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{openCount} open</span>
                        <span className="ui-badge bg-ink-900 text-white dark:bg-white dark:text-ink-900 !py-2 !px-3">{attemptedCount} attempted</span>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 ui-stagger">
                {error && tests.length === 0 ? (
                    <ErrorState message={error} onRetry={() => { setLoading(true); fetchTests(); }} />
                ) : tests.length > 0 ? tests.map(test => {
                    const windowState = testWindowState(test);
                    const numCount = (test.questions || []).filter(isNumerical).length;
                    const mcqCount = (test.questions?.length || 0) - numCount;
                    const neg = Number(test.negativeMarks) || 0;
                    const status = test.attempted
                        ? { text: 'Attempted', cls: 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' }
                        : windowState === 'open'
                            ? { text: 'Available', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', dot: true }
                            : windowState === 'upcoming'
                                ? { text: 'Upcoming', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' }
                                : { text: 'Closed', cls: 'bg-gray-100 text-gray-500 dark:bg-white/5' };
                    return (
                        <div key={test._id} className="ui-card ui-card-hover group relative overflow-hidden p-6 flex flex-col">
                            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-brand-500/5 group-hover:bg-brand-500/10 group-hover:scale-125 transition-all duration-500" />
                            <div className="relative flex justify-between items-start mb-4 gap-2">
                                <span className={`ui-badge ${status.cls}`}>{status.dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}{status.text}</span>
                                {test.isMock ? (
                                    <span className="ui-badge bg-ink-900 text-white dark:bg-white dark:text-ink-900"><FiLayers /> {test.pattern === 'jee_main' ? 'JEE Main mock' : tr('student.test.mock')}</span>
                                ) : test.subjectId?.name && <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 truncate">{test.subjectId.name}</span>}
                            </div>

                            <h3 className="relative text-lg font-extrabold text-gray-900 dark:text-white mb-1 leading-snug group-hover:text-brand-600 transition-colors line-clamp-2">{test.title}</h3>
                            <p className="relative text-sm text-gray-500 dark:text-gray-400">
                                {mcqCount} MCQs{numCount > 0 ? ` · ${numCount} Numerical` : ''} · {test.totalMarks} marks
                            </p>
                            <p className={`relative text-xs font-semibold mt-1 mb-5 ${neg > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                                {neg > 0 ? `−${neg} per wrong answer` : 'No negative marking'}
                            </p>

                            <div className="relative mt-auto grid grid-cols-2 mb-5 rounded-2xl bg-gray-50 dark:bg-white/5 divide-x divide-gray-200 dark:divide-white/10">
                                <div className="py-3 text-center">
                                    <p className="text-xl font-extrabold text-gray-900 dark:text-white">{test.duration}</p>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Minutes</p>
                                </div>
                                <div className="py-3 text-center">
                                    {test.attempted ? (
                                        <>
                                            <p className="text-xl font-extrabold text-brand-600">{test.score}</p>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Score</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xl font-extrabold text-gray-900 dark:text-white">{test.questions?.length || 0}</p>
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Questions</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {test.attempted ? (
                                <button
                                    onClick={() => handleViewResult(test)}
                                    disabled={loadingResultId === test._id}
                                    className="relative ui-btn-secondary w-full !py-3 !text-emerald-700 !border-emerald-200 hover:!bg-emerald-50 dark:!text-emerald-300 dark:!border-emerald-500/30 disabled:opacity-60"
                                >
                                    <FiAward /> {loadingResultId === test._id ? 'Loading…' : 'View result & rank'}
                                </button>
                            ) : windowState !== 'open' ? (
                                <div className="relative w-full text-center text-gray-400 font-semibold text-sm bg-gray-50 dark:bg-white/5 py-3 rounded-xl flex items-center justify-center gap-2">
                                    <FiLock />
                                    {windowState === 'upcoming'
                                        ? `Opens ${new Date(test.startTime).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                        : 'Test window closed'}
                                </div>
                            ) : (
                                <button onClick={() => setBriefingTest(test)} className="relative ui-btn-primary w-full !py-3">
                                    <FiPlay /> Attempt test now
                                </button>
                            )}
                        </div>
                    );
                }) : (
                    <EmptyState
                        icon={<FiEdit3 />}
                        title="No tests right now"
                        message="There are no active tests for your batch at this time."
                    />
                )}
            </div>
        </div>
    );
};

export default StudentTest;
