import React, { useCallback, useEffect, useState } from 'react';
import { FiCalendar, FiInbox, FiFileText, FiCreditCard, FiRefreshCw, FiArrowRight, FiPhone } from 'react-icons/fi';
import { api } from '../admin/adminApi';
import { Avatar, Badge, EmptyState, SkeletonBlock } from '../admin/AdminUI';
import { timeAgo } from '../admin/liveStatus';
import UpcomingDues from '../admin/UpcomingDues';
import UpcomingEventsCard from '../common/UpcomingEventsCard';
import { StatCard, GradientBanner } from '../ui/Motion';
import { greeting } from '../ui/motionUtils';
import { useI18n } from '../../i18n/useI18n';

const ListCard = ({ icon, title, cta, onCta, children }) => {
  const Icon = icon;
  return (
  <div className="ui-card p-5 md:p-6">
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><Icon /></span>{title}
      </h3>
      {onCta && <button type="button" onClick={onCta} className="ui-btn-secondary !py-2 !text-xs">{cta} <FiArrowRight /></button>}
    </div>
    {children}
  </div>
  );
};

/** Staff home: today's dues, new leads, pending admissions & payments. Real data only. */
const StaffOverview = ({ name, leads = [], onNavigate, onOpenFeeStudent, reloadKey = 0 }) => {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => Promise.all([
    api.get('/finance/upcoming-dues', { days: 1 }).catch(() => null),
    api.get('/admissions', { status: 'submitted' }).catch(() => null),
    api.get('/fees/pending').catch(() => null),
  ]).then(([dues, admissions, pending]) => setData({ dues, admissions, pending }))
    .finally(() => setLoading(false)), []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const newLeads = leads.filter(l => (l.status || 'new') === 'new');
  const dues = (data?.dues || []).filter(d => d.daysLeft <= 0);
  const dueAmount = dues.reduce((a, d) => a + (d.amount || 0), 0);
  const v = (x) => (x == null ? 0 : x.length);
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <GradientBanner
        title={`${greeting()}, ${(name || '').split(' ')[0] || t('admin.role.staff')} 👋`}
        subtitle={date}
        right={<button type="button" onClick={() => { setLoading(true); load(); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all"><FiRefreshCw className={loading ? 'animate-spin' : ''} /> {t('admin.common.refresh')}</button>}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { icon: FiCalendar, text: t('staff.chip.dues', { n: dues.length }), tab: 'fees', hot: dues.length > 0 },
            { icon: FiInbox, text: t('staff.chip.leads', { n: newLeads.length }), tab: 'leads', hot: newLeads.length > 0 },
            { icon: FiFileText, text: t('staff.chip.admissions', { n: v(data?.admissions) }), tab: 'admissions', hot: v(data?.admissions) > 0 },
          ].map((c) => (
            <button key={c.tab} type="button" onClick={() => onNavigate(c.tab)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20 text-xs font-bold text-white hover:bg-white/25 transition-all">
              {c.hot && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}<c.icon /> {loading && !data ? '…' : c.text}
            </button>
          ))}
        </div>
      </GradientBanner>

      {loading && !data ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <SkeletonBlock key={i} className="h-32" />)}</div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 ui-stagger">
          <StatCard icon={FiCalendar} label={t('staff.stat.dues')} value={dues.length} hint={t('staff.stat.duesHint', { amt: `₹${dueAmount.toLocaleString('en-IN')}` })} tone={dues.length ? 'red' : 'dark'} onClick={() => onNavigate('fees')} />
          <StatCard icon={FiInbox} label={t('staff.stat.leads')} value={newLeads.length} hint={t('staff.stat.leadsHint')} tone="brand" onClick={() => onNavigate('leads')} />
          <StatCard icon={FiFileText} label={t('staff.stat.admissions')} value={v(data?.admissions)} hint={t('staff.stat.admissionsHint')} tone="amber" onClick={() => onNavigate('admissions')} />
          <StatCard icon={FiCreditCard} label={t('staff.stat.payments')} value={v(data?.pending)} hint={t('staff.stat.paymentsHint')} tone={v(data?.pending) ? 'amber' : 'green'} onClick={() => onNavigate('fees')} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <UpcomingDues compact limit={6} onSelectStudent={onOpenFeeStudent} onViewAll={() => onNavigate('fees')} reloadKey={reloadKey} />
        <ListCard icon={FiInbox} title={t('staff.newLeads')} cta={t('admin.common.viewAll')} onCta={() => onNavigate('leads')}>
          {newLeads.length === 0 ? <EmptyState icon={FiInbox} title={t('staff.noNewLeads')} /> : (
            <ul className="space-y-1.5">
              {newLeads.slice(0, 6).map(l => (
                <li key={l._id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-brand-50/50 dark:hover:bg-white/5">
                  <Avatar name={l.name} size="sm" />
                  <span className="flex-1 min-w-0"><span className="block text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{l.name}</span><span className="block text-[11px] text-gray-500 truncate">{[l.course, l.phone].filter(Boolean).join(' · ')}</span></span>
                  {l.phone && <a href={`tel:${l.phone}`} className="w-8 h-8 rounded-lg text-brand-600 hover:bg-brand-50 flex items-center justify-center" aria-label={t('staff.call', { name: l.name })}><FiPhone /></a>}
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
        <ListCard icon={FiFileText} title={t('staff.pendingAdmissions')} cta={t('admin.common.viewAll')} onCta={() => onNavigate('admissions')}>
          {!data?.admissions || data.admissions.length === 0 ? <EmptyState icon={FiFileText} title={t('staff.noAdmissions')} /> : (
            <ul className="space-y-1.5">
              {data.admissions.slice(0, 6).map(a => (
                <li key={a._id}>
                  <button type="button" onClick={() => onNavigate('admissions')} className="w-full flex items-center gap-3 p-2 rounded-2xl text-left hover:bg-brand-50/50 dark:hover:bg-white/5">
                    <Avatar name={a.studentName} size="sm" />
                    <span className="flex-1 min-w-0"><span className="block text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{a.studentName}</span><span className="block text-[11px] font-mono text-gray-400">{a.applicationNo}</span></span>
                    <Badge tone="gray">{a.classApplying?.name || '—'}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
      </div>
      <UpcomingEventsCard limit={5} onViewAll={() => onNavigate('calendar')} />
    </div>
  );
};

export default StaffOverview;
