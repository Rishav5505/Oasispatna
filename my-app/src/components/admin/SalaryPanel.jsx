import React, { useCallback, useEffect, useState } from 'react';
import { FiUsers, FiZap, FiEdit2, FiCheck, FiX, FiRefreshCw, FiChevronDown, FiChevronUp, FiSave, FiDollarSign } from 'react-icons/fi';
import { api, toastError, toastSuccess, formatINR } from './adminApi';
import { Avatar, Badge, SkeletonRows, EmptyRow, tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls, iconBtn } from './AdminUI';
import { useI18n } from '../../i18n/useI18n';

const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const MODES = ['Bank Transfer', 'UPI', 'Cash', 'Cheque'];
const smallInput = 'ui-input !py-1.5 !px-2 w-24 text-sm font-semibold';

/* Default monthly salary per teacher (PUT /users/teachers/:teacherId { monthlySalary }) */
const TeacherSalaries = ({ teachers, onChanged }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(null);

  const save = async (tch) => {
    const id = tch.teacherId || tch.teacherProfile?._id;
    if (!id) return;
    setBusy(id);
    try {
      await api.put(`/users/teachers/${id}`, { monthlySalary: Number(draft[id]) || 0 });
      toastSuccess(t('admin.sal.defaultSaved', { name: tch.name }));
      setDraft(d => { const n = { ...d }; delete n[id]; return n; });
      onChanged?.();
    } catch (err) {
      toastError(err, t('admin.sal.saveFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="ui-card overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-5 md:px-6 py-4 text-left hover:bg-brand-50/40 dark:hover:bg-white/[0.03]" aria-expanded={open}>
        <span className="w-9 h-9 rounded-xl bg-ink-900 text-white flex items-center justify-center"><FiUsers /></span>
        <span className="flex-1">
          <span className="block font-extrabold text-gray-900 dark:text-white">{t('admin.sal.defaults')}</span>
          <span className="block text-xs text-gray-500">{t('admin.sal.defaultsHint')}</span>
        </span>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {open && (
        <div className="px-3 md:px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2 animate-fade-in">
          {teachers.length === 0 && <p className="px-2 py-4 text-sm text-gray-500">{t('admin.sal.noTeachers')}</p>}
          {teachers.map(tch => {
            const id = tch.teacherId || tch.teacherProfile?._id;
            const current = tch.teacherProfile?.monthlySalary ?? 0;
            const val = draft[id] ?? String(current);
            return (
              <div key={tch._id} className="flex items-center gap-3 p-2.5 rounded-2xl ring-1 ring-gray-100 dark:ring-white/10">
                <Avatar name={tch.name} size="sm" />
                <span className="flex-1 min-w-0 text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{tch.name}</span>
                <input type="number" min="0" className={smallInput} value={val} disabled={!id} onChange={e => setDraft(d => ({ ...d, [id]: e.target.value }))} aria-label={t('admin.sal.defaultFor', { name: tch.name })} />
                <button type="button" onClick={() => save(tch)} disabled={!id || busy === id || draft[id] === undefined} className={`${iconBtn} disabled:opacity-30`} aria-label={t('admin.common.save')}><FiSave /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SalaryPanel = ({ teachers = [], onTeachersChanged }) => {
  const { t } = useI18n();
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});
  const [payId, setPayId] = useState(null);
  const [payMode, setPayMode] = useState(MODES[0]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.get('/finance/salaries', { month }));
    } catch (err) {
      toastError(err, t('admin.common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [month, t]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/finance/salaries/generate', { month });
      setRows(res.records || []);
      toastSuccess(t('admin.sal.generated', { created: res.created, skipped: res.skipped }));
    } catch (err) {
      toastError(err, t('admin.sal.generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const replace = (rec) => setRows(rs => rs.map(r => (r._id === rec._id ? rec : r)));

  const saveEdit = async (id) => {
    setBusy(true);
    try {
      replace(await api.put(`/finance/salaries/${id}`, { baseAmount: Number(edit.baseAmount) || 0, bonus: Number(edit.bonus) || 0, deductions: Number(edit.deductions) || 0, note: edit.note || '' }));
      setEditId(null);
      toastSuccess(t('admin.sal.updated'));
    } catch (err) {
      toastError(err, t('admin.sal.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const pay = async (id) => {
    setBusy(true);
    try {
      replace(await api.post(`/finance/salaries/${id}/pay`, { mode: payMode }));
      setPayId(null);
      toastSuccess(t('admin.sal.paid'));
    } catch (err) {
      toastError(err, t('admin.sal.payFailed'));
    } finally {
      setBusy(false);
    }
  };

  const totalNet = rows.reduce((a, r) => a + (r.netAmount || 0), 0);
  const paidNet = rows.filter(r => r.status === 'paid').reduce((a, r) => a + (r.netAmount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="ui-card overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 md:px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiDollarSign /></div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white">{t('admin.sal.title')}</h3>
              <p className="text-xs text-gray-500">{t('admin.sal.summary', { paid: formatINR(paidNet), total: formatINR(totalNet) })}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="ui-input !w-auto !py-2 font-semibold" aria-label={t('admin.sal.month')} />
            <button type="button" onClick={generate} disabled={generating || !month} className="ui-btn-primary !py-2"><FiZap /> {generating ? t('admin.sal.generating') : t('admin.sal.generate')}</button>
            <button type="button" onClick={load} className={iconBtn} aria-label={t('admin.common.refresh')}><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>
        <div className={`${tableScroll} max-h-[32rem]`}>
          <table className="w-full text-left min-w-[860px]">
            <thead>
              <tr className={theadRow}>
                <th className={thCls}>{t('admin.sal.teacher')}</th>
                <th className={thCls}>{t('admin.sal.base')}</th>
                <th className={thCls}>{t('admin.sal.bonus')}</th>
                <th className={thCls}>{t('admin.sal.deductions')}</th>
                <th className={thCls}>{t('admin.sal.net')}</th>
                <th className={thCls}>{t('admin.common.status')}</th>
                <th className={`${thCls} text-right`}>{t('admin.common.actions')}</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {loading && rows.length === 0 ? <SkeletonRows rows={4} cols={7} /> : rows.length === 0 ? (
                <EmptyRow colSpan={7} icon={FiDollarSign} title={t('admin.sal.empty')} hint={t('admin.sal.emptyHint')} action={<button type="button" onClick={generate} className="ui-btn-primary"><FiZap /> {t('admin.sal.generate')}</button>} />
              ) : rows.map(r => {
                const editing = editId === r._id;
                return (
                  <tr key={r._id} className={rowCls}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <Avatar name={r.teacherId?.name || '?'} size="sm" />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{r.teacherId?.name || '—'}</p>
                          {r.note && <p className="text-[11px] text-gray-400 truncate max-w-[12rem]">{r.note}</p>}
                        </div>
                      </div>
                    </td>
                    {['baseAmount', 'bonus', 'deductions'].map(k => (
                      <td key={k} className={`${tdCls} text-sm font-semibold text-gray-700 dark:text-gray-200`}>
                        {editing ? <input type="number" min="0" className={smallInput} value={edit[k]} onChange={e => setEdit(s => ({ ...s, [k]: e.target.value }))} aria-label={t(`admin.sal.${k === 'baseAmount' ? 'base' : k}`)} /> : formatINR(r[k])}
                      </td>
                    ))}
                    <td className={`${tdCls} font-extrabold text-gray-900 dark:text-white`}>{formatINR(r.netAmount)}</td>
                    <td className={tdCls}>
                      <Badge tone={r.status === 'paid' ? 'green' : 'amber'} dot>{t(`admin.sal.st.${r.status}`)}</Badge>
                      {r.status === 'paid' && r.paidOn && <p className="text-[10px] text-gray-400 mt-1">{new Date(r.paidOn).toLocaleDateString('en-IN')} · {r.mode}</p>}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      {editing ? (
                        <span className="inline-flex gap-1">
                          <button type="button" disabled={busy} onClick={() => saveEdit(r._id)} className={`${iconBtn} !text-emerald-600`} aria-label={t('admin.common.save')}><FiCheck /></button>
                          <button type="button" onClick={() => setEditId(null)} className={iconBtn} aria-label={t('admin.common.cancel')}><FiX /></button>
                        </span>
                      ) : payId === r._id ? (
                        <span className="inline-flex items-center gap-1.5 animate-scale-in">
                          <select value={payMode} onChange={e => setPayMode(e.target.value)} className="ui-input !w-auto !py-1.5 !px-2 text-xs font-semibold" aria-label={t('admin.sal.mode')}>
                            {MODES.map(m => <option key={m}>{m}</option>)}
                          </select>
                          <button type="button" disabled={busy} onClick={() => pay(r._id)} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">{t('admin.sal.confirmPay')}</button>
                          <button type="button" onClick={() => setPayId(null)} className={iconBtn} aria-label={t('admin.common.cancel')}><FiX /></button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-1.5">
                          {r.status !== 'paid' && <button type="button" onClick={() => setPayId(r._id)} className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-300 transition-all">{t('admin.sal.markPaid')}</button>}
                          <button type="button" onClick={() => { setEditId(r._id); setEdit({ baseAmount: r.baseAmount, bonus: r.bonus, deductions: r.deductions, note: r.note }); }} className={iconBtn} aria-label={t('admin.common.edit')}><FiEdit2 /></button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <TeacherSalaries teachers={teachers} onChanged={onTeachersChanged} />
    </div>
  );
};

export default SalaryPanel;
