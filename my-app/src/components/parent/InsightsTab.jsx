import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiTrendingUp, FiZap, FiAward, FiClock, FiBookOpen, FiAlertCircle, FiCheckCircle, FiTarget, FiRefreshCw } from 'react-icons/fi';
import config from '../../config';
import { useI18n } from '../../i18n/useI18n';
import { StatCard } from '../ui/Motion';
import { Panel, EmptyState, SkeletonBlock, AnimatedBar, ProgressRing, Chip } from './ParentUI';
import { authHeaders } from './parentUtils';

const ENDPOINTS = {
    stats: '/practice/stats/me',
    study: '/practice/study/summary',
    syllabus: '/practice/syllabus/me',
    mistakes: '/practice/mistakes',
};

// Child's learning insights. Every section is optional: endpoints that fail or are not
// permitted for parents are skipped silently. Mount with key={studentId}.
const InsightsTab = ({ studentId }) => {
    const { t, lang } = useI18n();
    const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
    const [data, setData] = useState(null);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const keys = Object.keys(ENDPOINTS);
        Promise.allSettled(keys.map(k => axios.get(`${config.API_URL}${ENDPOINTS[k]}`, {
            headers: authHeaders(),
            params: k === 'study' ? { studentId, days: 7 } : { studentId },
        }))).then(results => {
            if (cancelled) return;
            const out = { failed: 0 };
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') out[keys[i]] = r.value.data;
                else if (![403, 404].includes(r.reason?.response?.status)) out.failed += 1;
            });
            setData(out);
        });
        return () => { cancelled = true; };
    }, [studentId, reload]);

    if (!data) {
        return (
            <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <SkeletonBlock key={i} className="h-28 rounded-3xl" />)}</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonBlock className="h-72 rounded-3xl" /><SkeletonBlock className="h-72 rounded-3xl" /></div>
            </>
        );
    }

    const { stats, study, syllabus, mistakes } = data;
    const nothing = !stats && !study && !syllabus && !mistakes;
    if (nothing) {
        return (
            <EmptyState
                icon={FiTrendingUp}
                title={data.failed ? t('parent.ins.error') : t('common.noData')}
                action={data.failed ? <button onClick={() => { setData(null); setReload(r => r + 1); }} className="ui-btn-secondary"><FiRefreshCw /> {t('common.retry')}</button> : null}
            />
        );
    }

    // Mistake summary by subject
    const mistakeList = Array.isArray(mistakes) ? mistakes : [];
    const bySubject = Object.values(mistakeList.reduce((acc, m) => {
        const name = m.subjectId?.name || t('parent.ins.general');
        if (!acc[name]) acc[name] = { name, open: 0, mastered: 0 };
        acc[name][m.status === 'mastered' ? 'mastered' : 'open'] += 1;
        return acc;
    }, {})).sort((a, b) => (b.open + b.mastered) - (a.open + a.mastered));
    const openTotal = bySubject.reduce((s, x) => s + x.open, 0);
    const masteredTotal = bySubject.reduce((s, x) => s + x.mastered, 0);

    const subjects = Array.isArray(syllabus) ? syllabus : [];
    const daily = Array.isArray(study?.daily) ? study.daily : [];
    const maxMin = Math.max(1, ...daily.map(d => Number(d.minutes) || 0));

    return (
        <>
            {(stats || study) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ui-stagger">
                    {stats && <StatCard icon={FiAward} label={t('parent.ins.level')} value={Number(stats.level) || 1} tone="brand" hint={t('parent.ins.weeklyXp', { xp: Number(stats.weeklyXp) || 0 })} />}
                    {stats && <StatCard icon={FiZap} label={t('parent.ins.xp')} value={Number(stats.xp) || 0} tone="dark" hint={stats.rank ? `${t('parent.ins.rank')}: #${stats.rank}` : undefined} />}
                    {stats && <StatCard icon={FiTarget} label={t('parent.ins.streak')} value={Number(stats.streak) || 0} suffix={` ${t('parent.ins.days')}`} tone="amber" hint={t('parent.ins.bestStreak', { count: Number(stats.bestStreak) || 0 })} />}
                    {study && <StatCard icon={FiClock} label={t('parent.ins.studyToday')} value={Number(study.todayMinutes) || 0} suffix={` ${t('parent.ins.min')}`} tone="green" hint={t('parent.ins.studyWeek', { count: Number(study.weekMinutes) || 0 })} />}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {syllabus && (
                    <Panel title={t('parent.ins.syllabus')} subtitle={t('parent.ins.syllabusHint')} icon={FiBookOpen}>
                        {subjects.length === 0 ? (
                            <EmptyState icon={FiBookOpen} title={t('parent.ins.syllabusEmpty')} hint={t('parent.ins.syllabusEmptyHint')} />
                        ) : (
                            <div className="space-y-5 ui-stagger">
                                {subjects.map(s => {
                                    const total = s.chapters?.length || 0;
                                    const done = (s.chapters || []).filter(c => c.myStatus === 'done').length;
                                    return (
                                        <div key={s.subjectId || s.subjectName}>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{s.subjectName}</p>
                                                <span className="text-[11px] font-bold text-gray-400">{t('parent.ins.chapters', { done, total })}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-24 sm:w-28 shrink-0 text-[11px] font-semibold text-gray-500">{t('parent.ins.done')}</span>
                                                    <AnimatedBar value={s.percentDone} className="h-2" />
                                                    <span className="w-9 text-right text-[11px] font-bold text-gray-700 dark:text-gray-200">{Math.round(s.percentDone || 0)}%</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="w-24 sm:w-28 shrink-0 text-[11px] font-semibold text-gray-500">{t('parent.ins.taught')}</span>
                                                    <AnimatedBar value={s.percentTaught} className="h-2" barClassName="bg-ink-900 dark:bg-gray-300" />
                                                    <span className="w-9 text-right text-[11px] font-bold text-gray-700 dark:text-gray-200">{Math.round(s.percentTaught || 0)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>
                )}

                {mistakes && (
                    <Panel title={t('parent.ins.mistakes')} subtitle={t('parent.ins.mistakesHint')} icon={FiAlertCircle}>
                        {mistakeList.length === 0 ? (
                            <EmptyState icon={FiCheckCircle} title={t('parent.ins.mistakesEmpty')} hint={t('parent.ins.mistakesEmptyHint')} />
                        ) : (
                            <>
                                <div className="flex items-center gap-5 mb-5">
                                    <ProgressRing value={(masteredTotal / (openTotal + masteredTotal)) * 100} size={84} stroke={8} color="#10b981">
                                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">{Math.round((masteredTotal / (openTotal + masteredTotal)) * 100)}%</span>
                                    </ProgressRing>
                                    <div className="flex flex-wrap gap-2">
                                        <Chip tone="amber">{t('parent.ins.open')}: {openTotal}</Chip>
                                        <Chip tone="green">{t('parent.ins.mastered')}: {masteredTotal}</Chip>
                                    </div>
                                </div>
                                <ul className="space-y-3 ui-stagger">
                                    {bySubject.map(s => (
                                        <li key={s.name}>
                                            <div className="flex justify-between text-xs font-semibold mb-1">
                                                <span className="text-gray-700 dark:text-gray-200 truncate">{s.name}</span>
                                                <span className="text-gray-400"><span className="text-amber-600">{s.open}</span> · <span className="text-emerald-600">{s.mastered}</span></span>
                                            </div>
                                            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5">
                                                <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(s.mastered / (s.open + s.mastered)) * 100}%` }} />
                                                <div className="bg-amber-400 transition-all duration-700" style={{ width: `${(s.open / (s.open + s.mastered)) * 100}%` }} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </Panel>
                )}
            </div>

            {study && (
                <Panel title={t('parent.ins.study')} subtitle={t('parent.ins.studyHint')} icon={FiClock}>
                    {daily.every(d => !Number(d.minutes)) ? (
                        <EmptyState icon={FiClock} title={t('parent.ins.noStudy')} />
                    ) : (
                        <div className="flex items-end gap-2 sm:gap-4 h-44" role="img" aria-label={t('parent.ins.study')}>
                            {daily.map(d => {
                                const m = Number(d.minutes) || 0;
                                return (
                                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end min-w-0">
                                        <span className="text-[10px] font-bold text-gray-500">{m || ''}</span>
                                        <div className="w-full max-w-[44px] rounded-t-lg bg-brand-gradient transition-all duration-700" style={{ height: `${Math.max(m ? 6 : 2, (m / maxMin) * 100)}%`, opacity: m ? 1 : 0.25 }} title={`${m} ${t('parent.ins.min')}`} />
                                        <span className="text-[10px] font-semibold text-gray-400 truncate">{new Date(`${d.date}T00:00:00`).toLocaleDateString(locale, { weekday: 'short' })}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Panel>
            )}
        </>
    );
};

export default InsightsTab;
