import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCreditCard, FiSliders, FiClock, FiAlertCircle, FiList, FiHelpCircle, FiRefreshCw, FiFilter } from 'react-icons/fi';
import { api, toastError } from '../adminApi';
import { toast } from '../../../utils/notify';
import { PageHeader } from '../AdminUI';
import FeeApprovals from '../FeeApprovals';
import UpcomingDues from '../UpcomingDues';
import HowItWorks from './HowItWorks';
import FeeSummaryCards from './FeeSummaryCards';
import ClassFeeSetup from './ClassFeeSetup';
import CollectPayment from './CollectPayment';
import TransactionsTable from './TransactionsTable';
import { readFlag, writeFlag } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

const HOW_KEY = 'oasis.fees.howDismissed';
const NO_SEL = { classId: null, studentId: null };

/**
 * The whole fees section, shared by the admin and staff dashboards.
 * canManage=false (staff) hides everything the backend rejects with 403: class structures, applying, plan edits, reminders.
 * students: the dashboard's student list (used only to map a student to their class).
 */
const FeesDesk = ({ canManage = false, students = [], focusStudentId, onFocusHandled, onDataChanged, eyebrow, title, subtitle }) => {
  const { t } = useI18n();
  const [tab, setTab] = useState('collect');
  const [sel, setSel] = useState(NO_SEL);
  const [classes, setClasses] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [dueWeek, setDueWeek] = useState(null);
  const [fees, setFees] = useState(null);
  const [feesLoading, setFeesLoading] = useState(false);
  const [showHow, setShowHow] = useState(() => !readFlag(HOW_KEY));
  const [classFilter, setClassFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    const [c, p, d] = await Promise.allSettled([
      api.get('/finance/class-fees'),
      api.get('/fees/pending'),
      api.get('/finance/upcoming-dues', { days: 7 }),
    ]);
    if (c.status === 'fulfilled') setClasses(c.value);
    else { setClasses(prev => prev || []); toastError(c.reason, t('admin.common.loadFailed')); }
    if (p.status === 'fulfilled') setPendingCount(p.value.length);
    if (d.status === 'fulfilled') setDueWeek(d.value);
  }, [t]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const loadFees = useCallback(async () => {
    setFeesLoading(true);
    try {
      setFees(await api.get('/fees/all'));
    } catch (err) {
      setFees(prev => prev || []);
      toastError(err, t('admin.common.loadFailed'));
    } finally {
      setFeesLoading(false);
    }
  }, [t]);

  // Transactions are only fetched once that tab is opened (and again after something changed).
  useEffect(() => { if (tab === 'tx' && fees === null) loadFees(); }, [tab, fees, loadFees]);

  // Anything that moves money or plans: refresh numbers here and tell the dashboard.
  const changed = useCallback(() => {
    loadSummary();
    setFees(null);
    setReloadKey(k => k + 1);
    onDataChanged?.();
  }, [loadSummary, onDataChanged]);

  const refreshAll = async () => {
    setRefreshing(true);
    setFees(null);
    setReloadKey(k => k + 1);
    await loadSummary();
    setRefreshing(false);
  };

  const classNameOf = useMemo(() => {
    const m = new Map(students.map(s => [String(s._id), s.classId?.name || '']));
    return (id) => m.get(String(id)) || '';
  }, [students]);

  // Jump into step 3 for a student picked from dues / defaulters / another screen.
  const collectFor = useCallback((studentId, row) => {
    const s = students.find(x => String(x._id) === String(studentId));
    const name = row?.className || s?.classId?.name;
    const cid = s?.classId?._id || (typeof s?.classId === 'string' ? s.classId : null)
      || (classes || []).find(c => c.className === name)?.classId;
    if (!cid) { toast.error(t('admin.fd.noClassForStudent')); return false; }
    setSel({ classId: String(cid), studentId: String(studentId) });
    setTab('collect');
    return true;
  }, [students, classes, t]);

  const hasStudents = students.length > 0;
  useEffect(() => {
    if (!focusStudentId || classes === null || !hasStudents) return;
    Promise.resolve().then(() => { collectFor(focusStudentId); onFocusHandled?.(); });
  }, [focusStudentId, classes, hasStudents, collectFor, onFocusHandled]);

  const dismissHow = () => { setShowHow(false); writeFlag(HOW_KEY, true); };
  const reopenHow = () => { setShowHow(true); writeFlag(HOW_KEY, false); };
  const go = (id) => setTab(id);

  const tabs = [
    { id: 'collect', icon: FiCreditCard, label: t('admin.fd.tab.collect') },
    { id: 'setup', icon: FiSliders, label: t('admin.fd.tab.setup'), warn: (classes || []).some(c => !c.structure || (c.students > 0 && c.withoutPlan > 0)) },
    { id: 'approvals', icon: FiClock, label: t('admin.fd.tab.approvals'), badge: pendingCount || 0 },
    { id: 'dues', icon: FiAlertCircle, label: t('admin.fd.tab.dues') },
    { id: 'tx', icon: FiList, label: t('admin.fd.tab.tx') },
  ];

  const classSelect = (
    <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
      <FiFilter /> <span className="hidden sm:inline">{t('admin.fd.filterClass')}</span>
      <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="ui-input !w-auto !py-2 text-sm font-semibold" aria-label={t('admin.fd.filterClass')}>
        <option value="">{t('admin.fd.allClasses')}</option>
        {(classes || []).map(c => <option key={c.classId} value={c.className}>{c.className}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        icon={FiCreditCard}
        eyebrow={eyebrow || t('admin.group.finance')}
        title={title || t('admin.fd.title')}
        subtitle={subtitle || t('admin.fd.subtitle')}
        actions={(
          <div className="flex gap-2">
            {!showHow && <button type="button" onClick={reopenHow} className="ui-btn-secondary !py-2.5 !text-xs"><FiHelpCircle /> {t('admin.fd.how.title')}</button>}
            <button type="button" onClick={refreshAll} className="ui-btn-secondary !py-2.5 !text-xs"><FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> {t('admin.common.refresh')}</button>
          </div>
        )}
      />

      {showHow && <HowItWorks onDismiss={dismissHow} onGo={go} canManage={canManage} />}

      <FeeSummaryCards classes={classes} pendingCount={pendingCount} dueWeek={dueWeek} onGo={go} />

      <div className="flex gap-1.5 overflow-x-auto ui-scrollbar p-1.5 rounded-2xl bg-gray-100 dark:bg-white/5 w-full lg:w-fit" role="tablist" aria-label={t('admin.fd.title')}>
        {tabs.map(x => {
          const on = tab === x.id;
          return (
            <button key={x.id} type="button" role="tab" aria-selected={on} onClick={() => setTab(x.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${on ? 'bg-white dark:bg-ink-900 text-brand-700 dark:text-brand-300 shadow-card' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
              <x.icon /> {x.label}
              {x.badge > 0 && <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-600 text-white text-[11px] font-extrabold flex items-center justify-center">{x.badge}</span>}
              {x.warn && !on && <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div key={tab} className="animate-fade-in space-y-5">
        {tab === 'collect' && <CollectPayment classes={classes} sel={sel} setSel={setSel} canManage={canManage} onPaid={changed} />}

        {tab === 'setup' && (
          <ClassFeeSetup classes={classes} canManage={canManage} onChanged={async () => { await loadSummary(); setReloadKey(k => k + 1); onDataChanged?.(); }} onCollect={(id) => { setSel({ classId: String(id), studentId: null }); setTab('collect'); }} />
        )}

        {tab === 'approvals' && (
          <>
            <div className="flex justify-end">{classSelect}</div>
            <FeeApprovals show="approvals" classFilter={classFilter} onChanged={changed} />
          </>
        )}

        {tab === 'dues' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.fd.dues.hint')}</p>
              {classSelect}
            </div>
            <UpcomingDues classFilter={classFilter} reloadKey={reloadKey} onSelectStudent={collectFor} />
            <FeeApprovals show="defaulters" classFilter={classFilter} canRemind={canManage} reloadKey={reloadKey} onSelectStudent={collectFor} />
          </>
        )}

        {tab === 'tx' && (
          <>
            <div className="flex justify-end">{classSelect}</div>
            <TransactionsTable fees={fees} loading={feesLoading} onRefresh={loadFees} classFilter={classFilter} classOf={classNameOf} />
          </>
        )}
      </div>
    </div>
  );
};

export default FeesDesk;
