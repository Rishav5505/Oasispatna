import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiAlertTriangle, FiAlertCircle, FiRefreshCw, FiTrendingDown, FiTrendingUp, FiMinus, FiMessageSquare, FiArrowRight, FiSmile } from 'react-icons/fi';
import { useI18n } from '../../i18n/useI18n';
import { API, authHeaders, errMsg } from './teacherApi';
import { Avatar, Badge, EmptyState, PageHeader, Segmented, Spinner } from './TeacherUI';

const fmtPct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v)}%`);
const TrendIcon = ({ trend }) => (trend === 'down'
    ? <FiTrendingDown className="text-red-500" aria-label="Falling" />
    : trend === 'up' ? <FiTrendingUp className="text-emerald-500" aria-label="Rising" /> : <FiMinus className="text-gray-400" aria-label="Flat" />);

const useAtRisk = (params) => {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const key = JSON.stringify(params || {});
    const load = useCallback(async () => {
        try {
            const p = JSON.parse(key);
            const res = await axios.get(`${API}/analytics/at-risk`, { headers: authHeaders(), params: p });
            const list = Array.isArray(res.data) ? res.data : [];
            list.sort((a, b) => (a.riskLevel === b.riskLevel ? 0 : a.riskLevel === 'high' ? -1 : 1));
            setRows(list);
            setError('');
        } catch (err) {
            setError(errMsg(err, 'Failed to load at-risk students'));
            setRows([]);
        }
    }, [key]);
    useEffect(() => { const id = setTimeout(load, 0); return () => clearTimeout(id); }, [load]);
    return { rows, error, reload: load };
};

const RiskBadge = ({ level }) => {
    const { t } = useI18n();
    return level === 'high'
        ? <Badge tone="red" dot>{t('teacher.atRisk.high')}</Badge>
        : <Badge tone="amber">{t('teacher.atRisk.medium')}</Badge>;
};

/** Compact overview card: count + top few flagged students. */
export const AtRiskCard = ({ onViewAll, className = '' }) => {
    const { t } = useI18n();
    const { rows, error } = useAtRisk();
    const high = (rows || []).filter(r => r.riskLevel === 'high').length;
    return (
        <div className={`ui-card p-5 ${className}`}>
            <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="flex items-center gap-2 font-extrabold tracking-tight text-gray-900 dark:text-white">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${high ? 'bg-red-50 text-red-500 dark:bg-red-500/10 animate-glow' : 'bg-brand-50 dark:bg-brand-500/15 text-brand-600'}`}><FiAlertTriangle /></span>
                    {t('teacher.heading.atRisk')}
                </h3>
                <button type="button" onClick={onViewAll} className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 group">
                    {t('teacher.atRisk.viewAll')} <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
            {rows === null ? (
                <div className="space-y-2.5">{[0, 1, 2].map(i => <div key={i} className="ui-skeleton h-12" />)}</div>
            ) : error ? (
                <p className="text-sm text-red-500 py-4 text-center">{error}</p>
            ) : rows.length === 0 ? (
                <div className="py-6 flex flex-col items-center gap-2 text-center">
                    <span className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><FiSmile /></span>
                    <p className="text-sm font-semibold text-gray-500">{t('teacher.atRisk.none')}</p>
                </div>
            ) : (
                <>
                    <div className="flex gap-2 mb-3">
                        <Badge tone="red">{high} {t('teacher.atRisk.high')}</Badge>
                        <Badge tone="amber">{rows.length - high} {t('teacher.atRisk.medium')}</Badge>
                    </div>
                    <ul className="space-y-2">
                        {rows.slice(0, 4).map(r => (
                            <li key={r.studentId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-brand-50/40 dark:hover:bg-white/5">
                                <Avatar name={r.name} size="xs" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{r.name}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{r.reasons?.[0]}</p>
                                </div>
                                <TrendIcon trend={r.trend} />
                                <RiskBadge level={r.riskLevel} />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

/** Full list tab with filters and a "message parent" quick action. */
export const AtRiskTab = ({ teacherData, onMessage }) => {
    const { t } = useI18n();
    const classes = teacherData?.classes || [];
    const batches = teacherData?.batches || [];
    const [classId, setClassId] = useState('');
    const [batchId, setBatchId] = useState('');
    const [level, setLevel] = useState('all');
    const params = useMemo(() => ({ ...(classId ? { classId } : {}), ...(batchId ? { batchId } : {}) }), [classId, batchId]);
    const { rows, error, reload } = useAtRisk(params);
    const [parents, setParents] = useState({}); // studentId -> parent userId

    useEffect(() => {
        let cancelled = false;
        axios.get(`${API}/chat/contacts`, { headers: authHeaders() })
            .then(({ data }) => {
                if (cancelled) return;
                const map = {};
                (Array.isArray(data) ? data : []).forEach(c => { if (c.role === 'parent' && c.studentId) map[String(c.studentId)] = c.userId; });
                setParents(map);
            })
            .catch(() => { /* chat contacts are optional for this view */ });
        return () => { cancelled = true; };
    }, []);

    const list = rows || [];
    const high = list.filter(r => r.riskLevel === 'high').length;
    const visible = level === 'all' ? list : list.filter(r => r.riskLevel === level);

    return (
        <div className="space-y-6">
            <PageHeader icon={FiAlertTriangle} eyebrow={t('teacher.group.classroom')} title={t('teacher.heading.atRisk')} subtitle={t('teacher.heading.atRiskSub')} />
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <Segmented value={level} onChange={setLevel} options={[['all', 'All', list.length], ['high', t('teacher.atRisk.high'), high], ['medium', t('teacher.atRisk.medium'), list.length - high]]} />
                <div className="grid grid-cols-2 gap-2.5 md:ml-auto md:w-96">
                    <select className="ui-input" aria-label="Class" value={classId} onChange={e => setClassId(e.target.value)}>
                        <option value="">All my classes</option>{classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <select className="ui-input" aria-label="Batch" value={batchId} onChange={e => setBatchId(e.target.value)}>
                        <option value="">All batches</option>{batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                </div>
            </div>

            {rows === null ? <Spinner label="Analysing attendance and scores…" rows={5} />
                : error ? <EmptyState icon={FiAlertCircle} title={error} action={<button type="button" onClick={reload} className="ui-btn-secondary"><FiRefreshCw /> Try again</button>} />
                    : visible.length === 0 ? <EmptyState icon={FiSmile} title={t('teacher.atRisk.none')} hint="Students are flagged when 30-day attendance or recent test averages drop, or scores fall sharply." />
                        : (
                            <div key={`${level}${classId}${batchId}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4 ui-stagger">
                                {visible.map(r => {
                                    const parentId = parents[String(r.studentId)];
                                    return (
                                        <div key={r.studentId} className={`ui-card p-4 md:p-5 border-l-4 ${r.riskLevel === 'high' ? '!border-l-red-500' : '!border-l-amber-400'}`}>
                                            <div className="flex items-center gap-3">
                                                <Avatar name={r.name} size="md" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-extrabold text-gray-900 dark:text-white truncate">{r.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{r.className || '—'}</p>
                                                </div>
                                                <RiskBadge level={r.riskLevel} />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 mt-4">
                                                {[[t('teacher.atRisk.attendance'), fmtPct(r.attendancePct), r.attendancePct !== null && r.attendancePct < 65],
                                                    [t('teacher.atRisk.avg'), fmtPct(r.avgTestPct), r.avgTestPct !== null && r.avgTestPct < 40]].map(([label, val, bad]) => (
                                                    <div key={label} className="rounded-xl bg-gray-50 dark:bg-white/5 py-2 text-center">
                                                        <p className={`text-base font-extrabold tabular-nums ${bad ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{val}</p>
                                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                                                    </div>
                                                ))}
                                                <div className="rounded-xl bg-gray-50 dark:bg-white/5 py-2 flex flex-col items-center justify-center">
                                                    <span className="text-lg"><TrendIcon trend={r.trend} /></span>
                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Trend</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {(r.reasons || []).map((reason, i) => (
                                                    <span key={i} className={`ui-badge ${r.riskLevel === 'high' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>{reason}</span>
                                                ))}
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
                                                {parentId ? (
                                                    <button type="button" onClick={() => onMessage?.(parentId)} className="ui-btn-secondary !py-2 text-xs"><FiMessageSquare /> {t('teacher.atRisk.messageParent')}</button>
                                                ) : (
                                                    <p className="text-[11px] text-gray-400">{t('teacher.atRisk.noParent')}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
        </div>
    );
};
