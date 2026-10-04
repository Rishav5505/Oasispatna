import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiFileText, FiSearch, FiRefreshCw, FiChevronRight, FiX, FiCheckCircle, FiEye, FiXCircle, FiPhone, FiMail, FiExternalLink, FiUserPlus } from 'react-icons/fi';
import { api, toastError, toastSuccess } from './adminApi';
import { PageHeader, Badge, Avatar, SkeletonRows, EmptyRow, Pagination, Modal, inputCls, labelCls, tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls, iconBtn } from './AdminUI';
import usePagination from './usePagination';
import { timeAgo } from './liveStatus';
import AdmissionFunnel from './AdmissionFunnel';
import { resolveUrl, isPdfUrl } from '../common/api';
import { useI18n } from '../../i18n/useI18n';

const STATUSES = ['submitted', 'under_review', 'approved', 'rejected'];
const TONE = { submitted: 'brand', under_review: 'amber', approved: 'green', rejected: 'red' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const StatusBadge = ({ status }) => {
  const { t } = useI18n();
  return <Badge tone={TONE[status] || 'gray'} dot pulse={status === 'submitted'}>{t(`admin.adm.status.${status}`)}</Badge>;
};

const Field = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 break-words">{value || value === 0 ? value : '—'}</p>
  </div>
);

/* ---------------- Approve modal ---------------- */
const ApproveModal = ({ app, onClose, onApproved }) => {
  const { t } = useI18n();
  const [classes, setClasses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({ classId: app.classApplying?._id || app.classApplying || '', batchId: '', totalFee: '', createParent: Boolean(app.parentEmail) });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { api.get('/academics/classes').then(setClasses).catch(err => toastError(err, t('admin.common.loadFailed'))); }, [t]);
  useEffect(() => {
    if (!form.classId) return undefined;
    let alive = true;
    api.get('/academics/batches', { classId: form.classId }).then(b => { if (alive) setBatches(b); }).catch(() => {});
    return () => { alive = false; };
  }, [form.classId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.classId) return;
    setSaving(true);
    try {
      const body = { classId: form.classId, createParent: form.createParent };
      if (form.batchId) body.batchId = form.batchId;
      if (form.totalFee !== '') body.totalFee = Number(form.totalFee);
      const res = await api.post(`/admissions/${app._id}/approve`, body);
      setResult(res);
      toastSuccess(t('admin.adm.approvedToast', { name: app.studentName }));
      onApproved?.();
    } catch (err) {
      toastError(err, t('admin.adm.approveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const s = result.student;
    return (
      <Modal icon={FiCheckCircle} title={t('admin.adm.approvedTitle')} subtitle={app.applicationNo} onClose={onClose} z="z-[260]"
        footer={<button type="button" onClick={onClose} className="ui-btn-primary">{t('admin.common.done')}</button>}>
        <div className="space-y-4 animate-scale-in">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-200/70 dark:ring-emerald-500/20">
            <FiCheckCircle className="text-2xl text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{t('admin.adm.credsStudent', { name: s?.name || app.studentName, email: s?.userId?.email || app.email })}</p>
          </div>
          {result.parent ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-200/70 dark:ring-brand-500/20">
              <FiUserPlus className="text-2xl text-brand-600 shrink-0" />
              <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">{t('admin.adm.credsParent', { name: result.parent.name || '', email: result.parent.email })}</p>
            </div>
          ) : form.createParent && <p className="text-xs text-gray-500">{t('admin.adm.parentNotCreated')}</p>}
          <p className="text-xs text-gray-500">{t('admin.adm.credsHint')}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal icon={FiCheckCircle} title={t('admin.adm.approveTitle')} subtitle={`${app.studentName} · ${app.applicationNo}`} onClose={onClose} z="z-[260]"
      footer={(
        <>
          <button type="button" onClick={onClose} className="ui-btn-secondary">{t('admin.common.cancel')}</button>
          <button type="submit" form="approve-form" disabled={saving || !form.classId} className="ui-btn-primary">{saving ? t('admin.common.saving') : <><FiCheckCircle /> {t('admin.adm.approveCta')}</>}</button>
        </>
      )}>
      <form id="approve-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="ap-class">{t('admin.common.class')}</label>
            <select id="ap-class" required className={inputCls} value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, batchId: '' }))}>
              <option value="">—</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="ap-batch">{t('admin.common.batch')}</label>
            <select id="ap-batch" className={inputCls} value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))} disabled={!form.classId}>
              <option value="">{t('admin.common.none')}</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="ap-fee">{t('admin.adm.totalFee')}</label>
          <input id="ap-fee" type="number" min="0" className={inputCls} value={form.totalFee} onChange={e => setForm(f => ({ ...f, totalFee: e.target.value }))} placeholder="e.g. 60000" />
        </div>
        <label className={`flex items-center gap-3 p-4 rounded-2xl ring-1 ring-gray-100 dark:ring-white/10 ${app.parentEmail ? 'cursor-pointer hover:bg-brand-50/40' : 'opacity-60'}`}>
          <input type="checkbox" className="w-4 h-4 accent-brand-500" checked={form.createParent} disabled={!app.parentEmail} onChange={e => setForm(f => ({ ...f, createParent: e.target.checked }))} />
          <span className="flex-1">
            <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">{t('admin.adm.createParent')}</span>
            <span className="block text-xs text-gray-500">{app.parentEmail ? app.parentEmail : t('admin.adm.noParentEmail')}</span>
          </span>
        </label>
      </form>
    </Modal>
  );
};

