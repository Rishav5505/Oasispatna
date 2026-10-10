import React, { useMemo, useState } from 'react';
import { FiCreditCard, FiPrinter, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { formatINR } from '../adminApi';
import { Avatar, Badge, EmptyRow, SkeletonRows, Pagination, tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls, iconBtn } from '../AdminUI';
import usePagination from '../usePagination';
import { printInvoice } from '../printDocs';
import { fmtDate } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

const tone = (s) => { const v = String(s || 'Paid').toLowerCase(); return v === 'paid' ? 'green' : v === 'rejected' ? 'red' : 'amber'; };

/** Every fee entry (GET /fees/all), optionally narrowed to one class via `classOf(studentId)`. */
const TransactionsTable = ({ fees, loading, onRefresh, classFilter = '', classOf }) => {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (fees || []).filter(f => {
      const sid = f.studentId?._id || f.studentId;
      if (classFilter && classOf(sid) !== classFilter) return false;
      return !needle || [f.studentId?.name, f.transactionId, f.mode].some(v => (v || '').toLowerCase().includes(needle));
    });
  }, [fees, q, classFilter, classOf]);
  const pg = usePagination(list);

  return (
    <div className="ui-card overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 md:px-6 py-5">
        <div>
          <h3 className="font-extrabold text-gray-900 dark:text-white">{t('admin.fd.tx.title')}</h3>
          <p className="text-xs text-gray-500">{t('staff.fees.records', { n: list.length })}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className="ui-input !pl-10" value={q} onChange={e => { setQ(e.target.value); pg.setPage(1); }} placeholder={t('admin.fd.tx.search')} aria-label={t('admin.fd.tx.search')} />
          </div>
          <button type="button" onClick={onRefresh} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>
      <div className={`${tableScroll} max-h-[36rem]`}>
        <table className="w-full text-left min-w-[760px]">
          <thead>
            <tr className={theadRow}>
              <th className={thCls}>{t('staff.students.student')}</th>
              <th className={thCls}>{t('admin.common.date')}</th>
              <th className={thCls}>{t('admin.fd.pay.mode')}</th>
              <th className={thCls}>{t('admin.plan.amount')}</th>
              <th className={thCls}>{t('admin.common.status')}</th>
              <th className={`${thCls} text-right`}>{t('admin.fees.invoice')}</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {fees === null || (loading && fees.length === 0) ? <SkeletonRows rows={5} cols={6} /> : pg.total === 0 ? (
              <EmptyRow colSpan={6} icon={FiCreditCard} title={t('staff.fees.noTransactions')} hint={t('admin.fd.tx.emptyHint')} />
            ) : pg.pageItems.map(f => {
              const sid = f.studentId?._id || f.studentId;
              return (
                <tr key={f._id} className={rowCls}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      <Avatar name={f.studentId?.name || '?'} size="sm" />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{f.studentId?.name || '—'}</p>
                        <p className="text-[11px] text-gray-400 truncate">{classOf(sid) || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${tdCls} text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap`}>{fmtDate(f.date || f.createdAt)}</td>
                  <td className={`${tdCls} text-sm font-semibold text-gray-600 dark:text-gray-300`}>
                    {f.mode || '—'}
                    {f.transactionId && <span className="block text-[11px] font-mono text-gray-400 break-all">{f.transactionId}</span>}
                  </td>
                  <td className={`${tdCls} font-extrabold text-gray-900 dark:text-white tabular-nums`}>{formatINR(f.amount)}</td>
                  <td className={tdCls}><Badge tone={tone(f.status)} dot>{f.status || 'Paid'}</Badge></td>
                  <td className={`${tdCls} text-right`}>
                    {tone(f.status) === 'green'
                      ? <button type="button" onClick={() => printInvoice(f._id)} className={iconBtn} title={t('admin.fees.invoice')} aria-label={t('admin.fees.invoiceFor', { name: f.studentId?.name || '' })}><FiPrinter /></button>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination {...pg} label={t('staff.fees.transactionsLabel')} />
    </div>
  );
};

export default TransactionsTable;
