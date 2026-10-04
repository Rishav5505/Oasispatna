/**
 * I18nProvider — wraps the app (see main.jsx). Provides { lang, setLang, t } via useI18n().
 * - Languages: 'en' | 'hi'. Persisted in localStorage ('oasis_lang'); updates <html lang>.
 * - Dictionaries live in src/i18n/dict/<area>.<lang>.js (flat keys, e.g. 'student.nav.homework').
 *   Each role agent edits ONLY its own role files; add every key to BOTH .en.js and .hi.js.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './I18nContext';
import en from './en';
import hi from './hi';

const DICTS = { en, hi };
const STORAGE_KEY = 'oasis_lang';

const readStoredLang = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'hi' || v === 'en' ? v : 'en';
  } catch {
    return 'en';
  }
};

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  useEffect(() => {
    try { document.documentElement.lang = lang; } catch { /* ignore */ }
  }, [lang]);

  const setLang = useCallback((next) => {
    const value = next === 'hi' ? 'hi' : 'en';
    setLangState(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key, vars) => {
    let str = DICTS[lang]?.[key];
    if (str == null) str = en[key];
    if (str == null) return key;
    if (!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export default I18nProvider;
