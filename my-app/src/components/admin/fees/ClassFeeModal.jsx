import React, { useMemo, useState } from 'react';
import { FiSliders, FiZap, FiList, FiPlus, FiTrash2, FiCheckCircle, FiAlertTriangle, FiEdit3 } from 'react-icons/fi';
import { api, toastError, toastSuccess, formatINR } from '../adminApi';
import { Modal, inputCls, labelCls, iconBtn } from '../AdminUI';
import { toDateInput } from '../../common/api';
import { round2, splitRows, addMonths, fmtDate } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

/** Create / edit the standard fee + installment schedule of one class (PUT /finance/class-fees/:classId). */
const ClassFeeModal = ({ cls, onClose, onSaved }) => {
  const { t } = useI18n();
  const st = cls.structure;
  const [totalFee, setTotalFee] = useState(st ? String(st.totalFee) : '');
  const [gst, setGst] = useState(String(st?.gstPercent ?? 0));
  const [note, setNote] = useState(st?.note || '');
  const [mode, setMode] = useState(st ? 'manual' : 'quick');
  const [gen, setGen] = useState({ count: st?.installments?.length || 4, first: toDateInput(new Date()), interval: 3 });
  const [rows, setRows] = useState(() => (st?.installments || []).map(i => ({ label: i.label, amount: String(i.amount), dueDate: toDateInput(i.dueDate) })));
  const [saving, setSaving] = useState(false);

  const total = round2(totalFee);
  const labelFor = (i) => t('admin.fd.setup.instN', { n: i + 1 });
  const preview = useMemo(
    () => (total > 0 && gen.first ? splitRows(total, gen.count, gen.first, gen.interval, (i) => t('admin.fd.setup.instN', { n: i + 1 })) : []),
    [total, gen, t],
  );
  const active = mode === 'quick' ? preview : rows;
  const sum = round2(active.reduce((a, r) => a + (Number(r.amount) || 0), 0));
  const diff = round2(total - sum);
  const rowsOk = active.length > 0 && active.every(r => r.dueDate && r.amount !== '' && Number(r.amount) > 0);
  const adds = Math.abs(diff) <= 0.01 && active.length > 0;
  const gstOk = Number(gst) >= 0 && Number(gst) <= 100;
  const valid = total > 0 && rowsOk && adds && gstOk;

  const setRow = (i, k, v) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows(rs => [...rs, {
    label: labelFor(rs.length),
    amount: String(Math.max(0, diff)),
    dueDate: rs.length && rs[rs.length - 1].dueDate ? addMonths(rs[rs.length - 1].dueDate, 1) : toDateInput(new Date()),
  }]);
  const tuneManually = () => { setRows(preview.map(r => ({ ...r }))); setMode('manual'); };

  const save = async (e) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await api.put(`/finance/class-fees/${cls.classId}`, {
        totalFee: total,
        gstPercent: Number(gst) || 0,
        note: note.trim(),
        installments: active.map((r, i) => ({ label: (r.label || '').trim() || labelFor(i), amount: Number(r.amount), dueDate: r.dueDate })),
      });
      toastSuccess(t('admin.fd.setup.saved', { cls: cls.className }));
      onSaved();
    } catch (err) {
      toastError(err, t('admin.fd.setup.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const modeBtn = (id, Icon, label, hint) => (
    <button type="button" onClick={() => (id === 'manual' && mode === 'quick' && rows.length === 0 ? tuneManually() : setMode(id))} aria-pressed={mode === id}
      className={`flex-1 text-left rounded-2xl p-3.5 ring-1 transition-all ${mode === id ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'ring-gray-200 dark:ring-white/10 hover:ring-brand-300'}`}>
      <span className="flex items-center gap-2 text-sm font-extrabold text-gray-900 dark:text-white"><Icon className="text-brand-600" /> {label}</span>
      <span className="block text-[11px] text-gray-500 mt-0.5">{hint}</span>
    </button>
  );

  return (
    <Modal
      title={t(st ? 'admin.fd.setup.editTitle' : 'admin.fd.setup.setTitle', { cls: cls.className })}
      subtitle={t('admin.fd.setup.modalSub')}
      icon={FiSliders}
      portal
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={(
        <>
          <button type="button" onClick={onClose} className="ui-btn-secondary">{t('admin.common.cancel')}</button>
          <button type="submit" form="class-fee-form" disabled={!valid || saving} className="ui-btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            <FiCheckCircle /> {saving ? t('admin.common.saving') : t('admin.fd.setup.save')}
          </button>
        </>
      )}
    >
      <form id="class-fee-form" onSubmit={save} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="cf-total">{t('admin.fd.setup.totalFee')}</label>
            <input id="cf-total" type="number" min="1" step="0.01" required autoFocus className={`${inputCls} text-lg`} value={totalFee} onChange={e => setTotalFee(e.target.value)} placeholder="60000" />
          </div>
          <div>
            <label className={labelCls} htmlFor="cf-gst">{t('admin.fd.setup.gst')}</label>
            <input id="cf-gst" type="number" min="0" max="100" step="0.01" className={inputCls} value={gst} onChange={e => setGst(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelCls} htmlFor="cf-note">{t('admin.fd.setup.note')}</label>
            <input id="cf-note" maxLength={300} className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder={t('admin.fd.setup.notePh')} />
          </div>
        </div>

        <div>
          <p className={labelCls}>{t('admin.fd.setup.howSplit')}</p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            {modeBtn('quick', FiZap, t('admin.fd.setup.quick'), t('admin.fd.setup.quickHint'))}
            {modeBtn('manual', FiList, t('admin.fd.setup.manual'), t('admin.fd.setup.manualHint'))}
          </div>
        </div>

        {mode === 'quick' ? (
          <div className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls} htmlFor="cf-count">{t('admin.fd.setup.count')}</label>
                <input id="cf-count" type="number" min="1" max="60" className={inputCls} value={gen.count} onChange={e => setGen(g => ({ ...g, count: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls} htmlFor="cf-first">{t('admin.fd.setup.firstDue')}</label>
                <input id="cf-first" type="date" className={inputCls} value={gen.first} onChange={e => setGen(g => ({ ...g, first: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls} htmlFor="cf-gap">{t('admin.fd.setup.gap')}</label>
                <input id="cf-gap" type="number" min="0" max="24" className={inputCls} value={gen.interval} onChange={e => setGen(g => ({ ...g, interval: e.target.value }))} />
              </div>
            </div>
            {preview.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4 text-sm text-gray-500 text-center">{t('admin.fd.setup.previewEmpty')}</p>
            ) : (
              <div className="rounded-2xl ring-1 ring-gray-100 dark:ring-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-white/5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{t('admin.fd.setup.preview')}</p>
                  <button type="button" onClick={tuneManually} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"><FiEdit3 /> {t('admin.fd.setup.tune')}</button>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-white/5 max-h-56 overflow-y-auto ui-scrollbar">
                  {preview.map((r, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-[11px] font-extrabold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="flex-1 font-semibold text-gray-700 dark:text-gray-200 truncate">{r.label}</span>
                      <span className="text-xs text-gray-500">{fmtDate(`${r.dueDate}T00:00:00`)}</span>
                      <span className="font-extrabold text-gray-900 dark:text-white tabular-nums w-24 text-right">{formatINR(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            <div className="hidden sm:grid grid-cols-[1fr_8rem_10rem_2.25rem] gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <span>{t('admin.plan.label')}</span><span>{t('admin.plan.amount')}</span><span>{t('admin.plan.dueDate')}</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_2.25rem] sm:grid-cols-[1fr_8rem_10rem_2.25rem] gap-2 items-center p-2 sm:p-0 rounded-xl ring-1 ring-gray-100 sm:ring-0 dark:ring-white/10">
                <input className={`${inputCls} col-span-3 sm:col-span-1 !py-2`} value={r.label} onChange={e => setRow(i, 'label', e.target.value)} aria-label={t('admin.plan.label')} />
                <input type="number" min="0" step="0.01" className={`${inputCls} !py-2`} value={r.amount} onChange={e => setRow(i, 'amount', e.target.value)} aria-label={t('admin.plan.amount')} />
                <input type="date" required className={`${inputCls} !py-2`} value={r.dueDate} onChange={e => setRow(i, 'dueDate', e.target.value)} aria-label={t('admin.plan.dueDate')} />
                <button type="button" onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))} className={`${iconBtn} hover:!text-red-600 hover:!bg-red-50`} aria-label={t('admin.common.remove')}><FiTrash2 /></button>
              </div>
            ))}
            <button type="button" onClick={addRow} className="ui-btn-secondary !py-2 !text-xs"><FiPlus /> {t('admin.plan.addRow')}</button>
          </div>
        )}

        <div role="status" className={`flex flex-wrap items-center gap-2.5 p-3 rounded-xl text-sm font-semibold ${adds ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
          {adds ? <FiCheckCircle className="shrink-0" /> : <FiAlertTriangle className="shrink-0" />}
          <span>{t('admin.fd.setup.addsUp', { sum: formatINR(sum), total: formatINR(total) })}</span>
          {!adds && total > 0 && active.length > 0 && (
            <span className="ml-auto font-extrabold">{diff > 0 ? t('admin.plan.short', { amt: formatINR(diff) }) : t('admin.plan.over', { amt: formatINR(-diff) })}</span>
          )}
        </div>
        {!adds && <p className="text-xs text-gray-500 -mt-3">{t('admin.fd.setup.mustMatch')}</p>}
      </form>
    </Modal>
  );
};

export default ClassFeeModal;
