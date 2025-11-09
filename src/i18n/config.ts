import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { enUS, es, fr, de, fi, sv } from 'date-fns/locale';
import type { Locale } from 'date-fns';

import en from './locales/en.json';
import esTranslation from './locales/es.json';
import frTranslation from './locales/fr.json';
import deTranslation from './locales/de.json';
import fiTranslation from './locales/fi.json';
import svTranslation from './locales/sv.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: esTranslation },
      fr: { translation: frTranslation },
      de: { translation: deTranslation },
      fi: { translation: fiTranslation },
      sv: { translation: svTranslation },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Map i18n language codes to date-fns locales
const dateFnsLocales: Record<string, Locale> = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  fi: fi,
  sv: sv,
};

export const getDateFnsLocale = (): Locale => {
  const currentLanguage = i18n.language || 'en';
  return dateFnsLocales[currentLanguage] || enUS;
};

export default i18n;