/* ---------------- Detail drawer ---------------- */
const AdmissionDrawer = ({ id, canApprove, onClose, onChanged }) => {
  const { t } = useI18n();
  const [app, setApp] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    try {
      const a = await api.get(`/admissions/${id}`);
      setApp(a);
      setNote(a.reviewNote || '');
    } catch (err) {
      toastError(err, t('admin.common.loadFailed'));
      onClose();
    }
  }, [id, onClose, t]);

  useEffect(() => { load(); }, [load]);

  const review = async (status) => {
    setBusy(true);
    try {
      const a = await api.put(`/admissions/${id}/review`, { status, reviewNote: note });
      setApp(prev => ({ ...prev, ...a }));
      setConfirmReject(false);
      toastSuccess(t(status === 'rejected' ? 'admin.adm.rejectedToast' : 'admin.adm.reviewToast'));
      onChanged?.();
    } catch (err) {
      toastError(err, t('admin.adm.reviewFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <aside className="absolute right-0 inset-y-0 w-full max-w-xl bg-white dark:bg-ink-900 shadow-2xl flex flex-col animate-slide-in-right" onClick={e => e.stopPropagation()} aria-label={t('admin.adm.detail')}>
        <div className="relative bg-brand-sunset text-white p-6">
          <button type="button" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center" aria-label={t('admin.common.close')}><FiX /></button>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{t('admin.adm.detail')}</p>
          {app ? (
            <div className="mt-3 flex items-center gap-4">
              {(() => {
                const photo = (app.documents || []).find(d => d.kind === 'photo');
                return <Avatar name={app.studentName} src={photo ? resolveUrl(photo.url) : null} size="xl" className="!ring-white/30" />;
              })()}
              <div className="min-w-0">
                <h3 className="text-xl font-extrabold truncate">{app.studentName}</h3>
                <p className="text-sm text-white/75 font-mono">{app.applicationNo}</p>
                <div className="mt-1.5"><StatusBadge status={app.status} /></div>
              </div>
            </div>
          ) : <div className="mt-3 h-16 ui-skeleton !bg-white/20 rounded-2xl" />}
        </div>

        <div className="flex-1 overflow-y-auto ui-scrollbar p-6 space-y-6">
          {!app ? [0, 1, 2].map(i => <div key={i} className="ui-skeleton h-24 rounded-2xl" />) : (
            <>
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 mb-3">{t('admin.adm.secStudent')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t('admin.common.email')} value={app.email} />
                  <Field label={t('admin.common.phone')} value={app.phone} />
                  <Field label={t('admin.adm.dob')} value={app.dob ? fmtDate(app.dob) : ''} />
                  <Field label={t('admin.adm.gender')} value={app.gender} />
                  <div className="col-span-2"><Field label={t('admin.adm.address')} value={app.address} /></div>
                </div>
              </section>
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 mb-3">{t('admin.adm.secParent')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t('admin.adm.father')} value={app.fatherName} />
                  <Field label={t('admin.adm.mother')} value={app.motherName} />
                  <Field label={t('admin.adm.parentPhone')} value={app.parentPhone} />
                  <Field label={t('admin.adm.parentEmail')} value={app.parentEmail} />
                </div>
              </section>
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 mb-3">{t('admin.adm.secAcademic')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t('admin.adm.classApplying')} value={app.classApplying?.name} />
                  <Field label={t('admin.adm.course')} value={app.courseInterest} />
                  <Field label={t('admin.adm.school')} value={app.schoolName} />
                  <Field label={t('admin.adm.prevMarks')} value={app.previousMarksPct != null ? `${app.previousMarksPct}%` : ''} />
                  <Field label={t('admin.adm.submitted')} value={fmtDate(app.createdAt)} />
                  {app.leadId && <Field label={t('admin.adm.lead')} value={`${app.leadId.name || ''} · ${app.leadId.status || ''}`} />}
                </div>
              </section>
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 mb-3">{t('admin.adm.documents')}</p>
                {(app.documents || []).length === 0 ? <p className="text-sm text-gray-500">{t('admin.adm.noDocs')}</p> : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {app.documents.map((d, i) => {
                      const url = resolveUrl(d.url);
                      return (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="group block rounded-2xl ring-1 ring-gray-100 dark:ring-white/10 overflow-hidden hover:ring-brand-300 transition-all">
                          {isPdfUrl(url)
                            ? <div className="h-24 flex items-center justify-center bg-brand-50 dark:bg-brand-500/10 text-brand-600 text-3xl"><FiFileText /></div>
                            : <img src={url} alt={d.kind} className="h-24 w-full object-cover group-hover:scale-105 transition-transform" />}
                          <p className="px-2.5 py-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between gap-1 capitalize">{t(`admin.adm.doc.${d.kind}`)} <FiExternalLink /></p>
                        </a>
                      );
                    })}
                  </div>
                )}
              </section>
              {app.createdStudentId && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  {t('admin.adm.enrolledAs', { name: app.createdStudentId.name || app.studentName, cls: app.createdStudentId.classId?.name || '' })}
                </div>
              )}
              {app.status !== 'approved' && (
                <section>
                  <label className={labelCls} htmlFor="adm-note">{t('admin.adm.reviewNote')}</label>
                  <textarea id="adm-note" rows={3} className={`${inputCls} resize-none`} value={note} onChange={e => setNote(e.target.value)} placeholder={t('admin.adm.notePh')} />
                </section>
              )}
            </>
          )}
        </div>

        {app && app.status !== 'approved' && (
          <div className="p-4 border-t border-gray-100 dark:border-white/5 flex flex-wrap gap-2 justify-end">
            {confirmReject ? (
              <span className="flex flex-wrap items-center gap-2 animate-scale-in">
                <span className="text-xs font-semibold text-gray-500">{t('admin.adm.rejectConfirm')}</span>
                <button type="button" disabled={busy} onClick={() => review('rejected')} className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50">{t('admin.adm.reject')}</button>
                <button type="button" onClick={() => setConfirmReject(false)} className="ui-btn-secondary">{t('admin.common.cancel')}</button>
              </span>
            ) : (
              <>
                {app.status !== 'rejected' && <button type="button" onClick={() => setConfirmReject(true)} className="ui-btn-secondary !text-red-600"><FiXCircle /> {t('admin.adm.reject')}</button>}
                {app.status !== 'under_review' && <button type="button" disabled={busy} onClick={() => review('under_review')} className="ui-btn-secondary"><FiEye /> {t('admin.adm.markReview')}</button>}
                {canApprove && <button type="button" onClick={() => setApproving(true)} className="ui-btn-primary"><FiCheckCircle /> {t('admin.adm.approve')}</button>}
              </>
            )}
          </div>
        )}
      </aside>
      {approving && app && (
        <div onClick={e => e.stopPropagation()}>
          <ApproveModal app={app} onClose={() => setApproving(false)} onApproved={() => { load(); onChanged?.(); }} />
        </div>
      )}
    </div>
  );
};

