import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { X, Key, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface GeminiApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export function GeminiApiKeyDialog({ isOpen, onClose, onSave }: GeminiApiKeyDialogProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl"
        style={{ background: theme.bgDark }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${theme.primary}20` }}
            >
              <Key size={20} style={{ color: theme.primaryLight }} />
            </div>
            <h2 className="text-xl font-serif text-white">
              {t.geminiApiKey.title}
            </h2>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <p className="text-white/60 text-sm mb-6 leading-relaxed">
          {t.geminiApiKey.description}
        </p>

        {/* API Key Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/70 mb-2">
            {t.geminiApiKey.inputLabel}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t.geminiApiKey.inputPlaceholder}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
              autoFocus
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
            >
              {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Get API Key Button */}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 mb-4 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all text-sm"
        >
          <ExternalLink size={16} />
          {t.geminiApiKey.getKeyButton}
        </a>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all"
          >
            {t.geminiApiKey.skipButton}
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            style={{ background: theme.primary }}
          >
            {t.geminiApiKey.saveButton}
          </button>
        </div>

        {/* Hints */}
        <div className="space-y-2 text-xs text-white/40">
          <p>{t.geminiApiKey.hint1}</p>
          <p>{t.geminiApiKey.hint2}</p>
        </div>
      </div>
    </div>
  );
}
