import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    FiCheckCircle, FiTrendingUp, FiCreditCard, FiClock, FiArrowRight, FiCalendar, FiSun, FiAlertCircle
} from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import { ProgressRing, Chip, AnimatedBar, Panel, EmptyState, SkeletonBlock } from './ParentUI';
import { verdictFor, formatINR, daysUntil } from './parentUtils';
import { AnimatedNumber } from '../ui/Motion';

const VERDICT_TEXT = {
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-rose-600 dark:text-rose-400',
    gray: 'text-gray-400',
};

// ---------- Child health check ----------
export const HealthRing = ({ icon: Icon, label, value, verdict, detail, loading, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="ui-card ui-card-hover group text-left p-5 flex items-center gap-4 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
        {loading ? (
            <SkeletonBlock className="w-[88px] h-[88px] rounded-full" />
        ) : (
            <ProgressRing value={value ?? 0} size={88} stroke={8} color={verdict.color}>
                <span className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {value === null ? '—' : <AnimatedNumber value={value} suffix="%" />}
                </span>
            </ProgressRing>
        )}
        <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {Icon && <Icon className="text-brand-500" />} {label}
            </p>
            {loading ? (
                <SkeletonBlock className="h-5 w-24 mt-2" />
            ) : (
                <p className={`mt-1 text-lg font-extrabold tracking-tight ${VERDICT_TEXT[verdict.tone]}`}>{verdict.label}</p>
            )}
            {detail && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{detail}</p>}
        </div>
        <FiArrowRight className="text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
);

export const HealthCheckRow = ({ attendancePct, testPct, feePct, feeVerdict, attendanceDetail, testDetail, feeDetail, loading, onNavigate }) => (
    <section aria-label="Child health check">
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Health check</h2>
            <span className="text-[11px] text-gray-400 font-medium">Tap a card for details</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 ui-stagger">
            <HealthRing icon={FiCheckCircle} label="Attendance" value={attendancePct} verdict={verdictFor(attendancePct, { good: 85, ok: 75 })} detail={attendanceDetail} loading={loading.attendance} onClick={() => onNavigate('Attendance')} />
            <HealthRing icon={FiTrendingUp} label="Avg test score" value={testPct} verdict={verdictFor(testPct, { good: 75, ok: 50 })} detail={testDetail} loading={loading.marks && loading.analysis} onClick={() => onNavigate('Tests')} />
            <HealthRing icon={FiCreditCard} label="Fees paid" value={feePct} verdict={feeVerdict} detail={feeDetail} loading={loading.fees} onClick={() => onNavigate('Fees')} />
        </div>
    </section>
);

// ---------- 30-day attendance heat strip ----------
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const CELL_STYLE = {
    present: 'bg-emerald-500 ring-emerald-500/30',
    partial: 'bg-amber-400 ring-amber-400/30',
    absent: 'bg-rose-500 ring-rose-500/30',
    none: 'bg-gray-100 dark:bg-white/5 ring-transparent',
};

export const AttendanceHeatStrip = ({ attendance, loading, onOpen }) => {
    const days = useMemo(() => {
        const byDay = {};
        attendance.forEach(a => {
            if (!a.date) return;
            const k = dayKey(new Date(a.date));
            byDay[k] = byDay[k] || { p: 0, a: 0 };
            if (a.status === 'present') byDay[k].p += 1; else if (a.status === 'absent') byDay[k].a += 1;
        });
        const out = [];
        for (let i = 29; i >= 0; i -= 1) {
            const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
            const rec = byDay[dayKey(d)];
            let status = 'none';
            if (rec) status = rec.a === 0 && rec.p > 0 ? 'present' : rec.p === 0 && rec.a > 0 ? 'absent' : (rec.p || rec.a) ? 'partial' : 'none';
            out.push({ date: d, status, rec });
        }
        return out;
    }, [attendance]);

    const counts = days.reduce((acc, d) => ({ ...acc, [d.status]: (acc[d.status] || 0) + 1 }), {});

    return (
        <Panel
            title="Last 30 days"
            subtitle="Each square is one day"
            icon={FiCalendar}
            action={<button onClick={onOpen} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1">Calendar <FiArrowRight /></button>}
        >
            {loading ? (
                <SkeletonBlock className="h-20" />
            ) : (
                <>
                    <div className="grid grid-cols-10 sm:grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5 sm:gap-2">
                        {days.map((d, i) => {
                            const label = `${d.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}: ${d.status === 'none' ? 'No class recorded' : d.status === 'partial' ? `Partly present (${d.rec.p}/${d.rec.p + d.rec.a})` : d.status === 'present' ? 'Present' : 'Absent'}`;
                            const isToday = i === days.length - 1;
                            return (
                                <div
                                    key={i}
                                    title={label}
                                    aria-label={label}
                                    className={`aspect-square rounded-md ring-2 ring-offset-0 transition-transform duration-200 hover:scale-125 hover:z-10 ${CELL_STYLE[d.status]} ${isToday ? 'outline outline-2 outline-offset-2 outline-brand-400' : ''}`}
                                    style={{ animation: `ui-fade-up 0.5s ${i * 15}ms both` }}
                                />
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Present {counts.present || 0}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Partial {counts.partial || 0}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Absent {counts.absent || 0}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-white/10" /> No class</span>
                    </div>
                </>
            )}
        </Panel>
    );
};

// ---------- Performance trend (orange gradient line) ----------
export const PerformanceTrendChart = ({ labels, values, loading, emptyHint, height = 'h-64' }) => {
    const { theme } = useTheme() || {};
    const dark = theme === 'dark';

    const data = {
        labels,
        datasets: [{
            label: 'Marks %',
            data: values,
            fill: true,
            borderColor: '#f37021',
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#f37021',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            backgroundColor: (ctx) => {
                const { chart } = ctx;
                const { ctx: c, chartArea } = chart;
                if (!chartArea) return 'rgba(243,112,33,0.15)';
                const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                g.addColorStop(0, 'rgba(243,112,33,0.35)');
                g.addColorStop(1, 'rgba(243,112,33,0)');
                return g;
            },
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#111114', padding: 10, cornerRadius: 10, displayColors: false, titleFont: { weight: '700' } },
        },
        scales: {
            y: { beginAtZero: true, border: { display: false }, grid: { color: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', maxRotation: 0, autoSkip: true } },
        },
    };

    if (loading) return <SkeletonBlock className={`${height} w-full`} />;
    if (!values.length) return <EmptyState icon={FiTrendingUp} title="No marks published yet" hint={emptyHint} className={`${height} flex flex-col items-center justify-center`} />;
    return <div className={height}><Line data={data} options={options} /></div>;
};

// ---------- Fee snapshot ----------
const dueChipFor = (pending, dueDate) => {
    if (!(pending > 0)) return { tone: 'green', text: 'All fees cleared', icon: FiCheckCircle };
    const d = daysUntil(dueDate);
    if (d === null) return { tone: 'amber', text: 'Payment due', icon: FiClock };
    if (d < 0) return { tone: 'red', text: `Overdue by ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'}`, icon: FiAlertCircle };
    if (d === 0) return { tone: 'red', text: 'Due today', icon: FiAlertCircle };
    return { tone: d <= 7 ? 'amber' : 'gray', text: `Due in ${d} day${d === 1 ? '' : 's'}`, icon: FiClock };
};

export const DueChip = ({ pending, dueDate, className = '' }) => {
    const chip = dueChipFor(pending, dueDate);
    return <Chip tone={chip.tone} icon={chip.icon} className={className}>{chip.text}</Chip>;
};

export const FeeSnapshotCard = ({ fees, pendingApprovalTotal, loading, onPay, onHistory, canPay }) => {
    const total = Number(fees.totalFees || 0);
    const paid = Number(fees.paidFees || 0);
    const pending = Number(fees.pendingFees || 0);
    const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

    return (
        <Panel title="Fees" subtitle="This academic session" icon={FiCreditCard} className="h-full flex flex-col" bodyClassName="flex-1 flex flex-col">
            {loading ? (
                <div className="space-y-3"><SkeletonBlock className="h-10 w-2/3" /><SkeletonBlock className="h-3" /><SkeletonBlock className="h-12" /></div>
            ) : (
                <>
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Outstanding</p>
                            <p className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                                <AnimatedNumber value={pending} prefix="₹" />
                            </p>
                        </div>
                        <DueChip pending={pending} dueDate={fees.dueDate} />
                    </div>
                    <div className="mt-5">
                        <AnimatedBar value={pct} className="h-3" barClassName={pct >= 100 ? 'bg-emerald-500' : 'bg-brand-gradient'} />
                        <div className="mt-2 flex justify-between text-xs font-semibold">
                            <span className="text-emerald-600 dark:text-emerald-400">Paid {formatINR(paid)}</span>
                            <span className="text-gray-400">of {formatINR(total)}</span>
                        </div>
                    </div>
                    {pendingApprovalTotal > 0 && (
                        <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2">
                            <FiClock className="shrink-0" /> {formatINR(pendingApprovalTotal)} awaiting office approval
                        </p>
                    )}
                    <div className="mt-auto pt-5 grid grid-cols-2 gap-2">
                        <button onClick={onPay} disabled={!canPay} className="ui-btn-primary">
                            <FiCreditCard /> Pay now
                        </button>
                        <button onClick={onHistory} className="ui-btn-secondary">History</button>
                    </div>
                </>
            )}
        </Panel>
    );
};

// ---------- Tip of the day (static) ----------
const TIPS = [
    'Ask your child to teach you one concept they learned today — explaining it is the best revision.',
    'A fixed 20-minute daily revision slot beats a long weekend cram session.',
    'Celebrate effort, not only marks. Consistency is what moves JEE ranks.',
    'Regular sleep (7–8 hours) measurably improves problem-solving speed.',
    'Review the mistakes from the last test together — they show exactly what to practise next.',
    'Short breaks every 45–50 minutes keep focus sharp during long study sessions.',
    'Keep phones out of the study room — even a silent phone nearby reduces concentration.',
];

export const TipCard = () => {
    const [tip] = useState(() => TIPS[Math.floor(Date.now() / 86400000) % TIPS.length]);
    return (
        <div className="relative overflow-hidden rounded-3xl p-5 md:p-6 bg-brand-dark text-white">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-500/25 blur-2xl" />
            <p className="relative flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300">
                <FiSun /> Parent tip of the day
            </p>
            <p className="relative mt-3 text-sm md:text-base leading-relaxed text-white/90 font-medium">{tip}</p>
        </div>
    );
};

// ---------- Notice card with date chip ----------
export const NoticeCard = ({ notice, onClick, compact = false }) => {
    const d = notice.createdAt ? new Date(notice.createdAt) : new Date();
    const fresh = daysUntil(d) !== null && daysUntil(d) >= -3;
    return (
        <button
            type="button"
            onClick={onClick}
            className="group w-full text-left flex items-start gap-4 p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-brand-200 dark:hover:border-brand-500/30 hover:shadow-card hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
            <div className="w-14 shrink-0 rounded-xl overflow-hidden text-center ring-1 ring-gray-100 dark:ring-white/10">
                <p className="bg-brand-gradient text-white text-[10px] font-bold uppercase py-0.5 tracking-wider">{d.toLocaleString('en-IN', { month: 'short' })}</p>
                <p className="text-xl font-extrabold text-gray-900 dark:text-white py-1 leading-none">{d.getDate()}</p>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm md:text-base truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{notice.title}</h4>
                    {fresh && <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 shrink-0">New</span>}
                </div>
                <p className={`text-xs md:text-sm text-gray-500 dark:text-gray-400 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>{notice.message || notice.content}</p>
                {!compact && notice.targetRoles?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {notice.targetRoles.map(r => <span key={r} className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300 normal-case">{r}</span>)}
                    </div>
                )}
            </div>
            <FiArrowRight className="text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
        </button>
    );
};
