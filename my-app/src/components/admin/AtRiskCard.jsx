import React, { useCallback, useEffect, useState } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiCheckCircle, FiTrendingDown, FiTrendingUp, FiMinus } from 'react-icons/fi';
import { api } from './adminApi';
import { Avatar, Badge, SkeletonBlock, EmptyState, iconBtn } from './AdminUI';
import { useI18n } from '../../i18n/useI18n';

const TREND = { down: [FiTrendingDown, 'text-red-500'], up: [FiTrendingUp, 'text-emerald-500'], flat: [FiMinus, 'text-gray-400'] };
const pct = (v) => (v == null ? '—' : `${Math.round(v)}%`);

/** Students flagged by GET /analytics/at-risk (attendance < 65%, avg < 40%, or falling trend). */
const AtRiskCard = ({ limit = 6, className = '' }) => {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.get('/analytics/at-risk'));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = rows || [];
  const high = list.filter(r => r.riskLevel === 'high').length;

  return (
    <div className={`ui-card p-5 md:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 flex items-center justify-center shrink-0"><FiAlertTriangle /></div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-gray-900 dark:text-white tracking-tight">{t('admin.risk.title')}</h3>
            <p className="text-xs text-gray-500 truncate">{rows ? t('admin.risk.summary', { n: list.length, high }) : t('admin.risk.subtitle')}</p>
          </div>
        </div>
        <button type="button" onClick={load} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
      </div>
      {rows === null && !failed ? (
        <div className="space-y-2">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-14 !rounded-2xl" />)}</div>
      ) : failed && rows === null ? (
        <EmptyState icon={FiAlertTriangle} title={t('admin.common.loadFailed')} action={<button type="button" onClick={load} className="ui-btn-secondary"><FiRefreshCw /> {t('admin.common.retry')}</button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={FiCheckCircle} title={t('admin.risk.empty')} hint={t('admin.risk.emptyHint')} />
      ) : (
        <ul className="space-y-2">
          {list.slice(0, limit).map(r => {
            const [TIcon, tCls] = TREND[r.trend] || TREND.flat;
            return (
              <li key={r.studentId} className={`p-3 rounded-2xl ring-1 ${r.riskLevel === 'high' ? 'ring-red-100 dark:ring-red-500/20 bg-red-50/40 dark:bg-red-500/5' : 'ring-amber-100 dark:ring-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5'}`}>
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} size="sm" className={r.riskLevel === 'high' ? '!bg-none !bg-red-500 !shadow-none' : ''} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{r.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{r.className || '—'}</p>
                  </div>
                  <div className="text-right text-[11px] font-semibold text-gray-500 leading-tight">
                    <p>{t('admin.risk.att')} <span className="font-extrabold text-gray-800 dark:text-gray-100">{pct(r.attendancePct)}</span></p>
                    <p className="flex items-center justify-end gap-1">{t('admin.risk.avg')} <span className="font-extrabold text-gray-800 dark:text-gray-100">{pct(r.avgTestPct)}</span> <TIcon className={tCls} /></p>
                  </div>
                  <Badge tone={r.riskLevel === 'high' ? 'red' : 'amber'} dot pulse={r.riskLevel === 'high'}>{t(`admin.risk.${r.riskLevel}`)}</Badge>
                </div>
                {r.reasons?.length > 0 && <p className="mt-1.5 pl-11 text-[11px] text-gray-500 line-clamp-2">{r.reasons.join(' · ')}</p>}
              </li>
            );
          })}
          {list.length > limit && <p className="text-center text-xs font-semibold text-gray-400 pt-1">{t('admin.dues.more', { n: list.length - limit })}</p>}
        </ul>
      )}
    </div>
  );
};

export default AtRiskCard;
