import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Translations } from './types';
// Import default translations synchronously for initial render
import enTranslations from './locales/en.json';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'gather_language';

// Dynamic import function for JSON files
async function loadTranslations(lang: Language): Promise<Translations> {
  try {
    const module = await import(`./locales/${lang}.json`);
    return module.default;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    // Fallback to English if loading fails
    return enTranslations as Translations;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  // Initialize with English translations to prevent undefined errors during first render
  const [translations, setTranslations] = useState<Translations>(enTranslations as Translations);
  const [loading, setLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    let isMounted = true;
    
    async function loadLanguage() {
      setLoading(true);
      const t = await loadTranslations(language);
      if (isMounted) {
        setTranslations(t);
        setLoading(false);
      }
    }

    loadLanguage();

    return () => {
      isMounted = false;
    };
  }, [language]);

  // Initialize language from localStorage or browser language
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved && (saved === 'en' || saved === 'zh' || saved === 'es')) {
      setLanguageState(saved);
    } else {
      // Detect browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('zh')) {
        setLanguageState('zh');
      } else if (browserLang.startsWith('es')) {
        setLanguageState('es');
      } else {
        setLanguageState('en');
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  // translations is never null now since we initialize with static translations
  const t = translations;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
