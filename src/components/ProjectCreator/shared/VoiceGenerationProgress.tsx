/**
 * Shared Voice Generation Progress component.
 * Shows section-by-section voice generation progress after voice assignments are confirmed.
 * Used by both ProjectCreator and EpisodeCreator.
 */
import { useRef, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { ScriptSection } from '../../../types';
import {
  Check, X, Loader2, Mic2, Play, Pause, RefreshCw, ChevronDown,
} from 'lucide-react';
import * as api from '../../../services/api';
import type { SectionVoiceAudio, SectionVoiceStatus, ProductionProgress } from '../reducer';

interface VoiceGenerationProgressProps {
  scriptSections: ScriptSection[];
  production: ProductionProgress;
  onGenerateSection: (section: ScriptSection) => Promise<boolean>;
  onClearAndRegenSection: (sectionId: string, section: ScriptSection) => void;
  onGenerateAll: () => void;
  /** Optional: per-line regeneration handler */
  onRegenerateLine?: (section: ScriptSection, sectionId: string, audioIndex: number, audio: SectionVoiceAudio) => void;
  /** Optional: regenerating line ID */
  regeneratingLineId?: string | null;
  /** Optional: listened segments set */
  listenedSegments?: Set<string>;
  /** Optional: callback when a segment is listened to */
  onSegmentListened?: (segId: string) => void;
}

export function VoiceGenerationProgress({
  scriptSections,
  production,
  onGenerateSection,
  onClearAndRegenSection,
  onGenerateAll,
  onRegenerateLine,
  regeneratingLineId,
  listenedSegments,
  onSegmentListened,
}: VoiceGenerationProgressProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { voiceGeneration } = production;
  const { sectionStatus } = voiceGeneration;

  // Local state for expanded sections and audio playback
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const segmentAudioRef = useRef<HTMLAudioElement | null>(null);

  const completedSections = scriptSections.filter(s => sectionStatus[s.id]?.status === 'completed').length;
  const allCompleted = completedSections === scriptSections.length && scriptSections.length > 0;

  return (
    <div className="space-y-6">
      {/* Overall progress header */}
      <div className="text-center py-4">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: `${theme.primary}20` }}
        >
          {allCompleted ? (
            <Check size={32} style={{ color: theme.primaryLight }} />
          ) : (
            <Mic2 size={32} className={voiceGeneration.status === 'processing' ? 'animate-pulse' : ''} style={{ color: theme.primaryLight }} />
          )}
        </div>
        <h3 className="text-xl font-medium text-t-text1 mb-2">
          {language === 'zh' ? '逐段语音生成' : 'Section-by-Section Voice Generation'}
        </h3>
        <p className="text-base text-t-text3">
          {allCompleted
            ? (language === 'zh' ? '所有段落已完成' : 'All sections completed')
            : `${completedSections}/${scriptSections.length} ${language === 'zh' ? '段落已完成' : 'sections completed'}`
          }
        </p>
      </div>

      {/* Section list with individual controls */}
      <div className="space-y-4">
        {scriptSections.map((section, index) => {
          const status: SectionVoiceStatus = sectionStatus[section.id] || { status: 'idle', progress: 0, audioSegments: [] };
          const isCurrentSection = voiceGeneration.currentSectionId === section.id;
          const lineCount = section.timeline.reduce((acc, item) => acc + (item.lines?.filter(l => l.line.trim()).length || 0), 0);

          return (
            <div
              key={section.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                isCurrentSection ? 'border-t-border' : 'border-t-border'
              }`}
              style={{ background: 'var(--t-bg-card)' }}
            >
              {/* Section header */}
              <div
                className={`px-5 py-4 flex items-center gap-4 ${
                  status.status === 'completed' && status.audioSegments.length > 0
                    ? 'cursor-pointer hover:bg-t-card transition-colors'
                    : ''
                }`}
                onClick={() => {
                  if (status.status === 'completed' && status.audioSegments.length > 0) {
                    setExpandedSections(prev => {
                      const next = new Set(prev);
                      if (next.has(section.id)) {
                        next.delete(section.id);
                        if (segmentAudioRef.current) {
                          segmentAudioRef.current.pause();
                          segmentAudioRef.current = null;
                        }
                        setPlayingSegmentId(null);
                      } else {
                        next.add(section.id);
                      }
                      return next;
                    });
                  }
                }}
              >
                {/* Status icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: status.status === 'completed'
                      ? `${theme.primary}30`
                      : status.status === 'processing'
                        ? `${theme.primary}20`
                        : status.status === 'error'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'var(--t-bg-card)'
                  }}
                >
                  {status.status === 'completed' ? (
                    <Check size={20} style={{ color: theme.primaryLight }} />
                  ) : status.status === 'processing' ? (
                    <Loader2 size={20} className="animate-spin" style={{ color: theme.primaryLight }} />
                  ) : status.status === 'error' ? (
                    <X size={20} className="text-red-400" />
                  ) : (
                    <span className="text-t-text3 text-sm font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Section info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-medium text-t-text1 truncate">{section.name}</h4>
                  <p className="text-sm text-t-text3">
                    {lineCount} {language === 'zh' ? '条对话' : 'lines'}
                    {status.status === 'completed' && status.audioSegments.length > 0 && (
                      <span className="ml-2 text-green-400">
                        · {status.audioSegments.length} {language === 'zh' ? '条音频' : 'audio clips'}
                      </span>
                    )}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {status.status === 'processing' && (
                    <span className="text-sm font-medium" style={{ color: theme.primaryLight }}>
                      {status.progress}%
                    </span>
                  )}

                  {(status.status === 'idle' || status.status === 'error') && (
                    <button
                      onClick={() => onGenerateSection(section)}
                      disabled={voiceGeneration.status === 'processing'}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      style={{ background: theme.primary }}
                    >
                      <Mic2 size={16} />
                      {status.status === 'error'
                        ? (language === 'zh' ? '重试' : 'Retry')
                        : (language === 'zh' ? '生成' : 'Generate')
                      }
                    </button>
                  )}

                  {status.status === 'completed' && (
                    <button
                      onClick={() => onClearAndRegenSection(section.id, section)}
                      disabled={voiceGeneration.status === 'processing'}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-t-text2 hover:text-t-text1 hover:bg-t-card-hover transition-all disabled:opacity-50"
                      title={language === 'zh' ? '重新生成' : 'Regenerate'}
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}

                  {status.status === 'completed' && status.audioSegments.length > 0 && (
                    <ChevronDown
                      size={18}
                      className={`text-t-text3 transition-transform duration-200 ${
                        expandedSections.has(section.id) ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Progress bar for processing sections */}
              {status.status === 'processing' && (
                <div className="px-5 pb-4">
                  <div className="h-1.5 rounded-full bg-t-card-hover overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${status.progress}%`, background: theme.primary }}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {status.status === 'error' && status.error && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-red-400">{status.error}</p>
                </div>
              )}

              {/* Expanded audio segment list */}
              {status.status === 'completed' && status.audioSegments.length > 0 && expandedSections.has(section.id) && (
                <div className="border-t border-t-border-lt">
                  <div className="divide-y divide-t-border-lt">
                    {status.audioSegments.map((audio, audioIndex) => {
                      const segId = `${section.id}-${audioIndex}`;
                      const isPlaying = playingSegmentId === segId;
                      const isListened = listenedSegments?.has(segId);
                      const isRegenerating = regeneratingLineId === segId;
                      return (
                        <div
                          key={audioIndex}
                          className="px-5 py-3 flex items-center gap-3 hover:bg-t-card transition-colors"
                        >
                          <button
                            disabled={isRegenerating}
                            onClick={() => {
                              if (isPlaying) {
                                if (segmentAudioRef.current) {
                                  segmentAudioRef.current.pause();
                                  segmentAudioRef.current = null;
                                }
                                setPlayingSegmentId(null);
                              } else {
                                if (segmentAudioRef.current) {
                                  segmentAudioRef.current.pause();
                                  segmentAudioRef.current = null;
                                }
                                const audioUrl = audio.audioUrl || api.audioDataToUrl(audio.audioData, audio.mimeType);
                                const audioEl = new Audio(audioUrl);
                                audioEl.onended = () => {
                                  setPlayingSegmentId(null);
                                  segmentAudioRef.current = null;
                                  onSegmentListened?.(segId);
                                };
                                audioEl.play().catch(() => {
                                  setPlayingSegmentId(null);
                                  segmentAudioRef.current = null;
                                });
                                segmentAudioRef.current = audioEl;
                                setPlayingSegmentId(segId);
                              }
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                            style={{ 
                              background: isPlaying ? theme.primary : `${theme.primary}30`,
                              opacity: isRegenerating ? 0.5 : 1,
                            }}
                          >
                            {isRegenerating ? (
                              <Loader2 size={14} className="animate-spin" style={{ color: theme.primaryLight }} />
                            ) : isPlaying ? (
                              <Pause size={14} className="text-t-text1" />
                            ) : (
                              <Play size={14} className="ml-0.5" style={{ color: theme.primaryLight }} />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-t-text2">{audio.speaker}</span>
                            <p className="text-xs text-t-text3 truncate mt-0.5">{audio.text}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isListened && (
                              <Check size={14} className="text-green-400" />
                            )}
                            {onRegenerateLine && (
                              <button
                                onClick={() => onRegenerateLine(section, section.id, audioIndex, audio)}
                                disabled={isRegenerating || voiceGeneration.status === 'processing'}
                                className="p-1.5 rounded-lg text-t-text3 hover:text-t-text1 hover:bg-t-card-hover transition-all disabled:opacity-40"
                                title={language === 'zh' ? '重新生成此行' : 'Regenerate this line'}
                              >
                                <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
                              </button>
                            )}
                            <span className="text-xs text-t-text3">#{audio.lineIndex + 1}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Generate all button */}
      {!allCompleted && (
        <button
          onClick={onGenerateAll}
          disabled={voiceGeneration.status === 'processing'}
          className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl text-base text-t-text1 font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ background: `${theme.primary}80` }}
        >
          {voiceGeneration.status === 'processing' ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <Mic2 size={22} />
          )}
          {language === 'zh' ? '一键生成全部' : 'Generate All Sections'}
        </button>
      )}
    </div>
  );
}
