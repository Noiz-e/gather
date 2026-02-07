import { Religion, ColorMode } from '../types';

// All theme tokens as CSS variable names
export const themeVars = {
  primary: '--t-primary',
  primaryLight: '--t-primary-light',
  primaryDark: '--t-primary-dark',
  accent: '--t-accent',
  accentLight: '--t-accent-light',
  bg: '--t-bg',
  bgBase: '--t-bg-base',
  bgCard: '--t-bg-card',
  bgCardHover: '--t-bg-card-hover',
  surface: '--t-surface',
  surfaceMuted: '--t-surface-muted',
  text1: '--t-text-1',
  text2: '--t-text-2',
  text3: '--t-text-3',
  border: '--t-border',
  borderLight: '--t-border-light',
  glow: '--t-glow',
  glowStrong: '--t-glow-strong',
} as const;

// Raw color values for each religion × mode
interface TokenValues {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  bg: string;         // gradient or solid for body
  bgBase: string;     // solid fallback
  bgCard: string;
  bgCardHover: string;
  surface: string;
  surfaceMuted: string;
  text1: string;      // primary text
  text2: string;      // secondary text
  text3: string;      // muted/tertiary text
  border: string;
  borderLight: string;
  glow: string;
  glowStrong: string;
}

const tokens: Record<Religion, Record<ColorMode, TokenValues>> = {
  default: {
    dark: {
      primary: '#007AFF',
      primaryLight: '#5AC8FA',
      primaryDark: '#0051a8',
      accent: '#FF9500',
      accentLight: '#FFCC00',
      bg: 'linear-gradient(180deg,#000 0%,#1d1d1f 50%,#000 100%)',
      bgBase: '#000000',
      bgCard: 'rgba(255,255,255,0.05)',
      bgCardHover: 'rgba(255,255,255,0.1)',
      surface: '#2c2c2e',
      surfaceMuted: 'rgba(0,122,255,0.08)',
      text1: '#f5f5f7',
      text2: 'rgba(255,255,255,0.7)',
      text3: 'rgba(255,255,255,0.45)',
      border: 'rgba(255,255,255,0.1)',
      borderLight: 'rgba(255,255,255,0.05)',
      glow: 'rgba(0,122,255,0.25)',
      glowStrong: 'rgba(0,122,255,0.5)',
    },
    light: {
      primary: '#007AFF',
      primaryLight: '#5AC8FA',
      primaryDark: '#0051a8',
      accent: '#FF9500',
      accentLight: '#FFCC00',
      bg: 'linear-gradient(180deg,#fff 0%,#f5f5f7 50%,#fff 100%)',
      bgBase: '#ffffff',
      bgCard: 'rgba(0,0,0,0.03)',
      bgCardHover: 'rgba(0,0,0,0.06)',
      surface: '#f5f5f7',
      surfaceMuted: 'rgba(0,122,255,0.06)',
      text1: '#1d1d1f',
      text2: 'rgba(0,0,0,0.65)',
      text3: 'rgba(0,0,0,0.4)',
      border: 'rgba(0,0,0,0.1)',
      borderLight: 'rgba(0,0,0,0.05)',
      glow: 'rgba(0,122,255,0.15)',
      glowStrong: 'rgba(0,122,255,0.3)',
    },
  },
  educational: {
    dark: {
      primary: '#34C759',
      primaryLight: '#30D158',
      primaryDark: '#248a3d',
      accent: '#5856D6',
      accentLight: '#AF52DE',
      bg: 'linear-gradient(180deg,#0a1a14 0%,#0d2818 50%,#0a1a14 100%)',
      bgBase: '#0a1410',
      bgCard: 'rgba(52,199,89,0.1)',
      bgCardHover: 'rgba(52,199,89,0.18)',
      surface: '#1a2e24',
      surfaceMuted: 'rgba(52,199,89,0.08)',
      text1: '#f5f5f7',
      text2: 'rgba(255,255,255,0.7)',
      text3: 'rgba(255,255,255,0.45)',
      border: 'rgba(52,199,89,0.2)',
      borderLight: 'rgba(52,199,89,0.1)',
      glow: 'rgba(52,199,89,0.3)',
      glowStrong: 'rgba(52,199,89,0.55)',
    },
    light: {
      primary: '#34C759',
      primaryLight: '#30D158',
      primaryDark: '#248a3d',
      accent: '#5856D6',
      accentLight: '#AF52DE',
      bg: 'linear-gradient(180deg,#fff 0%,#f0fff4 50%,#fff 100%)',
      bgBase: '#ffffff',
      bgCard: 'rgba(52,199,89,0.06)',
      bgCardHover: 'rgba(52,199,89,0.12)',
      surface: '#f0fff4',
      surfaceMuted: 'rgba(52,199,89,0.05)',
      text1: '#1d1d1f',
      text2: 'rgba(0,0,0,0.65)',
      text3: 'rgba(0,0,0,0.4)',
      border: 'rgba(52,199,89,0.2)',
      borderLight: 'rgba(52,199,89,0.1)',
      glow: 'rgba(52,199,89,0.15)',
      glowStrong: 'rgba(52,199,89,0.3)',
    },
  },
  faithful: {
    dark: {
      primary: '#8b5cf6',
      primaryLight: '#a78bfa',
      primaryDark: '#6d28d9',
      accent: '#f59e0b',
      accentLight: '#fbbf24',
      bg: 'linear-gradient(135deg,#0f0f1a 0%,#1e1b4b 30%,#1a1a2e 70%,#0f0f1a 100%)',
      bgBase: '#0a0a12',
      bgCard: 'rgba(139,92,246,0.12)',
      bgCardHover: 'rgba(139,92,246,0.22)',
      surface: '#1e1b4b',
      surfaceMuted: 'rgba(139,92,246,0.1)',
      text1: '#ffffff',
      text2: 'rgba(255,255,255,0.7)',
      text3: 'rgba(255,255,255,0.5)',
      border: 'rgba(139,92,246,0.2)',
      borderLight: 'rgba(139,92,246,0.1)',
      glow: 'rgba(139,92,246,0.35)',
      glowStrong: 'rgba(139,92,246,0.6)',
    },
    light: {
      primary: '#8b5cf6',
      primaryLight: '#a78bfa',
      primaryDark: '#6d28d9',
      accent: '#f59e0b',
      accentLight: '#fbbf24',
      bg: 'linear-gradient(135deg,#fff 0%,#f5f3ff 30%,#faf5ff 70%,#fff 100%)',
      bgBase: '#ffffff',
      bgCard: 'rgba(139,92,246,0.06)',
      bgCardHover: 'rgba(139,92,246,0.12)',
      surface: '#f5f3ff',
      surfaceMuted: 'rgba(139,92,246,0.05)',
      text1: '#1e1b4b',
      text2: 'rgba(30,27,75,0.7)',
      text3: 'rgba(30,27,75,0.5)',
      border: 'rgba(139,92,246,0.2)',
      borderLight: 'rgba(139,92,246,0.1)',
      glow: 'rgba(139,92,246,0.15)',
      glowStrong: 'rgba(139,92,246,0.3)',
    },
  },
};

