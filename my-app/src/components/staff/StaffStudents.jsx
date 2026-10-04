import React, { useMemo, useState } from 'react';
import { FiUsers, FiSearch, FiCreditCard, FiRefreshCw } from 'react-icons/fi';
import { PageHeader, Avatar, Badge, SkeletonRows, EmptyRow, Pagination, tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls, iconBtn } from '../admin/AdminUI';
import usePagination from '../admin/usePagination';
import { resolveUrl } from '../common/api';
import { formatINR } from '../admin/adminApi';
import { useI18n } from '../../i18n/useI18n';

/** Read-only student directory for staff (GET /users/students/all). */
const StaffStudents = ({ students = [], loading, onRefresh, onOpenFees }) => {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('all');

  const classes = useMemo(() => [...new Set(students.map(s => s.classId?.name).filter(Boolean))].sort(), [students]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return students.filter(s => (cls === 'all' || s.classId?.name === cls)
      && (!term || [s.name, s.userId?.email, s.fatherName, s.parentId?.name].some(v => (v || '').toLowerCase().includes(term))));
  }, [students, q, cls]);
  const pg = usePagination(filtered);

  return (
    <>
      <PageHeader
        icon={FiUsers}
        eyebrow={t('admin.group.frontDesk')}
        title={t('staff.heading.students')}
        subtitle={t('staff.students.subtitle', { shown: filtered.length, total: students.length })}
        actions={(
          <>
            <div className="relative sm:w-64">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input className="ui-input !pl-10" value={q} onChange={e => { setQ(e.target.value); pg.setPage(1); }} placeholder={t('staff.students.searchPh')} aria-label={t('staff.students.searchPh')} />
            </div>
            <select className="ui-input sm:!w-auto font-semibold" value={cls} onChange={e => { setCls(e.target.value); pg.setPage(1); }} aria-label={t('admin.common.class')}>
              <option value="all">{t('staff.students.allClasses')}</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={onRefresh} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
          </>
        )}
      />
      <div className="ui-card overflow-hidden">
        <div className={`${tableScroll} max-h-[68vh]`}>
          <table className="w-full text-left min-w-[760px]">
            <thead>
              <tr className={theadRow}>
                <th className={thCls}>{t('staff.students.student')}</th>
                <th className={thCls}>{t('admin.common.class')}</th>
                <th className={thCls}>{t('staff.students.guardian')}</th>
                <th className={thCls}>{t('admin.plan.totalFee')}</th>
                <th className={`${thCls} text-right`}>{t('admin.nav.fees')}</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {loading && students.length === 0 ? <SkeletonRows rows={6} cols={5} /> : pg.total === 0 ? (
                <EmptyRow colSpan={5} icon={FiUsers} title={t('staff.students.none')} />
              ) : pg.pageItems.map(s => (
                <tr key={s._id} className={rowCls}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} src={s.userId?.profilePhoto ? resolveUrl(s.userId.profilePhoto) : null} size="md" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate">{s.userId?.email || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}><Badge tone="gray">{s.classId?.name || '—'}{s.batchId?.name ? ` · ${s.batchId.name}` : ''}</Badge></td>
                  <td className={`${tdCls} text-sm text-gray-600 dark:text-gray-300`}>{s.parentId?.name || s.fatherName || '—'}</td>
                  <td className={`${tdCls} text-sm font-bold text-gray-800 dark:text-gray-100`}>{s.totalFee ? formatINR(s.totalFee) : '—'}</td>
                  <td className={`${tdCls} text-right`}>
                    <button type="button" onClick={() => onOpenFees?.(s._id)} className="ui-btn-secondary !py-1.5 !text-xs"><FiCreditCard /> {t('staff.students.openFees')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination {...pg} label={t('staff.students.label')} />
      </div>
    </>
  );
};

export default StaffStudents;
