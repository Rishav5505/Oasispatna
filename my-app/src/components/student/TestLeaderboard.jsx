import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiAward } from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';
import config from '../../config';
import { authHeaders, errorMessage } from './helpers';
import { SkeletonRows, EmptyState, ErrorState } from './StudentUI';

const formatDuration = (secs) => {
    if (secs == null || !Number.isFinite(Number(secs))) return null;
    const s = Math.round(Number(secs));
    return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const PODIUM = {
    1: { h: 'h-28', ring: 'ring-amber-300', block: 'bg-gradient-to-b from-amber-300 to-amber-500', medal: 'text-amber-400', delay: '0.25s' },
    2: { h: 'h-20', ring: 'ring-gray-300', block: 'bg-gradient-to-b from-gray-200 to-gray-400', medal: 'text-gray-400', delay: '0.1s' },
    3: { h: 'h-14', ring: 'ring-brand-300', block: 'bg-gradient-to-b from-brand-300 to-brand-600', medal: 'text-brand-500', delay: '0.4s' },
};

const Podium = ({ top }) => {
    // visual order: 2nd, 1st, 3rd
    const order = [top.find(r => r.rank === 2), top.find(r => r.rank === 1), top.find(r => r.rank === 3)].filter(Boolean);
    if (order.length === 0) return null;
    return (
        <div className="flex items-end justify-center gap-3 sm:gap-5 mb-6 pt-4">
            {order.map((r, i) => {
                const p = PODIUM[r.rank] || PODIUM[3];
                return (
                    <div key={`${r.rank}-${i}`} className="flex flex-col items-center w-24 sm:w-28 animate-fade-up" style={{ animationDelay: p.delay }}>
                        {r.rank === 1 && <FaCrown className="text-amber-400 text-xl mb-1 animate-float-slow" aria-hidden="true" />}
                        <div className={`relative w-14 h-14 rounded-full bg-brand-gradient text-white font-extrabold flex items-center justify-center ring-4 ${p.ring} ${r.isMe ? 'shadow-brand-glow' : ''}`}>
                            {initials(r.studentName)}
                            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-ink-900 text-[11px] font-extrabold text-gray-900 dark:text-white flex items-center justify-center shadow">{r.rank}</span>
                        </div>
                        <p className="mt-3 text-xs font-bold text-gray-900 dark:text-white text-center line-clamp-1 w-full">{r.studentName}{r.isMe ? ' (You)' : ''}</p>
                        <p className="text-xs font-semibold text-gray-500 mb-2">{Math.round(Number(r.percentage) || 0)}%</p>
                        <div className={`w-full ${p.h} rounded-t-2xl ${p.block} flex items-start justify-center pt-2 shadow-inner origin-bottom animate-scale-in`} style={{ animationDelay: p.delay }}>
                            <span className="text-white/90 font-extrabold text-lg drop-shadow">#{r.rank}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const TestLeaderboard = ({ testId }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchBoard = useCallback(async () => {
        if (!testId) return;
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${config.API_URL}/tests/${testId}/leaderboard`, { headers: authHeaders() });
            setRows(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            setError(errorMessage(err, 'Could not load leaderboard'));
        } finally {
            setLoading(false);
        }
    }, [testId]);

    useEffect(() => { fetchBoard(); }, [fetchBoard]);

    const hasTime = rows.some(r => r.timeTaken != null);
    const top = rows.filter(r => r.rank <= 3).slice(0, 3);

    return (
        <div className="text-left">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><FiAward /></span>
                Leaderboard
            </h3>
            {loading ? (
                <SkeletonRows count={3} />
            ) : error ? (
                <ErrorState message={error} onRetry={fetchBoard} />
            ) : rows.length === 0 ? (
                <EmptyState compact icon={<FiAward />} title="No rankings yet" />
            ) : (
                <>
                    <Podium top={top} />
                    <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-white/5">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Rank</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Student</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">Score</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">%</th>
                                    {hasTime && <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider hidden sm:table-cell">Time</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {rows.map((r, idx) => {
                                    const prevRank = idx > 0 ? rows[idx - 1].rank : null;
                                    const gap = prevRank != null && r.rank > prevRank + 1;
                                    return (
                                        <React.Fragment key={`${r.rank}-${idx}`}>
                                            {gap && (
                                                <tr><td colSpan={hasTime ? 5 : 4} className="px-4 py-1 text-center text-gray-300 text-xs">• • •</td></tr>
                                            )}
                                            <tr className={`transition-colors ${r.isMe ? 'bg-brand-50 dark:bg-brand-500/10 font-bold' : 'hover:bg-brand-50/40 dark:hover:bg-white/5'}`}>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white tabular-nums">#{r.rank}</td>
                                                <td className="px-4 py-3">
                                                    <span className="flex items-center gap-2.5">
                                                        <span className="w-7 h-7 shrink-0 rounded-full bg-brand-gradient text-white text-[10px] font-bold flex items-center justify-center">{initials(r.studentName)}</span>
                                                        <span className="text-gray-800 dark:text-gray-200 truncate">{r.studentName}</span>
                                                        {r.isMe && <span className="ui-badge bg-brand-500 text-white !text-[9px] !px-2 !py-0.5">You</span>}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.score}/{r.totalMarks}</td>
                                                <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{Math.round(Number(r.percentage) || 0)}%</td>
                                                {hasTime && <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{formatDuration(r.timeTaken) || '—'}</td>}
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default TestLeaderboard;
