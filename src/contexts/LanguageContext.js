import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS } from '../constants/translations';

const LanguageContext = createContext();

const ASYNC_STORAGE_LOCALE_KEY = '@tikum_app_locale';

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState('id'); // Default locale is 'id'
  const [loading, setLoading] = useState(true);

  // Load language settings on startup
  useEffect(() => {
    async function loadStoredLocale() {
      try {
        const storedLocale = await AsyncStorage.getItem(ASYNC_STORAGE_LOCALE_KEY);
        if (storedLocale && ['id', 'en', 'ms', 'ja'].includes(storedLocale)) {
          setLocaleState(storedLocale);
        }
      } catch (err) {
        console.warn('Error loading stored locale:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStoredLocale();
  }, []);

  // Save selection and update state
  const changeLocale = async (newLocale) => {
    if (!['id', 'en', 'ms', 'ja'].includes(newLocale)) return;
    setLocaleState(newLocale);
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_LOCALE_KEY, newLocale);
    } catch (err) {
      console.warn('Error saving locale:', err);
    }
  };

  /**
   * Helper function to fetch translation by path string.
   * e.g., t('home.radar') => TRANSLATIONS[locale]['home']['radar']
   */
  const t = (path) => {
    if (!path) return '';
    const keys = path.split('.');
    let result = TRANSLATIONS[locale] || TRANSLATIONS['id'];

    for (const key of keys) {
      if (result && Object.prototype.hasOwnProperty.call(result, key)) {
        result = result[key];
      } else {
        // Fallback to Indonesian if the key path is missing in English or Malay
        let fallback = TRANSLATIONS['id'];
        for (const fKey of keys) {
          if (fallback && Object.prototype.hasOwnProperty.call(fallback, fKey)) {
            fallback = fallback[fKey];
          } else {
            return path; // Return the path string as fallback if it doesn't exist anywhere
          }
        }
        return fallback;
      }
    }

    return typeof result === 'string' ? result : path;
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLocale, t, loading }}>
      {!loading && children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
