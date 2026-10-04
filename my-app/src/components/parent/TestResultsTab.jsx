import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { FaLaptopCode, FaMedal, FaExclamationTriangle, FaChartLine, FaTrophy } from 'react-icons/fa';
import config from '../../config';
import { authHeaders } from './parentUtils';
import { EmptyState, ListSkeleton, SkeletonBlock, Panel, AnimatedBar } from './ParentUI';
import { AnimatedNumber } from '../ui/Motion';

const MAX_LEADERBOARD_FETCHES = 15;

const norm = (s) => String(s || '').trim().toLowerCase();

// Find the child's row in a leaderboard and derive a percentile when the list is complete.
const findChildRank = (rows, childName) => {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const row = rows.find(r => r.isMe) || rows.find(r => norm(r.studentName) === norm(childName));
    if (!row) return null;
    // Contract returns top 20 (+ caller's row). Only when fewer than 20 entries is the list the whole class.
    const complete = rows.length < 20;
    const n = rows.length;
    const percentile = complete ? (n > 1 ? Math.round(((n - row.rank) / (n - 1)) * 100) : 100) : null;
    return { rank: row.rank, total: complete ? n : null, percentile, percentage: row.percentage };
};

const pctColor = (p) => (p >= 75 ? 'bg-emerald-500' : p >= 50 ? 'bg-brand-500' : p >= 35 ? 'bg-amber-500' : 'bg-rose-500');

const orangeGradient = (ctx) => {
    const { ctx: c, chartArea } = ctx.chart;
    if (!chartArea) return 'rgba(243,112,33,0.15)';
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, 'rgba(243,112,33,0.35)');
    g.addColorStop(1, 'rgba(243,112,33,0)');
    return g;
};

