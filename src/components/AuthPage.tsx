import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_OPTIONS } from '../i18n/types';
import { ReligionIconMap } from './icons/ReligionIcons';
import { Mail, Lock, User, Loader2, AlertCircle, Globe } from 'lucide-react';

type AuthMode = 'login' | 'register';

export function AuthPage() {
  const { login, register } = useAuth();
  const { religion, theme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const ReligionIcon = ReligionIconMap[religion];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!displayName.trim()) {
          throw new Error(t.auth.displayNameRequired);
        }
        await register(email, password, displayName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: theme.bgGradient }}
    >
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{ background: theme.primary }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full blur-[100px] opacity-15"
          style={{ background: theme.accent }}
        />
      </div>

      <div 
        className="w-full max-w-md relative z-10 rounded-2xl border border-white/10 p-8 backdrop-blur-xl"
        style={{ background: `${theme.bgCard}90` }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ 
              background: `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}10)`,
              boxShadow: `0 0 40px ${theme.glow}`,
            }}
          >
            <ReligionIcon size={32} color={theme.primaryLight} />
          </div>
          <h1 className="text-2xl font-serif text-white tracking-wide">
            {t.appName}
          </h1>
          <p className="text-sm text-white/40 tracking-wider uppercase mt-1">
            Professional Publisher Studio
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-white/60 mb-2">{t.auth.displayName}</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t.auth.displayNamePlaceholder}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                  required={mode === 'register'}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-2">{t.auth.email}</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">{t.auth.password}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? t.auth.passwordPlaceholderRegister : '••••••••'}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                required
                minLength={mode === 'register' ? 8 : undefined}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ 
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
              boxShadow: `0 0 20px ${theme.glow}`,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {mode === 'login' ? t.auth.loggingIn : t.auth.registering}
              </>
            ) : (
              mode === 'login' ? t.auth.login : t.auth.register
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-6 text-center">
          <span className="text-white/40 text-sm">
            {mode === 'login' ? t.auth.noAccount : t.auth.hasAccount}
          </span>
          <button
            onClick={toggleMode}
            className="text-sm ml-1 hover:underline transition-colors"
            style={{ color: theme.primaryLight }}
          >
            {mode === 'login' ? t.auth.register : t.auth.login}
          </button>
        </div>

        {/* Language Switcher */}
        <div className="mt-6 flex justify-center relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            <Globe size={12} />
            {LANGUAGE_OPTIONS.find(opt => opt.value === language)?.label}
          </button>
          {showLangMenu && (
            <>
              <div className="fixed inset-0" onClick={() => setShowLangMenu(false)} />
              <div 
                className="absolute bottom-full mb-1 py-1 rounded-lg border border-white/10 backdrop-blur-xl overflow-hidden min-w-[100px]"
                style={{ background: `${theme.bgCard}e0` }}
              >
                {LANGUAGE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setLanguage(opt.value); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      language === opt.value 
                        ? 'text-white bg-white/10' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
