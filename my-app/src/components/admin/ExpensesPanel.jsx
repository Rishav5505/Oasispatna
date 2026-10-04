import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiShoppingBag, FiPlus, FiEdit2, FiPaperclip, FiRefreshCw, FiExternalLink } from 'react-icons/fi';
import config from '../../config';
import { api, toastError, toastSuccess, formatINR } from './adminApi';
import { Badge, Modal, ConfirmDelete, SkeletonRows, EmptyRow, inputCls, labelCls, tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls, iconBtn } from './AdminUI';
import { resolveUrl, toDateInput } from '../common/api';
import { useI18n } from '../../i18n/useI18n';

const EXPENSE_CATEGORIES = ['rent', 'utilities', 'marketing', 'supplies', 'salary', 'other'];
const CAT_TONE = { rent: 'dark', utilities: 'gray', marketing: 'brand', supplies: 'amber', salary: 'green', other: 'gray' };

const sendForm = (method, path, form) => {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, v); });
  return axios({ method, url: `${config.API_URL}${path}`, data: fd, headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } }).then(r => r.data);
};

const ExpenseModal = ({ expense, onClose, onSaved }) => {
  const { t } = useI18n();
  const [form, setForm] = useState({
    category: expense?.category || 'rent',
    amount: expense?.amount ?? '',
    date: expense?.date ? toDateInput(expense.date) : toDateInput(new Date()),
    note: expense?.note || '',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, receipt: file || undefined };
      const res = expense ? await sendForm('put', `/finance/expenses/${expense._id}`, body) : await sendForm('post', '/finance/expenses', body);
      toastSuccess(t(expense ? 'admin.exp.updated' : 'admin.exp.added'));
      onSaved(res);
    } catch (err) {
      toastError(err, t('admin.exp.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal icon={FiShoppingBag} title={t(expense ? 'admin.exp.edit' : 'admin.exp.add')} onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className="ui-btn-secondary">{t('admin.common.cancel')}</button>
          <button type="submit" form="exp-form" disabled={saving} className="ui-btn-primary">{saving ? t('admin.common.saving') : t('admin.common.save')}</button>
        </>
      )}>
      <form id="exp-form" onSubmit={submit} className="space-y-4">
        <div>
          <p className={labelCls}>{t('admin.exp.category')}</p>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map(c => (
              <button key={c} type="button" aria-pressed={form.category === c} onClick={() => setForm(f => ({ ...f, category: c }))}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${form.category === c ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-brand-600'}`}>
                {t(`admin.exp.cat.${c}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="exp-amt">{t('admin.plan.amount')}</label>
            <input id="exp-amt" type="number" min="0" step="0.01" required className={inputCls} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls} htmlFor="exp-date">{t('admin.common.date')}</label>
            <input id="exp-date" type="date" required className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="exp-note">{t('admin.exp.note')}</label>
          <input id="exp-note" className={inputCls} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder={t('admin.exp.notePh')} />
        </div>
        <label className="flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 cursor-pointer hover:border-brand-300">
          <FiPaperclip className="text-brand-500" />
          <span className="flex-1 text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">{file ? file.name : expense?.receiptUrl ? t('admin.exp.replaceReceipt') : t('admin.exp.attachReceipt')}</span>
          <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
      </form>
    </Modal>
  );
};

const ExpensesPanel = ({ onChanged }) => {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | expense

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.get('/finance/expenses', cat ? { category: cat } : undefined));
    } catch (err) {
      toastError(err, t('admin.common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [cat, t]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    try {
      await api.del(`/finance/expenses/${id}`);
      setRows(rs => rs.filter(r => r._id !== id));
      toastSuccess(t('admin.exp.deleted'));
      onChanged?.();
    } catch (err) {
      toastError(err, t('admin.exp.deleteFailed'));
    }
  };

  const total = useMemo(() => rows.reduce((a, r) => a + (r.amount || 0), 0), [rows]);

  return (
    <div className="ui-card overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 md:px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink-900 text-white flex items-center justify-center"><FiShoppingBag /></div>
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white">{t('admin.exp.title')}</h3>
            <p className="text-xs text-gray-500">{t('admin.exp.summary', { n: rows.length, amt: formatINR(total) })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={cat} onChange={e => setCat(e.target.value)} className="ui-input !w-auto !py-2 font-semibold" aria-label={t('admin.exp.category')}>
            <option value="">{t('admin.exp.allCats')}</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{t(`admin.exp.cat.${c}`)}</option>)}
          </select>
          <button type="button" onClick={() => setModal('new')} className="ui-btn-primary !py-2"><FiPlus /> {t('admin.exp.add')}</button>
          <button type="button" onClick={load} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>
      <div className={`${tableScroll} max-h-[32rem]`}>
        <table className="w-full text-left min-w-[720px]">
          <thead>
            <tr className={theadRow}>
              <th className={thCls}>{t('admin.common.date')}</th>
              <th className={thCls}>{t('admin.exp.category')}</th>
              <th className={thCls}>{t('admin.exp.note')}</th>
              <th className={thCls}>{t('admin.plan.amount')}</th>
              <th className={`${thCls} text-right`}>{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {loading && rows.length === 0 ? <SkeletonRows rows={4} cols={5} /> : rows.length === 0 ? (
              <EmptyRow colSpan={5} icon={FiShoppingBag} title={t('admin.exp.empty')} action={<button type="button" onClick={() => setModal('new')} className="ui-btn-primary"><FiPlus /> {t('admin.exp.add')}</button>} />
            ) : rows.map(r => (
              <tr key={r._id} className={rowCls}>
                <td className={`${tdCls} text-sm font-semibold text-gray-600 dark:text-gray-300`}>{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className={tdCls}><Badge tone={CAT_TONE[r.category]}>{t(`admin.exp.cat.${r.category}`)}</Badge></td>
                <td className={`${tdCls} text-sm text-gray-600 dark:text-gray-300 max-w-[18rem]`}>
                  <span className="block truncate">{r.note || '—'}</span>
                  {r.receiptUrl && <a href={resolveUrl(r.receiptUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline"><FiPaperclip /> {t('admin.exp.receipt')} <FiExternalLink /></a>}
                </td>
                <td className={`${tdCls} font-extrabold text-gray-900 dark:text-white`}>{formatINR(r.amount)}</td>
                <td className={`${tdCls} text-right`}>
                  <span className="inline-flex items-center gap-1">
                    <button type="button" onClick={() => setModal(r)} className={iconBtn} aria-label={t('admin.common.edit')}><FiEdit2 /></button>
                    <ConfirmDelete compact onConfirm={() => remove(r._id)} label={t('admin.common.delete')} confirmLabel={t('admin.common.delete')} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <ExpenseModal
          expense={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(exp) => {
            setModal(null);
            setRows(rs => (rs.some(r => r._id === exp._id) ? rs.map(r => (r._id === exp._id ? exp : r)) : [exp, ...rs]));
            onChanged?.();
          }}
        />
      )}
    </div>
  );
};

export default ExpensesPanel;
