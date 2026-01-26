import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { RELIGIONS } from '../types';
import { religionThemes } from '../themes';
import { Trash2, Download, Upload, Info, Key, Eye, EyeOff, Check } from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';

interface SettingsProps {
  onChangeReligion: () => void;
}

export function Settings({ onChangeReligion }: SettingsProps) {
  const { theme, religion, setReligion } = useTheme();
  const { projects } = useProjects();
  const { t, language } = useLanguage();
  
  // API Key state
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  
  // Load API key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini-api-key') || '';
    setGeminiApiKey(savedKey);
  }, []);
  
  // Save API key
  const saveApiKey = () => {
    localStorage.setItem('gemini-api-key', geminiApiKey);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

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
        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-white tracking-wide">{t.settings.title}</h1>
        <p className="text-white/50 mt-1 text-sm md:text-base">{t.settings.subtitle}</p>
      </div>

      {/* Current Theme */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
        <h2 className="text-base md:text-lg font-serif text-white mb-3 md:mb-4">{t.settings.currentTheme}</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl border border-white/10" style={{ background: `${theme.primary}10` }}>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${theme.primary}30` }}>
              <ReligionIcon size={22} className="md:hidden" color={theme.primaryLight} />
              <ReligionIcon size={28} className="hidden md:block" color={theme.primaryLight} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white text-sm md:text-base">{religionT.name}</h3>
              <p className="text-xs md:text-sm text-white/50 line-clamp-1">{religionT.description}</p>
            </div>
          </div>
          <button
            onClick={onChangeReligion}
            className="px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all hover:scale-105 flex-shrink-0 w-full sm:w-auto text-center"
            style={{ background: theme.accent, color: theme.primaryDark }}
          >
            {t.settings.changeTheme}
          </button>
        </div>
        <div className="mt-3 md:mt-4 flex gap-2">
          <div className="flex-1 h-6 md:h-8 rounded-md md:rounded-lg" style={{ background: theme.primary }} title="Primary" />
          <div className="flex-1 h-6 md:h-8 rounded-md md:rounded-lg" style={{ background: theme.primaryLight }} title="Light" />
          <div className="flex-1 h-6 md:h-8 rounded-md md:rounded-lg" style={{ background: theme.accent }} title="Accent" />
        </div>
      </div>

      {/* All Themes */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
        <h2 className="text-base md:text-lg font-serif text-white mb-3 md:mb-4">{t.settings.allThemes}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {RELIGIONS.map((r) => {
            const rTheme = religionThemes[r.id];
            const rT = t.religions[r.id];
            const isActive = religion === r.id;
            const RIcon = ReligionIconMap[r.id];
            return (
              <button
                key={r.id}
                onClick={() => {
                  if (!isActive) {
                    setReligion(r.id);
                  }
                }}
                className={`p-3 md:p-4 rounded-lg md:rounded-xl transition-all duration-300 border text-left hover:scale-[1.02] active:scale-[0.98] ${
                  isActive ? 'border-white/30 scale-[1.02]' : 'border-white/5 hover:border-white/20'
                }`}
                style={{ 
                  background: isActive ? `${rTheme.primary}30` : `${rTheme.primary}10`,
                  cursor: isActive ? 'default' : 'pointer',
                }}
              >
                <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
                  <RIcon size={16} className="md:hidden" color={rTheme.primaryLight} />
                  <RIcon size={20} className="hidden md:block" color={rTheme.primaryLight} />
                  <span className="text-xs md:text-sm font-medium text-white truncate">{rT.name}</span>
                </div>
                {isActive && (
                  <div className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded inline-block" style={{ background: rTheme.accent, color: rTheme.primaryDark }}>
                    {t.settings.currentlyUsing}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Stats */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
        <h2 className="text-base md:text-lg font-serif text-white mb-3 md:mb-4">{t.settings.dataStats}</h2>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="p-3 md:p-4 rounded-lg md:rounded-xl" style={{ background: `${theme.primary}10` }}>
            <div className="text-2xl md:text-3xl font-light text-white">{projects.length}</div>
            <div className="text-xs md:text-sm text-white/50">{t.settings.totalProjects}</div>
          </div>
          <div className="p-3 md:p-4 rounded-lg md:rounded-xl" style={{ background: `${theme.primary}10` }}>
            <div className="text-2xl md:text-3xl font-light text-white">{projects.reduce((acc, p) => acc + p.episodes.length, 0)}</div>
            <div className="text-xs md:text-sm text-white/50">{t.settings.totalEpisodes}</div>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
        <h2 className="text-base md:text-lg font-serif text-white mb-3 md:mb-4">
          {language === 'zh' ? 'API 配置' : 'API Configuration'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Gemini API Key
              <span className="text-white/40 font-normal ml-2">
                ({language === 'zh' ? '可选' : 'Optional'})
              </span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder={language === 'zh' ? '输入您的 Gemini API Key' : 'Enter your Gemini API Key'}
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/20 text-sm"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                onClick={saveApiKey}
                className="px-4 py-3 rounded-xl text-white font-medium transition-all flex items-center gap-2"
                style={{ background: apiKeySaved ? '#22c55e' : theme.primary }}
              >
                {apiKeySaved ? <Check size={18} /> : <Key size={18} />}
                <span className="hidden sm:inline">
                  {apiKeySaved 
                    ? (language === 'zh' ? '已保存' : 'Saved') 
                    : (language === 'zh' ? '保存' : 'Save')}
                </span>
              </button>
            </div>
            <p className="text-xs text-white/40 mt-2">
              {language === 'zh' 
                ? '用于 AI 内容分析和脚本生成。如果不填写，将使用系统默认配置。' 
                : 'Used for AI content analysis and script generation. If not provided, system default will be used.'}
            </p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
        <h2 className="text-base md:text-lg font-serif text-white mb-3 md:mb-4">{t.settings.dataManagement}</h2>
        <div className="space-y-2 md:space-y-3">
          <button onClick={exportData} className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl border border-white/10 hover:border-white/20 transition-all text-left group">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${theme.primary}20` }}>
              <Download size={18} className="md:hidden" color={theme.primaryLight} />
              <Download size={20} className="hidden md:block" color={theme.primaryLight} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-white group-hover:text-white/90 text-sm md:text-base">{t.settings.exportData}</div>
              <div className="text-xs md:text-sm text-white/40 truncate">{t.settings.exportDataDesc}</div>
            </div>
          </button>

          <button className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl border border-white/10 text-left opacity-50 cursor-not-allowed" disabled>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${theme.primary}20` }}>
              <Upload size={18} className="md:hidden" color={theme.primaryLight} />
              <Upload size={20} className="hidden md:block" color={theme.primaryLight} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-white text-sm md:text-base">{t.settings.importData}</div>
              <div className="text-xs md:text-sm text-white/40 truncate">{t.settings.importDataDesc} ({t.settings.comingSoon})</div>
            </div>
          </button>

          <button onClick={clearAllData} className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all text-left group">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center bg-red-500/20 flex-shrink-0">
              <Trash2 size={18} className="md:hidden text-red-400" />
              <Trash2 size={20} className="hidden md:block text-red-400" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-red-400 text-sm md:text-base">{t.settings.clearData}</div>
              <div className="text-xs md:text-sm text-white/40 truncate">{t.settings.clearDataDesc}</div>
            </div>
          </button>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
        <h2 className="text-base md:text-lg font-serif text-white mb-3 md:mb-4">{t.settings.about}</h2>
        <div className="flex items-start gap-2.5 md:gap-3 p-3 md:p-4 rounded-lg md:rounded-xl" style={{ background: `${theme.primary}10` }}>
          <Info size={18} className="md:hidden flex-shrink-0 mt-0.5" color={theme.primaryLight} />
          <Info size={20} className="hidden md:block flex-shrink-0 mt-0.5" color={theme.primaryLight} />
          <div className="text-xs md:text-sm min-w-0">
            <p className="font-medium text-white">{t.appName} {t.settings.version}</p>
            <p className="mt-1.5 md:mt-2 text-white/60">{t.settings.aboutText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
