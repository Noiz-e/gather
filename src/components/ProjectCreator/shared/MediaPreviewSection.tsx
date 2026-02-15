/**
 * Shared Media Preview section for BGM and SFX audio playback.
 * Used in the media production step of both ProjectCreator and EpisodeCreator.
 */
import { useRef, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import {
  Play, Square, Music, Volume2, RefreshCw, Loader2,
} from 'lucide-react';
import * as api from '../../../services/api';
import type { ProductionProgress } from '../reducer';
import type { MediaPickerResult } from '../../MediaPickerModal';

interface MediaPreviewSectionProps {
  production: ProductionProgress;
  onRegenMedia: (type: 'bgm' | 'sfx', index?: number) => void;
  regeneratingId: string | null;
  bgmSelection?: MediaPickerResult | null;
  toneDescription?: string;
}

export function MediaPreviewSection({
  production,
  onRegenMedia,
  regeneratingId,
  bgmSelection,
  toneDescription,
}: MediaPreviewSectionProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { mediaProduction } = production;

  const [playingMediaId, setPlayingMediaId] = useState<string | null>(null);
  const mediaAudioRef = useRef<HTMLAudioElement | null>(null);

  if (!mediaProduction.bgmAudio && (!mediaProduction.sfxAudios || mediaProduction.sfxAudios.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-3 mt-2">
      <h4 className="text-sm font-medium text-t-text2">
        {language === 'zh' ? '音频预览' : 'Audio Preview'}
      </h4>

      {/* BGM Preview */}
      {mediaProduction.bgmAudio && (
        <div
          className="flex items-center gap-3 p-3 rounded-lg border border-t-border"
          style={{ background: 'var(--t-bg-card)' }}
        >
          <button
            disabled={regeneratingId === 'bgm'}
            onClick={() => {
              if (playingMediaId === 'bgm') {
                mediaAudioRef.current?.pause();
                mediaAudioRef.current = null;
                setPlayingMediaId(null);
              } else {
                if (mediaAudioRef.current) {
                  mediaAudioRef.current.pause();
                  mediaAudioRef.current = null;
                }
                const url = mediaProduction.bgmAudio!.audioUrl
                  || api.audioDataToUrl(mediaProduction.bgmAudio!.audioData!, mediaProduction.bgmAudio!.mimeType);
                const audio = new Audio(url);
                audio.onended = () => { setPlayingMediaId(null); mediaAudioRef.current = null; };
                audio.onerror = () => { setPlayingMediaId(null); mediaAudioRef.current = null; };
                audio.play().catch(() => { setPlayingMediaId(null); });
                mediaAudioRef.current = audio;
                setPlayingMediaId('bgm');
              }
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
            style={{ background: theme.primary, opacity: regeneratingId === 'bgm' ? 0.5 : 1 }}
          >
            {regeneratingId === 'bgm' ? <Loader2 size={14} className="text-white animate-spin" /> : playingMediaId === 'bgm' ? <Square size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-t-text1 truncate">
              <Music size={14} className="inline mr-1.5" style={{ color: theme.primaryLight }} />
              BGM
              {bgmSelection?.source === 'library' && (
                <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${theme.primary}15`, color: theme.primaryLight }}>
                  {language === 'zh' ? '媒体库' : 'Library'}
                </span>
              )}
            </p>
            <p className="text-xs text-t-text3 truncate">{toneDescription || 'Background music'}</p>
          </div>
          <button
            disabled={regeneratingId !== null}
            onClick={() => onRegenMedia('bgm')}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-t-border transition-all hover:bg-t-card-hover disabled:opacity-40"
            title={language === 'zh' ? '重新生成' : 'Regenerate'}
          >
            <RefreshCw size={14} className={`text-t-text3 ${regeneratingId === 'bgm' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* SFX Previews */}
      {mediaProduction.sfxAudios?.map((sfx, idx) => {
        const sfxId = `sfx-${idx}`;
        const isRegenerating = regeneratingId === sfxId;
        return (
          <div
            key={sfxId}
            className="flex items-center gap-3 p-3 rounded-lg border border-t-border"
            style={{ background: 'var(--t-bg-card)' }}
          >
            <button
              disabled={isRegenerating}
              onClick={() => {
                if (playingMediaId === sfxId) {
                  mediaAudioRef.current?.pause();
                  mediaAudioRef.current = null;
                  setPlayingMediaId(null);
                } else {
                  if (mediaAudioRef.current) {
                    mediaAudioRef.current.pause();
                    mediaAudioRef.current = null;
                  }
                  const url = api.audioDataToUrl(sfx.audioData, sfx.mimeType);
                  const audio = new Audio(url);
                  audio.onended = () => { setPlayingMediaId(null); mediaAudioRef.current = null; };
                  audio.onerror = () => { setPlayingMediaId(null); mediaAudioRef.current = null; };
                  audio.play().catch(() => { setPlayingMediaId(null); });
                  mediaAudioRef.current = audio;
                  setPlayingMediaId(sfxId);
                }
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
              style={{ background: theme.primary, opacity: isRegenerating ? 0.5 : 1 }}
            >
              {isRegenerating ? <Loader2 size={14} className="text-white animate-spin" /> : playingMediaId === sfxId ? <Square size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-t-text1 truncate">
                <Volume2 size={14} className="inline mr-1.5" style={{ color: theme.primaryLight }} />
                {sfx.name}
              </p>
              <p className="text-xs text-t-text3 truncate">{sfx.prompt}</p>
            </div>
            <button
              disabled={regeneratingId !== null}
              onClick={() => onRegenMedia('sfx', idx)}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-t-border transition-all hover:bg-t-card-hover disabled:opacity-40"
              title={language === 'zh' ? '重新生成' : 'Regenerate'}
            >
              <RefreshCw size={14} className={`text-t-text3 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
