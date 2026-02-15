import { ReactNode, useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Language, LANGUAGE_OPTIONS } from '../i18n/types';
import { LayoutDashboard, FolderOpen, Settings, AudioWaveform, Globe, ChevronRight, ChevronDown, PanelLeftClose, PanelLeft, Menu, X, Image, LogOut, MessageSquare, ShieldCheck } from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';
import { RoleBadge } from './RoleBadge';

interface LayoutProps {
  children: ReactNode;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Layout({ children, onNavigate, currentPage }: LayoutProps) {
  const { religion, theme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileLangMenuOpen, setMobileLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const mobileLangMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
  };

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

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const navItems = [
    { id: 'dashboard', label: t.nav.workspace, icon: LayoutDashboard },
    { id: 'projects', label: t.nav.projects, icon: FolderOpen },
    { id: 'voice', label: t.nav.voice, icon: AudioWaveform },
    { id: 'media', label: t.nav.media || 'Media', icon: Image },
    { id: 'feedback', label: t.nav.feedback || 'Feedback', icon: MessageSquare },
    { id: 'settings', label: t.nav.settings, icon: Settings },
    ...(isAdmin ? [{ id: 'admin-feedback', label: t.nav.adminFeedback || 'Tickets', icon: ShieldCheck }] : []),
  ];

  const religionT = t.religions[religion];
  const ReligionIcon = ReligionIconMap[religion];

  return (
    <div 
      className="h-screen flex flex-col md:flex-row overflow-hidden"
      style={{ background: 'var(--t-bg)' }}
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
      <header className="md:hidden sticky top-0 z-30 border-b border-t-border-lt backdrop-blur-xl" style={{ background: 'var(--t-bg-base)' }}>
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
              <h1 className="text-base font-serif text-t-text1 tracking-wide">
                {t.appName}
              </h1>
              <p className="text-[10px] text-t-text3 tracking-wider uppercase">
                {religionT.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-t-card-hover transition-colors"
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-t-text2" />
            ) : (
              <Menu size={24} className="text-t-text2" />
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
        } border-l border-t-border-lt`}
        style={{ background: 'var(--t-bg-base)' }}
      >
        {/* Mobile Sidebar Header */}
        <div className="p-6 border-b border-t-border-lt">
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
                <h1 className="text-base font-serif text-t-text1 tracking-wide">
                  {t.appName}
                </h1>
                <p className="text-[10px] text-t-text3 tracking-wider uppercase">
                  {religionT.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-t-card-hover transition-colors"
            >
              <X size={20} className="text-t-text3" />
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
                      isActive ? 'text-t-text1' : 'text-t-text3 hover:text-t-text2'
                    }`}
                    style={isActive ? { 
                      background: 'var(--t-bg-card)',
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

        {/* Mobile User Info */}
        {user && (
          <div className="px-4 py-3 border-t border-t-border-lt">
            <div className="flex items-center gap-3">
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-medium text-t-text2"
                style={{ background: `${theme.primary}25` }}
              >
                {user.displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-t-text2 truncate leading-tight">{user.displayName}</p>
                <p className="text-xs text-t-text3 truncate">{user.email}</p>
              </div>
              <RoleBadge role={user.role} size="sm" />
            </div>
          </div>
        )}

        {/* Mobile Bottom Actions */}
        <div className="p-4 border-t border-t-border-lt space-y-3">
          <div className="relative" ref={mobileLangMenuRef}>
            <button
              onClick={() => setMobileLangMenuOpen(!mobileLangMenuOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-t-card hover:bg-t-card-hover transition-all duration-300 text-t-text2 hover:text-t-text2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Globe size={16} />
                <span>{LANGUAGE_OPTIONS.find(opt => opt.value === language)?.label}</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-200 ${mobileLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileLangMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-t-surface border border-t-border rounded-xl shadow-xl overflow-hidden">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleLanguageSelect(option.value)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-200 ${
                      language === option.value
                        ? 'bg-t-card-hover text-t-text1'
                        : 'text-t-text2 hover:bg-t-card hover:text-t-text2'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all duration-300 text-red-400 hover:text-red-300 text-sm"
          >
            <LogOut size={16} />
            <span>{t.common.logout}</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex ${sidebarCollapsed ? 'w-20' : 'w-72'} h-screen flex-col relative z-10 border-r border-t-border-lt transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        {/* Logo Area */}
        <div className={`${sidebarCollapsed ? 'p-4' : 'p-8'} border-b border-t-border-lt transition-all duration-300`}>
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
                <h1 className="text-lg font-serif text-t-text1 tracking-wide whitespace-nowrap">
                  {t.appName}
                </h1>
                <p className="text-xs text-t-text3 tracking-wider uppercase whitespace-nowrap">
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
                      isActive ? 'text-t-text1' : 'text-t-text3 hover:text-t-text2'
                    }`}
                    style={isActive ? { 
                      background: 'var(--t-bg-card)',
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

        {/* Bottom: User Info + Actions */}
        <div className={`${sidebarCollapsed ? 'p-3' : 'px-4 py-3'} border-t border-t-border-lt transition-all duration-300`}>
          {/* User Info (expanded only) */}
          {user && !sidebarCollapsed && (
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-medium text-t-text2"
                style={{ background: `${theme.primary}25` }}
              >
                {user.displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-t-text2 truncate leading-tight">{user.displayName}</p>
                <RoleBadge role={user.role} size="sm" />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
            {/* Language Switcher */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-t-card transition-all duration-300 text-t-text3 hover:text-t-text2"
                title={LANGUAGE_OPTIONS.find(opt => opt.value === language)?.label}
              >
                <Globe size={16} />
              </button>
              {langMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-36 bg-t-surface border border-t-border rounded-xl shadow-xl overflow-hidden z-20">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleLanguageSelect(option.value)}
                      className={`w-full px-3 py-2 text-left text-sm transition-all duration-200 ${
                        language === option.value
                          ? 'bg-t-card-hover text-t-text1'
                          : 'text-t-text2 hover:bg-t-card hover:text-t-text2'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-500/10 transition-all duration-300 text-t-text3 hover:text-red-400"
              title={t.common.logout}
            >
              <LogOut size={16} />
            </button>

            {/* Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-t-card transition-all duration-300 text-t-text3 hover:text-t-text2"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-t-border backdrop-blur-xl" style={{ background: 'var(--t-bg-base)' }}>
        <div className="flex items-center justify-around py-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[60px] ${
                  isActive ? 'text-t-text1' : 'text-t-text3'
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
