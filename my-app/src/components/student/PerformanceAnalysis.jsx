import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FiTrendingUp, FiTarget, FiAward, FiCheckSquare } from 'react-icons/fi';
import config from '../../config';
import { authHeaders, errorMessage } from './helpers';
import { EmptyState, ErrorState } from './StudentUI';
import { AnimatedNumber } from '../ui/Motion';
import { AnimatedBar, CardHeader } from './Widgets';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const pct = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : 0);

const barClass = (p) => (p >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : p >= 50 ? 'bg-brand-gradient' : 'bg-gradient-to-r from-rose-400 to-rose-600');

const areaFill = (context) => {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return 'rgba(243,112,33,0.15)';
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, 'rgba(243,112,33,0.38)');
    g.addColorStop(1, 'rgba(243,112,33,0)');
    return g;
};

// `onData` (optional) receives the loaded analysis so the dashboard can derive badges without refetching
const PerformanceAnalysis = ({ studentId, onData }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const onDataRef = useRef(onData);
    useEffect(() => { onDataRef.current = onData; }, [onData]);

    const fetchAnalysis = useCallback(async () => {
        if (!studentId) { setLoading(false); return; }
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${config.API_URL}/tests/student/${studentId}/analysis`, { headers: authHeaders() });
            setData(res.data);
            onDataRef.current?.(res.data);
        } catch (err) {
            console.error('Error fetching performance analysis:', err);
            setError(errorMessage(err, 'Could not load performance analysis'));
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

    const overall = data?.overall || {};
    const bySubject = Array.isArray(data?.bySubject) ? data.bySubject : [];
    const trend = Array.isArray(data?.trend) ? data.trend : [];
    const weakest = bySubject.length > 1
        ? bySubject.reduce((min, s) => (pct(s.avgPercentage) < pct(min.avgPercentage) ? s : min), bySubject[0])
        : null;

    return (
        <div className="ui-card p-6">
            <CardHeader icon={FiTrendingUp} title="Online Test Performance" subtitle="Subject strengths and your score trend" />

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => <div key={i} className="ui-skeleton h-8"></div>)}
                    </div>
                    <div className="ui-skeleton h-56"></div>
                </div>
            ) : error ? (
                <ErrorState message={error} onRetry={fetchAnalysis} />
            ) : !overall.testsTaken ? (
                <EmptyState compact icon={<FiTrendingUp />} title="No test data yet" message="Attempt online tests to unlock your subject-wise analysis." />
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-3 mb-6 ui-stagger">
                        {[
                            { icon: FiCheckSquare, label: 'Tests taken', value: overall.testsTaken, cls: 'bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white', ic: 'text-gray-400' },
                            { icon: FiTrendingUp, label: 'Average', value: pct(overall.avgPercentage), suffix: '%', cls: 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400', ic: 'text-brand-400' },
                            { icon: FiAward, label: 'Best', value: pct(overall.bestPercentage), suffix: '%', cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', ic: 'text-emerald-400' },
                        ].map(s => (
                            <div key={s.label} className={`rounded-2xl p-4 ${s.cls}`}>
                                <s.icon className={`mb-2 ${s.ic}`} />
                                <p className="text-2xl font-extrabold"><AnimatedNumber value={s.value} suffix={s.suffix} /></p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        <div className="lg:col-span-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Subject-wise average</h3>
                            {weakest && (
                                <div className="flex items-center gap-3 bg-ink-900 text-white rounded-2xl px-4 py-3 mb-5">
                                    <span className="w-8 h-8 shrink-0 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center"><FiTarget /></span>
                                    <p className="text-sm font-medium">Focus on <span className="font-bold text-brand-400">{weakest.subjectName}</span> — your lowest average at {pct(weakest.avgPercentage)}%.</p>
                                </div>
                            )}
                            <div className="space-y-4">
                                {bySubject.map(s => {
                                    const p = Math.min(100, Math.max(0, pct(s.avgPercentage)));
                                    return (
                                        <div key={s.subjectId || s.subjectName}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{s.subjectName || 'Subject'} <span className="text-gray-400 font-medium text-xs">· {s.testsTaken} test{s.testsTaken === 1 ? '' : 's'}</span></span>
                                                <span className="font-bold text-gray-900 dark:text-white">{p}%</span>
                                            </div>
                                            <AnimatedBar value={p} barClass={barClass(p)} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lg:col-span-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Score trend</h3>
                            {trend.length > 0 ? (
                                <div className="h-64">
                                    <Line
                                        data={{
                                            labels: trend.map(t => (t.date ? new Date(t.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : t.testTitle)),
                                            datasets: [{
                                                label: 'Score %',
                                                data: trend.map(t => pct(t.percentage)),
                                                borderColor: '#f37021',
                                                borderWidth: 3,
                                                backgroundColor: areaFill,
                                                pointBackgroundColor: '#fff',
                                                pointBorderColor: '#f37021',
                                                pointBorderWidth: 2.5,
                                                pointRadius: 4.5,
                                                pointHoverRadius: 7,
                                                pointHoverBackgroundColor: '#f37021',
                                                tension: 0.4,
                                                fill: true,
                                            }]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            animation: { duration: 1200, easing: 'easeOutQuart' },
                                            interaction: { mode: 'index', intersect: false },
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    backgroundColor: '#111114',
                                                    padding: 10,
                                                    cornerRadius: 10,
                                                    displayColors: false,
                                                    callbacks: {
                                                        title: (items) => trend[items[0].dataIndex]?.testTitle || '',
                                                        label: (item) => `${item.parsed.y}%`,
                                                    }
                                                }
                                            },
                                            scales: {
                                                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(148,163,184,0.15)' }, border: { display: false }, ticks: { color: '#9ca3af', callback: (v) => `${v}%` } },
                                                x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af' } },
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">Not enough tests to show a trend.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PerformanceAnalysis;
