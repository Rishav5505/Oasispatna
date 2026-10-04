/**
 * LanguageToggle — compact EN / हिं segmented switch for top bars.
 *   import LanguageToggle from '../components/common/LanguageToggle';
 *   <LanguageToggle />                 // default
 *   <LanguageToggle className="ml-2" dark />   // `dark` = styled for dark (ink) backgrounds
 * Reads/writes language through useI18n() (persisted in localStorage).
 */
import React from 'react';
import { useI18n } from '../../i18n/useI18n';

const OPTIONS = [
  { value: 'en', label: 'EN', aria: 'English' },
  { value: 'hi', label: 'हिं', aria: 'हिन्दी' },
];

export function LanguageToggle({ className = '', dark = false }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t('common.language')}
      className={`relative inline-flex items-center p-0.5 rounded-xl border text-xs font-bold select-none ${
        dark ? 'bg-white/10 border-white/10' : 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/10'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-[10px] bg-brand-gradient shadow-brand-soft transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          lang === 'hi' ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      {OPTIONS.map((o) => {
        const active = lang === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.aria}
            onClick={() => setLang(o.value)}
            className={`relative z-10 min-w-[2.5rem] px-2.5 py-1.5 rounded-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active ? 'text-white' : dark ? 'text-white/70 hover:text-white' : 'text-gray-500 dark:text-gray-300 hover:text-brand-600'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageToggle;