export const AnalysisSection = ({ analysis, loading }) => {
    const subjects = useMemo(() => (analysis?.bySubject || []).filter(s => s.testsTaken > 0), [analysis]);
    const weakest = useMemo(() => (subjects.length > 1
        ? subjects.reduce((min, s) => (s.avgPercentage < min.avgPercentage ? s : min), subjects[0])
        : null), [subjects]);
    const trend = analysis?.trend || [];

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonBlock className="h-72 rounded-3xl" />
                <SkeletonBlock className="h-72 rounded-3xl" />
            </div>
        );
    }

    if (!analysis || !analysis.overall || analysis.overall.testsTaken === 0) {
        return <EmptyState icon={FaChartLine} title="No performance analysis yet" hint="Analysis appears once your ward attempts an online test." />;
    }

    const trendData = {
        labels: trend.map(t => t.testTitle || new Date(t.date).toLocaleDateString()),
        datasets: [{
            label: 'Score %',
            data: trend.map(t => Math.round(t.percentage * 10) / 10),
            fill: true,
            borderColor: '#f37021',
            borderWidth: 3,
            backgroundColor: orangeGradient,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#f37021',
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.35
        }]
    };

    const stats = [
        { label: 'Tests taken', value: analysis.overall.testsTaken, suffix: '' },
        { label: 'Average', value: Math.round(analysis.overall.avgPercentage || 0), suffix: '%' },
        { label: 'Best', value: Math.round(analysis.overall.bestPercentage || 0), suffix: '%' },
    ];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 md:gap-4 ui-stagger">
                {stats.map((s, i) => {
                    const hero = i === stats.length - 1;
                    return (
                        <div key={s.label} className={`p-4 md:p-5 rounded-2xl ${hero ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-50 dark:bg-white/[0.03]'}`}>
                            <p className={`text-[11px] font-bold uppercase tracking-wider ${hero ? 'text-white/80' : 'text-gray-400'}`}>{s.label}</p>
                            <p className={`mt-1 text-2xl md:text-3xl font-extrabold tracking-tight ${hero ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                <AnimatedNumber value={s.value} suffix={s.suffix} />
                            </p>
                        </div>
                    );
                })}
            </div>

            {weakest && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/20 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                        <FaExclamationTriangle />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Needs attention: {weakest.subjectName}</p>
                        <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                            Averaging {Math.round(weakest.avgPercentage)}% across {weakest.testsTaken} test{weakest.testsTaken > 1 ? 's' : ''} — the lowest of all subjects. Extra practice here will lift the overall score.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl ring-1 ring-gray-100 dark:ring-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <h3 className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-[0.14em] mb-5">Subject-wise average</h3>
                    {subjects.length === 0 ? (
                        <p className="text-sm text-gray-400 font-semibold text-center py-10">No subject data yet</p>
                    ) : (
                        <div className="space-y-4">
                            {subjects.map(s => (
                                <div key={s.subjectId || s.subjectName}>
                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                        <span className="text-gray-700 dark:text-gray-200">{s.subjectName || 'General'}</span>
                                        <span className="text-gray-500 dark:text-gray-400">{Math.round(s.avgPercentage)}% · {s.testsTaken} test{s.testsTaken > 1 ? 's' : ''}</span>
                                    </div>
                                    <AnimatedBar value={Math.max(2, Math.min(100, s.avgPercentage))} className="h-2.5" barClassName={pctColor(s.avgPercentage)} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-5 rounded-2xl ring-1 ring-gray-100 dark:ring-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <h3 className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-[0.14em] mb-5">Score trend</h3>
                    {trend.length === 0 ? (
                        <p className="text-sm text-gray-400 font-semibold text-center py-10">No trend data yet</p>
                    ) : (
                        <div className="h-56">
                            <Line
                                data={trendData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    interaction: { intersect: false, mode: 'index' },
                                    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111114', padding: 10, cornerRadius: 10, displayColors: false } },
                                    scales: {
                                        y: { beginAtZero: true, max: 100, border: { display: false }, ticks: { color: '#9ca3af', callback: v => `${v}%` }, grid: { color: 'rgba(148,163,184,0.15)' } },
                                        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', maxRotation: 0, autoSkip: true } }
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RankCell = ({ info }) => {
    if (info === undefined) return <span className="ui-skeleton inline-block w-16 h-4"></span>;
    if (!info) return <span className="text-gray-300 font-bold">—</span>;
    return (
        <div className="flex flex-col items-start">
            <span className="inline-flex items-center gap-1 font-extrabold text-brand-600 dark:text-brand-400">
                {info.rank <= 3 && <FaMedal className={info.rank === 1 ? 'text-yellow-500' : info.rank === 2 ? 'text-gray-400' : 'text-amber-700'} />}
                #{info.rank}{info.total ? <span className="text-gray-400 text-xs font-semibold">&nbsp;/ {info.total}</span> : null}
            </span>
            {info.percentile !== null && (
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Top {Math.max(1, 100 - info.percentile)}%</span>
            )}
        </div>
    );
};

const TestResultsTab = ({ tests, loading, childName, analysis, analysisLoading }) => {
    const [ranks, setRanks] = useState({});

    const attempted = useMemo(() => tests.filter(t => t.attempted), [tests]);

    useEffect(() => {
        let cancelled = false;
        const targets = attempted.slice(0, MAX_LEADERBOARD_FETCHES);
        if (targets.length === 0) return undefined;
        const load = async () => {
            const results = await Promise.allSettled(
                targets.map(t => axios.get(`${config.API_URL}/tests/${t._id}/leaderboard`, { headers: authHeaders() }))
            );
            if (cancelled) return;
            const next = {};
            results.forEach((r, i) => {
                next[targets[i]._id] = r.status === 'fulfilled' ? findChildRank(r.value.data, childName) : null;
            });
            setRanks(next);
        };
        load();
        return () => { cancelled = true; };
    }, [attempted, childName]);

    return (
        <div className="space-y-6">
            <Panel title="Performance analysis" subtitle="Subject strengths, weak areas & score trend" icon={FaChartLine}>
                <AnalysisSection analysis={analysis} loading={analysisLoading} />
            </Panel>

            <Panel title="Online test results" subtitle="Scores and class rank in digital assessments" icon={FaLaptopCode}>
                {loading ? (
                    <ListSkeleton rows={5} />
                ) : tests.length === 0 ? (
                    <EmptyState icon={FaLaptopCode} title="No online tests found for this student" hint="Tests assigned to your ward's class will show up here." />
                ) : (
                    <>
                        <div className="overflow-x-auto ui-scrollbar rounded-2xl ring-1 ring-gray-100 dark:ring-white/5">
                            <table className="w-full text-left border-collapse min-w-[640px]">
                                <thead className="bg-gray-50 dark:bg-white/[0.03]">
                                    <tr className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="py-3 pl-4">Test</th>
                                        <th className="py-3">Subject</th>
                                        <th className="py-3">Date</th>
                                        <th className="py-3">Status</th>
                                        <th className="py-3">Class rank</th>
                                        <th className="py-3 text-right pr-4">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                                    {tests.map((test) => {
                                        const pct = test.attempted && test.totalMarks ? Math.round((test.score / test.totalMarks) * 100) : null;
                                        return (
                                            <tr key={test._id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3.5 pl-4 font-bold text-gray-900 dark:text-gray-100">{test.title}</td>
                                                <td className="py-3.5 font-medium text-gray-500 dark:text-gray-400">{test.subjectId?.name || 'General'}</td>
                                                <td className="py-3.5 font-medium text-gray-400 text-xs whitespace-nowrap">{new Date(test.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                                <td className="py-3.5">
                                                    {test.attempted ? (
                                                        <span className="ui-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Completed</span>
                                                    ) : (
                                                        <span className="ui-badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Missed / Pending</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5">
                                                    {test.attempted
                                                        ? (attempted.indexOf(test) < MAX_LEADERBOARD_FETCHES ? <RankCell info={ranks[test._id]} /> : <span className="text-gray-300 font-bold">—</span>)
                                                        : <span className="text-gray-300 font-bold">-</span>}
                                                </td>
                                                <td className="py-3.5 text-right pr-4">
                                                    {test.attempted ? (
                                                        <div className="inline-flex flex-col items-end gap-1">
                                                            <span className="font-extrabold text-gray-900 dark:text-white whitespace-nowrap">
                                                                {test.score} <span className="text-gray-400 text-xs font-semibold">/ {test.totalMarks}</span>
                                                            </span>
                                                            {pct !== null && <AnimatedBar value={pct} className="h-1 w-20" barClassName={pctColor(pct)} />}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 font-bold">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium mt-4 flex items-center gap-1.5">
                            <FaTrophy className="text-brand-400" /> Rank is computed among students of the same class who attempted the test.
                        </p>
                    </>
                )}
            </Panel>
        </div>
    );
};

export default TestResultsTab;
