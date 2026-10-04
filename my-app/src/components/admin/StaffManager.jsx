import React, { useCallback, useEffect, useState } from 'react';
import { FiBriefcase, FiUserPlus, FiRefreshCw, FiMail, FiPhone } from 'react-icons/fi';
import { api, toastError, toastSuccess } from './adminApi';
import { PageHeader, Avatar, Badge, ConfirmDelete, SkeletonRows, EmptyRow, inputCls, labelCls, tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls } from './AdminUI';
import { timeAgo } from './liveStatus';
import { useI18n } from '../../i18n/useI18n';

const EMPTY = { name: '', email: '', phone: '', password: '' };

/** Staff / receptionist accounts: GET/POST /users/staff, DELETE /users/:id. */
const StaffManager = () => {
  const { t } = useI18n();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStaff(await api.get('/users/staff'));
    } catch (err) {
      toastError(err, t('admin.common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() };
      if (form.password) body.password = form.password;
      const u = await api.post('/users/staff', body);
      setStaff(s => [u, ...s]);
      setForm(EMPTY);
      toastSuccess(t('admin.staff.created', { name: u.name }));
    } catch (err) {
      toastError(err, t('admin.staff.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    try {
      await api.del(`/users/${u._id}`);
      setStaff(s => s.filter(x => x._id !== u._id));
      toastSuccess(t('admin.staff.deleted', { name: u.name }));
    } catch (err) {
      toastError(err, t('admin.staff.deleteFailed'));
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader icon={FiBriefcase} eyebrow={t('admin.group.people')} title={t('admin.heading.staff')} subtitle={t('admin.staff.subtitle', { n: staff.length })}
        actions={<button type="button" onClick={load} className="ui-btn-secondary"><FiRefreshCw className={loading ? 'animate-spin' : ''} /> {t('admin.common.refresh')}</button>} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 md:gap-6">
        <div className="xl:col-span-2 ui-card overflow-hidden h-fit">
          <div className={`${tableScroll} max-h-[65vh]`}>
            <table className="w-full text-left min-w-[620px]">
              <thead>
                <tr className={theadRow}>
                  <th className={thCls}>{t('admin.staff.member')}</th>
                  <th className={thCls}>{t('admin.common.phone')}</th>
                  <th className={thCls}>{t('admin.common.status')}</th>
                  <th className={`${thCls} text-right`}>{t('admin.common.actions')}</th>
                </tr>
              </thead>
              <tbody className={tbodyCls}>
                {loading && staff.length === 0 ? <SkeletonRows rows={3} cols={4} /> : staff.length === 0 ? (
                  <EmptyRow colSpan={4} icon={FiBriefcase} title={t('admin.staff.empty')} hint={t('admin.staff.emptyHint')} />
                ) : staff.map(u => (
                  <tr key={u._id} className={rowCls}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="md" />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{u.name}</p>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1"><FiMail className="shrink-0" />{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${tdCls} text-sm text-gray-600 dark:text-gray-300`}><span className="flex items-center gap-1.5"><FiPhone className="text-gray-400" />{u.phone || '—'}</span></td>
                    <td className={tdCls}>
                      {u.mustChangePassword ? <Badge tone="amber" dot>{t('admin.staff.invited')}</Badge> : <Badge tone="green" dot>{t('admin.staff.active')}</Badge>}
                      {u.createdAt && <p className="text-[10px] text-gray-400 mt-1">{t('admin.staff.added', { when: timeAgo(u.createdAt) })}</p>}
                    </td>
                    <td className={`${tdCls} text-right`}><ConfirmDelete compact onConfirm={() => remove(u)} label={t('admin.common.delete')} confirmLabel={t('admin.common.delete')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={create} className="ui-card p-5 md:p-6 space-y-4 h-fit xl:sticky xl:top-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiUserPlus /></div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white">{t('admin.staff.add')}</h3>
              <p className="text-xs text-gray-500">{t('admin.staff.addHint')}</p>
            </div>
          </div>
          <div><label className={labelCls} htmlFor="st-name">{t('admin.common.name')}</label><input id="st-name" required className={inputCls} value={form.name} onChange={set('name')} /></div>
          <div><label className={labelCls} htmlFor="st-email">{t('admin.common.email')}</label><input id="st-email" type="email" required className={inputCls} value={form.email} onChange={set('email')} /></div>
          <div><label className={labelCls} htmlFor="st-phone">{t('admin.common.phone')}</label><input id="st-phone" type="tel" required className={inputCls} value={form.phone} onChange={set('phone')} /></div>
          <div><label className={labelCls} htmlFor="st-pass">{t('admin.staff.password')}</label><input id="st-pass" type="password" className={inputCls} value={form.password} onChange={set('password')} placeholder={t('admin.staff.passwordPh')} autoComplete="new-password" /></div>
          <button type="submit" disabled={saving} className="ui-btn-primary w-full !py-3"><FiUserPlus /> {saving ? t('admin.common.saving') : t('admin.staff.create')}</button>
          <p className="text-[11px] text-gray-400 leading-relaxed">{t('admin.staff.access')}</p>
        </form>
      </div>
    </>
  );
};

export default StaffManager;
