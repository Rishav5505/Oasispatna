import React from 'react';
import { FiTarget, FiCheckCircle, FiAlertCircle, FiClock, FiCalendar } from 'react-icons/fi';
import { AnimatedNumber } from '../../ui/Motion';
import { ProgressBar } from '../AdminUI';
import { formatINR } from '../adminApi';
import { pctOf } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

const TONES = {
  dark: 'bg-ink-900 text-white',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/10',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10',
};

const Tile = ({ icon, label, value, prefix, hint, tone, onClick, children, className = '' }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag {...(onClick ? { type: 'button', onClick } : {})} className={`ui-card ui-card-hover group p-4 text-left w-full min-w-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${TONES[tone]}`}>{React.createElement(icon)}</span>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
      </div>
      <p className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white truncate tabular-nums">
        <AnimatedNumber value={value} prefix={prefix} />
      </p>
      {children}
      {hint && <p className="mt-1 text-[11px] font-medium text-gray-500 truncate">{hint}</p>}
    </Tag>
  );
};

/** Top-of-desk numbers. All values come from /finance/class-fees, /fees/pending and /finance/upcoming-dues. */
const FeeSummaryCards = ({ classes, pendingCount, dueWeek, onGo }) => {
  const { t } = useI18n();
  if (classes === null) {
    return <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">{[0, 1, 2, 3, 4].map(i => <div key={i} className="ui-skeleton h-28 rounded-3xl" />)}</div>;
  }
  const sum = (k) => classes.reduce((a, c) => a + (Number(c[k]) || 0), 0);
  const expected = sum('expected');
  const collected = sum('collected');
  const pending = sum('pending');
  const dueAmt = (dueWeek || []).reduce((a, r) => a + (Number(r.amount) || 0), 0);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 ui-stagger">
      <Tile className="col-span-2 lg:col-span-1" icon={FiTarget} tone="dark" label={t('admin.fd.sum.expected')} value={expected} prefix="₹" hint={t('admin.fd.sum.expectedHint', { n: sum('students') })} />
      <Tile icon={FiCheckCircle} tone="green" label={t('admin.fd.sum.collected')} value={collected} prefix="₹">
        <ProgressBar value={pctOf(collected, expected)} barClass="bg-emerald-500" className="mt-2 !h-1.5" />
      </Tile>
      <Tile icon={FiAlertCircle} tone="red" label={t('admin.fd.sum.pending')} value={pending} prefix="₹" hint={t('admin.fd.sum.pendingHint')} onClick={() => onGo('dues')} />
      <Tile icon={FiClock} tone={pendingCount ? 'amber' : 'brand'} label={t('admin.fd.sum.approvals')} value={pendingCount ?? '—'} hint={pendingCount ? t('admin.fd.sum.approvalsHint') : t('admin.fd.sum.approvalsNone')} onClick={() => onGo('approvals')} />
      <Tile icon={FiCalendar} tone="brand" label={t('admin.fd.sum.week')} value={dueWeek ? dueWeek.length : '—'} hint={dueWeek ? t('admin.fd.sum.weekHint', { amt: formatINR(dueAmt) }) : undefined} onClick={() => onGo('dues')} />
    </div>
  );
};

export default FeeSummaryCards;
