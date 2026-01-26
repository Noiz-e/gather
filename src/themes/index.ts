import { Religion } from '../types';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Accent (gold tones)
  accent: string;
  accentLight: string;
  
  // Background gradients for immersive feel
  bgGradient: string;
  bgDark: string;
  bgCard: string;
  bgCardHover: string;
  
  // Surface colors
  surfaceLight: string;
  surfaceMuted: string;
  
  // Text
  textOnDark: string;
  textOnLight: string;
  textMuted: string;
  
  // Glow effects
  glow: string;
  glowStrong: string;
}

export const religionThemes: Record<Religion, ThemeColors> = {
  // Default - Modern gradient (purple/blue with amber accent)
  default: {
    primary: '#8b5cf6', // Violet
    primaryLight: '#a78bfa',
    primaryDark: '#1e1b4b',
    accent: '#f59e0b', // Amber/Gold - professional and warm
    accentLight: '#fbbf24',
    bgGradient: 'linear-gradient(135deg, #0f0f1a 0%, #1e1b4b 30%, #1a1a2e 70%, #0f0f1a 100%)',
    bgDark: '#0a0a12',
    bgCard: 'rgba(139, 92, 246, 0.12)',
    bgCardHover: 'rgba(139, 92, 246, 0.22)',
    surfaceLight: '#f5f3ff',
    surfaceMuted: 'rgba(139, 92, 246, 0.1)',
    textOnDark: '#ffffff',
    textOnLight: '#1e1b4b',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    glow: 'rgba(139, 92, 246, 0.35)',
    glowStrong: 'rgba(139, 92, 246, 0.6)',
  },
  christianity: {
    primary: '#4a90e2', // Deep blue
    primaryLight: '#6ba3f0',
    primaryDark: '#1e3a5f',
    accent: '#d4af37', // Gold
    accentLight: '#f0d78c',
    bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%)',
    bgDark: '#0f1419',
    bgCard: 'rgba(30, 58, 95, 0.25)',
    bgCardHover: 'rgba(30, 58, 95, 0.4)',
    surfaceLight: '#ebf4ff',
    surfaceMuted: 'rgba(74, 144, 226, 0.1)',
    textOnDark: '#ffffff',
    textOnLight: '#1e3a5f',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    glow: 'rgba(74, 144, 226, 0.4)',
    glowStrong: 'rgba(74, 144, 226, 0.7)',
  },
  // Catholicism - Royal purple/gold (Vatican colors)
  catholicism: {
    primary: '#7c3aed', // Purple (liturgical)
    primaryLight: '#a78bfa',
    primaryDark: '#2e1065',
    accent: '#d4af37', // Vatican gold
    accentLight: '#f0d78c',
    bgGradient: 'linear-gradient(135deg, #1a0a2e 0%, #2e1065 30%, #4c1d95 60%, #1a0a2e 100%)',
    bgDark: '#0f0a1a',
    bgCard: 'rgba(124, 58, 237, 0.2)',
    bgCardHover: 'rgba(124, 58, 237, 0.35)',
    surfaceLight: '#f5f3ff',
    surfaceMuted: 'rgba(124, 58, 237, 0.1)',
    textOnDark: '#ffffff',
    textOnLight: '#2e1065',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    glow: 'rgba(124, 58, 237, 0.4)',
    glowStrong: 'rgba(124, 58, 237, 0.7)',
  },
  buddhism: {
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    primaryDark: '#2e1065',
    accent: '#fbbf24',
    accentLight: '#fde68a',
    bgGradient: 'linear-gradient(135deg, #1a0a2e 0%, #2e1065 50%, #1a0a2e 100%)',
    bgDark: '#1a0a2e',
    bgCard: 'rgba(46, 16, 101, 0.4)',
    bgCardHover: 'rgba(46, 16, 101, 0.6)',
    surfaceLight: '#f5f3ff',
    surfaceMuted: 'rgba(139, 92, 246, 0.1)',
    textOnDark: '#ffffff',
    textOnLight: '#2e1065',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    glow: 'rgba(139, 92, 246, 0.3)',
    glowStrong: 'rgba(139, 92, 246, 0.6)',
  },
  islam: {
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#022c22',
    accent: '#d4af37',
    accentLight: '#f0d78c',
    bgGradient: 'linear-gradient(135deg, #021a14 0%, #065f46 50%, #022c22 100%)',
    bgDark: '#021a14',
    bgCard: 'rgba(6, 95, 70, 0.4)',
    bgCardHover: 'rgba(6, 95, 70, 0.6)',
    surfaceLight: '#ecfdf5',
    surfaceMuted: 'rgba(16, 185, 129, 0.1)',
    textOnDark: '#ffffff',
    textOnLight: '#065f46',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    glow: 'rgba(16, 185, 129, 0.3)',
    glowStrong: 'rgba(16, 185, 129, 0.6)',
  },
  judaism: {
    primary: '#ef4444',
    primaryLight: '#f87171',
    primaryDark: '#450a0a',
    accent: '#d4af37',
    accentLight: '#f0d78c',
    bgGradient: 'linear-gradient(135deg, #1a0505 0%, #7f1d1d 50%, #450a0a 100%)',
    bgDark: '#1a0505',
    bgCard: 'rgba(127, 29, 29, 0.4)',
    bgCardHover: 'rgba(127, 29, 29, 0.6)',
    surfaceLight: '#fef2f2',
    surfaceMuted: 'rgba(239, 68, 68, 0.1)',
    textOnDark: '#ffffff',
    textOnLight: '#991b1b',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    glow: 'rgba(239, 68, 68, 0.3)',
    glowStrong: 'rgba(239, 68, 68, 0.6)',
  },
  hinduism: {
    primary: '#f97316',
    primaryLight: '#fb923c',
    primaryDark: '#431407',
    accent: '#fbbf24',
    accentLight: '#fde68a',
    bgGradient: 'linear-gradient(135deg, #1a0a02 0%, #9a3412 50%, #431407 100%)',
    bgDark: '#1a0a02',
    bgCard: 'rgba(154, 52, 18, 0.4)',
    bgCardHover: 'rgba(154, 52, 18, 0.6)',
    surfaceLight: '#fff7ed',
    surfaceMuted: 'rgba(249, 115, 22, 0.1)',
    textOnDark: '#ffffff',
    textOnLight: '#c2410c',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    glow: 'rgba(249, 115, 22, 0.3)',
    glowStrong: 'rgba(249, 115, 22, 0.6)',
  },
  taoism: {
    primary: '#22c55e',
    primaryLight: '#4ade80',
    primaryDark: '#052e16',
    accent: '#d4af37',
    accentLight: '#f0d78c',
    bgGradient: 'linear-gradient(135deg, #021a0a 0%, #14532d 50%, #052e16 100%)',
    bgDark: '#021a0a',
    bgCard: 'rgba(20, 83, 45, 0.4)',
    bgCardHover: 'rgba(20, 83, 45, 0.6)',
    surfaceLight: '#f0fdf4',
    surfaceMuted: 'rgba(34, 197, 94, 0.1)',
    textOnDark: '#ffffff',
    textOnLight: '#14532d',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    glow: 'rgba(34, 197, 94, 0.3)',
    glowStrong: 'rgba(34, 197, 94, 0.6)',
  },
};
