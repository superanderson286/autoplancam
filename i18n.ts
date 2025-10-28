import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files directly
import enTranslation from './public/locales/en/translation.json';
import esTranslation from './public/locales/es/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      es: {
        translation: esTranslation,
      },
    },
    supportedLngs: ['en', 'es'],
    fallbackLng: 'en',
    lng: 'es', // Default language
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;