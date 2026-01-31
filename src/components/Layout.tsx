import { ReactNode, useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Language, LANGUAGE_OPTIONS } from '../i18n/types';
import { Home, FolderOpen, Settings, AudioWaveform, Globe, ChevronRight, ChevronDown, PanelLeftClose, PanelLeft, Menu, X } from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';

interface LayoutProps {
  children: ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Layout({ children, onNavigate, currentPage }: LayoutProps) {
  const { religion, theme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileLangMenuOpen, setMobileLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const mobileLangMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when navigating
  const handleNavigate = (page: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  // Handle language selection
  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setLangMenuOpen(false);
    setMobileLangMenuOpen(false);
  };

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
      if (mobileLangMenuRef.current && !mobileLangMenuRef.current.contains(event.target as Node)) {
        setMobileLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navItems = [
    { id: 'dashboard', label: t.nav.home, icon: Home },
    { id: 'projects', label: t.nav.projects, icon: FolderOpen },
    { id: 'voice', label: t.nav.voice, icon: AudioWaveform },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  const religionT = t.religions[religion];
  const ReligionIcon = ReligionIconMap[religion];

  return (
    <div 
      className="h-screen flex flex-col md:flex-row overflow-hidden"
      style={{ background: theme.bgGradient }}
    >
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-0 left-1/4 w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full blur-[80px] md:blur-[120px] opacity-20"
          style={{ background: theme.primary }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-[250px] md:w-[500px] h-[250px] md:h-[500px] rounded-full blur-[60px] md:blur-[100px] opacity-10"
          style={{ background: theme.accent }}
        />
      </div>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 border-b border-white/5 backdrop-blur-xl" style={{ background: `${theme.bgDark}95` }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}10)`,
                boxShadow: `0 0 20px ${theme.glow}`,
              }}
            >
              <ReligionIcon size={20} color={theme.primaryLight} />
            </div>
            <div>
              <h1 className="text-base font-serif text-white tracking-wide">
                {t.appName}
              </h1>
              <p className="text-[10px] text-white/40 tracking-wider uppercase">
                {religionT.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-white/70" />
            ) : (
              <Menu size={24} className="text-white/70" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`md:hidden fixed top-0 right-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        } border-l border-white/5`}
        style={{ background: theme.bgDark }}
      >
        {/* Mobile Sidebar Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}10)`,
                  boxShadow: `0 0 20px ${theme.glow}`,
                }}
              >
                <ReligionIcon size={20} color={theme.primaryLight} />
              </div>
              <div>
                <h1 className="text-base font-serif text-white tracking-wide">
                  {t.appName}
                </h1>
                <p className="text-[10px] text-white/40 tracking-wider uppercase">
                  {religionT.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={20} className="text-white/50" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                      isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                    }`}
                    style={isActive ? { 
                      background: theme.bgCard,
                      boxShadow: `0 0 20px ${theme.glow}`,
                    } : {}}
                  >
                    <Icon size={20} />
                    <span className="font-medium tracking-wide">{item.label}</span>
                    {isActive && (
                      <ChevronRight size={16} className="ml-auto opacity-50" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile Bottom Actions */}
        <div className="p-4 border-t border-white/5">
          <div className="relative" ref={mobileLangMenuRef}>
            <button
              onClick={() => setMobileLangMenuOpen(!mobileLangMenuOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 text-white/60 hover:text-white/80 text-sm"
            >
              <div className="flex items-center gap-2">
                <Globe size={16} />
                <span>{LANGUAGE_OPTIONS.find(opt => opt.value === language)?.label}</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-200 ${mobileLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileLangMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden">
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
      </aside>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex ${sidebarCollapsed ? 'w-20' : 'w-72'} h-screen flex-col relative z-10 border-r border-white/5 transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        {/* Logo Area */}
        <div className={`${sidebarCollapsed ? 'p-4' : 'p-8'} border-b border-white/5 transition-all duration-300`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-4'}`}>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}10)`,
                boxShadow: `0 0 30px ${theme.glow}`,
              }}
            >
              <ReligionIcon size={24} color={theme.primaryLight} />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-serif text-white tracking-wide whitespace-nowrap">
                  {t.appName}
                </h1>
                <p className="text-xs text-white/40 tracking-wider uppercase whitespace-nowrap">
                  {religionT.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${sidebarCollapsed ? 'p-3' : 'p-6'} transition-all duration-300`}>
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 group ${
                      isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                    }`}
                    style={isActive ? { 
                      background: theme.bgCard,
                      boxShadow: `0 0 20px ${theme.glow}`,
                    } : {}}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="font-medium tracking-wide whitespace-nowrap">{item.label}</span>
                        {isActive && (
                          <ChevronRight size={16} className="ml-auto opacity-50" />
                        )}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom actions - Language, Theme, Collapse in one row */}
        <div className={`${sidebarCollapsed ? 'p-3' : 'p-4'} border-t border-white/5 transition-all duration-300`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
            {/* Language Switcher */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition-all duration-300 text-white/40 hover:text-white/60"
                title={LANGUAGE_OPTIONS.find(opt => opt.value === language)?.label}
              >
                <Globe size={16} />
              </button>
              {langMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-36 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-20">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleLanguageSelect(option.value)}
                      className={`w-full px-3 py-2 text-left text-sm transition-all duration-200 ${
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

            {/* Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition-all duration-300 text-white/40 hover:text-white/60"
              title={sidebarCollapsed ? t.common.expand || 'Expand' : t.common.collapse || 'Collapse'}
            >
              {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        <div className="p-4 sm:p-6 lg:p-12 pb-24 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 backdrop-blur-xl" style={{ background: `${theme.bgDark}95` }}>
        <div className="flex items-center justify-around py-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[60px] ${
                  isActive ? 'text-white' : 'text-white/40'
                }`}
                style={isActive ? { 
                  background: `${theme.primary}30`,
                } : {}}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
