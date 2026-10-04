import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCreditCard, FiSearch, FiX, FiChevronRight, FiCheckCircle, FiPrinter, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { api, toastError, toastSuccess, formatINR } from '../admin/adminApi';
import { PageHeader, Avatar, Badge, EmptyRow, SkeletonRows, Pagination, inputCls, labelCls, tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls, iconBtn } from '../admin/AdminUI';
import usePagination from '../admin/usePagination';
import FeePlanCard from '../admin/FeePlanCard';
import UpcomingDues from '../admin/UpcomingDues';
import FeeApprovals from '../admin/FeeApprovals';
import { printInvoice } from '../admin/printDocs';
import { useI18n } from '../../i18n/useI18n';

const EMPTY_PAY = { amount: '', type: 'Tuition', mode: 'Cash', remarks: '' };
const MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'];
const tone = (s) => { const v = String(s || 'Paid').toLowerCase(); return v === 'paid' ? 'green' : v === 'rejected' ? 'red' : 'amber'; };

/* Selected student: plan (read-only), record payment, history with invoices */
const StudentFeePanel = ({ student, onClose, onPaid }) => {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [pay, setPay] = useState(EMPTY_PAY);
  const [saving, setSaving] = useState(false);
  const [planKey, setPlanKey] = useState(0);

  const load = useCallback(() => api.get(`/fees/student/${student._id}`)
    .then(setData)
    .catch(err => { setData({ payments: [] }); toastError(err, t('admin.common.loadFailed')); }), [student._id, t]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/fees/pay', { studentId: student._id, amount: Number(pay.amount), type: pay.type, mode: pay.mode, remarks: pay.remarks || pay.mode });
      toastSuccess(t('staff.fees.recorded', { amt: formatINR(pay.amount), name: student.name }));
      setPay(EMPTY_PAY);
      load();
      setPlanKey(k => k + 1);
      onPaid?.();
    } catch (err) {
      toastError(err, t('staff.fees.recordFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 animate-fade-up">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl bg-brand-sunset text-white p-6 shadow-brand-glow">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <Avatar name={student.name} size="lg" className="!ring-white/30" />
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold truncate">{student.name}</h3>
              <p className="text-white/70 text-sm truncate">{[student.classId?.name && `${t('admin.common.class')} ${student.classId.name}`, student.batchId?.name].filter(Boolean).join(' · ')}</p>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0" aria-label={t('admin.common.close')}><FiX /></button>
          </div>
          {data && (
            <div className="relative grid grid-cols-3 gap-2 mt-5">
              {[[t('admin.plan.net'), data.totalFees], [t('admin.plan.paid'), data.paidFees], [t('admin.plan.pending'), data.pendingFees]].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-black/15 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{l}</p><p className="font-extrabold truncate">{formatINR(v)}</p></div>
              ))}
            </div>
          )}
        </div>
        <FeePlanCard studentId={student._id} reloadKey={planKey} />
      </div>

      <div className="lg:col-span-2 space-y-5">
        <form onSubmit={submit} className="ui-card p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="md:col-span-2 font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5"><span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiPlus /></span> {t('staff.fees.record')}</h3>
          <div>
            <label className={labelCls} htmlFor="sp-amt">{t('admin.plan.amount')}</label>
            <input id="sp-amt" type="number" min="1" required className={`${inputCls} text-lg`} value={pay.amount} onChange={e => setPay(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls} htmlFor="sp-type">{t('staff.fees.type')}</label>
            <select id="sp-type" className={inputCls} value={pay.type} onChange={e => setPay(p => ({ ...p, type: e.target.value }))}>
              {['Tuition', 'Exam', 'Registration', 'Other'].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="sp-mode">{t('admin.sal.mode')}</label>
            <select id="sp-mode" className={inputCls} value={pay.mode} onChange={e => setPay(p => ({ ...p, mode: e.target.value }))}>
              {MODES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="sp-rem">{t('staff.fees.remarks')}</label>
            <input id="sp-rem" className={inputCls} value={pay.remarks} onChange={e => setPay(p => ({ ...p, remarks: e.target.value }))} placeholder={t('staff.fees.remarksPh')} />
          </div>
          <button type="submit" disabled={saving} className="md:col-span-2 ui-btn-primary !py-3"><FiCheckCircle /> {saving ? t('admin.common.saving') : t('staff.fees.confirm')}</button>
        </form>

        <div className="ui-card overflow-hidden">
          <div className="px-5 md:px-6 py-5 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 dark:text-white">{t('staff.fees.history')}</h3>
            <button type="button" onClick={load} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw /></button>
          </div>
          <div className={`${tableScroll} max-h-[28rem]`}>
            <table className="w-full text-left min-w-[560px]">
              <thead><tr className={theadRow}><th className={thCls}>{t('admin.common.date')}</th><th className={thCls}>{t('staff.fees.type')}</th><th className={thCls}>{t('admin.plan.amount')}</th><th className={thCls}>{t('admin.common.status')}</th><th className={`${thCls} text-right`}>{t('admin.fees.invoice')}</th></tr></thead>
              <tbody className={tbodyCls}>
                {!data ? <SkeletonRows rows={3} cols={5} /> : data.payments.length === 0 ? <EmptyRow colSpan={5} icon={FiCreditCard} title={t('staff.fees.noHistory')} /> : data.payments.map(f => (
                  <tr key={f._id} className={rowCls}>
                    <td className={`${tdCls} text-sm font-semibold text-gray-600 dark:text-gray-300`}>{new Date(f.date || f.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className={tdCls}><Badge tone="brand">{f.type}</Badge></td>
                    <td className={`${tdCls} font-extrabold text-gray-900 dark:text-white`}>{formatINR(f.amount)}</td>
                    <td className={tdCls}><Badge tone={tone(f.status)} dot>{f.status || 'Paid'}</Badge></td>
                    <td className={`${tdCls} text-right`}>
                      {tone(f.status) === 'green' ? <button type="button" onClick={() => printInvoice(f._id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5"><FiPrinter /> {t('admin.fees.invoice')}</button> : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Staff fees desk: record payments, approve/reject pending, upcoming dues, invoices. */
const StaffFees = ({ students = [], focusStudentId, onFocusHandled }) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFees = useCallback(() => api.get('/fees/all')
    .then(setFees)
    .catch(err => toastError(err, t('admin.common.loadFailed')))
    .finally(() => setLoading(false)), [t]);

  useEffect(() => { loadFees(); }, [loadFees]);

  // Jump to a student requested by another view (e.g. dues on the overview)
  useEffect(() => {
    if (!focusStudentId) return;
    const s = students.find(x => String(x._id) === String(focusStudentId));
    if (s) Promise.resolve().then(() => { setSelected(s); onFocusHandled?.(); });
  }, [focusStudentId, students, onFocusHandled]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? students.filter(s => (s.name || '').toLowerCase().includes(q)).slice(0, 10) : [];
  }, [search, students]);
  const pg = usePagination(fees);

  return (
    <>
      <PageHeader
        icon={FiCreditCard}
        eyebrow={t('admin.group.finance')}
        title={t('staff.heading.fees')}
        subtitle={t('staff.fees.subtitle')}
        actions={(
          <div className="relative w-full lg:w-96">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className="ui-input !pl-10" value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} placeholder={t('staff.fees.searchPh')} aria-label={t('staff.fees.searchPh')} />
            {search && !selected && (
              <div className="absolute top-full inset-x-0 mt-2 ui-card !rounded-2xl max-h-72 overflow-y-auto ui-scrollbar z-20 p-1.5 animate-scale-in origin-top">
                {matches.map(s => (
                  <button key={s._id} type="button" onClick={() => { setSelected(s); setSearch(s.name); }} className="group w-full p-2.5 hover:bg-brand-50 dark:hover:bg-white/5 rounded-xl flex items-center gap-3 text-left">
                    <Avatar name={s.name} size="sm" />
                    <span className="flex-1 min-w-0"><span className="block font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{s.name}</span><span className="block text-[11px] text-gray-500">{s.classId?.name || '—'}{s.fatherName ? ` · S/O ${s.fatherName}` : ''}</span></span>
                    <FiChevronRight className="text-gray-300 group-hover:text-brand-500" />
                  </button>
                ))}
                {matches.length === 0 && <p className="p-4 text-center text-sm text-gray-400">{t('staff.students.none')}</p>}
              </div>
            )}
          </div>
        )}
      />

      {selected ? (
        <StudentFeePanel key={selected._id} student={selected} onClose={() => { setSelected(null); setSearch(''); }} onPaid={loadFees} />
      ) : (
        <div className="space-y-6">
          <UpcomingDues onSelectStudent={(id) => { const s = students.find(x => String(x._id) === String(id)); if (s) { setSelected(s); setSearch(s.name); } }} />
          <FeeApprovals onChanged={loadFees} canRemind={false} />
          <div className="ui-card overflow-hidden">
            <div className="flex justify-between items-center px-5 md:px-6 py-5">
              <div><h3 className="font-extrabold text-gray-900 dark:text-white">{t('staff.fees.transactions')}</h3><p className="text-xs text-gray-500">{t('staff.fees.records', { n: fees.length })}</p></div>
              <button type="button" onClick={loadFees} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw /></button>
            </div>
            <div className={`${tableScroll} max-h-[36rem]`}>
              <table className="w-full text-left min-w-[680px]">
                <thead><tr className={theadRow}><th className={thCls}>{t('staff.students.student')}</th><th className={thCls}>{t('admin.common.date')}</th><th className={thCls}>{t('admin.plan.amount')}</th><th className={thCls}>{t('admin.common.status')}</th><th className={`${thCls} text-right`}>{t('admin.fees.invoice')}</th></tr></thead>
                <tbody className={tbodyCls}>
                  {loading && fees.length === 0 ? <SkeletonRows rows={5} cols={5} /> : pg.total === 0 ? <EmptyRow colSpan={5} icon={FiCreditCard} title={t('staff.fees.noTransactions')} /> : pg.pageItems.map(f => (
                    <tr key={f._id} className={rowCls}>
                      <td className={tdCls}><div className="flex items-center gap-3"><Avatar name={f.studentId?.name || '?'} size="sm" /><span className="font-bold text-sm text-gray-900 dark:text-white truncate">{f.studentId?.name || '—'}</span></div></td>
                      <td className={`${tdCls} text-sm text-gray-600 dark:text-gray-300`}>{new Date(f.date || f.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className={`${tdCls} font-extrabold text-gray-900 dark:text-white`}>{formatINR(f.amount)}</td>
                      <td className={tdCls}><Badge tone={tone(f.status)} dot>{f.status || 'Paid'}</Badge></td>
                      <td className={`${tdCls} text-right`}>{tone(f.status) === 'green' ? <button type="button" onClick={() => printInvoice(f._id)} className={iconBtn} aria-label={t('admin.fees.invoiceFor', { name: f.studentId?.name || '' })}><FiPrinter /></button> : <span className="text-xs text-gray-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pg} label={t('staff.fees.transactionsLabel')} />
          </div>
        </div>
      )}
    </>
  );
};

export default StaffFees;
