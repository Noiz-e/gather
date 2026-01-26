# Internationalization (i18n) System

## 概述 / Overview

这是一个基于 JSON 文件的优雅多语言支持系统。

This is an elegant JSON-based multilingual support system.

## 文件结构 / File Structure

```
src/i18n/
├── README.md              # 本文档 / This document
├── types.ts              # TypeScript 类型定义 / Type definitions
├── LanguageContext.tsx   # React Context 和 Hook / React Context and Hook
├── locales/              # 语言文件目录 / Language files directory
│   ├── en.json          # 英文翻译 / English translations
│   ├── zh.json          # 中文翻译 / Chinese translations
│   └── es.json          # 西班牙语翻译 / Spanish translations
└── translations.ts       # (已弃用 - 仅作备份) / (Deprecated - backup only)
```

## 使用方法 / Usage

### 1. 在组件中使用翻译 / Using translations in components

```typescript
import { useLanguage } from '../i18n/LanguageContext';

function MyComponent() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div>
      <h1>{t.appName}</h1>
      <p>{t.dashboard.welcome}</p>
      <button onClick={() => setLanguage('zh')}>
        切换到中文
      </button>
    </div>
  );
}
```

### 2. 使用语言选项 / Using language options

```typescript
import { LANGUAGE_OPTIONS } from '../i18n/types';

function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
      {LANGUAGE_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
```

## 添加新的翻译键 / Adding new translation keys

### 步骤 / Steps:

1. **更新 JSON 文件** / Update JSON files
   - 在 `locales/en.json` 中添加新键
   - 在 `locales/zh.json` 中添加对应的中文翻译
   - 在 `locales/es.json` 中添加对应的西班牙语翻译

2. **更新类型定义** / Update type definitions
   - 在 `types.ts` 的 `Translations` 接口中添加对应的类型定义

### 示例 / Example:

**locales/en.json:**
```json
{
  "myNewSection": {
    "title": "My Title",
    "description": "My Description"
  }
}
```

**locales/zh.json:**
```json
{
  "myNewSection": {
    "title": "我的标题",
    "description": "我的描述"
  }
}
```

**locales/es.json:**
```json
{
  "myNewSection": {
    "title": "Mi Título",
    "description": "Mi Descripción"
  }
}
```

**types.ts:**
```typescript
export interface Translations {
  // ... other fields
  myNewSection: {
    title: string;
    description: string;
  };
}
```

## 添加新语言 / Adding a new language

### 步骤 / Steps:

1. **创建新的 JSON 文件** / Create new JSON file
   - 在 `locales/` 目录下创建新文件，例如 `fr.json` (法语)
   - 复制现有语言文件的结构并翻译所有内容

2. **更新类型定义** / Update type definitions
   ```typescript
   // types.ts
   export type Language = 'en' | 'zh' | 'es' | 'fr'; // 添加新语言

   export const LANGUAGE_OPTIONS: LanguageOption[] = [
     { value: 'en', label: 'English' },
     { value: 'zh', label: '中文' },
     { value: 'es', label: 'Español' },
     { value: 'fr', label: 'Français' }, // 添加新选项
   ];
   ```

3. **更新 LanguageContext** / Update LanguageContext
   ```typescript
   // LanguageContext.tsx
   // 在 useEffect 中添加语言检测逻辑
   if (browserLang.startsWith('fr')) {
     setLanguageState('fr');
   }
   ```

## 最佳实践 / Best Practices

### ✅ 正确做法 / Do

- 始终使用 `t.*` 引用翻译文本
- 保持所有语言文件的键结构一致
- 为新功能添加翻译时,同时更新所有语言文件
- 使用有意义的键名,按功能模块组织

### ❌ 错误做法 / Don't

- ❌ 不要使用内联条件判断: `language === 'zh' ? '中文' : 'English'`
- ❌ 不要硬编码文本字符串
- ❌ 不要在代码中直接导入 JSON 文件
- ❌ 不要忘记更新类型定义

## 特性 / Features

- ✨ **类型安全**: 完整的 TypeScript 类型支持
- 🌍 **易于扩展**: 添加新语言只需添加 JSON 文件
- 🔄 **动态加载**: 按需加载语言文件
- 💾 **持久化**: 自动保存用户语言偏好到 localStorage
- 🌐 **自动检测**: 首次访问时自动检测浏览器语言
- 🎯 **集中管理**: 所有翻译集中在 JSON 文件中

## 支持的语言 / Supported Languages

| 语言 / Language | 代码 / Code | 文件 / File |
|----------------|-------------|-------------|
| English        | `en`        | `en.json`   |
| 中文           | `zh`        | `zh.json`   |
| Español        | `es`        | `es.json`   |

## API

### useLanguage()

返回当前语言上下文 / Returns the current language context

```typescript
interface LanguageContextType {
  language: Language;          // 当前语言代码 / Current language code
  setLanguage: (lang: Language) => void;  // 切换语言 / Switch language
  t: Translations;            // 翻译对象 / Translation object
  loading: boolean;           // 加载状态 / Loading state
}
```

## 性能优化 / Performance Optimization

- JSON 文件使用动态导入 (`import()`)，实现按需加载
- 翻译对象缓存在 Context 中，避免重复加载
- 使用 `localStorage` 持久化用户偏好，减少初始化时间

## 迁移指南 / Migration Guide

如果你的代码中还有旧的内联条件判断,请按以下方式迁移:

If your code still has old inline conditionals, migrate them as follows:

### 旧代码 / Old Code
```typescript
const title = language === 'zh' ? '标题' : 'Title';
```

### 新代码 / New Code
```typescript
const { t } = useLanguage();
const title = t.mySection.title;
```

## 常见问题 / FAQ

**Q: 如何处理带参数的翻译?**  
A: 建议在翻译键中使用占位符,然后在代码中进行字符串替换:

```typescript
// en.json: "welcomeMessage": "Welcome, {name}!"
const message = t.welcomeMessage.replace('{name}', userName);
```

**Q: 翻译文件太大怎么办?**  
A: 可以考虑将翻译文件按功能模块拆分,使用动态导入按需加载。

**Q: 如何处理复数形式?**  
A: 可以在翻译键中定义不同的复数形式,然后根据数量选择:

```json
{
  "items": {
    "zero": "No items",
    "one": "1 item",
    "many": "{count} items"
  }
}
```

## 贡献 / Contributing

欢迎贡献新的翻译或改进现有翻译!

Welcome to contribute new translations or improve existing ones!

---

**最后更新 / Last Updated**: 2026-01-25
