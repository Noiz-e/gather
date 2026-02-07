# Internationalization (i18n) System

## Overview

Built on **react-i18next** (the most popular React i18n library). Provides type-safe translations with interpolation, pluralization, and automatic language detection.

## File Structure

```
src/i18n/
├── README.md              # This document
├── index.ts              # i18next initialization & configuration
├── i18next.d.ts          # TypeScript type augmentation for i18next
├── types.ts              # Language type, Translations type (auto-inferred from JSON)
├── LanguageContext.tsx    # Backward-compatible wrapper (useLanguage hook)
└── locales/
    ├── en.json           # English translations (source of truth for types)
    ├── zh.json           # Chinese translations
    └── es.json           # Spanish translations
```

## Usage

### Option 1: useLanguage() — Dot-access (backward compat)

```typescript
import { useLanguage } from '../i18n/LanguageContext';

function MyComponent() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div>
      <h1>{t.appName}</h1>
      <p>{t.dashboard.welcome}</p>
      <button onClick={() => setLanguage('zh')}>中文</button>
    </div>
  );
}
```

### Option 2: useTranslation() — react-i18next native (recommended for new code)

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('appName')}</h1>
      {/* Interpolation */}
      <p>{t('welcome', { name: 'John' })}</p>
      {/* Pluralization */}
      <p>{t('items', { count: 5 })}</p>
      <button onClick={() => i18n.changeLanguage('zh')}>中文</button>
    </div>
  );
}
```

## Adding New Translation Keys

Only **2 steps** needed (no manual type definitions!):

1. Add the key to `locales/en.json`
2. Add the same key to `locales/zh.json` and `locales/es.json`

Types are **automatically inferred** from `en.json` — no need to update any TypeScript interface.

## Adding a New Language

1. Create `locales/xx.json` (copy structure from `en.json`)
2. Add the language to `types.ts`:
   ```typescript
   export type Language = 'en' | 'zh' | 'es' | 'fr';
   ```
3. Register in `index.ts`:
   ```typescript
   import fr from './locales/fr.json';
   // In resources:
   fr: { translation: fr },
   ```
4. Add to `LANGUAGE_OPTIONS` in `types.ts`

## Features

- **react-i18next** — Industry-standard i18n library
- **Type-safe** — Types auto-inferred from JSON (no manual interface maintenance)
- **Interpolation** — `t('welcome', { name })` → "Welcome, John!"
- **Pluralization** — `t('items', { count: 5 })` → "5 items"
- **Auto-detection** — Browser language detected via `i18next-browser-languagedetector`
- **Persistence** — Language preference saved to `localStorage`
- **Fallback** — Falls back to English if translation is missing

## Supported Languages

| Language | Code | File      |
|----------|------|-----------|
| English  | `en` | `en.json` |
| 中文     | `zh` | `zh.json` |
| Español  | `es` | `es.json` |

---

**Last Updated**: 2026-02-06
