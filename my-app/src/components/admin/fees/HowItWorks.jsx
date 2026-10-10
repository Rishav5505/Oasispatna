import React from 'react';
import { FiX, FiSliders, FiUsers, FiCreditCard, FiChevronRight, FiMail } from 'react-icons/fi';
import { useI18n } from '../../../i18n/useI18n';

/** Dismissible 3-step explainer shown at the top of the fees desk. */
const HowItWorks = ({ onDismiss, onGo, canManage }) => {
  const { t } = useI18n();
  const steps = [
    { icon: FiSliders, title: t('admin.fd.how.s1'), text: t('admin.fd.how.s1d'), tab: 'setup' },
    { icon: FiUsers, title: t('admin.fd.how.s2'), text: t('admin.fd.how.s2d'), tab: 'setup' },
    { icon: FiCreditCard, title: t('admin.fd.how.s3'), text: t('admin.fd.how.s3d'), tab: 'collect', mail: true },
  ];
  return (
    <section className="relative overflow-hidden rounded-3xl bg-brand-dark text-white p-5 md:p-6 shadow-card animate-fade-up" aria-label={t('admin.fd.how.title')}>
      <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300">{t('admin.fd.how.eyebrow')}</p>
          <h3 className="text-lg font-extrabold tracking-tight">{t('admin.fd.how.title')}</h3>
          {!canManage && <p className="text-xs text-white/60 mt-0.5">{t('admin.fd.how.staffNote')}</p>}
        </div>
        <button type="button" onClick={onDismiss} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold shrink-0 transition-colors">
          <FiX /> {t('admin.fd.how.dismiss')}
        </button>
      </div>
      <ol className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button type="button" onClick={() => onGo(s.tab)} className="group w-full h-full text-left rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] ring-1 ring-white/10 p-4 flex gap-3.5 transition-colors">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center font-extrabold text-lg shadow-brand-soft">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-extrabold text-sm"><s.icon className="text-brand-300 shrink-0" /> {s.title}</span>
                <span className="block text-xs text-white/70 mt-1 leading-relaxed">{s.text}</span>
                {s.mail && <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300"><FiMail /> {t('admin.fd.how.mail')}</span>}
              </span>
              <FiChevronRight className="shrink-0 mt-1 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default HowItWorks;
