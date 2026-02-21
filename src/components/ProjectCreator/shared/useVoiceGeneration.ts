/**
 * Shared hook for voice generation orchestration.
 * Used by ProjectCreator, EpisodeCreator, and EpisodeEditor.
 */
import { useCallback, useRef } from 'react';
import * as api from '../../../services/api';
import type { ScriptSection } from '../../../types';
import type { SectionVoiceAudio } from '../reducer';

interface VoiceCharacterLike {
  id: string;
  name?: string;
  refAudioDataUrl?: string;
  audioSampleUrl?: string;
}

export interface VoiceGenerationDeps {
  getScriptSections: () => ScriptSection[];
  getCharacters: () => Array<{ name: string; assignedVoiceId?: string }>;
  getAvailableVoices: () => VoiceCharacterLike[];
  getSystemVoices: () => api.Voice[];
  language: string;

  updateSectionVoiceStatus: (sectionId: string, status: 'idle' | 'processing' | 'completed' | 'error', progress: number, error?: string) => void;
  setCurrentSection: (sectionId: string | undefined) => void;
  addSectionVoiceAudio: (sectionId: string, audio: SectionVoiceAudio) => void;
  replaceSectionVoiceAudio: (sectionId: string, audioIndex: number, audio: SectionVoiceAudio) => void;
  updateProductionPhase: (phase: 'voice-generation', status: 'idle' | 'processing' | 'completed' | 'error', progress: number, detail?: string) => void;

  setRegeneratingLineId: (id: string | null) => void;
  setListenedSegments: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useVoiceGeneration(deps: VoiceGenerationDeps) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const resolveVoice = useCallback((speaker: string) => {
    const d = depsRef.current;
    const character = d.getCharacters().find(c => c.name === speaker);
    const assignedId = character?.assignedVoiceId;
    const customVoice = d.getAvailableVoices().find(v => v.id === assignedId);
    const systemVoice = d.getSystemVoices().find(v => v.id === assignedId);
    const refAudioDataUrl = customVoice?.refAudioDataUrl || customVoice?.audioSampleUrl;
    const voiceName = systemVoice ? systemVoice.id : undefined;
    return { assignedId, voiceName, refAudioDataUrl };
  }, []);

  const generateVoiceForSection = useCallback(async (section: ScriptSection): Promise<boolean> => {
    const d = depsRef.current;
    const sectionId = section.id;

    const segments: Array<{
      text: string; speaker: string; voiceName?: string;
      refAudioDataUrl?: string; lineIndex: number;
      pauseAfterMs?: number; voiceId?: string;
    }> = [];
    let lineIndex = 0;

    for (const item of section.timeline) {
      for (const line of item.lines) {
        if (line.line.trim()) {
          const { assignedId, voiceName, refAudioDataUrl } = resolveVoice(line.speaker);
          segments.push({
            text: line.line,
            speaker: line.speaker || 'Narrator',
            voiceName,
            refAudioDataUrl,
            lineIndex,
            pauseAfterMs: line.pauseAfterMs,
            voiceId: assignedId,
          });
        }
        lineIndex++;
      }
    }

    if (segments.length === 0) {
      d.updateSectionVoiceStatus(sectionId, 'completed', 100);
      return true;
    }

    d.updateSectionVoiceStatus(sectionId, 'processing', 0);
    d.setCurrentSection(sectionId);

    let success = false;
    try {
      const batchSegments: api.AudioSegment[] = segments.map(seg => ({
        text: seg.text,
        speaker: seg.speaker,
        voiceName: seg.voiceName,
        refAudioDataUrl: seg.refAudioDataUrl,
      }));

      const result = await api.generateAudioBatch(batchSegments);

      for (const generated of result.segments) {
        const segment = segments[generated.index];
        if (segment) {
          const audio: SectionVoiceAudio = {
            lineIndex: segment.lineIndex,
            speaker: segment.speaker,
            text: segment.text,
            audioData: generated.audioData,
            mimeType: generated.mimeType,
            audioUrl: generated.audioUrl,
            pauseAfterMs: segment.pauseAfterMs,
            voiceId: segment.voiceId,
          };
          d.addSectionVoiceAudio(sectionId, audio);
        }
      }

      if (result.totalGenerated === 0 || (result.segments && result.segments.length === 0)) {
        const errorMessages = result.errors?.map(e => e.error).filter(Boolean) || [];
        const errorMsg = errorMessages.length > 0
          ? errorMessages[0]
          : (d.language === 'zh' ? '所有音频生成失败' : 'All audio segments failed to generate');
        d.updateSectionVoiceStatus(sectionId, 'error', 0, errorMsg);
        success = false;
      } else {
        if (result.errors?.length) {
          console.warn(`${result.errors.length}/${segments.length} segments failed`);
        }
        d.updateSectionVoiceStatus(sectionId, 'completed', 100);
        success = true;
      }
    } catch (error) {
      console.error('Section voice generation failed:', error);
      d.updateSectionVoiceStatus(sectionId, 'error', 0,
        error instanceof Error ? error.message : 'Generation failed');
      success = false;
    }

    d.setCurrentSection(undefined);
    return success;
  }, [resolveVoice]);

