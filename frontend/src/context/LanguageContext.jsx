import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  TRANSLATIONS,
  interpolate,
  lookup,
} from '../i18n/translations';

const LanguageContext = createContext(null);

const isSupported = (code) => Object.prototype.hasOwnProperty.call(LANGUAGES, code);

const readStoredLanguage = () => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupported(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    // Private mode / blocked storage: fall back to the default language
    return DEFAULT_LANGUAGE;
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(readStoredLanguage);

  const meta = LANGUAGES[language] || LANGUAGES[DEFAULT_LANGUAGE];

  // Keep the whole document in sync: <html lang/dir> drives native text rendering,
  // font fallback for Ethiopic/Arabic/Hebrew glyphs and browser UI direction.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = meta.code;
    root.dir = meta.dir;
  }, [meta.code, meta.dir]);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Persistence is best-effort
    }
  }, [language]);

  /**
   * Translate a dotted key with the active language, falling back to English
   * and finally to the key itself so a missing string is obvious but never blank.
   */
  const t = useCallback(
    (key, values) => {
      const template = lookup(TRANSLATIONS[language], key) ?? lookup(TRANSLATIONS.en, key);
      if (typeof template !== 'string') return key;
      return values ? interpolate(template, values) : template;
    },
    [language]
  );

  /**
   * Translate a backend enum value (status / sentiment / priority / intent /
   * department). Unknown values are passed through untouched so the console
   * still shows the raw server data instead of hiding it.
   */
  const tEnum = useCallback(
    (group, value, fallback = '') => {
      if (!value) return fallback;
      const key = `${group}.${value}`;
      const template = lookup(TRANSLATIONS[language], key) ?? lookup(TRANSLATIONS.en, key);
      return typeof template === 'string' ? template : String(value);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      tEnum,
      dir: meta.dir,
      isRtl: meta.dir === 'rtl',
      speechLocale: meta.speechLocale,
      ttsLocale: meta.ttsLocale,
      languages: Object.values(LANGUAGES),
    }),
    [language, meta, t, tEnum]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside a <LanguageProvider>');
  return ctx;
};
