import type en from './locales/en.json';

// Supported languages
export type Language = 'en' | 'zh' | 'es';

// Translation type auto-inferred from the English JSON (single source of truth)
export type Translations = typeof en;

// Language option for UI
export interface LanguageOption {
  value: Language;
  label: string;
}

// All available language options
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'es', label: 'Español' },
];
