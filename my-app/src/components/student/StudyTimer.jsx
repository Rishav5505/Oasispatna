import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiClock, FiPlay, FiPause, FiSquare, FiRotateCcw, FiCoffee, FiZap, FiBarChart2 } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { toast } from '../../utils/notify';
import { errorMessage } from './helpers';
import { EmptyState, ErrorState, PageHeader } from './StudentUI';
import { AnimatedBar } from './Widgets';
import { StatCard } from '../ui/Motion';
import { Segmented } from './PracticeUI';
import { api } from './practiceApi';
import { useI18n } from '../../i18n/useI18n';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const FOCUS = 25 * 60;
const BREAK = 5 * 60;
const MAX_MIN = 180;

const fmt = (sec) => {
    const s = Math.max(0, Math.round(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
};

const RingTimer = ({ progress, label, sub, running, phase }) => {
    const size = 260;
    const stroke = 14;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = Math.min(1, Math.max(0, progress));
    return (
        <div className={`relative mx-auto w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] ${running ? 'animate-glow rounded-full' : ''}`}>
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90" aria-hidden="true">
                <defs>
                    <linearGradient id="study-ring" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={phase === 'break' ? '#6ee7b7' : '#fbad78'} />
                        <stop offset="100%" stopColor={phase === 'break' ? '#059669' : '#f37021'} />
                    </linearGradient>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-white/10" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="url(#study-ring)"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c - p * c}
                    style={{ transition: 'stroke-dashoffset 0.4s linear' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center" role="timer" aria-label={label}>
                <span className="text-5xl sm:text-6xl font-extrabold tabular-nums tracking-tight text-gray-900 dark:text-white">{label}</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">{sub}</span>
            </div>
        </div>
    );
};

const WeeklyChart = ({ daily, t }) => {
    const labels = daily.map(d => new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }));
    const data = {
        labels,
        datasets: [{
            label: t('student.timer.minutes'),
            data: daily.map(d => d.minutes),
            backgroundColor: (ctx) => {
                const { chart } = ctx;
                const { ctx: c, chartArea } = chart;
                if (!chartArea) return '#f37021';
                const g = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                g.addColorStop(0, '#fbad78');
                g.addColorStop(1, '#f37021');
                return g;
            },
            borderRadius: 4,
            borderSkipped: 'bottom',
            maxBarThickness: 28,
        }],
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#111114', padding: 10, displayColors: false, callbacks: { label: (ctx) => `${ctx.parsed.y} ${t('student.timer.min')}` } },
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { weight: 600 } } },
            y: { beginAtZero: true, grid: { color: 'rgba(156,163,175,0.15)' }, border: { display: false }, ticks: { color: '#9ca3af', precision: 0 } },
        },
    };
    return <div className="h-56"><Bar data={data} options={options} /></div>;
};

