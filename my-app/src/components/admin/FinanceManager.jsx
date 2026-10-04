import React, { useCallback, useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { FiTrendingUp, FiRefreshCw, FiDollarSign, FiShoppingBag, FiPieChart, FiAlertTriangle } from 'react-icons/fi';
import { api, formatINR } from './adminApi';
import { PageHeader, SkeletonBlock, EmptyState, iconBtn } from './AdminUI';
import { StatCard } from '../ui/Motion';
import { INK, GREY, tooltipStyle, baseScales, rupeeTick, brandGradient } from './chartTheme';
import SalaryPanel from './SalaryPanel';
import ExpensesPanel from './ExpensesPanel';
import { useI18n } from '../../i18n/useI18n';

const PnlCard = ({ reloadKey }) => {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.get('/finance/pnl', { months: 6 }));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const sum = (k) => (rows || []).reduce((a, r) => a + (r[k] || 0), 0);
  const income = sum('income');
  const profit = sum('profit');
  const hasData = (rows || []).some(r => r.income || r.salaries || r.expenses);

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 ui-stagger">
        <StatCard icon={FiTrendingUp} label={t('admin.pnl.income')} value={income} prefix="₹" hint={t('admin.pnl.sixMonths')} tone="brand" />
        <StatCard icon={FiDollarSign} label={t('admin.pnl.salaries')} value={sum('salaries')} prefix="₹" hint={t('admin.pnl.paidOnly')} tone="dark" />
        <StatCard icon={FiShoppingBag} label={t('admin.pnl.expenses')} value={sum('expenses')} prefix="₹" hint={t('admin.pnl.sixMonths')} tone="amber" />
        <StatCard icon={FiPieChart} label={t('admin.pnl.profit')} value={Math.abs(profit)} prefix={profit < 0 ? '-₹' : '₹'} hint={income > 0 ? t('admin.pnl.margin', { pct: ((profit / income) * 100).toFixed(1) }) : t('admin.pnl.sixMonths')} tone={profit < 0 ? 'red' : 'green'} />
      </div>
      <div className="ui-card p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><FiPieChart /></div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white tracking-tight">{t('admin.pnl.title')}</h3>
              <p className="text-xs text-gray-500">{t('admin.pnl.subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={load} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
        {rows === null && !failed ? <SkeletonBlock className="h-72" /> : failed && rows === null ? (
          <EmptyState icon={FiAlertTriangle} title={t('admin.common.loadFailed')} action={<button type="button" onClick={load} className="ui-btn-secondary"><FiRefreshCw /> {t('admin.common.retry')}</button>} />
        ) : !hasData ? (
          <EmptyState icon={FiPieChart} title={t('admin.pnl.empty')} hint={t('admin.pnl.emptyHint')} />
        ) : (
          <div className="h-72 md:h-80">
            <Bar
              data={{
                labels: rows.map(r => r.label || r.month),
                datasets: [
                  { type: 'line', label: t('admin.pnl.profit'), data: rows.map(r => r.profit), borderColor: '#10b981', backgroundColor: '#10b981', borderWidth: 2.5, pointBackgroundColor: '#fff', pointBorderWidth: 2, pointRadius: 4, tension: 0.35, order: 0 },
                  { label: t('admin.pnl.income'), data: rows.map(r => r.income), backgroundColor: (ctx) => brandGradient(ctx), borderRadius: 8, maxBarThickness: 28, order: 1 },
                  { label: t('admin.pnl.salaries'), data: rows.map(r => r.salaries), backgroundColor: INK, borderRadius: 8, maxBarThickness: 28, order: 1 },
                  { label: t('admin.pnl.expenses'), data: rows.map(r => r.expenses), backgroundColor: GREY, borderRadius: 8, maxBarThickness: 28, order: 1 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, color: '#94a3b8', font: { family: 'Outfit, sans-serif', weight: '600' } } },
                  tooltip: { ...tooltipStyle, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatINR(ctx.parsed.y)}` } },
                },
                scales: { ...baseScales, y: { ...baseScales.y, beginAtZero: true, ticks: { ...baseScales.y.ticks, callback: rupeeTick } } },
              }}
            />
          </div>
        )}
      </div>
    </>
  );
};

/** Finance tab: P&L (last 6 months), salaries, expenses. Admin only. */
const FinanceManager = ({ teachers, onTeachersChanged }) => {
  const { t } = useI18n();
  const [section, setSection] = useState('salaries');
  const [pnlKey, setPnlKey] = useState(0);
  const bump = () => setPnlKey(k => k + 1);

  return (
    <>
      <PageHeader icon={FiDollarSign} eyebrow={t('admin.group.finance')} title={t('admin.heading.finance')} subtitle={t('admin.finance.subtitle')} />
      <PnlCard reloadKey={pnlKey} />
      <div className="inline-flex p-1 rounded-2xl bg-gray-100 dark:bg-white/5" role="tablist">
        {['salaries', 'expenses'].map(s => (
          <button key={s} type="button" role="tab" aria-selected={section === s} onClick={() => { setSection(s); bump(); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${section === s ? 'bg-white dark:bg-ink-800 text-brand-600 shadow-card' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}>
            {t(`admin.finance.tab.${s}`)}
          </button>
        ))}
      </div>
      <div key={section} className="animate-fade-up">
        {section === 'salaries' ? <SalaryPanel teachers={teachers} onTeachersChanged={onTeachersChanged} /> : <ExpensesPanel onChanged={bump} />}
      </div>
    </>
  );
};

export default FinanceManager;
