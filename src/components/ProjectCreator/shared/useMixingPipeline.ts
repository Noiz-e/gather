/**
 * Shared hook for audio mixing orchestration.
 * Used by ProjectCreator, EpisodeCreator, and EpisodeEditor.
 */
import { useCallback, useRef } from 'react';
import * as api from '../../../services/api';
import type { ScriptSection } from '../../../types';
import type { MixedAudioOutput, ProductionProgress } from '../reducer';
import { getAudioMixConfig } from '../templates';

export interface MixingPipelineDeps {
  getScriptSections: () => ScriptSection[];
  getProduction: () => ProductionProgress;
  getSpec: () => { addBgm?: boolean };
  templateId?: string | null;
  language: string;

  updateProductionPhase: (
    phase: 'mixing-editing',
    status: 'idle' | 'processing' | 'completed' | 'error',
    progress: number,
    detail?: string
  ) => void;
  setMixedOutput: (output: MixedAudioOutput) => void;
  setMixingError: (error: string) => void;
}

export function useMixingPipeline(deps: MixingPipelineDeps) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const performMixing = useCallback(async () => {
    const d = depsRef.current;
    try {
      d.updateProductionPhase('mixing-editing', 'processing', 10);

      const production = d.getProduction();
      const scriptSections = d.getScriptSections();
      const spec = d.getSpec();
      const mixConfig = getAudioMixConfig(d.templateId ?? null);

      const voiceTracks: api.AudioTrack[] = [];
      for (const section of scriptSections) {
        const sectionStatus = production.voiceGeneration.sectionStatus[section.id];
        if (sectionStatus?.audioSegments) {
          let isFirstInSection = true;
          for (const segment of sectionStatus.audioSegments) {
            if (segment.audioData || segment.audioUrl) {
              voiceTracks.push({
                audioData: segment.audioData,
                audioUrl: segment.audioUrl,
                mimeType: segment.mimeType || 'audio/wav',
                speaker: segment.speaker,
                sectionStart: isFirstInSection,
                pauseAfterMs: segment.pauseAfterMs,
                volume: 1,
              });
              isFirstInSection = false;
            }
          }
        }
      }

      if (voiceTracks.length === 0) {
        d.setMixingError(d.language === 'zh' ? '没有可用的语音数据' : 'No voice data available');
        d.updateProductionPhase('mixing-editing', 'completed', 100);
        return;
      }

      d.updateProductionPhase('mixing-editing', 'processing', 30);

      const mixRequest: api.MixRequest = {
        voiceTracks,
        config: { ...mixConfig },
      };

      if (spec.addBgm && production.mediaProduction.bgmAudio) {
        mixRequest.bgmTrack = {
          audioData: production.mediaProduction.bgmAudio.audioData,
          audioUrl: production.mediaProduction.bgmAudio.audioUrl,
          mimeType: production.mediaProduction.bgmAudio.mimeType,
        };
      }

      d.updateProductionPhase('mixing-editing', 'processing', 50);

      const result = await api.mixAudioTracks(mixRequest);

      d.updateProductionPhase('mixing-editing', 'processing', 90);

      d.setMixedOutput({
        audioData: result.audioData,
        mimeType: result.mimeType,
        durationMs: result.durationMs,
      });

      d.updateProductionPhase('mixing-editing', 'completed', 100);
    } catch (error) {
      console.error('Mixing failed:', error);
      const d = depsRef.current;
      d.setMixingError(error instanceof Error ? error.message : 'Unknown error');
      d.updateProductionPhase('mixing-editing', 'completed', 100);
    }
  }, []);

  return { performMixing };
}
