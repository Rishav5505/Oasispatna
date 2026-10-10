import React, { useCallback, useEffect, useState } from 'react';
import { FiCalendar, FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiChevronRight } from 'react-icons/fi';
import { api, formatINR } from './adminApi';
import { Avatar, Badge, SkeletonBlock, EmptyState, iconBtn } from './AdminUI';
import { useI18n } from '../../i18n/useI18n';

const dueChip = (daysLeft, t) => {
  if (daysLeft < 0) return { tone: 'red', text: t('admin.dues.overdueBy', { n: -daysLeft }) };
  if (daysLeft === 0) return { tone: 'red', text: t('admin.dues.today') };
  if (daysLeft === 1) return { tone: 'amber', text: t('admin.dues.tomorrow') };
  return { tone: daysLeft <= 3 ? 'amber' : 'gray', text: t('admin.dues.inDays', { n: daysLeft }) };
};

/**
 * Unpaid installments due within N days, overdue included (GET /finance/upcoming-dues?days=).
 * compact: short list for overview cards. onSelectStudent(studentId) makes rows clickable.
 */
const UpcomingDues = ({ compact = false, limit, onSelectStudent, onViewAll, reloadKey = 0, className = '', classFilter = '' }) => {
  const { t } = useI18n();
  const [days, setDays] = useState(compact ? 7 : 14);
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.get('/finance/upcoming-dues', { days }));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const list = classFilter ? (rows || []).filter(r => r.className === classFilter) : (rows || []);
  const overdue = list.filter(r => r.daysLeft < 0);
  const total = list.reduce((a, r) => a + (r.amount || 0), 0);
  const shown = limit ? list.slice(0, limit) : list;

  return (
    <div className={`ui-card overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-6 py-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0"><FiCalendar /></div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
              {t('admin.dues.title')}
              {overdue.length > 0 && <Badge tone="red" dot pulse>{t('admin.dues.overdueCount', { n: overdue.length })}</Badge>}
            </h3>
            <p className="text-xs text-gray-500">{t('admin.dues.summary', { n: list.length, amt: formatINR(total) })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!compact && (
            <select value={days} onChange={e => setDays(Number(e.target.value))} className="ui-input !w-auto !py-2 text-sm font-semibold" aria-label={t('admin.dues.window')}>
              {[7, 14, 30, 60].map(d => <option key={d} value={d}>{t('admin.dues.nextDays', { n: d })}</option>)}
            </select>
          )}
          {onViewAll && <button type="button" onClick={onViewAll} className="ui-btn-secondary !py-2 !text-xs">{t('admin.common.viewAll')} <FiChevronRight /></button>}
          <button type="button" onClick={load} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>
      <div className={`px-3 md:px-4 pb-4 ${compact ? '' : 'max-h-[30rem] overflow-y-auto ui-scrollbar'}`}>
        {rows === null && !failed ? (
          <div className="space-y-2 px-2">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-14 !rounded-2xl" />)}</div>
        ) : failed && rows === null ? (
          <EmptyState icon={FiAlertTriangle} title={t('admin.common.loadFailed')} action={<button type="button" onClick={load} className="ui-btn-secondary"><FiRefreshCw /> {t('admin.common.retry')}</button>} />
        ) : list.length === 0 ? (
          <EmptyState icon={FiCheckCircle} title={t('admin.dues.empty')} hint={t('admin.dues.emptyHint')} />
        ) : (
          <ul className="space-y-1.5">
            {shown.map(r => {
              const chip = dueChip(r.daysLeft, t);
              const Tag = onSelectStudent ? 'button' : 'div';
              return (
                <li key={`${r.studentId}-${r.installmentId}`}>
                  <Tag
                    {...(onSelectStudent ? { type: 'button', onClick: () => onSelectStudent(r.studentId, r) } : {})}
                    className={`group w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-colors ${r.daysLeft < 0 ? 'bg-red-50/60 dark:bg-red-500/5' : ''} ${onSelectStudent ? 'hover:bg-brand-50/60 dark:hover:bg-white/5' : ''}`}
                  >
                    <Avatar name={r.studentName} size="sm" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{r.studentName}</span>
                      <span className="block text-[11px] text-gray-500 truncate">{[r.className && `${t('admin.common.class')} ${r.className}`, r.installmentLabel].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-extrabold text-gray-900 dark:text-white tabular-nums">{formatINR(r.amount)}</span>
                      <Badge tone={chip.tone} className="!text-[10px]">{chip.text}</Badge>
                    </span>
                  </Tag>
                </li>
              );
            })}
          </ul>
        )}
        {limit && list.length > limit && <p className="pt-2 text-center text-xs font-semibold text-gray-400">{t('admin.dues.more', { n: list.length - limit })}</p>}
      </div>
    </div>
  );
};

export default UpcomingDues;
