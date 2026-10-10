import React from 'react';
import { FiCheck, FiMail, FiAlertTriangle, FiPrinter, FiPlus, FiArrowLeft, FiCalendar } from 'react-icons/fi';
import { formatINR } from '../adminApi';
import { printInvoice } from '../printDocs';
import { fmtDate } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

/** Shown right after POST /fees/pay succeeds: what was received, where the receipt went, what is left. */
const PaymentSuccess = ({ receipt, student, className, onAnother, onBack }) => {
  const { t } = useI18n();
  const sum = receipt.summary || {};
  const balance = Number(sum.balance ?? Math.max(0, student.pending));
  const emails = receipt.emailedTo || [];
  const covered = sum.coveredLabels || [];
  return (
    <section className="ui-card overflow-hidden animate-scale-in" aria-live="polite">
      <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-6 md:p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/20 ring-8 ring-white/10 flex items-center justify-center text-3xl animate-glow"><FiCheck /></div>
        <h3 className="mt-4 text-2xl font-extrabold tracking-tight">{t('admin.fd.ok.received', { amt: formatINR(receipt.amount), name: student.name })}</h3>
        <p className="text-sm text-white/80 mt-1">{[receipt.mode, fmtDate(receipt.date || receipt.createdAt)].filter(Boolean).join(' · ')}</p>
        {covered.length > 0 && <p className="text-xs text-white/80 mt-1">{t('admin.fd.ok.covered', { list: covered.join(', ') })}</p>}
      </div>

      <div className="p-5 md:p-6 space-y-4">
        {emails.length > 0 ? (
          <p className="flex gap-3 p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200 text-sm font-semibold">
            <FiMail className="shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{t('admin.fd.ok.emailed', { list: emails.join(', ') })}</span>
          </p>
        ) : (
          <p className="flex gap-3 p-3.5 rounded-2xl bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200 text-sm font-semibold">
            <FiAlertTriangle className="shrink-0 mt-0.5" />
            <span>{t('admin.fd.ok.noEmail')}</span>
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`rounded-2xl p-4 ${balance > 0 ? 'bg-gray-50 dark:bg-white/5' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('admin.fd.ok.balance')}</p>
            {balance > 0
              ? <p className="text-2xl font-extrabold text-red-600 tabular-nums">{formatINR(balance)}</p>
              : <p className="text-2xl font-extrabold text-emerald-600">{t('admin.fd.ok.fullyPaid')} 🎉</p>}
            {sum.totalFee > 0 && <p className="text-[11px] text-gray-500 mt-0.5">{t('admin.fd.ok.paidOf', { paid: formatINR(sum.totalPaid), total: formatINR(sum.totalFee) })}</p>}
          </div>
          <div className="rounded-2xl p-4 bg-gray-50 dark:bg-white/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t('admin.fd.ok.next')}</p>
            {sum.next ? (
              <>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums">{formatINR(sum.next.amount)}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5"><FiCalendar /> {sum.next.label} · {fmtDate(sum.next.dueDate)}</p>
              </>
            ) : (
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mt-1.5">{balance > 0 ? t('admin.fd.ok.nextNone') : t('admin.fd.ok.nextDone')}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 pt-1">
          <button type="button" onClick={() => printInvoice(receipt._id)} className="ui-btn-dark"><FiPrinter /> {t('admin.fd.ok.print')}</button>
          <button type="button" onClick={onAnother} className="ui-btn-primary"><FiPlus /> {t('admin.fd.ok.another')}</button>
          <button type="button" onClick={onBack} className="ui-btn-secondary sm:ml-auto"><FiArrowLeft /> {t('admin.fd.ok.back', { cls: className })}</button>
        </div>
      </div>
    </section>
  );
};

export default PaymentSuccess;