/**
 * Generate a CSS variables string to inject into :root / document.
 */
export function buildCssVars(religion: Religion, mode: ColorMode): string {
  const t = tokens[religion][mode];
  return [
    `${themeVars.primary}:${t.primary}`,
    `${themeVars.primaryLight}:${t.primaryLight}`,
    `${themeVars.primaryDark}:${t.primaryDark}`,
    `${themeVars.accent}:${t.accent}`,
    `${themeVars.accentLight}:${t.accentLight}`,
    `${themeVars.bg}:${t.bg}`,
    `${themeVars.bgBase}:${t.bgBase}`,
    `${themeVars.bgCard}:${t.bgCard}`,
    `${themeVars.bgCardHover}:${t.bgCardHover}`,
    `${themeVars.surface}:${t.surface}`,
    `${themeVars.surfaceMuted}:${t.surfaceMuted}`,
    `${themeVars.text1}:${t.text1}`,
    `${themeVars.text2}:${t.text2}`,
    `${themeVars.text3}:${t.text3}`,
    `${themeVars.border}:${t.border}`,
    `${themeVars.borderLight}:${t.borderLight}`,
    `${themeVars.glow}:${t.glow}`,
    `${themeVars.glowStrong}:${t.glowStrong}`,
  ].join(';');
}

// ---- Legacy compat layer (used by components not yet migrated) ----
export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  bgGradient: string;
  bgDark: string;
  bgCard: string;
  bgCardHover: string;
  surfaceLight: string;
  surfaceMuted: string;
  textOnDark: string;
  textOnLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  glow: string;
  glowStrong: string;
}

export function getThemeColors(religion: Religion, mode: ColorMode): ThemeColors {
  const t = tokens[religion][mode];
  return {
    primary: t.primary,
    primaryLight: t.primaryLight,
    primaryDark: t.primaryDark,
    accent: t.accent,
    accentLight: t.accentLight,
    bgGradient: t.bg,
    bgDark: t.bgBase,
    bgCard: t.bgCard,
    bgCardHover: t.bgCardHover,
    surfaceLight: t.surface,
    surfaceMuted: t.surfaceMuted,
    textOnDark: t.text1,
    textOnLight: t.text1,
    textPrimary: t.text1,
    textSecondary: t.text2,
    textMuted: t.text3,
    border: t.border,
    borderLight: t.borderLight,
    glow: t.glow,
    glowStrong: t.glowStrong,
  };
}