  const performVoiceGeneration = useCallback(async (onlySectionIds?: Set<string>) => {
    const d = depsRef.current;
    const sections = d.getScriptSections();
    if (sections.length === 0) {
      d.updateProductionPhase('voice-generation', 'completed', 100);
      return;
    }

    d.updateProductionPhase('voice-generation', 'processing', 0);

    let failedSections = 0;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      if (onlySectionIds && !onlySectionIds.has(section.id)) {
        const overallProgress = Math.round(((i + 1) / sections.length) * 100);
        d.updateProductionPhase('voice-generation', 'processing', overallProgress, section.name);
        continue;
      }

      const success = await generateVoiceForSection(section);
      if (!success) failedSections++;

      const overallProgress = Math.round(((i + 1) / sections.length) * 100);
      d.updateProductionPhase('voice-generation', 'processing', overallProgress, section.name);
    }

    const totalGenerated = onlySectionIds ? onlySectionIds.size : sections.length;
    if (failedSections === totalGenerated) {
      d.updateProductionPhase('voice-generation', 'error', 0,
        d.language === 'zh' ? '所有段落生成失败' : 'All sections failed');
    } else if (failedSections > 0) {
      d.updateProductionPhase('voice-generation', 'completed', 100,
        d.language === 'zh' ? `${failedSections} 个段落失败` : `${failedSections} section(s) failed`);
    } else {
      d.updateProductionPhase('voice-generation', 'completed', 100);
    }
  }, [generateVoiceForSection]);

  const regenerateVoiceForLine = useCallback(async (
    _section: ScriptSection,
    sectionId: string,
    audioIndex: number,
    audio: SectionVoiceAudio
  ) => {
    const d = depsRef.current;
    const segId = `${sectionId}-${audioIndex}`;
    d.setRegeneratingLineId(segId);
    try {
      const { assignedId, voiceName, refAudioDataUrl } = resolveVoice(audio.speaker);

      const batchSegments: api.AudioSegment[] = [{
        text: audio.text,
        speaker: audio.speaker,
        voiceName,
        refAudioDataUrl,
      }];

      const result = await api.generateAudioBatch(batchSegments);

      if (result.segments && result.segments.length > 0) {
        const generated = result.segments[0];
        const newAudio: SectionVoiceAudio = {
          lineIndex: audio.lineIndex,
          speaker: audio.speaker,
          text: audio.text,
          audioData: generated.audioData,
          mimeType: generated.mimeType,
          audioUrl: generated.audioUrl,
          pauseAfterMs: audio.pauseAfterMs,
          voiceId: assignedId,
        };
        d.replaceSectionVoiceAudio(sectionId, audioIndex, newAudio);
        d.setListenedSegments(prev => {
          const next = new Set(prev);
          next.delete(segId);
          return next;
        });
      }
    } catch (error) {
      console.error('Line voice regeneration failed:', error);
    } finally {
      d.setRegeneratingLineId(null);
    }
  }, [resolveVoice]);

  return {
    generateVoiceForSection,
    performVoiceGeneration,
    regenerateVoiceForLine,
  };
}
