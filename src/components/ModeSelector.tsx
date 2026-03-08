import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, LayoutDashboard, ArrowRight, Check } from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';

type Mode = 'workspace' | 'creative';

interface ModeSelectorProps {
  onSelect: (mode: Mode) => void;
}

const STORAGE_KEY = 'gather_mode_chosen';

export function hasChosenMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function getSavedMode(): Mode | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'workspace' || val === 'creative') return val;
    return null;
  } catch {
    return null;
  }
}

export function saveChosenMode(mode: Mode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch { /* ignore */ }
}

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  const { theme, religion } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const ms = t.modeSelector;
  const [selected, setSelected] = useState<Mode | null>(null);

  const ReligionIcon = ReligionIconMap[religion];

  const handleContinue = () => {
    if (!selected) return;
    saveChosenMode(selected);
    onSelect(selected);
  };

  const modes: { id: Mode; title: string; desc: string; icon: typeof Sparkles }[] = [
    {
      id: 'creative',
      title: ms.creativeTitle,
      desc: ms.creativeDesc,
      icon: Sparkles,
    },
    {
      id: 'workspace',
      title: ms.workspaceTitle,
      desc: ms.workspaceDesc,
      icon: LayoutDashboard,
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--t-bg)' }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.08]"
          style={{ background: theme.primary }}
        />
        <div
          className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.05]"
          style={{ background: theme.accent }}
        />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center mb-10">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}10)`,
            boxShadow: `0 0 40px ${theme.glow}`,
          }}
        >
          <ReligionIcon size={28} color={theme.primaryLight} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-light text-t-text1 tracking-wide text-center">
          {ms.welcome}{user?.displayName ? `, ${user.displayName}` : ''}
        </h1>
        <p className="text-t-text3 text-sm sm:text-base mt-2 text-center">
          {ms.subtitle}
        </p>
      </div>

      {/* Mode cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selected === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setSelected(mode.id)}
              className="relative text-left rounded-2xl p-6 border-2 transition-all duration-300 group"
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${theme.primary}12, ${theme.primary}06)`
                  : 'var(--t-bg-card)',
                borderColor: isSelected ? theme.primary : 'var(--t-border-light)',
                boxShadow: isSelected ? `0 0 30px ${theme.glow}` : 'none',
              }}
            >
              {/* Selected check */}
              {isSelected && (
                <div
                  className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: theme.primary }}
                >
                  <Check size={14} color="#fff" strokeWidth={3} />
                </div>
              )}

              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                style={{
                  background: isSelected
                    ? `${theme.primary}25`
                    : `${theme.primary}15`,
                }}
              >
                <Icon
                  size={22}
                  color={isSelected ? theme.primaryLight : 'var(--t-text-3)'}
                  className="transition-colors duration-300"
                />
              </div>

              <h3 className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                isSelected ? 'text-t-text1' : 'text-t-text2'
              }`}>
                {mode.title}
              </h3>
              <p className="text-sm text-t-text3 leading-relaxed">
                {mode.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Continue button */}
      <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-2xl">
        <button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02]"
          style={{
            background: selected
              ? `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
              : 'var(--t-bg-card)',
            color: selected ? '#fff' : 'var(--t-text-3)',
            border: selected ? 'none' : '1px solid var(--t-border-light)',
          }}
        >
          {ms.continueBtn}
          <ArrowRight size={16} />
        </button>
        <p className="text-[11px] text-t-text3">{ms.switchLater}</p>
      </div>
    </div>
  );
}
