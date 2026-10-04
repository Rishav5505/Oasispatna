/**
 * LeaveRequests — leave application form + "my requests" list, and/or a review queue (/api/leaves).
 *   import LeaveRequests from '../components/common/LeaveRequests';
 *   <LeaveRequests mode="request" role="student" />
 *   <LeaveRequests mode="request" role="parent" studentOptions={[{ _id: child._id, name: child.name }]} />
 *   <LeaveRequests mode="both" role="teacher" />   // teacher: own leave + review their students' leaves
 *   <LeaveRequests mode="review" role="admin" />
 * Props:
 *   mode: 'request' | 'review' | 'both'
 *   role: 'student' | 'parent' | 'teacher' | 'admin' | 'staff' (used for labels / child picker)
 *   studentOptions?: [{_id, name}] – parent only; adds a child picker (sent as studentId)
 *   className?: string
 * Request: POST /leaves {fromDate, toDate, reason, type, studentId?}, GET /leaves/mine, DELETE /leaves/:id (pending).
 * Review:  GET /leaves/pending, PUT /leaves/:id/review {status:'approved'|'rejected', reviewNote}.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiCalendar, FiSend, FiCheck, FiX, FiTrash2, FiInbox, FiClock, FiUser } from 'react-icons/fi';
import { API, authHeaders, errMsg, toDateInput } from './api';
import { useI18n } from '../../i18n/useI18n';

const TYPES = ['sick', 'personal', 'other'];
const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};
const idOf = (x) => String(x?._id ?? x?.id ?? x ?? '');
const dayCount = (a, b) => {
  const s = new Date(a); s.setHours(0, 0, 0, 0);
  const e = new Date(b); e.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
};
const requesterName = (r) =>
  r.studentName || r.studentId?.name || r.studentId?.userId?.name || r.userId?.name || r.name || '—';

const Empty = ({ text }) => (
  <div className="py-10 flex flex-col items-center text-center gap-3">
    <span className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center"><FiInbox className="w-6 h-6" /></span>
    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{text}</p>
  </div>
);
const Skeleton = () => <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="ui-skeleton h-20" />)}</div>;

export function LeaveRequests({ mode = 'request', role = 'student', studentOptions = [], className = '' }) {
  const { t, lang } = useI18n();
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const canRequest = mode === 'request' || mode === 'both';
  const canReview = mode === 'review' || mode === 'both';
  const [tab, setTab] = useState(canRequest ? 'mine' : 'review');

  const today = toDateInput(new Date());
  const [form, setForm] = useState({ fromDate: today, toDate: today, type: 'sick', reason: '', studentId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState(null);
  const [pending, setPending] = useState(null);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const children = useMemo(() => studentOptions.map((s) => ({ value: idOf(s), label: s.name || s.label || idOf(s) })), [studentOptions]);
  const childId = form.studentId || children[0]?.value || '';

  const loadMine = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/leaves/mine`, { headers: authHeaders() });
      setMine(Array.isArray(data) ? data : []);
    } catch (err) {
      setMine([]);
      toast.error(errMsg(err, t('common.error')));
    }
  }, [t]);

  const loadPending = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/leaves/pending`, { headers: authHeaders() });
      setPending(Array.isArray(data) ? data : []);
    } catch (err) {
      setPending([]);
      toast.error(errMsg(err, t('common.error')));
    }
  }, [t]);

  useEffect(() => { if (canRequest) loadMine(); }, [canRequest, loadMine]);
  useEffect(() => { if (canReview) loadPending(); }, [canReview, loadPending]);

  const fmt = (d) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const range = (r) => (toDateInput(r.fromDate) === toDateInput(r.toDate) ? fmt(r.fromDate) : `${fmt(r.fromDate)} – ${fmt(r.toDate)}`);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) { toast.error(t('leave.reasonRequired')); return; }
    if (form.toDate < form.fromDate) { toast.error(t('leave.dateError')); return; }
    setSubmitting(true);
    try {
      const payload = { fromDate: form.fromDate, toDate: form.toDate, type: form.type, reason: form.reason.trim() };
      if (role === 'parent' && childId) payload.studentId = childId;
      const { data } = await axios.post(`${API}/leaves`, payload, { headers: authHeaders() });
      toast.success(t('leave.submitted'));
      setForm((f) => ({ ...f, reason: '' }));
      const created = data?.leave || data;
      if (created && created._id) setMine((list) => [created, ...(list || [])]);
      else loadMine();
    } catch (err) {
      toast.error(errMsg(err, t('common.error')));
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async (id) => {
    setBusyId(id);
    try {
      await axios.delete(`${API}/leaves/${id}`, { headers: authHeaders() });
      setMine((list) => (list || []).filter((r) => idOf(r) !== id));
      toast.success(t('leave.withdrawn'));
    } catch (err) {
      toast.error(errMsg(err, t('common.error')));
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const review = async (id, status) => {
    setBusyId(id);
    try {
      await axios.put(`${API}/leaves/${id}/review`, { status, reviewNote: (notes[id] || '').trim() }, { headers: authHeaders() });
      setPending((list) => (list || []).filter((r) => idOf(r) !== id));
      toast.success(t(`leave.status.${status}`));
    } catch (err) {
      toast.error(errMsg(err, t('common.error')));
    } finally {
      setBusyId(null);
    }
  };

  const requestForm = (
    <form onSubmit={submit} className="ui-card p-5 sm:p-6 space-y-4 self-start">
      <h3 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">
        <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiCalendar /></span>
        {t('leave.request')}
      </h3>
      {role === 'parent' && children.length > 1 && (
        <label className="block">
          <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('leave.forChild')}</span>
          <select className="ui-input" value={childId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}>
            {children.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('common.from')}</span>
          <input type="date" className="ui-input" value={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value, toDate: f.toDate < e.target.value ? e.target.value : f.toDate }))} required />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('common.to')}</span>
          <input type="date" className="ui-input" value={form.toDate} min={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} required />
        </label>
      </div>
      <div>
        <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('leave.type')}</span>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((ty) => (
            <button
              key={ty}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: ty }))}
              aria-pressed={form.type === ty}
              className={`py-2 rounded-xl text-xs font-bold border transition ${form.type === ty ? 'bg-brand-gradient text-white border-transparent shadow-brand-soft' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-brand-300'}`}
            >
              {t(`leave.type.${ty}`)}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('leave.reason')}</span>
        <textarea className="ui-input min-h-[90px] resize-y" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} maxLength={500} required />
      </label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-gray-400">{form.fromDate && form.toDate >= form.fromDate ? t('leave.days', { count: dayCount(form.fromDate, form.toDate) }) : ''}</span>
        <button type="submit" disabled={submitting} className="ui-btn-primary"><FiSend /> {submitting ? t('common.loading') : t('common.submit')}</button>
      </div>
    </form>
  );

  const myList = (
    <div className="ui-card p-5 sm:p-6 min-w-0">
      <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">{t('leave.myRequests')}</h3>
      {mine === null ? <Skeleton /> : mine.length === 0 ? <Empty text={t('leave.none')} /> : (
        <ul className="space-y-3 ui-stagger">
          {mine.map((r) => {
            const id = idOf(r);
            const status = r.status || 'pending';
            return (
              <li key={id} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-brand-100 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{range(r)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t(`leave.type.${TYPES.includes(r.type) ? r.type : 'other'}`)} · {t('leave.days', { count: dayCount(r.fromDate, r.toDate) })}
                      {role === 'parent' && requesterName(r) !== '—' && r.studentId ? ` · ${requesterName(r)}` : ''}
                    </p>
                  </div>
                  <span className={`ui-badge ${STATUS_BADGE[status] || STATUS_BADGE.pending}`}>{t(`leave.status.${status}`)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-line break-words">{r.reason}</p>
                {r.reviewNote && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2"><span className="font-bold">{t('common.note')}:</span> {r.reviewNote}</p>
                )}
                {status === 'pending' && (
                  <div className="mt-3 flex justify-end">
                    {confirmId === id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-red-600">{t('common.confirm')}</span>
                        <button type="button" onClick={() => withdraw(id)} disabled={busyId === id} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">{t('common.yes')}</button>
                        <button type="button" onClick={() => setConfirmId(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">{t('common.no')}</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmId(id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                        <FiTrash2 /> {t('leave.withdraw')}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const reviewList = (
    <div className="ui-card p-5 sm:p-6 min-w-0">
      <h3 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
        {t('leave.toReview')}
        {pending?.length > 0 && <span className="ui-badge bg-brand-gradient text-white">{pending.length}</span>}
      </h3>
      {pending === null ? <Skeleton /> : pending.length === 0 ? <Empty text={t('leave.noneToReview')} /> : (
        <ul className="space-y-3 ui-stagger">
          {pending.map((r) => {
            const id = idOf(r);
            const name = requesterName(r);
            const reqRole = r.role || r.userId?.role;
            return (
              <li key={id} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 shrink-0 rounded-full bg-brand-gradient text-white font-extrabold text-sm flex items-center justify-center">
                    {name !== '—' ? name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() : <FiUser />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{name}</p>
                      {reqRole && <span className="ui-badge bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 !text-[10px]">{reqRole}</span>}
                      <span className="ui-badge bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 !text-[10px]"><FiClock className="w-3 h-3" /> {t('leave.status.pending')}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {range(r)} · {t('leave.days', { count: dayCount(r.fromDate, r.toDate) })} · {t(`leave.type.${TYPES.includes(r.type) ? r.type : 'other'}`)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-line break-words">{r.reason}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    className="ui-input !py-2.5 flex-1"
                    placeholder={t('leave.reviewNote')}
                    aria-label={t('leave.reviewNote')}
                    value={notes[id] || ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [id]: e.target.value }))}
                    maxLength={300}
                  />
                  <div className="grid grid-cols-2 sm:flex gap-2">
                    <button type="button" disabled={busyId === id} onClick={() => review(id, 'approved')} className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-50">
                      <FiCheck /> {t('leave.approve')}
                    </button>
                    <button type="button" disabled={busyId === id} onClick={() => review(id, 'rejected')} className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 active:scale-[0.98] transition disabled:opacity-50">
                      <FiX /> {t('leave.reject')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const requestView = (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-5">
      {requestForm}
      {myList}
    </div>
  );

  if (mode !== 'both') {
    return <div className={className}>{canRequest ? requestView : reviewList}</div>;
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <div role="tablist" className="inline-flex p-1 rounded-2xl bg-gray-100 dark:bg-white/10">
        {[['mine', t('leave.myRequests')], ['review', t('leave.toReview')]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === key ? 'bg-white dark:bg-ink-800 text-brand-600 shadow-card' : 'text-gray-500 dark:text-gray-300 hover:text-brand-600'}`}
          >
            {label}
            {key === 'review' && pending?.length > 0 && <span className="ml-1.5 ui-badge bg-brand-gradient text-white !px-1.5 !py-0.5">{pending.length}</span>}
          </button>
        ))}
      </div>
      <div key={tab} className="animate-fade-up">{tab === 'mine' ? requestView : reviewList}</div>
    </div>
  );
}

export default LeaveRequests;
