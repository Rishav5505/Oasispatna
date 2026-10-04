import { useContext } from 'react';
import { I18nContext } from './I18nContext';
import en from './en';

// Fallback used when a component renders outside <I18nProvider> (e.g. in isolation/tests).
const interpolate = (str, vars) => (vars ? String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : str);
const FALLBACK = {
  lang: 'en',
  setLang: () => {},
  t: (key, vars) => interpolate(en[key] ?? key, vars),
};

/**
 * useI18n() -> { lang: 'en' | 'hi', setLang(lang), t(key, vars?) }
 *   const { t } = useI18n();
 *   t('common.save')                       // "Save" / "सेव करें"
 *   t('common.welcome', { name: 'Rahul' }) // "{name}" placeholders are interpolated
 * Missing keys fall back to English, then to the key itself.
 */
export function useI18n() {
  return useContext(I18nContext) || FALLBACK;
}

export default useI18n;
