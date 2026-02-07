import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language, Translations } from './types';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * LanguageProvider wraps i18next and provides a backward-compatible API.
 * 
 * Existing components can continue using:
 *   const { t, language, setLanguage } = useLanguage();
 *   <span>{t.nav.workspace}</span>
 * 
 * New components can also use react-i18next directly:
 *   const { t } = useTranslation();
 *   <span>{t('nav.workspace')}</span>
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  const language = (i18n.language?.startsWith('zh') ? 'zh' :
    i18n.language?.startsWith('es') ? 'es' : 
    i18n.resolvedLanguage || 'en') as Language;

  const setLanguage = useCallback((lang: Language) => {
    i18n.changeLanguage(lang);
  }, [i18n]);

  // Get the full translation object for dot-access (backward compat)
  const t = (i18n.getResourceBundle(language, 'translation') || 
    i18n.getResourceBundle('en', 'translation')) as Translations;

  const loading = !i18n.isInitialized;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook for accessing translations with dot-notation (backward compat).
 * For new code, prefer useTranslation() from 'react-i18next'.
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
