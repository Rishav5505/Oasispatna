import React from 'react';
import { FiGlobe, FiBell } from 'react-icons/fi';
import PushToggle from '../common/PushToggle';
import LanguageToggle from '../common/LanguageToggle';
import { useI18n } from '../../i18n/useI18n';

/** Language + push-notification preferences (shown on the profile tab; mirrors the top-bar controls on mobile). */
const PreferencesCard = () => {
  const { t } = useI18n();
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex items-center gap-3.5 p-4 rounded-2xl ring-1 ring-gray-100 dark:ring-white/5">
        <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0"><FiGlobe /></span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.prefs.language')}</p>
          <p className="text-xs text-gray-500">{t('admin.prefs.languageHint')}</p>
        </div>
        <LanguageToggle />
      </div>
      <div className="flex items-center gap-3.5 p-4 rounded-2xl ring-1 ring-gray-100 dark:ring-white/5">
        <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0"><FiBell /></span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.prefs.push')}</p>
          <p className="text-xs text-gray-500">{t('admin.prefs.pushHint')}</p>
        </div>
        <PushToggle compact />
      </div>
    </div>
  );
};

export default PreferencesCard;