/* ---------------- Manager ---------------- */
const AdmissionsManager = ({ canApprove = false, reloadKey = 0 }) => {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [funnelKey, setFunnelKey] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get('/admissions', query ? { q: query } : undefined));
    } catch (err) {
      toastError(err, t('admin.common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const counts = useMemo(() => STATUSES.reduce((a, s) => ({ ...a, [s]: items.filter(i => i.status === s).length }), {}), [items]);
  const filtered = status === 'all' ? items : items.filter(i => i.status === status);
  const pg = usePagination(filtered);
  const changed = () => { load(); setFunnelKey(k => k + 1); };
  const closeDrawer = useCallback(() => setOpenId(null), []);

  return (
    <>
      <PageHeader
        icon={FiFileText}
        eyebrow={t('admin.group.engagement')}
        title={t('admin.heading.admissions')}
        subtitle={t('admin.adm.subtitle', { n: items.length })}
        actions={(
          <div className="relative sm:w-72">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className="ui-input !pl-10" value={q} onChange={e => { setQ(e.target.value); pg.setPage(1); }} placeholder={t('admin.adm.searchPh')} aria-label={t('admin.adm.searchPh')} />
          </div>
        )}
      />

      <AdmissionFunnel reloadKey={funnelKey + reloadKey} />

      <div className="flex flex-wrap gap-2">
        {['all', ...STATUSES].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatus(s); pg.setPage(1); }}
            aria-pressed={status === s}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${status === s ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-white dark:bg-white/5 ring-1 ring-gray-200 dark:ring-white/10 text-gray-600 dark:text-gray-300 hover:text-brand-600'}`}
          >
            {s === 'all' ? t('admin.common.all') : t(`admin.adm.status.${s}`)}
            <span className={`text-[11px] px-1.5 rounded-md ${status === s ? 'bg-white/25' : 'bg-gray-100 dark:bg-white/10'}`}>{s === 'all' ? items.length : counts[s] || 0}</span>
          </button>
        ))}
        <button type="button" onClick={changed} className={`${iconBtn} ml-auto`} aria-label={t('admin.common.refresh')}><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className={`${tableScroll} max-h-[65vh]`}>
          <table className="w-full text-left min-w-[820px]">
            <thead>
              <tr className={theadRow}>
                <th className={thCls}>{t('admin.adm.applicant')}</th>
                <th className={thCls}>{t('admin.common.class')}</th>
                <th className={thCls}>{t('admin.adm.contact')}</th>
                <th className={thCls}>{t('admin.adm.submitted')}</th>
                <th className={thCls}>{t('admin.common.status')}</th>
                <th className={`${thCls} text-right`}><span className="sr-only">{t('admin.common.open')}</span></th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {loading && items.length === 0 ? <SkeletonRows rows={5} cols={6} /> : pg.total === 0 ? (
                <EmptyRow colSpan={6} icon={FiFileText} title={t('admin.adm.empty')} hint={t('admin.adm.emptyHint')} />
              ) : pg.pageItems.map(a => (
                <tr key={a._id} className={`${rowCls} cursor-pointer`} onClick={() => setOpenId(a._id)}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      <Avatar name={a.studentName} size="md" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-brand-600">{a.studentName}</p>
                        <p className="text-[11px] font-mono text-gray-400">{a.applicationNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}><Badge tone="gray">{a.classApplying?.name || '—'}</Badge></td>
                  <td className={`${tdCls} text-xs text-gray-600 dark:text-gray-300`}>
                    <p className="flex items-center gap-1.5"><FiPhone className="text-gray-400" />{a.phone}</p>
                    <p className="flex items-center gap-1.5 truncate max-w-[14rem]"><FiMail className="text-gray-400" />{a.email}</p>
                  </td>
                  <td className={`${tdCls} text-xs font-semibold text-gray-500`}>{timeAgo(a.createdAt)}</td>
                  <td className={tdCls}><StatusBadge status={a.status} /></td>
                  <td className={`${tdCls} text-right`}><span className={iconBtn}><FiChevronRight /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination {...pg} label={t('admin.adm.records')} />
      </div>

      {openId && <AdmissionDrawer id={openId} canApprove={canApprove} onClose={closeDrawer} onChanged={changed} />}
    </>
  );
};

export default AdmissionsManager;
