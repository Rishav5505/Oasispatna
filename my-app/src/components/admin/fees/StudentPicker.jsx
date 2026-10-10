import React, { useMemo, useState } from 'react';
import { FiSearch, FiChevronRight, FiUsers, FiCheckCircle, FiAlertTriangle, FiCalendar } from 'react-icons/fi';
import { formatINR } from '../adminApi';
import { Avatar, Badge, ProgressBar, EmptyState } from '../AdminUI';
import { fmtDate, pctOf, isOverdue } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

const FILTERS = {
  all: () => true,
  dues: (s) => s.pending > 0,
  overdue: (s) => isOverdue(s),
  paid: (s) => s.totalFee > 0 && s.pending <= 0,
};

/** Step 2 of collecting: searchable, filterable list of one class's students with their fee position. */
const StudentPicker = ({ students, onPick }) => {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => Object.fromEntries(Object.entries(FILTERS).map(([k, fn]) => [k, (students || []).filter(fn).length])), [students]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (students || []).filter(FILTERS[filter]).filter(s => !needle || [s.name, s.fatherName, s.phone, s.batchName].some(v => (v || '').toLowerCase().includes(needle)));
  }, [students, q, filter]);

  if (students === null) {
    return <div className="space-y-2.5">{[0, 1, 2, 3].map(i => <div key={i} className="ui-skeleton h-20 rounded-2xl" />)}</div>;
  }
  if (students.length === 0) {
    return <div className="ui-card"><EmptyState icon={FiUsers} title={t('admin.fd.pick.noStudents')} hint={t('admin.fd.pick.noStudentsHint')} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input className="ui-input !pl-10" value={q} onChange={e => setQ(e.target.value)} placeholder={t('admin.fd.pick.search')} aria-label={t('admin.fd.pick.search')} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto ui-scrollbar pb-1 lg:pb-0" role="tablist" aria-label={t('admin.fd.pick.filter')}>
          {Object.keys(FILTERS).map(k => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${filter === k
                ? (k === 'overdue' ? 'bg-red-600 text-white' : 'bg-ink-900 text-white dark:bg-white dark:text-ink-900')
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300'}`}>
              {t(`admin.fd.pick.f.${k}`)} <span className="opacity-70 tabular-nums">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="ui-card"><EmptyState icon={FiSearch} title={t('admin.fd.pick.noMatch')} /></div>
      ) : (
        <ul className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {list.map(s => {
            const over = isOverdue(s);
            const done = s.totalFee > 0 && s.pending <= 0;
            return (
              <li key={s.studentId}>
                <button type="button" onClick={() => onPick(s.studentId)}
                  className={`group w-full text-left ui-card ui-card-hover !rounded-2xl p-4 flex items-center gap-3.5 ${over ? '!ring-1 !ring-red-300 bg-red-50/40 dark:bg-red-500/5' : ''}`}>
                  <Avatar name={s.name} size="lg" />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 dark:text-white truncate">{s.name}</span>
                      {over && <Badge tone="red" dot pulse className="shrink-0">{t('admin.plan.st.overdue')}</Badge>}
                      {done && <Badge tone="green" className="shrink-0"><FiCheckCircle /> {t('admin.fd.pick.fullyPaid')}</Badge>}
                    </span>
                    <span className="block text-[11px] text-gray-500 truncate">
                      {[s.fatherName && t('admin.fd.pick.father', { name: s.fatherName }), s.batchName && `${t('admin.common.batch')} ${s.batchName}`].filter(Boolean).join(' · ') || '—'}
                    </span>
                    <span className="flex items-center justify-between text-[11px] font-bold mt-2 mb-1">
                      <span className="text-emerald-600">{t('admin.fd.pick.paid', { amt: formatINR(s.paid) })}</span>
                      <span className={s.pending > 0 ? 'text-red-600' : 'text-gray-400'}>{t('admin.fd.pick.pending', { amt: formatINR(s.pending) })}</span>
                    </span>
                    <ProgressBar value={pctOf(s.paid, s.totalFee)} barClass={over ? 'bg-red-500' : 'bg-emerald-500'} className="!h-1.5" />
                    <span className="flex flex-wrap gap-1.5 mt-2">
                      {s.nextDue && (
                        <Badge tone={over ? 'red' : 'amber'}><FiCalendar /> {t('admin.fd.pick.next', { amt: formatINR(s.nextDue.amount), date: fmtDate(s.nextDue.dueDate) })}</Badge>
                      )}
                      {!s.hasPlan && <Badge tone="gray"><FiAlertTriangle /> {t('admin.fd.pick.noPlan')}</Badge>}
                      {s.hasPlan && <Badge tone="gray">{t('admin.fd.pick.instDone', { a: s.installmentsPaid, b: s.installmentsTotal })}</Badge>}
                    </span>
                  </span>
                  <FiChevronRight className="shrink-0 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default StudentPicker;
