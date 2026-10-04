import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { FiUser, FiMail, FiPhone, FiHash, FiCamera, FiEdit2, FiCheckCircle, FiX } from 'react-icons/fi';
import config from '../../config';
import { AuthContext } from '../../contexts/AuthContext';
import { api, toastError, toastSuccess } from '../admin/adminApi';
import { Avatar, Badge, SkeletonBlock, inputCls, labelCls } from '../admin/AdminUI';
import PreferencesCard from '../admin/PreferencesCard';
import { resolveUrl } from '../common/api';
import { useI18n } from '../../i18n/useI18n';

/** Staff profile: view/edit name & phone, photo (PUT /auth/me multipart), language & push preferences. */
const StaffProfile = () => {
  const { t } = useI18n();
  const { updateUser } = useContext(AuthContext);
  const [me, setMe] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(u => { setMe(u); setForm({ name: u.name || '', phone: u.phone || '' }); }).catch(err => toastError(err, t('admin.common.loadFailed')));
  }, [t]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('phone', form.phone);
      if (photo) fd.append('profilePhoto', photo);
      const res = await axios.put(`${config.API_URL}/auth/me`, fd, { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } });
      const u = res.data?.user || {};
      setMe(m => ({ ...m, ...u }));
      updateUser?.({ name: u.name, profilePhoto: u.profilePhoto });
      setEdit(false);
      setPhoto(null);
      setPreview(null);
      toastSuccess(t('staff.profile.saved'));
    } catch (err) {
      toastError(err, t('staff.profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!me) return <div className="max-w-3xl mx-auto"><SkeletonBlock className="h-96" /></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="ui-card overflow-hidden">
        <div className="relative h-32 bg-brand-sunset"><div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} /></div>
        <div className="px-6 md:px-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-12">
            <label className="relative group w-28 h-28 rounded-3xl ring-4 ring-white dark:ring-ink-900 overflow-hidden cursor-pointer shrink-0">
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <Avatar name={me.name} src={me.profilePhoto ? resolveUrl(me.profilePhoto) : null} size="xl" className="!w-full !h-full !text-3xl !rounded-none !ring-0" />}
              <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold transition-all"><FiCamera className="text-xl mb-1" />{t('staff.profile.photo')}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={pick} />
            </label>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white truncate">{me.name}</h2>
              <Badge tone="brand" dot pulse>{t('staff.profile.role')}</Badge>
            </div>
            {!edit && <button type="button" onClick={() => setEdit(true)} className="ui-btn-secondary"><FiEdit2 /> {t('admin.common.edit')}</button>}
          </div>

          {preview && !edit && (
            <div className="flex flex-wrap gap-2.5 mt-5 p-3 rounded-2xl bg-brand-50 dark:bg-white/5 animate-fade-up">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1 self-center">{t('staff.profile.photoConfirm')}</p>
              <button type="button" onClick={save} disabled={saving} className="ui-btn-primary"><FiCheckCircle /> {t('admin.common.save')}</button>
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} className="ui-btn-secondary">{t('admin.common.cancel')}</button>
            </div>
          )}

          {edit ? (
            <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 animate-fade-in">
              <div><label className={labelCls} htmlFor="sp-name">{t('admin.common.name')}</label><input id="sp-name" required className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className={labelCls} htmlFor="sp-phone">{t('admin.common.phone')}</label><input id="sp-phone" className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="md:col-span-2 flex justify-end gap-2.5">
                <button type="button" onClick={() => setEdit(false)} className="ui-btn-secondary"><FiX /> {t('admin.common.cancel')}</button>
                <button type="submit" disabled={saving} className="ui-btn-primary"><FiCheckCircle /> {saving ? t('admin.common.saving') : t('admin.common.save')}</button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[{ icon: FiUser, l: t('admin.common.name'), v: me.name }, { icon: FiHash, l: t('staff.profile.id'), v: `#${(me._id || '').slice(-8).toUpperCase()}` }, { icon: FiPhone, l: t('admin.common.phone'), v: me.phone || '—' }, { icon: FiMail, l: t('admin.common.email'), v: me.email }].map((f) => (
                <div key={f.l} className="flex items-center gap-3.5 p-4 rounded-2xl ring-1 ring-gray-100 dark:ring-white/5">
                  <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0"><f.icon /></span>
                  <div className="min-w-0"><p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{f.l}</p><p className="font-bold text-gray-900 dark:text-white truncate">{f.v}</p></div>
                </div>
              ))}
            </div>
          )}
          <PreferencesCard />
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
