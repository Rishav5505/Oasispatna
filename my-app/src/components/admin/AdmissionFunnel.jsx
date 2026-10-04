import React, { useCallback, useEffect, useState } from 'react';
import { FiFilter, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import { api } from './adminApi';
import { SkeletonBlock, iconBtn } from './AdminUI';
import { AnimatedNumber } from '../ui/Motion';
import { useI18n } from '../../i18n/useI18n';

const STAGES = [
  { key: 'leads', labelKey: 'admin.funnel.leads', bar: 'bg-ink-900 dark:bg-white/80' },
  { key: 'contacted', labelKey: 'admin.funnel.contacted', bar: 'bg-ink-800 dark:bg-white/60' },
  { key: 'interested', labelKey: 'admin.funnel.interested', bar: 'bg-brand-700' },
  { key: 'applications', labelKey: 'admin.funnel.applications', bar: 'bg-brand-500' },
  { key: 'approved', labelKey: 'admin.funnel.approved', bar: 'bg-brand-gradient' },
];

// Animated width bar (grows from 0 on mount / data change).
const GrowBar = ({ pct, className }) => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return <div className={`h-full rounded-xl ${className} transition-[width] duration-1000 ease-out`} style={{ width: `${Math.max(w, pct > 0 ? 4 : 0)}%` }} />;
};

/** Admission funnel for the last 90 days (GET /admissions/funnel). */
const AdmissionFunnel = ({ reloadKey = 0, className = '' }) => {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get('/admissions/funnel'));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const top = data ? Math.max(1, ...STAGES.map(s => data[s.key] || 0)) : 1;
  const overall = data && data.leads > 0 ? ((data.approved || 0) / data.leads) * 100 : null;

  return (
    <div className={`ui-card p-5 md:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0"><FiFilter /></div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-gray-900 dark:text-white tracking-tight">{t('admin.funnel.title')}</h3>
            <p className="text-xs text-gray-500 truncate">{t('admin.funnel.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overall != null && (
            <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              {t('admin.funnel.conversion', { pct: overall.toFixed(1) })}
            </span>
          )}
          <button type="button" onClick={load} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2.5">{STAGES.map(s => <SkeletonBlock key={s.key} className="h-10 !rounded-xl" />)}</div>
      ) : failed && !data ? (
        <p className="py-6 text-center text-sm text-gray-500 flex items-center justify-center gap-2"><FiAlertTriangle className="text-amber-500" /> {t('admin.common.loadFailed')}</p>
      ) : (
        <ol className="space-y-2.5">
          {STAGES.map((s, i) => {
            const v = data?.[s.key] || 0;
            const prev = i > 0 ? data?.[STAGES[i - 1].key] || 0 : null;
            const conv = prev ? Math.round((v / prev) * 100) : null;
            return (
              <li key={s.key} className="grid grid-cols-[6.5rem_1fr_auto] sm:grid-cols-[8rem_1fr_auto] items-center gap-3">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate">{t(s.labelKey)}</span>
                <div className="h-9 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden">
                  <GrowBar pct={(v / top) * 100} className={s.bar} />
                </div>
                <span className="w-24 text-right">
                  <span className="text-base font-extrabold text-gray-900 dark:text-white tabular-nums"><AnimatedNumber value={v} /></span>
                  {conv != null && <span className="ml-1.5 text-[11px] font-bold text-gray-400 tabular-nums">{conv}%</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default AdmissionFunnel;
