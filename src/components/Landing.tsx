import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  BookOpen,
  Mic2,
  Heart,
  GraduationCap,
  Sparkles,
  Music,
  Volume2,
  Image,
  User,
  Home,
  type LucideIcon,
} from 'lucide-react';

export interface LandingData {
  selectedFormat: string;
  projectDescription: string;
  mediaConfig: {
    voiceCount: 'single' | 'multiple';
    addBgm: boolean;
    addSoundEffects: boolean;
    hasVisualContent: boolean;
  };
}

interface LandingProps {
  onEnterWorkspace: (data?: LandingData) => void;
}

const FORMAT_ICONS: { id: string; Icon: LucideIcon; label: string; labelZh: string }[] = [
  { id: 'audiobook', Icon: BookOpen, label: 'Audiobook', labelZh: '有声书' },
  { id: 'podcast', Icon: Mic2, label: 'Podcast', labelZh: '播客' },
  { id: 'devotional', Icon: Heart, label: 'Devotional', labelZh: '灵修' },
  { id: 'educational', Icon: GraduationCap, label: 'Educational', labelZh: '教育' },
];

export function Landing({ onEnterWorkspace }: LandingProps) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [projectDescription, setProjectDescription] = useState('');
  
  // Media configuration options
  const [mediaConfig, setMediaConfig] = useState({
    voiceCount: 'single' as 'single' | 'multiple',
    addBgm: false,
    addSoundEffects: false,
    hasVisualContent: false,
  });

  // Handle format selection with default config
  const handleFormatSelect = (formatId: string) => {
    setSelectedFormat(formatId);
    // Set reasonable defaults based on format
    switch (formatId) {
      case 'audiobook':
        setMediaConfig({ voiceCount: 'single', addBgm: false, addSoundEffects: false, hasVisualContent: false });
        break;
      case 'podcast':
        setMediaConfig({ voiceCount: 'multiple', addBgm: true, addSoundEffects: false, hasVisualContent: false });
        break;
      case 'devotional':
        setMediaConfig({ voiceCount: 'single', addBgm: true, addSoundEffects: false, hasVisualContent: false });
        break;
      case 'educational':
        setMediaConfig({ voiceCount: 'single', addBgm: false, addSoundEffects: true, hasVisualContent: true });
        break;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row md:items-center md:justify-center p-6 md:p-12 lg:p-16 gap-10 md:gap-16 overflow-hidden relative"
      style={{ background: theme.bgGradient }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full blur-[80px] md:blur-[120px] opacity-20"
          style={{ background: theme.primary }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full blur-[60px] md:blur-[100px] opacity-10"
          style={{ background: theme.accent }}
        />
      </div>

      {/* Top-right: Home navigation */}
      <button
        type="button"
        onClick={() => onEnterWorkspace()}
        className="absolute top-6 right-6 md:top-12 md:right-12 lg:top-16 lg:right-16 z-20 flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-all duration-200 hover:scale-105"
        style={{ background: theme.bgCard }}
      >
        <Home size={16} style={{ color: theme.primaryLight }} />
        <span className="text-sm font-medium" style={{ color: theme.textOnDark }}>
          {language === 'zh' ? '工作台' : 'Home'}
        </span>
      </button>

      {/* Bottom-left: Home navigation (subtle) */}
      <button
        type="button"
        onClick={() => onEnterWorkspace()}
        className="absolute bottom-6 left-6 md:bottom-12 md:left-12 lg:bottom-16 lg:left-16 z-20 flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors duration-200"
      >
        <Home size={14} />
        <span className="text-xs">
          {language === 'zh' ? '进入工作台' : 'Enter Workspace'}
        </span>
      </button>

      {/* Left: Marketing */}
      <div className="flex-1 max-w-xl relative z-10">
        <div
          className="inline-block px-3 py-1.5 rounded-full border border-white/20 text-[10px] md:text-xs font-medium tracking-wider uppercase mb-6 md:mb-8"
          style={{
            background: theme.bgCard,
            color: theme.textOnDark,
          }}
        >
          {t.landing.badge}
        </div>
        <h1
          className="font-serif font-bold text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[1.15] tracking-tight mb-6"
          style={{ color: theme.textOnDark }}
        >
          <span className="block">{t.landing.headline1}</span>
          <span className="block">{t.landing.headline2}</span>
          <span className="block">{t.landing.headline3}</span>
          <span className="block">{t.landing.headline4}</span>
        </h1>
        <p
          className="text-base md:text-lg leading-relaxed max-w-md"
          style={{ color: theme.textMuted }}
        >
          {t.landing.body}
        </p>
      </div>

      {/* Right: Start Your Journey card */}
      <div className="flex-1 w-full max-w-lg relative z-10">
        <div
          className="rounded-3xl border border-white/10 p-6 md:p-8"
          style={{
            background: theme.bgCard,
            boxShadow: `0 0 30px ${theme.glow}`,
          }}
        >
          <h2
            className="font-semibold text-xl md:text-2xl mb-4"
            style={{ color: theme.textOnDark }}
          >
            {t.landing.startJourney}
          </h2>

          <p className="text-[10px] md:text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
            {t.landing.selectFormat}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {FORMAT_ICONS.map(({ id, Icon, label, labelZh }) => {
              const isSelected = selectedFormat === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleFormatSelect(id)}
                  className="p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 border border-white/10 hover:border-white/20"
                  style={
                    isSelected
                      ? {
                          background: `${theme.primary}20`,
                          borderColor: theme.primary,
                          boxShadow: `0 0 15px ${theme.glow}`,
                        }
                      : {}
                  }
                  aria-label={id}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={isSelected ? 2.5 : 1.5} 
                    style={{ color: isSelected ? theme.primaryLight : 'rgba(255,255,255,0.5)' }}
                  />
                  <span 
                    className="text-[10px] font-medium"
                    style={{ color: isSelected ? theme.textOnDark : 'rgba(255,255,255,0.5)' }}
                  >
                    {language === 'zh' ? labelZh : label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-white/50 text-sm italic mb-2">
            "{t.landing.journeyPrompt}"
          </p>
          <div className="relative mb-4">
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder={t.landing.inputPlaceholder}
              className="w-full min-h-[100px] md:min-h-[120px] px-4 py-3 pr-10 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:border-transparent resize-none text-sm placeholder:text-white/40"
              style={{
                background: theme.bgDark,
                color: theme.textOnDark,
              }}
              rows={4}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="text-[10px] text-white/30">[{language === 'zh' ? '选填' : 'optional'}]</span>
              <Sparkles size={16} className="opacity-60" style={{ color: theme.primaryLight }} />
            </div>
          </div>

          {/* Media Options - Show when format is selected */}
          {selectedFormat && (
            <div className="mb-5 p-3 rounded-xl border border-white/10" style={{ background: `${theme.primary}08` }}>
              {/* Voice Type */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-white/50 uppercase tracking-wider w-16">
                  {language === 'zh' ? '声音' : 'Voice'}
                </span>
                <div className="flex gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => setMediaConfig(prev => ({ ...prev, voiceCount: 'single' }))}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                      mediaConfig.voiceCount === 'single'
                        ? 'text-white'
                        : 'text-white/50 border border-white/10 hover:border-white/20'
                    }`}
                    style={mediaConfig.voiceCount === 'single' ? { background: theme.primary } : {}}
                  >
                    <User size={12} />
                    {language === 'zh' ? '单人' : 'Solo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaConfig(prev => ({ ...prev, voiceCount: 'multiple' }))}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                      mediaConfig.voiceCount === 'multiple'
                        ? 'text-white'
                        : 'text-white/50 border border-white/10 hover:border-white/20'
                    }`}
                    style={mediaConfig.voiceCount === 'multiple' ? { background: theme.primary } : {}}
                  >
                    <User size={12} />
                    <User size={12} className="-ml-1.5" />
                    {language === 'zh' ? '多人' : 'Multi'}
                  </button>
                </div>
              </div>
              
              {/* Media Toggles */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/50 uppercase tracking-wider w-16">
                  {language === 'zh' ? '媒体' : 'Media'}
                </span>
                <div className="flex gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => setMediaConfig(prev => ({ ...prev, addBgm: !prev.addBgm }))}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                      mediaConfig.addBgm
                        ? 'text-white'
                        : 'text-white/50 border border-white/10 hover:border-white/20'
                    }`}
                    style={mediaConfig.addBgm ? { background: theme.primary } : {}}
                  >
                    <Music size={12} />
                    BGM
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaConfig(prev => ({ ...prev, addSoundEffects: !prev.addSoundEffects }))}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                      mediaConfig.addSoundEffects
                        ? 'text-white'
                        : 'text-white/50 border border-white/10 hover:border-white/20'
                    }`}
                    style={mediaConfig.addSoundEffects ? { background: theme.primary } : {}}
                  >
                    <Volume2 size={12} />
                    SFX
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaConfig(prev => ({ ...prev, hasVisualContent: !prev.hasVisualContent }))}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                      mediaConfig.hasVisualContent
                        ? 'text-white'
                        : 'text-white/50 border border-white/10 hover:border-white/20'
                    }`}
                    style={mediaConfig.hasVisualContent ? { background: theme.primary } : {}}
                  >
                    <Image size={12} />
                    {language === 'zh' ? '图片' : 'Image'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (selectedFormat) {
                onEnterWorkspace({
                  selectedFormat,
                  projectDescription,
                  mediaConfig,
                });
              }
            }}
            disabled={!selectedFormat}
            className={`w-full py-3.5 rounded-xl font-medium text-base transition-all duration-300 ${
              selectedFormat ? 'hover:scale-[1.02]' : 'opacity-50 cursor-not-allowed'
            }`}
            style={{
              background: theme.accent,
              color: theme.primaryDark,
            }}
          >
            {t.landing.beginProduction}
          </button>
        </div>
      </div>
    </div>
  );
}
