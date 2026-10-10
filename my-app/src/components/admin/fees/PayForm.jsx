import React, { useRef, useState } from 'react';
import { FiCheckCircle, FiCreditCard, FiDollarSign, FiSmartphone, FiHome, FiFileText, FiMail, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { api, errMsg, toastError, formatINR } from '../adminApi';
import { toast } from '../../../utils/notify';
import { inputCls, labelCls } from '../AdminUI';
import { MODES, PAY_TYPES } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

const MODE_ICON = { Cash: FiDollarSign, UPI: FiSmartphone, 'Bank Transfer': FiHome, Cheque: FiFileText, Card: FiCreditCard };

/**
 * Payment form for one student (POST /fees/pay). `amount`/`target` are controlled by the parent so the
 * "Collect ₹X" buttons on the installment timeline can pre-fill it.
 */
const PayForm = ({ student, amount, setAmount, target, onSuccess }) => {
  const { t } = useI18n();
  const [type, setType] = useState('Tuition');
  const [mode, setMode] = useState('Cash');
  const [refNo, setRefNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false); // blocks a second submit before React re-renders the disabled button

  const amt = Number(amount);
  const needsRef = mode !== 'Cash';
  const refMissing = needsRef && !refNo.trim();
  const valid = Number.isFinite(amt) && amt > 0 && !refMissing;
  const over = student.totalFee > 0 && amt > student.pending + 0.01;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      const res = await api.post('/fees/pay', {
        studentId: student.studentId,
        amount: amt,
        type,
        mode,
        transactionId: refNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });
      onSuccess(res);
    } catch (err) {
      // 409 = the same payment was recorded seconds ago: show the server's message, never retry.
      if (err?.response?.status === 409) toast.error(errMsg(err));
      else toastError(err, t('admin.fd.pay.failed'));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="ui-card p-5 md:p-6 space-y-5" id="fee-pay-form">
      <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiCreditCard /></span>
        {t('admin.fd.pay.title')}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="pf-amt">{t('admin.fd.pay.amount')}</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-extrabold text-gray-400 pointer-events-none">₹</span>
            <input id="pf-amt" type="number" min="1" step="0.01" required inputMode="decimal" className={`${inputCls} !pl-9 !text-2xl !font-extrabold`} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-gray-500 flex items-start gap-1.5">
            <FiInfo className="shrink-0 mt-0.5" />
            {target ? t('admin.fd.pay.forInst', { label: target }) : t('admin.fd.pay.custom')} {student.hasPlan && t('admin.fd.pay.oldestFirst')}
          </p>
        </div>
        <div>
          <label className={labelCls} htmlFor="pf-type">{t('admin.fd.pay.type')}</label>
          <select id="pf-type" className={inputCls} value={type} onChange={e => setType(e.target.value)}>
            {PAY_TYPES.map(x => <option key={x} value={x}>{t(`admin.fd.pay.type.${x}`)}</option>)}
          </select>
        </div>
      </div>

      {over && (
        <p className="flex gap-2.5 p-3 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200 text-xs font-semibold animate-fade-in">
          <FiAlertTriangle className="shrink-0 mt-0.5" /> {t('admin.fd.pay.over', { amt: formatINR(student.pending) })}
        </p>
      )}

      <div>
        <p className={labelCls}>{t('admin.fd.pay.mode')}</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('admin.fd.pay.mode')}>
          {MODES.map(m => {
            const Icon = MODE_ICON[m];
            const on = mode === m;
            return (
              <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setMode(m)}
                className={`flex-1 min-w-[6.5rem] whitespace-nowrap flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold ring-1 transition-all active:scale-95 ${on ? 'bg-ink-900 text-white ring-ink-900 dark:bg-white dark:text-ink-900' : 'ring-gray-200 text-gray-600 hover:ring-brand-300 dark:ring-white/10 dark:text-gray-300'}`}>
                <Icon /> {t(`admin.fd.mode.${m}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="pf-ref">{t('admin.fd.pay.ref')} {needsRef ? <span className="text-red-500">*</span> : <span className="normal-case font-medium text-gray-400">({t('admin.fd.pay.optional')})</span>}</label>
          <input id="pf-ref" className={`${inputCls} ${refMissing ? '!ring-amber-300' : ''}`} value={refNo} onChange={e => setRefNo(e.target.value)} required={needsRef} placeholder={t(needsRef ? 'admin.fd.pay.refPh' : 'admin.fd.pay.refPhCash')} />
          {refMissing && <p className="mt-1 text-[11px] font-semibold text-amber-600">{t('admin.fd.pay.refNeeded', { mode: t(`admin.fd.mode.${mode}`) })}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="pf-rem">{t('admin.fd.pay.remarks')} <span className="normal-case font-medium text-gray-400">({t('admin.fd.pay.optional')})</span></label>
          <input id="pf-rem" className={inputCls} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={t('admin.fd.pay.remarksPh')} />
        </div>
      </div>

      <button type="submit" disabled={!valid || saving} className="ui-btn-primary w-full !py-3.5 !text-base disabled:opacity-50 disabled:cursor-not-allowed">
        <FiCheckCircle /> {saving ? t('admin.fd.pay.saving') : t('admin.fd.pay.confirm', { amt: valid || amt > 0 ? formatINR(amt) : '₹0' })}
      </button>
      <p className="text-center text-[11px] font-semibold text-gray-500 flex items-center justify-center gap-1.5">
        <FiMail className="text-emerald-500" /> {student.email ? t('admin.fd.pay.willEmail') : t('admin.fd.pay.willEmailMaybe')}
      </p>
    </form>
  );
};

export default PayForm;
