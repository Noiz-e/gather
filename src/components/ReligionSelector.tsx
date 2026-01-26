import { useState, useRef, useEffect } from 'react';
import { Religion, RELIGIONS } from '../types';
import { religionThemes } from '../themes';
import { useLanguage } from '../i18n/LanguageContext';
import { Language, LANGUAGE_OPTIONS } from '../i18n/types';
import { ReligionIconMap } from './icons/ReligionIcons';
import { ChevronDown } from 'lucide-react';

interface ReligionSelectorProps {
  onSelect: (religion: Religion) => void;
}

export function ReligionSelector({ onSelect }: ReligionSelectorProps) {
  const { t, language, setLanguage } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setLangMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-48 md:w-96 h-48 md:h-96 bg-blue-500/10 rounded-full blur-2xl md:blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-40 md:w-80 h-40 md:h-80 bg-purple-500/10 rounded-full blur-2xl md:blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-36 md:w-72 h-36 md:h-72 bg-green-500/10 rounded-full blur-2xl md:blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-6xl w-full relative z-10">
        {/* Language Switcher */}
        <div className="flex justify-end mb-6 md:mb-8">
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 text-white text-xs md:text-sm font-medium"
            >
              <span>{LANGUAGE_OPTIONS.find(opt => opt.value === language)?.label}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-10">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleLanguageSelect(option.value)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-200 ${
                      language === option.value
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8 md:mb-16 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-light text-white mb-2 md:mb-4 tracking-wide">
            {t.religionSelector.title}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/60 font-light">
            {t.religionSelector.subtitle}
          </p>
          <p className="text-white/40 mt-3 md:mt-4 text-xs md:text-sm tracking-widest uppercase">
            {t.religionSelector.selectPrompt}
          </p>
        </div>

        {/* Religion Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {RELIGIONS.map((religion, index) => {
            const theme = religionThemes[religion.id];
            const religionT = t.religions[religion.id];
            const IconComponent = ReligionIconMap[religion.id];
            
            return (
              <button
                key={religion.id}
                onClick={() => onSelect(religion.id)}
                className="group relative overflow-hidden rounded-2xl md:rounded-3xl p-5 md:p-8 text-left transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] animate-slide-up backdrop-blur-sm border border-white/10"
                style={{
                  background: theme.bgCard,
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Glow effect on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl md:rounded-3xl"
                  style={{ 
                    background: `radial-gradient(circle at 50% 50%, ${theme.glow}, transparent 70%)`,
                  }}
                />
                
                {/* Icon with glow */}
                <div className="relative mb-4 md:mb-6">
                  <div 
                    className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.primary}20, ${theme.primary}40)`,
                      boxShadow: `0 0 30px ${theme.glow}`,
                    }}
                  >
                    <IconComponent size={24} className="md:hidden" color={theme.primaryLight} />
                    <IconComponent size={32} className="hidden md:block" color={theme.primaryLight} />
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative">
                  <h2 className="text-xl md:text-2xl font-serif font-light text-white mb-0.5 md:mb-1 tracking-wide">
                    {religionT.name}
                  </h2>
                  <p className="text-xs md:text-sm text-white/40 mb-2 md:mb-4 uppercase tracking-wider">
                    {religion.nameEn}
                  </p>
                  <p className="text-white/60 text-xs md:text-sm leading-relaxed line-clamp-3">
                    {religionT.description}
                  </p>
                </div>

                {/* Hover indicator */}
                <div className="relative mt-4 md:mt-6 flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-300 transform md:translate-y-2 group-hover:translate-y-0">
                  <span 
                    className="text-xs md:text-sm font-medium tracking-wide"
                    style={{ color: theme.accent }}
                  >
                    {t.religionSelector.startUsing}
                  </span>
                  <svg 
                    className="w-3 h-3 md:w-4 md:h-4 transform group-hover:translate-x-1 transition-transform" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    style={{ color: theme.accent }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>

                {/* Accent line at bottom */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)` }}
                />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 md:mt-16 text-white/30 text-xs md:text-sm tracking-widest">
          <p>{t.religionSelector.footer}</p>
        </div>
      </div>
    </div>
  );
}
