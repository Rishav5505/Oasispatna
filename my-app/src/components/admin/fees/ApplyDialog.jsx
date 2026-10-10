import React, { useState } from 'react';
import { FiUsers, FiUserPlus, FiRepeat, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { api, toastError, toastSuccess } from '../adminApi';
import { Modal, Badge } from '../AdminUI';
import { plural } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

/** Copy a class's fee structure into its students' plans (POST /finance/class-fees/:classId/apply). */
const ApplyDialog = ({ cls, onClose, onApplied }) => {
  const { t } = useI18n();
  const [mode, setMode] = useState('missing');
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.post(`/finance/class-fees/${cls.classId}/apply`, { mode });
      const n = (r.created || 0) + (r.replaced || 0);
      toastSuccess(n > 0 ? plural(t, 'admin.fd.apply.done', n, { cls: cls.className }) : t('admin.fd.apply.doneNone'));
      onApplied(r);
    } catch (err) {
      toastError(err, t('admin.fd.apply.failed'));
    } finally {
      setBusy(false);
    }
  };

  const choice = (id, Icon, title, text, extra) => (
    <button type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
      className={`w-full text-left rounded-2xl p-4 flex gap-3.5 ring-1 transition-all ${mode === id ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'ring-gray-200 dark:ring-white/10 hover:ring-brand-300'}`}>
      <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${mode === id ? 'border-brand-600' : 'border-gray-300 dark:border-white/20'}`}>
        {mode === id && <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 font-extrabold text-sm text-gray-900 dark:text-white"><Icon className="text-brand-600" /> {title} {extra}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{text}</span>
      </span>
    </button>
  );

  return (
    <Modal
      title={t('admin.fd.apply.title', { cls: cls.className })}
      subtitle={t('admin.fd.apply.sub', { n: cls.students })}
      icon={FiUsers}
      portal
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={(
        <>
          <button type="button" onClick={onClose} className="ui-btn-secondary">{t('admin.fd.apply.later')}</button>
          <button type="button" onClick={apply} disabled={busy} className="ui-btn-primary disabled:opacity-50">
            <FiCheckCircle /> {busy ? t('admin.fd.apply.applying') : t('admin.fd.apply.confirm')}
          </button>
        </>
      )}
    >
      <div role="radiogroup" aria-label={t('admin.fd.apply.title', { cls: cls.className })} className="space-y-3">
        {choice('missing', FiUserPlus, t('admin.fd.apply.missing'), t('admin.fd.apply.missingText', { n: cls.withoutPlan }), <Badge tone="green">{t('admin.fd.apply.recommended')}</Badge>)}
        {choice('all', FiRepeat, t('admin.fd.apply.all'), t('admin.fd.apply.allText', { n: cls.students }))}
        {mode === 'all' && (
          <p className="flex gap-2.5 p-3 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200 text-xs font-semibold animate-fade-in">
            <FiAlertTriangle className="shrink-0 mt-0.5" /> {t('admin.fd.apply.allWarn')}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default ApplyDialog;
