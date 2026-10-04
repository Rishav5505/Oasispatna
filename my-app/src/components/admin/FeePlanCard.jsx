import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiLayers, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiCheckCircle, FiAlertTriangle, FiZap } from 'react-icons/fi';
import { api, toastError, toastSuccess, formatINR } from './adminApi';
import { Badge, ProgressBar, SkeletonBlock, EmptyState, inputCls, labelCls, iconBtn } from './AdminUI';
import { toDateInput } from '../common/api';
import { useI18n } from '../../i18n/useI18n';

const TONE = { paid: 'green', due: 'amber', overdue: 'red' };
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const addMonths = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toDateInput(d);
};

const splitRows = (net, count, first, interval) => {
  const c = Math.max(1, Math.min(60, parseInt(count, 10) || 1));
  const each = Math.floor((net / c) * 100) / 100;
  return Array.from({ length: c }, (_, i) => ({
    label: `Installment ${i + 1}`,
    amount: String(i === c - 1 ? round2(net - each * (c - 1)) : each),
    dueDate: first ? addMonths(first, i * (parseInt(interval, 10) || 0)) : '',
  }));
};

/* ---------------- Editor ---------------- */
const PlanEditor = ({ studentId, plan, defaultTotal, onSaved, onCancel }) => {
  const { t } = useI18n();
  const [totalFee, setTotalFee] = useState(String(plan?.totalFee ?? defaultTotal ?? ''));
  const [discount, setDiscount] = useState(String(plan?.discount ?? 0));
  const [gst, setGst] = useState(String(plan?.gstPercent ?? 0));
  const [gen, setGen] = useState({ count: plan?.installments?.length || 3, first: toDateInput(new Date()), interval: 1 });
  const [rows, setRows] = useState(() => (plan?.installments || []).map(i => ({ label: i.label, amount: String(i.amount), dueDate: toDateInput(i.dueDate) })));
  const [saving, setSaving] = useState(false);

  const net = round2((Number(totalFee) || 0) - (Number(discount) || 0));
  const sum = round2(rows.reduce((a, r) => a + (Number(r.amount) || 0), 0));
  const diff = round2(net - sum);
  const rowsValid = rows.length > 0 && rows.every(r => r.dueDate && r.amount !== '' && Number(r.amount) >= 0);
  const valid = Number(totalFee) >= 0 && totalFee !== '' && net >= 0 && Math.abs(diff) <= 0.01 && rowsValid;

  const autoSplit = () => setRows(splitRows(net, gen.count, gen.first, gen.interval));
  const setRow = (i, k, v) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const body = {
        totalFee: Number(totalFee),
        discount: Number(discount) || 0,
        gstPercent: Number(gst) || 0,
        installments: rows.map(r => ({ label: r.label.trim() || 'Installment', amount: Number(r.amount), dueDate: r.dueDate })),
      };
      const res = await api.post(`/finance/plans/${studentId}`, body);
      toastSuccess(t('admin.plan.saved'));
      onSaved(res);
    } catch (err) {
      toastError(err, t('admin.plan.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls} htmlFor="pl-total">{t('admin.plan.totalFee')}</label>
          <input id="pl-total" type="number" min="0" required className={inputCls} value={totalFee} onChange={e => setTotalFee(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="pl-disc">{t('admin.plan.discount')}</label>
          <input id="pl-disc" type="number" min="0" className={inputCls} value={discount} onChange={e => setDiscount(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="pl-gst">{t('admin.plan.gst')}</label>
          <input id="pl-gst" type="number" min="0" max="100" step="0.01" className={inputCls} value={gst} onChange={e => setGst(e.target.value)} />
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-2xl bg-ink-900 text-white px-4 py-2.5 flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('admin.plan.net')}</p>
          <p className="text-lg font-extrabold">{formatINR(net)}</p>
        </div>
      </div>

      <div className="rounded-2xl ring-1 ring-brand-100 dark:ring-white/10 bg-brand-50/50 dark:bg-white/5 p-4">
        <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><FiZap className="text-brand-500" /> {t('admin.plan.autoSplit')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className={labelCls} htmlFor="pl-count">{t('admin.plan.count')}</label>
            <input id="pl-count" type="number" min="1" max="60" className={inputCls} value={gen.count} onChange={e => setGen(g => ({ ...g, count: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls} htmlFor="pl-first">{t('admin.plan.firstDue')}</label>
            <input id="pl-first" type="date" className={inputCls} value={gen.first} onChange={e => setGen(g => ({ ...g, first: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls} htmlFor="pl-int">{t('admin.plan.interval')}</label>
            <input id="pl-int" type="number" min="0" max="24" className={inputCls} value={gen.interval} onChange={e => setGen(g => ({ ...g, interval: e.target.value }))} />
          </div>
          <button type="button" onClick={autoSplit} disabled={net <= 0 || !gen.first} className="ui-btn-dark !py-3"><FiZap /> {t('admin.plan.split')}</button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-[1fr_8rem_10rem_2.25rem] gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          <span>{t('admin.plan.label')}</span><span>{t('admin.plan.amount')}</span><span>{t('admin.plan.dueDate')}</span><span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_8rem_10rem_2.25rem] gap-2 items-center p-2 sm:p-0 rounded-xl ring-1 ring-gray-100 sm:ring-0 dark:ring-white/10">
            <input className={`${inputCls} col-span-2 sm:col-span-1 !py-2`} value={r.label} onChange={e => setRow(i, 'label', e.target.value)} aria-label={t('admin.plan.label')} />
            <input type="number" min="0" step="0.01" className={`${inputCls} !py-2`} value={r.amount} onChange={e => setRow(i, 'amount', e.target.value)} aria-label={t('admin.plan.amount')} />
            <input type="date" className={`${inputCls} !py-2`} value={r.dueDate} onChange={e => setRow(i, 'dueDate', e.target.value)} aria-label={t('admin.plan.dueDate')} required />
            <button type="button" onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))} className={`${iconBtn} hover:!text-red-600 hover:!bg-red-50`} aria-label={t('admin.common.remove')}><FiTrash2 /></button>
          </div>
        ))}
        <button type="button" onClick={() => setRows(rs => [...rs, { label: `Installment ${rs.length + 1}`, amount: String(Math.max(0, diff)), dueDate: rs.length ? addMonths(rs[rs.length - 1].dueDate || gen.first, 1) : gen.first }])} className="ui-btn-secondary !py-2 !text-xs">
          <FiPlus /> {t('admin.plan.addRow')}
        </button>
      </div>

      <div className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-semibold ${Math.abs(diff) <= 0.01 && rows.length ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
        {Math.abs(diff) <= 0.01 && rows.length ? <FiCheckCircle /> : <FiAlertTriangle />}
        {t('admin.plan.sumCheck', { sum: formatINR(sum), net: formatINR(net) })}
        {Math.abs(diff) > 0.01 && <span className="ml-auto font-extrabold">{diff > 0 ? t('admin.plan.short', { amt: formatINR(diff) }) : t('admin.plan.over', { amt: formatINR(-diff) })}</span>}
      </div>

      <div className="flex justify-end gap-2.5">
        {onCancel && <button type="button" onClick={onCancel} className="ui-btn-secondary">{t('admin.common.cancel')}</button>}
        <button type="submit" disabled={!valid || saving} className="ui-btn-primary">{saving ? t('admin.common.saving') : <><FiCheckCircle /> {t('admin.plan.save')}</>}</button>
      </div>
    </form>
  );
};

/* ---------------- Card ---------------- */
/** Installment plan for one student (GET/POST /finance/plans/:studentId). canEdit = admin. */
const FeePlanCard = ({ studentId, defaultTotal, canEdit = false, reloadKey = 0, onChanged }) => {
  const { t } = useI18n();
  const [plan, setPlan] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | none | error
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => api.get(`/finance/plans/${studentId}`)
    .then((p) => { setPlan(p); setState('ready'); })
    .catch((err) => {
      if (err?.response?.status === 404) { setPlan(null); setState('none'); } else setState('error');
    }), [studentId]);

  useEffect(() => { load(); }, [load, reloadKey]);
  const reload = () => { setState('loading'); load(); };

  const paidPct = useMemo(() => (plan && plan.netFee > 0 ? Math.min(100, (plan.paid / plan.netFee) * 100) : 0), [plan]);

  return (
    <div className="ui-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h3 className="font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiLayers /></span>
          {t('admin.plan.title')}
        </h3>
        <div className="flex items-center gap-1.5">
          {canEdit && state === 'ready' && !editing && <button type="button" onClick={() => setEditing(true)} className="ui-btn-secondary !py-2 !text-xs"><FiEdit2 /> {t('admin.common.edit')}</button>}
          <button type="button" onClick={reload} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw className={state === 'loading' ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {state === 'loading' && <div className="space-y-2.5">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-12 !rounded-xl" />)}</div>}
      {state === 'error' && <EmptyState icon={FiAlertTriangle} title={t('admin.common.loadFailed')} action={<button type="button" onClick={reload} className="ui-btn-secondary"><FiRefreshCw /> {t('admin.common.retry')}</button>} />}
      {state === 'none' && !editing && (
        <EmptyState
          icon={FiLayers}
          title={t('admin.plan.none')}
          hint={canEdit ? t('admin.plan.noneHint') : t('admin.plan.noneStaff')}
          action={canEdit ? <button type="button" onClick={() => setEditing(true)} className="ui-btn-primary"><FiPlus /> {t('admin.plan.create')}</button> : null}
        />
      )}
      {editing && (
        <PlanEditor
          studentId={studentId}
          plan={plan}
          defaultTotal={defaultTotal}
          onCancel={() => setEditing(false)}
          onSaved={(p) => { setPlan(p); setState('ready'); setEditing(false); onChanged?.(p); }}
        />
      )}

      {state === 'ready' && plan && !editing && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-3 gap-2.5">
            {[[t('admin.plan.net'), plan.netFee, 'text-gray-900 dark:text-white'], [t('admin.plan.paid'), plan.paid, 'text-emerald-600'], [t('admin.plan.pending'), plan.pending, 'text-red-600']].map(([l, v, c]) => (
              <div key={l} className="rounded-2xl bg-gray-50 dark:bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p>
                <p className={`text-base md:text-lg font-extrabold truncate ${c}`}>{formatINR(v)}</p>
              </div>
            ))}
          </div>
          <ProgressBar value={paidPct} barClass="bg-emerald-500" />
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-gray-500">
            {plan.discount > 0 && <Badge tone="brand">{t('admin.plan.discountBadge', { amt: formatINR(plan.discount) })}</Badge>}
            {plan.gstPercent > 0 && <Badge tone="dark">GST {plan.gstPercent}%</Badge>}
          </div>
          <ol className="divide-y divide-gray-100 dark:divide-white/5">
            {plan.installments.map(i => (
              <li key={i._id} className="flex items-center gap-3 py-2.5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${i.status === 'paid' ? 'bg-emerald-500' : i.status === 'overdue' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{i.label}</p>
                  <p className="text-[11px] text-gray-500">
                    {t('admin.plan.dueOn', { date: new Date(i.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })}
                    {i.paidAmount > 0 && i.status !== 'paid' && ` · ${t('admin.plan.partPaid', { amt: formatINR(i.paidAmount) })}`}
                  </p>
                </div>
                <span className="text-sm font-extrabold text-gray-900 dark:text-white tabular-nums">{formatINR(i.amount)}</span>
                <Badge tone={TONE[i.status] || 'gray'}>{t(`admin.plan.st.${i.status}`)}</Badge>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default FeePlanCard;
