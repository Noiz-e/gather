/**
 * Shared hook for media production orchestration (BGM, SFX, Images).
 * Used by ProjectCreator, EpisodeCreator, and EpisodeEditor.
 */
import { useCallback, useRef } from 'react';
import * as api from '../../../services/api';
import type { ScriptSection } from '../../../types';
import type { MediaItem } from '../../../types';
import { loadMediaItems, addMediaItem } from '../../../utils/mediaStorage';
import type { MediaPickerResult } from '../../MediaPickerModal';

export interface MediaProductionDeps {
  getScriptSections: () => ScriptSection[];
  getSpec: () => { addBgm?: boolean; addSoundEffects?: boolean; hasVisualContent?: boolean; toneAndExpression?: string };
  getBgmSelection: () => MediaPickerResult | null;
  getSfxSelections: () => Record<string, MediaPickerResult>;
  getProduction: () => {
    mediaProduction: {
      bgmAudio?: { audioData?: string; audioUrl?: string; mimeType: string };
      sfxAudios?: Array<{ name: string; prompt: string; audioData: string; mimeType: string }>;
    };
  };
  language: string;
  projectId?: string;
  title: string;

  setBgmAudio: (audio: { audioData?: string; audioUrl?: string; mimeType: string }) => void;
  addSfxAudio: (sfx: { name: string; prompt: string; audioData: string; mimeType: string }) => void;
  updateSfxAudio: (index: number, sfx: { name: string; prompt: string; audioData: string; mimeType: string }) => void;
  updateProductionPhase: (
    phase: 'media-production',
    status: 'idle' | 'processing' | 'completed' | 'error',
    progress: number,
    detail?: string
  ) => void;
  setMediaSelectionsConfirmed: (v: boolean) => void;
  setRegeneratingId: (id: string | null) => void;
}

