import React, { useCallback, useEffect, useState } from 'react';
import { FiZap, FiAward, FiTrendingUp, FiStar, FiTarget } from 'react-icons/fi';
import { errorMessage } from './helpers';
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from './StudentUI';
import { AnimatedBar } from './Widgets';
import { AnimatedNumber, StatCard } from '../ui/Motion';
import { Segmented } from './PracticeUI';
import { api } from './practiceApi';
import { levelProgress } from './useStudentStats';
import { useI18n } from '../../i18n/useI18n';

// Compact "Lv 3 · 420 XP" pill for the top bar / banner
export const XpChip = ({ stats, onClick, variant = 'light' }) => {
    const { t } = useI18n();
    if (!stats) return null;
    const styles = variant === 'glass'
        ? 'bg-white/15 hover:bg-white/25 border-white/20 text-white backdrop-blur-md'
        : 'bg-brand-50 hover:bg-brand-100 border-brand-100 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/20 dark:text-brand-300';
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${styles}`}
            title={t('student.xp.chipTitle')}
        >
            <FiStar className="shrink-0" />
            <span>{t('student.xp.level', { level: stats.level })}</span>
            <span className="opacity-60">·</span>
            <span className="tabular-nums">{Number(stats.xp || 0).toLocaleString('en-IN')} XP</span>
        </button>
    );
};

// XP / level progress card
export const XpProgressCard = ({ stats, className = '' }) => {
    const { t } = useI18n();
    if (!stats) return <div className={`ui-skeleton h-40 !rounded-3xl ${className}`} />;
    const pct = levelProgress(stats);
    return (
        <div className={`relative overflow-hidden rounded-3xl bg-brand-dark text-white p-6 shadow-card ${className}`}>
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-500/30 blur-3xl animate-float-slow" />
            <div className="relative flex items-center gap-4">
                <div className="w-16 h-16 shrink-0 rounded-2xl bg-brand-gradient flex flex-col items-center justify-center shadow-brand-glow">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">{t('student.xp.lv')}</span>
                    <span className="text-2xl font-extrabold leading-none">{stats.level}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/50">{t('student.xp.total')}</p>
                    <p className="text-3xl font-extrabold tracking-tight"><AnimatedNumber value={stats.xp || 0} /> <span className="text-base text-brand-300">XP</span></p>
                </div>
            </div>
            <div className="relative mt-5">
                <AnimatedBar value={pct} className="h-3" trackClass="bg-white/10" />
                <div className="flex justify-between mt-2 text-[11px] font-semibold text-white/60">
                    <span>{t('student.xp.level', { level: stats.level })}</span>
                    <span>{t('student.xp.toNext', { xp: Math.max(0, (stats.nextLevelXp || 0) - (stats.xp || 0)), level: (stats.level || 1) + 1 })}</span>
                </div>
            </div>
        </div>
    );
};

const Leaderboard = ({ stats }) => {
    const { t } = useI18n();
    const [scope, setScope] = useState('week');
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');

    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let cancelled = false;
        api.get('/practice/leaderboard', { scope })
            .then((data) => { if (!cancelled) setRows(Array.isArray(data) ? data : []); })
            .catch((err) => { if (!cancelled) setError(errorMessage(err, t('student.xp.loadError'))); });
        return () => { cancelled = true; };
    }, [scope, nonce, t]);

    const load = useCallback(() => { setRows(null); setError(''); setNonce(n => n + 1); }, []);
    const changeScope = (v) => { if (v === scope) return; setRows(null); setError(''); setScope(v); };

    return (
        <div className="space-y-6">
            <PageHeader icon={FiAward} title={t('student.xp.title')} subtitle={t('student.xp.subtitle')} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <XpProgressCard stats={stats} className="lg:col-span-1" />
                <div className="grid grid-cols-2 lg:col-span-2 gap-4 ui-stagger">
                    <StatCard icon={FiTrendingUp} label={t('student.xp.weekly')} value={stats?.weeklyXp || 0} suffix=" XP" tone="brand" />
                    <StatCard icon={FiAward} label={t('student.xp.rank')} value={stats?.rank || 0} prefix={stats?.rank ? '#' : ''} tone="dark" hint={stats?.rank ? t('student.xp.inClass') : t('student.xp.noRank')} />
                    <StatCard icon={FiZap} label={t('student.xp.dppStreak')} value={stats?.streak || 0} tone="amber" hint={t('student.xp.best', { count: stats?.bestStreak || 0 })} />
                    <StatCard icon={FiTarget} label={t('student.xp.nextLevel')} value={stats?.nextLevelXp || 0} suffix=" XP" tone="green" />
                </div>
            </div>

            <div className="ui-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/5">
                    <h3 className="font-extrabold text-gray-900 dark:text-white">{t('student.xp.leaderboard')}</h3>
                    <Segmented
                        value={scope}
                        onChange={changeScope}
                        options={[{ value: 'week', label: t('student.xp.thisWeek') }, { value: 'all', label: t('student.xp.allTime') }]}
                    />
                </div>
                <div className="p-3 md:p-4">
                    {error ? <ErrorState message={error} onRetry={load} /> : rows === null ? <SkeletonRows count={6} /> : rows.length === 0 ? (
                        <EmptyState compact icon={<FiAward />} title={t('student.xp.emptyTitle')} message={t('student.xp.emptyMsg')} />
                    ) : (
                        <ol className="space-y-1.5">
                            {rows.map((r, i) => {
                                const medal = r.rank === 1 ? 'bg-amber-400 text-white' : r.rank === 2 ? 'bg-gray-300 text-gray-800' : r.rank === 3 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 dark:bg-white/5 text-gray-500';
                                const gap = i > 0 && r.isMe && rows[i - 1].rank < r.rank - 1;
                                return (
                                    <React.Fragment key={`${r.studentId || r.name}-${i}`}>
                                        {gap && <li className="text-center text-gray-300 dark:text-gray-600 text-xs" aria-hidden="true">•••</li>}
                                        <li className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${r.isMe ? 'bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-200 dark:ring-brand-500/30' : 'hover:bg-brand-50/40 dark:hover:bg-white/5'}`}>
                                            <span className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-extrabold ${medal}`}>{r.rank}</span>
                                            <span className="w-9 h-9 shrink-0 rounded-full bg-brand-gradient text-white text-sm font-bold flex items-center justify-center">{(r.name || '?').charAt(0).toUpperCase()}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{r.name}{r.isMe && <span className="ml-1.5 text-brand-600 dark:text-brand-400">({t('student.xp.you')})</span>}</p>
                                                <p className="text-[11px] text-gray-400">{t('student.xp.level', { level: r.level })}</p>
                                            </div>
                                            <span className="text-sm font-extrabold tabular-nums text-gray-900 dark:text-white">{Number(r.xp).toLocaleString('en-IN')} <span className="text-[10px] text-gray-400">XP</span></span>
                                        </li>
                                    </React.Fragment>
                                );
                            })}
                        </ol>
                    )}
                </div>
            </div>

            <div className="ui-card p-5">
                <h3 className="font-extrabold text-gray-900 dark:text-white mb-3">{t('student.xp.howTitle')}</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                    {['student.xp.rule1', 'student.xp.rule2', 'student.xp.rule3', 'student.xp.rule4'].map(k => (
                        <li key={k} className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2"><FiZap className="text-brand-500 shrink-0" /> {t(k)}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Leaderboard;