const StudyTimer = ({ onXpChange }) => {
    const { t } = useI18n();
    const [mode, setMode] = useState('pomodoro');
    const [phase, setPhase] = useState('focus');
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0); // seconds in current phase
    const [subjectId, setSubjectId] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [summary, setSummary] = useState(null);
    const [summaryError, setSummaryError] = useState('');
    const [logging, setLogging] = useState(false);
    const [rounds, setRounds] = useState(0);
    const startRef = useRef(null); // timestamp when last resumed
    const baseRef = useRef(0); // seconds accumulated before last resume

    useEffect(() => {
        api.get('/public/subjects').then(d => setSubjects(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    const loadSummary = useCallback(async () => {
        setSummaryError('');
        try {
            setSummary(await api.get('/practice/study/summary', { days: 7 }));
        } catch (err) {
            setSummaryError(errorMessage(err, t('student.timer.summaryError')));
        }
    }, [t]);
    useEffect(() => { loadSummary(); }, [loadSummary]);

    const resetClock = () => {
        setRunning(false);
        startRef.current = null;
        baseRef.current = 0;
        setElapsed(0);
    };

    const logSession = useCallback(async (minutes, sessionMode) => {
        const mins = Math.min(MAX_MIN, Math.floor(minutes));
        if (mins < 1) { toast(t('student.timer.tooShort'), { icon: '⏱️' }); return; }
        setLogging(true);
        try {
            const res = await api.post('/practice/study/sessions', { minutes: mins, mode: sessionMode, ...(subjectId ? { subjectId } : {}) });
            toast.success(res.xpEarned > 0 ? t('student.timer.loggedXp', { min: mins, xp: res.xpEarned }) : t('student.timer.logged', { min: mins }), { icon: '⚡' });
            onXpChange?.();
            loadSummary();
        } catch (err) {
            toast.error(errorMessage(err, t('student.timer.logError')));
        } finally {
            setLogging(false);
        }
    }, [subjectId, t, onXpChange, loadSummary]);

    const target = mode === 'pomodoro' ? (phase === 'focus' ? FOCUS : BREAK) : MAX_MIN * 60;

    // Handle reaching the end of a phase
    const finishPhase = useCallback(() => {
        resetClock();
        if (mode === 'free') {
            logSession(MAX_MIN, 'free');
            return;
        }
        if (phase === 'focus') {
            logSession(FOCUS / 60, 'pomodoro');
            setRounds(r => r + 1);
            setPhase('break');
            toast(t('student.timer.breakTime'), { icon: '☕' });
        } else {
            setPhase('focus');
            toast(t('student.timer.backToFocus'), { icon: '🎯' });
        }
    }, [mode, phase, logSession, t]);

    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => {
            const secs = baseRef.current + (Date.now() - startRef.current) / 1000;
            if (secs >= target) {
                clearInterval(id);
                finishPhase();
            } else {
                setElapsed(secs);
            }
        }, 250);
        return () => clearInterval(id);
    }, [running, target, finishPhase]);

    const start = () => { startRef.current = Date.now(); setRunning(true); };
    const pause = () => {
        baseRef.current += (Date.now() - startRef.current) / 1000;
        startRef.current = null;
        setRunning(false);
        setElapsed(baseRef.current);
    };
    const stopAndLog = () => {
        const secs = running ? baseRef.current + (Date.now() - startRef.current) / 1000 : baseRef.current;
        resetClock();
        if (phase === 'focus' || mode === 'free') logSession(secs / 60, mode);
        if (mode === 'pomodoro' && phase === 'break') setPhase('focus');
    };
    const switchMode = (m) => {
        if (running || elapsed > 0) { toast(t('student.timer.stopFirst'), { icon: '⏸️' }); return; }
        setMode(m);
        setPhase('focus');
    };

    const remaining = mode === 'pomodoro' ? target - elapsed : elapsed;
    const progress = mode === 'pomodoro' ? elapsed / target : (elapsed % 3600) / 3600;
    const sub = mode === 'pomodoro' ? (phase === 'focus' ? t('student.timer.focus') : t('student.timer.break')) : t('student.timer.freeMode');
    const maxDaily = summary ? Math.max(1, ...summary.daily.map(d => d.minutes)) : 1;
    const weekTotal = summary?.weekMinutes || 0;

    return (
        <div className="space-y-6">
            <PageHeader icon={FiClock} title={t('student.nav.timer')} subtitle={t('student.timer.subtitle')} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="ui-card p-6 md:p-8 lg:col-span-3 flex flex-col items-center gap-6">
                    <Segmented
                        value={mode}
                        onChange={switchMode}
                        options={[
                            { value: 'pomodoro', label: t('student.timer.pomodoro') },
                            { value: 'free', label: t('student.timer.free') },
                        ]}
                    />
                    <RingTimer progress={progress} label={fmt(remaining)} sub={sub} running={running} phase={phase} />
                    {mode === 'pomodoro' && (
                        <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                            {phase === 'break' ? <FiCoffee /> : <FiZap />} {t('student.timer.rounds', { count: rounds })}
                        </p>
                    )}
                    <label className="w-full max-w-xs">
                        <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('student.common.subject')}</span>
                        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={running} className="ui-input dark:text-white disabled:opacity-60">
                            <option value="">{t('student.timer.general')}</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </label>
                    <div className="flex flex-wrap justify-center gap-3">
                        {running ? (
                            <button onClick={pause} className="ui-btn-dark !px-6 !py-3"><FiPause /> {t('student.timer.pause')}</button>
                        ) : (
                            <button onClick={start} disabled={logging} className="ui-btn-primary !px-6 !py-3"><FiPlay /> {elapsed > 0 ? t('student.timer.resume') : t('student.timer.start')}</button>
                        )}
                        {(running || elapsed > 0) && (
                            <>
                                <button onClick={stopAndLog} disabled={logging} className="ui-btn-secondary !py-3"><FiSquare /> {phase === 'break' && mode === 'pomodoro' ? t('student.timer.skipBreak') : t('student.timer.finish')}</button>
                                <button onClick={resetClock} className="ui-btn-secondary !py-3" aria-label={t('student.timer.reset')}><FiRotateCcw /></button>
                            </>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-400 text-center max-w-sm">{t('student.timer.note')}</p>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4 ui-stagger">
                        <StatCard icon={FiClock} label={t('student.timer.today')} value={summary?.todayMinutes || 0} suffix={` ${t('student.timer.min')}`} tone="brand" />
                        <StatCard icon={FiBarChart2} label={t('student.timer.thisWeek')} value={Math.round((weekTotal / 60) * 10) / 10} decimals={1} suffix=" h" tone="dark" />
                    </div>
                    <div className="ui-card p-5">
                        <h3 className="font-extrabold text-gray-900 dark:text-white mb-3">{t('student.timer.bySubject')}</h3>
                        {summaryError ? <ErrorState message={summaryError} onRetry={loadSummary} /> : !summary ? (
                            <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="ui-skeleton h-6" />)}</div>
                        ) : summary.bySubject.length === 0 ? (
                            <p className="text-sm text-gray-400">{t('student.timer.noSessions')}</p>
                        ) : (
                            <ul className="space-y-3">
                                {summary.bySubject.map(s => (
                                    <li key={s.subjectName}>
                                        <div className="flex justify-between text-sm font-semibold mb-1"><span className="text-gray-700 dark:text-gray-200 truncate">{s.subjectName}</span><span className="text-gray-500 tabular-nums">{s.minutes} {t('student.timer.min')}</span></div>
                                        <AnimatedBar value={(s.minutes / Math.max(1, summary.bySubject[0].minutes)) * 100} className="h-2" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <div className="ui-card p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-gray-900 dark:text-white">{t('student.timer.weekChart')}</h3>
                    {summary && <span className="text-xs font-semibold text-gray-400">{t('student.timer.best', { min: maxDaily })}</span>}
                </div>
                {summaryError ? null : !summary ? <div className="ui-skeleton h-56" /> : weekTotal === 0 && summary.daily.every(d => d.minutes === 0) ? (
                    <EmptyState compact icon={<FiClock />} title={t('student.timer.noSessions')} message={t('student.timer.noSessionsMsg')} />
                ) : (
                    <WeeklyChart daily={summary.daily} t={t} />
                )}
            </div>
        </div>
    );
};

export default StudyTimer;
