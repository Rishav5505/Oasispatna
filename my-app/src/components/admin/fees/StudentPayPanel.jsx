import React, { useCallback, useEffect, useState } from 'react';
import { FiArrowLeft, FiCheck, FiAlertTriangle, FiLayers, FiEdit2, FiPrinter, FiPhone, FiMail, FiZap, FiChevronUp } from 'react-icons/fi';
import { api, toastError, toastSuccess, formatINR } from '../adminApi';
import { Avatar, Badge, ProgressRing, EmptyState } from '../AdminUI';
import { toDateInput } from '../../common/api';
import FeePlanCard from '../FeePlanCard';
import { printInvoice } from '../printDocs';
import PayForm from './PayForm';
import PaymentSuccess from './PaymentSuccess';
import { fmtDate, pctOf, round2 } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

const TONE = { paid: 'green', due: 'amber', overdue: 'red' };
const payTone = (s) => { const v = String(s || 'Paid').toLowerCase(); return v === 'paid' ? 'green' : v === 'rejected' ? 'red' : 'amber'; };

/* Payments already recorded for this student, with invoice printing. */
const History = ({ studentId, reloadKey }) => {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get(`/fees/student/${studentId}`)
      .then(d => { if (alive) setRows(d.payments || []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [studentId, reloadKey]);
  return (
    <div className="ui-card p-5 md:p-6">
      <h3 className="font-extrabold text-gray-900 dark:text-white mb-3">{t('admin.fd.hist.title')}</h3>
      {rows === null ? <div className="space-y-2">{[0, 1].map(i => <div key={i} className="ui-skeleton h-12 rounded-xl" />)}</div>
        : rows.length === 0 ? <p className="text-sm text-gray-500 py-3">{t('admin.fd.hist.none')}</p> : (
          <ul className="divide-y divide-gray-100 dark:divide-white/5 max-h-72 overflow-y-auto ui-scrollbar">
            {rows.map(f => (
              <li key={f._id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white tabular-nums">{formatINR(f.amount)} <span className="font-semibold text-gray-500 text-xs">· {f.mode || '—'}</span></p>
                  <p className="text-[11px] text-gray-500 truncate">{fmtDate(f.date || f.createdAt)} · {f.type}{f.transactionId ? ` · ${f.transactionId}` : ''}</p>
                </div>
                <Badge tone={payTone(f.status)} dot>{f.status || 'Paid'}</Badge>
                {payTone(f.status) === 'green' && (
                  <button type="button" onClick={() => printInvoice(f._id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5" aria-label={t('admin.fees.invoiceFor', { name: '' })}>
                    <FiPrinter /> <span className="hidden sm:inline">{t('admin.fees.invoice')}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
};

/** Step 3 of collecting: one student's fee position, installment timeline and the payment form. */
const StudentPayPanel = ({ student, cls, canManage, onBack, onPaid, onPlanChanged }) => {
  const { t } = useI18n();
  const [amount, setAmount] = useState(student.nextDue ? String(student.nextDue.amount) : '');
  const [target, setTarget] = useState(student.nextDue?.label || '');
  const [receipt, setReceipt] = useState(null);
  const [histKey, setHistKey] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const pick = (label, amt) => {
    setTarget(label);
    setAmount(amt ? String(amt) : '');
    setReceipt(null);
    requestAnimationFrame(() => {
      document.getElementById('fee-pay-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('pf-amt')?.focus({ preventScroll: true });
    });
  };

  const handleSuccess = useCallback((res) => {
    setReceipt(res);
    setHistKey(k => k + 1);
    const next = res.summary?.next;
    setAmount(next ? String(next.amount) : '');
    setTarget(next?.label || '');
    onPaid(res);
  }, [onPaid]);

  // Copy the class's standard fee into a plan for just this student.
  const createFromClass = async () => {
    const st = cls?.structure;
    if (!st || creating) return;
    setCreating(true);
    try {
      await api.post(`/finance/plans/${student.studentId}`, {
        totalFee: st.totalFee,
        gstPercent: st.gstPercent || 0,
        installments: st.installments.map(i => ({ label: i.label, amount: i.amount, dueDate: toDateInput(i.dueDate) })),
      });
      toastSuccess(t('admin.fd.plan.created', { name: student.name }));
      onPlanChanged();
    } catch (err) {
      toastError(err, t('admin.plan.saveFailed'));
    } finally {
      setCreating(false);
    }
  };

  const pct = pctOf(student.paid, student.totalFee);
  const unpaid = student.installments.filter(i => i.status !== 'paid');

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Who */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-sunset text-white p-5 md:p-6 shadow-brand-glow">
        <div className="pointer-events-none absolute -top-12 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button type="button" onClick={onBack} className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0" aria-label={t('admin.fd.backToList')}><FiArrowLeft /></button>
            <Avatar name={student.name} size="lg" className="!ring-white/30" />
            <div className="min-w-0">
              <h3 className="text-xl font-extrabold truncate">{student.name}</h3>
              <p className="text-white/80 text-sm truncate">
                {[cls?.className, student.batchName && `${t('admin.common.batch')} ${student.batchName}`, student.fatherName && t('admin.fd.pick.father', { name: student.fatherName })].filter(Boolean).join(' · ')}
              </p>
              <p className="text-white/70 text-xs flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {student.phone && <span className="inline-flex items-center gap-1"><FiPhone /> {student.phone}</span>}
                <span className="inline-flex items-center gap-1 min-w-0"><FiMail className="shrink-0" /> <span className="truncate">{student.email || t('admin.fd.noEmail')}</span></span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block shrink-0">
            <ProgressRing value={pct} size={84} stroke={9} color="#ffffff" track="rgba(255,255,255,0.2)" label={t('admin.fd.paidPct', { n: Math.round(pct) })}>
              <span className="text-lg font-extrabold">{Math.round(pct)}%</span>
            </ProgressRing>
            </div>
            <dl className="grid grid-cols-3 gap-2 flex-1 md:w-80">
              {[[t('admin.fd.total'), student.totalFee], [t('admin.plan.paid'), student.paid], [t('admin.fd.balance'), student.pending]].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-black/20 p-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-white/70">{l}</dt>
                  <dd className="text-sm sm:text-base font-extrabold tabular-nums break-words">{formatINR(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        {student.discount > 0 && <p className="relative mt-3 text-xs font-semibold text-white/80">{t('admin.fd.discountNote', { amt: formatINR(student.discount) })}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Installments */}
        <div className="lg:col-span-2 space-y-5">
          <div className="ui-card p-5 md:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><FiLayers /></span>
                {t('admin.fd.inst.title')}
              </h3>
              {student.hasPlan && <Badge tone="gray">{t('admin.fd.pick.instDone', { a: student.installmentsPaid, b: student.installmentsTotal })}</Badge>}
            </div>

            {!student.hasPlan ? (
              <EmptyState
                icon={FiAlertTriangle}
                title={t('admin.fd.plan.none')}
                hint={canManage ? (cls?.structure ? t('admin.fd.plan.noneHint') : t('admin.fd.plan.noneNoStructure')) : t('admin.plan.noneStaff')}
                action={canManage ? (
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    {cls?.structure && <button type="button" onClick={createFromClass} disabled={creating} className="ui-btn-primary disabled:opacity-50"><FiZap /> {creating ? t('admin.common.saving') : t('admin.fd.plan.fromClass')}</button>}
                    <button type="button" onClick={() => setPlanOpen(true)} className="ui-btn-secondary"><FiEdit2 /> {t('admin.fd.plan.custom')}</button>
                  </div>
                ) : null}
              />
            ) : (
              <ol className="relative space-y-2.5">
                {student.installments.map((i, idx) => {
                  const left = round2(i.amount - (i.paidAmount || 0));
                  const paid = i.status === 'paid';
                  return (
                    <li key={i._id || idx} className={`rounded-2xl p-3.5 ring-1 ${paid ? 'ring-emerald-100 bg-emerald-50/50 dark:ring-emerald-500/10 dark:bg-emerald-500/5' : i.status === 'overdue' ? 'ring-red-200 bg-red-50/60 dark:ring-red-500/20 dark:bg-red-500/5' : 'ring-gray-100 dark:ring-white/10'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${paid ? 'bg-emerald-500 text-white' : i.status === 'overdue' ? 'bg-red-500 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>{paid ? <FiCheck /> : idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{i.label}</p>
                          <p className="text-[11px] text-gray-500">{t('admin.plan.dueOn', { date: fmtDate(i.dueDate) })}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-gray-900 dark:text-white tabular-nums">{formatINR(i.amount)}</p>
                          <Badge tone={TONE[i.status] || 'gray'}>{t(`admin.plan.st.${i.status}`)}</Badge>
                        </div>
                      </div>
                      {!paid && (
                        <div className="flex items-center justify-between gap-2 mt-2.5 pl-11">
                          <span className="text-[11px] font-semibold text-gray-500">{i.paidAmount > 0 ? t('admin.fd.inst.part', { paid: formatINR(i.paidAmount), left: formatINR(left) }) : ''}</span>
                          <button type="button" onClick={() => pick(i.label, left)} className={`${i.status === 'overdue' || unpaid[0] === i ? 'ui-btn-primary' : 'ui-btn-secondary'} !py-2 !px-3.5 !text-xs shrink-0`}>
                            {t('admin.fd.inst.collect', { amt: formatINR(left) })}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" onClick={() => pick('', '')} className="ui-btn-secondary !py-2 !text-xs">{t('admin.fd.inst.custom')}</button>
              {canManage && student.hasPlan && (
                <button type="button" onClick={() => setPlanOpen(o => !o)} className="ui-btn-secondary !py-2 !text-xs">
                  {planOpen ? <FiChevronUp /> : <FiEdit2 />} {t(planOpen ? 'admin.fd.plan.hide' : 'admin.fd.plan.edit')}
                </button>
              )}
            </div>
          </div>

          {canManage && planOpen && (
            <div className="animate-fade-in">
              <FeePlanCard studentId={student.studentId} defaultTotal={student.totalFee || cls?.structure?.totalFee} canEdit reloadKey={histKey} onChanged={onPlanChanged} />
            </div>
          )}
        </div>

        {/* Pay / success + history */}
        <div className="lg:col-span-3 space-y-5">
          {receipt ? (
            <PaymentSuccess receipt={receipt} student={student} className={cls?.className || ''} onAnother={() => setReceipt(null)} onBack={onBack} />
          ) : (
            <PayForm student={student} amount={amount} setAmount={(v) => setAmount(v)} target={target} onSuccess={handleSuccess} />
          )}
          <History studentId={student.studentId} reloadKey={histKey} />
        </div>
      </div>
    </div>
  );
};

export default StudentPayPanel;