export function useMediaProduction(deps: MediaProductionDeps) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const performMediaProduction = useCallback(async () => {
    const d = depsRef.current;
    d.setMediaSelectionsConfirmed(true);

    const spec = d.getSpec();
    const bgmSelection = d.getBgmSelection();
    const sfxSelections = d.getSfxSelections();
    const scriptSections = d.getScriptSections();

    const tasks: { type: string; label: string }[] = [];

    // Apply preset/library BGM immediately
    if (spec.addBgm && bgmSelection) {
      if (bgmSelection.source === 'preset' && bgmSelection.audioUrl) {
        d.setBgmAudio({ audioUrl: bgmSelection.audioUrl, mimeType: 'audio/wav' });
      } else if (bgmSelection.source === 'library' && bgmSelection.mediaItem) {
        const mimeMatch = bgmSelection.mediaItem.dataUrl?.match(/^data:([^;]+);base64,(.+)$/);
        if (mimeMatch) {
          d.setBgmAudio({ audioData: mimeMatch[2], mimeType: mimeMatch[1] });
        } else {
          d.setBgmAudio({ audioUrl: bgmSelection.mediaItem.dataUrl || '', mimeType: bgmSelection.mediaItem.mimeType || 'audio/wav' });
        }
      } else if (bgmSelection.source === 'generate') {
        tasks.push({ type: 'bgm', label: d.language === 'zh' ? '生成背景音乐' : 'Generating BGM' });
      }
    }

    // Apply library SFX immediately, queue generate tasks
    const needsSfxGeneration = spec.addSoundEffects && Object.values(sfxSelections).some(s => s.source === 'generate');
    if (spec.addSoundEffects) {
      for (const section of scriptSections) {
        for (const item of section.timeline) {
          if (item.soundMusic?.trim()) {
            const sel = sfxSelections[`${section.id}-${item.id}`];
            if (sel?.source === 'library' && sel.mediaItem) {
              const mimeMatch = sel.mediaItem.dataUrl?.match(/^data:([^;]+);base64,(.+)$/);
              if (mimeMatch) {
                d.addSfxAudio({ name: `${section.name} - SFX`, prompt: item.soundMusic, audioData: mimeMatch[2], mimeType: mimeMatch[1] });
              }
            }
          }
        }
      }
    }
    if (needsSfxGeneration) tasks.push({ type: 'sfx', label: d.language === 'zh' ? '生成音效' : 'Generating SFX' });
    if (spec.hasVisualContent) tasks.push({ type: 'images', label: d.language === 'zh' ? '生成图片' : 'Generating Images' });

    if (tasks.length === 0) {
      d.updateProductionPhase('media-production', 'completed', 100);
      return;
    }

    let mediaItems = loadMediaItems();

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      d.updateProductionPhase('media-production', 'processing', Math.round((i / tasks.length) * 100), task.label);

      try {
        if (task.type === 'bgm') {
          const bgmPrompt = bgmSelection?.prompt || spec.toneAndExpression || 'background music';
          const bgmResult = await api.generateBGM(bgmPrompt, undefined, 180);
          d.setBgmAudio({ audioData: bgmResult.audioData, mimeType: bgmResult.mimeType });
          const bgmItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
            name: `${d.title} - BGM`,
            description: bgmPrompt,
            type: 'bgm',
            mimeType: bgmResult.mimeType,
            dataUrl: `data:${bgmResult.mimeType};base64,${bgmResult.audioData}`,
            duration: 180,
            tags: ['generated', 'bgm'],
            projectIds: d.projectId ? [d.projectId] : [],
            source: 'generated',
            prompt: bgmPrompt,
          };
          mediaItems = addMediaItem(mediaItems, bgmItem);
        } else if (task.type === 'sfx') {
          for (const section of scriptSections) {
            for (const item of section.timeline) {
              if (item.soundMusic?.trim()) {
                const sel = sfxSelections[`${section.id}-${item.id}`];
                if (sel?.source === 'generate') {
                  const sfxResult = await api.generateSoundEffect(sel.prompt || item.soundMusic, 5);
                  d.addSfxAudio({ name: `${section.name} - SFX`, prompt: item.soundMusic, audioData: sfxResult.audioData, mimeType: sfxResult.mimeType });
                  const sfxItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
                    name: `${section.name} - SFX`,
                    description: item.soundMusic,
                    type: 'sfx',
                    mimeType: sfxResult.mimeType,
                    dataUrl: `data:${sfxResult.mimeType};base64,${sfxResult.audioData}`,
                    duration: 5,
                    tags: ['generated', 'sfx'],
                    projectIds: d.projectId ? [d.projectId] : [],
                    source: 'generated',
                    prompt: item.soundMusic,
                  };
                  mediaItems = addMediaItem(mediaItems, sfxItem);
                }
              }
            }
          }
        } else if (task.type === 'images') {
          for (const section of scriptSections) {
            if (section.coverImageDescription?.trim()) {
              const imageResult = await api.generateCoverImage(section.coverImageDescription);
              const imageItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
                name: `${section.name} - Cover`,
                description: section.coverImageDescription,
                type: 'image',
                mimeType: imageResult.mimeType || 'image/png',
                dataUrl: imageResult.imageData,
                tags: ['generated', 'cover'],
                projectIds: d.projectId ? [d.projectId] : [],
                source: 'generated',
                prompt: section.coverImageDescription,
              };
              mediaItems = addMediaItem(mediaItems, imageItem);
            }
          }
        }
      } catch (error) {
        console.error(`${task.type} generation failed:`, error);
      }

      d.updateProductionPhase('media-production', 'processing', Math.round(((i + 1) / tasks.length) * 100), task.label);
    }

    d.updateProductionPhase('media-production', 'completed', 100);
  }, []);

  const handleRegenMedia = useCallback(async (type: 'bgm' | 'sfx', index?: number) => {
    const d = depsRef.current;
    const regenId = type === 'bgm' ? 'bgm' : `sfx-${index}`;
    d.setRegeneratingId(regenId);
    try {
      if (type === 'bgm') {
        const spec = d.getSpec();
        const bgmResult = await api.generateBGM(spec.toneAndExpression || '', 'peaceful', 30);
        d.setBgmAudio({ audioData: bgmResult.audioData, mimeType: bgmResult.mimeType });
        let mediaItems = loadMediaItems();
        const bgmItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
          name: `${d.title} - BGM`,
          description: spec.toneAndExpression || 'Background music',
          type: 'bgm',
          mimeType: bgmResult.mimeType,
          dataUrl: `data:${bgmResult.mimeType};base64,${bgmResult.audioData}`,
          duration: 30,
          tags: ['generated', 'bgm'],
          projectIds: d.projectId ? [d.projectId] : [],
          source: 'generated',
          prompt: spec.toneAndExpression || '',
        };
        mediaItems = addMediaItem(mediaItems, bgmItem);
      } else if (type === 'sfx' && index !== undefined) {
        const production = d.getProduction();
        const sfxItem = production.mediaProduction.sfxAudios?.[index];
        if (sfxItem) {
          const sfxResult = await api.generateSoundEffect(sfxItem.prompt, 5);
          d.updateSfxAudio(index, { name: sfxItem.name, prompt: sfxItem.prompt, audioData: sfxResult.audioData, mimeType: sfxResult.mimeType });
        }
      }
    } catch (error) {
      console.error(`Regen ${type} failed:`, error);
    } finally {
      d.setRegeneratingId(null);
    }
  }, []);

  return {
    performMediaProduction,
    handleRegenMedia,
  };
}
