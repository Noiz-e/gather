/**
 * Shared Mixing & Editing step component.
 * Used by both ProjectCreator and EpisodeCreator.
 */
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import {
  Check, X, Music, Play, Save, Sliders, RefreshCw, Image,
} from 'lucide-react';
import * as api from '../../../services/api';
import type { ProductionProgress } from '../reducer';

interface MixingStepProps {
  production: ProductionProgress;
  onRetryMixing: () => void;
  /** Title used for the download filename */
  downloadTitle: string;
  /** Whether spec has visual content */
  hasVisualContent?: boolean;
}

export function MixingStep({
  production,
  onRetryMixing,
  downloadTitle,
  hasVisualContent,
}: MixingStepProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { mixingEditing } = production;
  const mixedOutput = mixingEditing.output;
  const mixingError = mixingEditing.error;

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayMixedAudio = () => {
    if (mixedOutput?.audioData) {
      const audioUrl = api.audioDataToUrl(mixedOutput.audioData, mixedOutput.mimeType);
      const audio = new Audio(audioUrl);
      audio.play().catch(err => console.error('Playback failed:', err));
    }
  };

  const handleDownloadMixedAudio = () => {
    if (mixedOutput?.audioData) {
      const filename = `${downloadTitle || 'audio'}.wav`;
      api.downloadAudio(mixedOutput.audioData, mixedOutput.mimeType, filename);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div
          className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
          style={{ background: `${theme.primary}20` }}
        >
          {mixingEditing.status === 'completed' && mixedOutput ? (
            <Check size={40} style={{ color: theme.primaryLight }} />
          ) : mixingError ? (
            <X size={40} className="text-red-400" />
          ) : (
            <Sliders size={40} className={mixingEditing.status === 'processing' ? 'animate-pulse' : ''} style={{ color: theme.primaryLight }} />
          )}
        </div>
        <h3 className="text-xl font-medium text-t-text1 mb-2">
          {language === 'zh' ? '混音与编辑' : 'Mixing & Editing'}
        </h3>
        <p className="text-base text-t-text3">
          {mixingError
            ? (language === 'zh' ? `混音失败: ${mixingError}` : `Mixing failed: ${mixingError}`)
            : mixingEditing.status === 'completed' && mixedOutput
              ? (language === 'zh' ? '混音完成！' : 'Mixing complete!')
              : (language === 'zh' ? '正在合成音轨...' : 'Combining audio tracks...')
          }
        </p>
      </div>

      {/* Progress bar */}
      {mixingEditing.status === 'processing' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-t-text3">
            <span>{language === 'zh' ? '进度' : 'Progress'}</span>
            <span>{mixingEditing.progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-t-card-hover overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${mixingEditing.progress}%`, background: theme.primary }}
            />
          </div>
        </div>
      )}

      {/* Audio Player when complete */}
      {mixingEditing.status === 'completed' && mixedOutput && (
        <div
          className="rounded-xl p-5 border border-t-border"
          style={{ background: 'var(--t-bg-card)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Music size={18} style={{ color: theme.primaryLight }} />
            <span className="text-t-text1 text-base font-medium">
              {language === 'zh' ? '最终音频' : 'Final Audio'}
            </span>
            <span className="text-t-text3 text-sm ml-auto">
              {formatDuration(mixedOutput.durationMs)}
            </span>
          </div>

          <audio
            controls
            className="w-full mb-4"
            src={api.audioDataToUrl(mixedOutput.audioData, mixedOutput.mimeType)}
            style={{ height: '40px' }}
          />

          <div className="flex gap-3">
            <button
              onClick={handlePlayMixedAudio}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-t-text1 text-sm font-medium transition-all hover:opacity-90"
              style={{ background: theme.primary }}
            >
              <Play size={16} />
              {language === 'zh' ? '播放' : 'Play'}
            </button>
            <button
              onClick={handleDownloadMixedAudio}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-t-text1 text-sm font-medium border border-t-border transition-all hover:bg-t-card-hover"
            >
              <Save size={16} />
              {language === 'zh' ? '下载' : 'Download'}
            </button>
          </div>
        </div>
      )}

      {/* Retry button on error */}
      {mixingError && (
        <button
          onClick={onRetryMixing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-t-text1 text-sm font-medium transition-all hover:opacity-90"
          style={{ background: theme.primary }}
        >
          <RefreshCw size={16} />
          {language === 'zh' ? '重试混音' : 'Retry Mixing'}
        </button>
      )}

      {/* Visual preview */}
      {mixingEditing.status === 'completed' && hasVisualContent && (
        <div
          className="rounded-xl p-5 border border-t-border"
          style={{ background: 'var(--t-bg-card)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Image size={18} style={{ color: theme.primaryLight }} />
            <span className="text-t-text1 text-base font-medium">{language === 'zh' ? '视觉预览' : 'Visual Preview'}</span>
          </div>
          <div className="h-14 rounded-lg flex items-center justify-center text-t-text3 text-sm" style={{ background: `${theme.primary}10` }}>
            {language === 'zh' ? '即将推出' : 'Coming soon'}
          </div>
        </div>
      )}
    </div>
  );
}
