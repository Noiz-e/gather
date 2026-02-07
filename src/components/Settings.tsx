import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { RELIGIONS } from '../types';
import { getThemeColors } from '../themes';
import { Trash2, Download, Upload, Info, Sun, Moon } from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';

export function Settings() {
  const { theme, religion, setReligion, colorMode, setColorMode, isDark } = useTheme();
  const { projects } = useProjects();
  const { t } = useLanguage();

  const religionT = t.religions[religion];
  const ReligionIcon = ReligionIconMap[religion];

  const exportData = () => {
    const data = { projects, exportDate: new Date().toISOString(), religion };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `podcast-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (window.confirm(t.settings.clearConfirm1)) {
      if (window.confirm(t.settings.clearConfirm2)) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-light tracking-wide text-t-text1">{t.settings.title}</h1>
        <p className="mt-1 text-sm md:text-base text-t-text3">{t.settings.subtitle}</p>
      </div>

      {/* Appearance - Light/Dark Mode */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 bg-t-card border border-t-border">
        <h2 className="text-base md:text-lg font-serif mb-3 md:mb-4 text-t-text1">{t.settings.appearance}</h2>
        <div className="flex gap-2 md:gap-3">
          <button
            onClick={() => setColorMode('light')}
            className={`flex-1 flex items-center justify-center gap-2 p-3 md:p-4 rounded-lg md:rounded-xl transition-all duration-200 border ${
              !isDark ? 'scale-[1.02] border-t-primary bg-t-surface-m' : 'hover:scale-[1.01] border-t-border bg-t-card'
            }`}
          >
            <Sun size={18} className={!isDark ? 'text-t-primary' : 'text-t-text3'} />
            <span className={`text-sm font-medium ${!isDark ? 'text-t-primary' : 'text-t-text2'}`}>
              {t.settings.lightMode}
            </span>
          </button>
          <button
            onClick={() => setColorMode('dark')}
            className={`flex-1 flex items-center justify-center gap-2 p-3 md:p-4 rounded-lg md:rounded-xl transition-all duration-200 border ${
              isDark ? 'scale-[1.02] border-t-primary bg-t-surface-m' : 'hover:scale-[1.01] border-t-border bg-t-card'
            }`}
          >
            <Moon size={18} className={isDark ? 'text-t-primary' : 'text-t-text3'} />
            <span className={`text-sm font-medium ${isDark ? 'text-t-primary' : 'text-t-text2'}`}>
              {t.settings.darkMode}
            </span>
          </button>
        </div>
      </div>

      {/* Current Theme */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 bg-t-card border border-t-border">
        <h2 className="text-base md:text-lg font-serif mb-3 md:mb-4 text-t-text1">{t.settings.currentTheme}</h2>
        <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl border border-t-border bg-t-surface-m">
          <div className="w-11 h-11 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${theme.primary}30` }}>
            <ReligionIcon size={22} className="md:hidden" color={theme.primaryLight} />
            <ReligionIcon size={28} className="hidden md:block" color={theme.primaryLight} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm md:text-base text-t-text1">{religionT.name}</h3>
            <p className="text-xs md:text-sm line-clamp-1 text-t-text3">{religionT.description}</p>
          </div>
        </div>
        <div className="mt-3 md:mt-4 flex gap-2">
          <div className="flex-1 h-6 md:h-8 rounded-md md:rounded-lg" style={{ background: theme.primary }} title="Primary" />
          <div className="flex-1 h-6 md:h-8 rounded-md md:rounded-lg" style={{ background: theme.primaryLight }} title="Light" />
          <div className="flex-1 h-6 md:h-8 rounded-md md:rounded-lg" style={{ background: theme.accent }} title="Accent" />
        </div>
      </div>

      {/* All Themes */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 bg-t-card border border-t-border">
        <h2 className="text-base md:text-lg font-serif mb-3 md:mb-4 text-t-text1">{t.settings.allThemes}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {RELIGIONS.map((r) => {
            const rTheme = getThemeColors(r.id, colorMode);
            const rT = t.religions[r.id];
            const isActive = religion === r.id;
            const RIcon = ReligionIconMap[r.id];
            return (
              <button
                key={r.id}
                onClick={() => { if (!isActive) setReligion(r.id); }}
                className={`p-3 md:p-4 rounded-lg md:rounded-xl transition-all duration-300 text-left hover:scale-[1.02] active:scale-[0.98] border ${
                  isActive ? 'scale-[1.02]' : 'border-t-border-lt'
                }`}
                style={{
                  background: isActive ? `${rTheme.primary}30` : `${rTheme.primary}10`,
                  cursor: isActive ? 'default' : 'pointer',
                  borderColor: isActive ? rTheme.primary : undefined,
                }}
              >
                <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
                  <RIcon size={16} className="md:hidden" color={rTheme.primaryLight} />
                  <RIcon size={20} className="hidden md:block" color={rTheme.primaryLight} />
                  <span className="text-xs md:text-sm font-medium truncate text-t-text1">{rT.name}</span>
                </div>
                {isActive && (
                  <div className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded inline-block" style={{ background: rTheme.accent, color: '#1d1d1f' }}>
                    {t.settings.currentlyUsing}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Stats */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 bg-t-card border border-t-border">
        <h2 className="text-base md:text-lg font-serif mb-3 md:mb-4 text-t-text1">{t.settings.dataStats}</h2>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="p-3 md:p-4 rounded-lg md:rounded-xl bg-t-surface-m">
            <div className="text-2xl md:text-3xl font-light text-t-text1">{projects.length}</div>
            <div className="text-xs md:text-sm text-t-text3">{t.settings.totalProjects}</div>
          </div>
          <div className="p-3 md:p-4 rounded-lg md:rounded-xl bg-t-surface-m">
            <div className="text-2xl md:text-3xl font-light text-t-text1">{projects.reduce((acc, p) => acc + p.episodes.length, 0)}</div>
            <div className="text-xs md:text-sm text-t-text3">{t.settings.totalEpisodes}</div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 bg-t-card border border-t-border">
        <h2 className="text-base md:text-lg font-serif mb-3 md:mb-4 text-t-text1">{t.settings.dataManagement}</h2>
        <div className="space-y-2 md:space-y-3">
          <button onClick={exportData} className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl transition-all text-left group hover:opacity-80 border border-t-border">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 bg-t-surface-m">
              <Download size={18} className="md:hidden" color={theme.primaryLight} />
              <Download size={20} className="hidden md:block" color={theme.primaryLight} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm md:text-base text-t-text1">{t.settings.exportData}</div>
              <div className="text-xs md:text-sm truncate text-t-text3">{t.settings.exportDataDesc}</div>
            </div>
          </button>

          <button className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl text-left opacity-50 cursor-not-allowed border border-t-border" disabled>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 bg-t-surface-m">
              <Upload size={18} className="md:hidden" color={theme.primaryLight} />
              <Upload size={20} className="hidden md:block" color={theme.primaryLight} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm md:text-base text-t-text1">{t.settings.importData}</div>
              <div className="text-xs md:text-sm truncate text-t-text3">{t.settings.importDataDesc} ({t.settings.comingSoon})</div>
            </div>
          </button>

          <button onClick={clearAllData} className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all text-left group">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center bg-red-500/20 flex-shrink-0">
              <Trash2 size={18} className="md:hidden text-red-400" />
              <Trash2 size={20} className="hidden md:block text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-red-400 text-sm md:text-base">{t.settings.clearData}</div>
              <div className="text-xs md:text-sm truncate text-t-text3">{t.settings.clearDataDesc}</div>
            </div>
          </button>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 bg-t-card border border-t-border">
        <h2 className="text-base md:text-lg font-serif mb-3 md:mb-4 text-t-text1">{t.settings.about}</h2>
        <div className="flex items-start gap-2.5 md:gap-3 p-3 md:p-4 rounded-lg md:rounded-xl bg-t-surface-m">
          <Info size={18} className="md:hidden flex-shrink-0 mt-0.5" color={theme.primaryLight} />
          <Info size={20} className="hidden md:block flex-shrink-0 mt-0.5" color={theme.primaryLight} />
          <div className="text-xs md:text-sm min-w-0">
            <p className="font-medium text-t-text1">{t.appName} {t.settings.version}</p>
            <p className="mt-1.5 md:mt-2 text-t-text2">{t.settings.aboutText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
