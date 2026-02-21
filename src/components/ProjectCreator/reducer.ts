// ProjectCreator state management with Immer
import { produce } from 'immer';
import { ScriptSection, EpisodeCharacter, isValidSpeaker } from '../../types';
import { ProjectTemplate, getTemplateById } from './templates';

// --- Draft Persistence ---

const DRAFT_STORAGE_KEY = 'gather_project_creator_draft';

/**
 * Serializable snapshot of the project creator state + local UI state.
 * File objects (uploadedFiles) cannot be serialized and are excluded.
 */
export interface DraftSnapshot {
  /** Current wizard step (1-8) */
  currentStep: number;
  /** Reducer state (minus non-serializable fields) */
  reducerState: Omit<ProjectCreatorState, 'contentInput'> & {
    contentInput: { textContent: string };
  };
  /** Local UI state that lives outside the reducer */
  localState: {
    customDescription: string;
    templateConfig: {
      voiceCount: 'single' | 'multiple';
      addBgm: boolean;
      addSoundEffects: boolean;
      hasVisualContent: boolean;
    };
    voicesConfirmed: boolean;
  };
  /** Timestamp for display / staleness checks */
  savedAt: number;
}

/**
 * Save the current project creator draft to localStorage.
 * Strips non-serializable data (File objects, very large audio blobs).
 */
export function saveDraft(
  currentStep: number,
  state: ProjectCreatorState,
  localState: DraftSnapshot['localState']
): void {
  try {
    // Build a serializable copy – drop uploadedFiles (File objects)
    const snapshot: DraftSnapshot = {
      currentStep,
      reducerState: {
        selectedTemplateId: state.selectedTemplateId,
        selectedTemplate: state.selectedTemplate,
        spec: state.spec,
        contentInput: {
          textContent: state.contentInput.textContent,
        },
        scriptSections: state.scriptSections,
        characters: state.characters,
        production: state.production,
      },
      localState,
      savedAt: Date.now(),
    };

    const json = JSON.stringify(snapshot);

    // Guard against localStorage quota (~5 MB). If the payload is too large
    // (e.g. lots of base64 audio), strip base64 audioData but keep audioUrl
    // so segments can be fetched from cloud storage on restore.
    if (json.length > 4 * 1024 * 1024) {
      // Strip heavy base64 audioData but keep audioUrl and metadata
      const lite: DraftSnapshot = {
        ...snapshot,
        reducerState: {
          ...snapshot.reducerState,
          production: {
            voiceGeneration: {
              ...state.production.voiceGeneration,
              sectionStatus: Object.fromEntries(
                Object.entries(state.production.voiceGeneration.sectionStatus).map(
                  ([id, s]) => [id, {
                    ...s,
                    audioSegments: s.audioSegments
                      .filter(seg => seg.audioUrl) // Only keep segments that have a cloud URL
                      .map(seg => ({ ...seg, audioData: '' })) // Strip base64 data
                  }]
                )
              ),
            },
            mediaProduction: {
              ...state.production.mediaProduction,
              bgmAudio: undefined,
              sfxAudios: undefined,
            },
            mixingEditing: {
              ...state.production.mixingEditing,
              output: undefined,
            },
          },
        },
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(lite));
    } else {
      localStorage.setItem(DRAFT_STORAGE_KEY, json);
    }
  } catch (err) {
    console.warn('[Draft] Failed to save draft:', err);
  }
}

/**
 * Load a previously saved draft from localStorage (if any).
 */
export function loadDraft(): DraftSnapshot | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const snapshot: DraftSnapshot = JSON.parse(raw);
    // Basic validity check
    if (!snapshot.currentStep || !snapshot.reducerState) return null;
    return snapshot;
  } catch {
    console.warn('[Draft] Failed to load draft');
    return null;
  }
}

/**
 * Remove the saved draft from localStorage.
 */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface SpecData {
  storyTitle: string;
  subtitle: string;
  targetAudience: string;
  formatAndDuration: string;
  toneAndExpression: string;
  addBgm: boolean;
  addSoundEffects: boolean;
  hasVisualContent: boolean;
  selectedCharacters: string[];
}

// Production phases for the new workflow
export type ProductionPhase = 
  | 'voice-generation'    // Chunk-by-Chunk Voice Generation
  | 'media-production'    // Music, Sound Effects, and Images
  | 'mixing-editing';     // Mixing and Timeline Editing

// Section-level voice generation status
export interface SectionVoiceAudio {
  lineIndex: number;
  speaker: string;
  text: string;
  audioData: string;
  mimeType: string;
  audioUrl?: string; // GCS URL for persistent storage (used when audioData is not available)
  pauseAfterMs?: number; // Custom pause after this segment
  voiceId?: string; // Tracks which voice was used, enabling smart re-generation diff
}

export interface SectionVoiceStatus {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  audioSegments: SectionVoiceAudio[];
  error?: string;
}

export interface MixedAudioOutput {
  audioData: string;
  mimeType: string;
  durationMs: number;
}

export interface ProductionProgress {
  voiceGeneration: {
    status: 'idle' | 'processing' | 'completed' | 'error';
    progress: number;
    currentSectionId?: string;
    currentChunk?: string;
    // Section-level tracking for progressive generation
    sectionStatus: Record<string, SectionVoiceStatus>;
  };
  mediaProduction: {
    status: 'idle' | 'processing' | 'completed' | 'error';
    progress: number;
    currentTask?: string;
    // Generated or preset BGM (if any)
    bgmAudio?: {
      audioData?: string;
      audioUrl?: string;
      mimeType: string;
    };
    // Generated SFX items (if any)
    sfxAudios?: Array<{
      name: string;
      prompt: string;
      audioData: string;
      mimeType: string;
    }>;
  };
  mixingEditing: {
    status: 'idle' | 'processing' | 'completed' | 'error';
    progress: number;
    // Final mixed audio output
    output?: MixedAudioOutput;
    error?: string;
  };
}

export interface ProjectCreatorState {
  // Template selection (new Step 1)
  selectedTemplateId: string | null;
  selectedTemplate: ProjectTemplate | null;
  
  // Spec configuration
  spec: SpecData;
  
  // Content input (moved after spec)
  contentInput: {
    textContent: string;
    uploadedFiles: File[];
  };
  
  // Script and characters
  scriptSections: ScriptSection[];
  characters: EpisodeCharacter[];
  
  // Production progress (3 phases)
  production: ProductionProgress;
}

const initialSpecData: SpecData = {
  storyTitle: '',
  subtitle: '',
  targetAudience: '',
  formatAndDuration: '',
  toneAndExpression: '',
  addBgm: true,
  addSoundEffects: true,
  hasVisualContent: false,
  selectedCharacters: []
};

const initialProductionProgress: ProductionProgress = {
  voiceGeneration: { status: 'idle', progress: 0, sectionStatus: {} },
  mediaProduction: { status: 'idle', progress: 0 },
  mixingEditing: { status: 'idle', progress: 0 },
};

export const initialState: ProjectCreatorState = {
  selectedTemplateId: null,
  selectedTemplate: null,
  spec: initialSpecData,
  contentInput: {
    textContent: '',
    uploadedFiles: [],
  },
  scriptSections: [],
  characters: [],
  production: initialProductionProgress,
};

type Action =
  // Template selection
  | { type: 'SELECT_TEMPLATE'; templateId: string }
  | { type: 'CLEAR_TEMPLATE' }
  // Spec management
  | { type: 'SET_SPEC'; payload: Partial<SpecData> }
  | { type: 'UPDATE_SPEC_FIELD'; field: keyof SpecData; value: SpecData[keyof SpecData] }
  | { type: 'TOGGLE_CHARACTER_SELECTION'; voiceId: string }
  | { type: 'RESET_SPEC' }
  // Content input
  | { type: 'SET_TEXT_CONTENT'; content: string }
  | { type: 'ADD_UPLOADED_FILES'; files: File[] }
  | { type: 'REMOVE_UPLOADED_FILE'; index: number }
  | { type: 'CLEAR_CONTENT_INPUT' }
  // Script and sections
  | { type: 'SET_SCRIPT_SECTIONS'; payload: ScriptSection[] }
  | { type: 'UPDATE_SECTION_COVER'; sectionId: string; coverImageDescription: string }
  | { type: 'UPDATE_TIMELINE_ITEM'; sectionId: string; itemId: string; field: string; value: string }
  | { type: 'UPDATE_SCRIPT_LINE'; sectionId: string; itemId: string; lineIndex: number; field: 'speaker' | 'line'; value: string }
  | { type: 'SET_LINE_PAUSE'; sectionId: string; itemId: string; lineIndex: number; pauseAfterMs: number | undefined }
  | { type: 'ADD_SCRIPT_LINE'; sectionId: string; itemId: string }
  | { type: 'SPLIT_SCRIPT_LINE'; sectionId: string; itemId: string; lineIndex: number; cursorPos: number }
  | { type: 'REMOVE_SCRIPT_LINE'; sectionId: string; itemId: string; lineIndex: number }
  | { type: 'ADD_TIMELINE_ITEM'; sectionId: string }
  | { type: 'REMOVE_TIMELINE_ITEM'; sectionId: string; itemId: string }
  // Characters
  | { type: 'SET_CHARACTERS'; payload: EpisodeCharacter[] }
  | { type: 'ASSIGN_VOICE_TO_CHARACTER'; characterIndex: number; voiceId: string }
  | { type: 'EXTRACT_CHARACTERS_FROM_SCRIPT' }
  | { type: 'UPDATE_CHARACTER_TAGS'; tags: Record<string, { tags: string[]; voiceDescription: string }> }
  // Production progress
  | { type: 'UPDATE_PRODUCTION_PHASE'; phase: ProductionPhase; status: 'idle' | 'processing' | 'completed' | 'error'; progress: number; detail?: string }
  | { type: 'RESET_PRODUCTION' }
  // Mixing output
  | { type: 'SET_MIXED_OUTPUT'; output: MixedAudioOutput }
  | { type: 'SET_MIXING_ERROR'; error: string }
  | { type: 'SET_BGM_AUDIO'; audio: { audioData?: string; audioUrl?: string; mimeType: string } }
  | { type: 'ADD_SFX_AUDIO'; sfx: { name: string; prompt: string; audioData: string; mimeType: string } }
  | { type: 'UPDATE_SFX_AUDIO'; index: number; sfx: { name: string; prompt: string; audioData: string; mimeType: string } }
  // Section-level voice generation
  | { type: 'UPDATE_SECTION_VOICE_STATUS'; sectionId: string; status: SectionVoiceStatus['status']; progress?: number; error?: string }
  | { type: 'ADD_SECTION_VOICE_AUDIO'; sectionId: string; audio: SectionVoiceAudio }
  | { type: 'CLEAR_SECTION_VOICE'; sectionId: string }
  | { type: 'REPLACE_SECTION_VOICE_AUDIO'; sectionId: string; audioIndex: number; audio: SectionVoiceAudio }
  | { type: 'SET_CURRENT_SECTION'; sectionId: string | undefined }
  // Draft restoration
  | { type: 'RESTORE_DRAFT'; snapshot: DraftSnapshot }
  // Global
  | { type: 'RESET_ALL' };

function findTimelineItem(sections: ScriptSection[], sectionId: string, itemId: string) {
  const section = sections.find(s => s.id === sectionId);
  return section?.timeline.find(t => t.id === itemId) ?? null;
}

export const projectCreatorReducer = produce((state: ProjectCreatorState, action: Action) => {
  switch (action.type) {
    // Template selection
    case 'SELECT_TEMPLATE': {
      const template = getTemplateById(action.templateId);
      if (template) {
        state.selectedTemplateId = action.templateId;
        state.selectedTemplate = template;
        // Pre-fill spec from template defaults
        state.spec = {
          ...initialSpecData,
          targetAudience: template.defaultSpec.targetAudience,
          formatAndDuration: template.defaultSpec.formatAndDuration,
          toneAndExpression: template.defaultSpec.toneAndExpression,
          addBgm: template.suggestedDefaults.addBgm,
          addSoundEffects: template.suggestedDefaults.addSoundEffects,
          hasVisualContent: template.suggestedDefaults.hasVisualContent,
        };
      }
      break;
    }

    case 'CLEAR_TEMPLATE':
      state.selectedTemplateId = null;
      state.selectedTemplate = null;
      state.spec = initialSpecData;
      break;

    // Spec management
    case 'SET_SPEC':
      Object.assign(state.spec, action.payload);
      break;

    case 'UPDATE_SPEC_FIELD':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state.spec as any)[action.field] = action.value;
      break;

    case 'TOGGLE_CHARACTER_SELECTION': {
      const index = state.spec.selectedCharacters.indexOf(action.voiceId);
      if (index >= 0) {
        state.spec.selectedCharacters.splice(index, 1);
      } else {
        state.spec.selectedCharacters.push(action.voiceId);
      }
      break;
    }

    case 'RESET_SPEC':
      state.spec = initialSpecData;
      break;

    // Content input
    case 'SET_TEXT_CONTENT':
      state.contentInput.textContent = action.content;
      break;

    case 'ADD_UPLOADED_FILES':
      state.contentInput.uploadedFiles.push(...action.files);
      break;

    case 'REMOVE_UPLOADED_FILE':
      state.contentInput.uploadedFiles.splice(action.index, 1);
      break;

    case 'CLEAR_CONTENT_INPUT':
      state.contentInput = { textContent: '', uploadedFiles: [] };
      break;

    case 'SET_SCRIPT_SECTIONS':
      state.scriptSections = action.payload;
      break;

    case 'UPDATE_SECTION_COVER': {
      const section = state.scriptSections.find(s => s.id === action.sectionId);
      if (section) {
        section.coverImageDescription = action.coverImageDescription;
      }
      break;
    }

    case 'UPDATE_TIMELINE_ITEM': {
      const item = findTimelineItem(state.scriptSections, action.sectionId, action.itemId);
      if (item) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item as any)[action.field] = action.value;
      }
      break;
    }

    case 'UPDATE_SCRIPT_LINE': {
      const item = findTimelineItem(state.scriptSections, action.sectionId, action.itemId);
      if (item?.lines?.[action.lineIndex]) {
        item.lines[action.lineIndex][action.field] = action.value;
      }
      break;
    }

    case 'SET_LINE_PAUSE': {
      const item = findTimelineItem(state.scriptSections, action.sectionId, action.itemId);
      if (item?.lines?.[action.lineIndex]) {
        item.lines[action.lineIndex].pauseAfterMs = action.pauseAfterMs;
      }
      break;
    }

    case 'ADD_SCRIPT_LINE': {
      const item = findTimelineItem(state.scriptSections, action.sectionId, action.itemId);
      if (item) {
        if (!item.lines) item.lines = [];
        // Default speaker to the last line's speaker
        const lastSpeaker = item.lines.length > 0 ? (item.lines[item.lines.length - 1].speaker || '') : '';
        item.lines.push({ speaker: lastSpeaker, line: '' });
      }
      break;
    }

    case 'SPLIT_SCRIPT_LINE': {
      const item = findTimelineItem(state.scriptSections, action.sectionId, action.itemId);
      if (item?.lines?.[action.lineIndex]) {
        const line = item.lines[action.lineIndex];
        const textBefore = line.line.slice(0, action.cursorPos);
        const textAfter = line.line.slice(action.cursorPos);
        line.line = textBefore;
        item.lines.splice(action.lineIndex + 1, 0, { speaker: line.speaker, line: textAfter });
      }
      break;
    }

    case 'REMOVE_SCRIPT_LINE': {
      const item = findTimelineItem(state.scriptSections, action.sectionId, action.itemId);
      if (item?.lines) {
        item.lines.splice(action.lineIndex, 1);
      }
      break;
    }

    case 'ADD_TIMELINE_ITEM': {
      const section = state.scriptSections.find(s => s.id === action.sectionId);
      if (section) {
        // Default speaker to the last speaker used in this section
        let lastSpeaker = '';
        for (const ti of section.timeline) {
          if (ti.lines && ti.lines.length > 0) {
            const last = ti.lines[ti.lines.length - 1].speaker;
            if (last) lastSpeaker = last;
          }
        }
        section.timeline.push({
          id: crypto.randomUUID(),
          timeStart: '',
          timeEnd: '',
          lines: [{ speaker: lastSpeaker, line: '' }],
          soundMusic: ''
        });
      }
      break;
    }

    case 'REMOVE_TIMELINE_ITEM': {
      const section = state.scriptSections.find(s => s.id === action.sectionId);
      if (section) {
        const index = section.timeline.findIndex(t => t.id === action.itemId);
        if (index >= 0) {
          section.timeline.splice(index, 1);
        }
      }
      break;
    }

    case 'SET_CHARACTERS':
      state.characters = action.payload;
      break;

    case 'ASSIGN_VOICE_TO_CHARACTER':
      if (state.characters[action.characterIndex]) {
        state.characters[action.characterIndex].assignedVoiceId = action.voiceId;
      }
      break;

    case 'EXTRACT_CHARACTERS_FROM_SCRIPT': {
      const speakers = new Set<string>();
      for (const section of state.scriptSections) {
        for (const item of section.timeline) {
          if (item.lines) {
            for (const line of item.lines) {
              const speaker = line.speaker?.trim();
              if (isValidSpeaker(speaker)) {
                speakers.add(speaker!);
              }
            }
          }
        }
      }
      // Build a lookup of existing character data (voice assignments, tags, etc.)
      // so we can preserve them when re-extracting after script edits.
      const existingByName = new Map<string, EpisodeCharacter>();
      for (const char of state.characters) {
        existingByName.set(char.name, char);
      }
      state.characters = Array.from(speakers).map(name => {
        const existing = existingByName.get(name);
        return {
          name,
          description: existing?.description ?? '',
          assignedVoiceId: existing?.assignedVoiceId,
          tags: existing?.tags,
        };
      });
      break;
    }

    case 'UPDATE_CHARACTER_TAGS': {
      const { tags } = action;
      for (const char of state.characters) {
        const analysis = tags[char.name];
        if (analysis) {
          if (analysis.tags?.length > 0) {
            char.tags = analysis.tags;
          }
          if (analysis.voiceDescription) {
            char.voiceDescription = analysis.voiceDescription;
          }
        }
      }
      break;
    }

    // Production progress
    case 'UPDATE_PRODUCTION_PHASE': {
      const { phase, status, progress, detail } = action;
      if (phase === 'voice-generation') {
        state.production.voiceGeneration.status = status;
        state.production.voiceGeneration.progress = progress;
        state.production.voiceGeneration.currentChunk = detail;
      } else if (phase === 'media-production') {
        state.production.mediaProduction.status = status;
        state.production.mediaProduction.progress = progress;
        state.production.mediaProduction.currentTask = detail;
      } else if (phase === 'mixing-editing') {
        state.production.mixingEditing.status = status;
        state.production.mixingEditing.progress = progress;
      }
      break;
    }

    case 'RESET_PRODUCTION':
      state.production = initialProductionProgress;
      break;

    case 'SET_MIXED_OUTPUT':
      state.production.mixingEditing.output = action.output;
      state.production.mixingEditing.error = undefined;
      break;

    case 'SET_MIXING_ERROR':
      state.production.mixingEditing.error = action.error;
      break;

    case 'SET_BGM_AUDIO':
      state.production.mediaProduction.bgmAudio = action.audio;
      break;

    case 'ADD_SFX_AUDIO':
      if (!state.production.mediaProduction.sfxAudios) {
        state.production.mediaProduction.sfxAudios = [];
      }
      state.production.mediaProduction.sfxAudios.push(action.sfx);
      break;

    case 'UPDATE_SFX_AUDIO':
      if (state.production.mediaProduction.sfxAudios && state.production.mediaProduction.sfxAudios[action.index]) {
        state.production.mediaProduction.sfxAudios[action.index] = action.sfx;
      }
      break;

    // Section-level voice generation
    case 'UPDATE_SECTION_VOICE_STATUS': {
      const { sectionId, status, progress, error } = action;
      if (!state.production.voiceGeneration.sectionStatus[sectionId]) {
        state.production.voiceGeneration.sectionStatus[sectionId] = {
          status: 'idle',
          progress: 0,
          audioSegments: []
        };
      }
      state.production.voiceGeneration.sectionStatus[sectionId].status = status;
      if (progress !== undefined) {
        state.production.voiceGeneration.sectionStatus[sectionId].progress = progress;
      }
      if (error !== undefined) {
        state.production.voiceGeneration.sectionStatus[sectionId].error = error;
      }
      break;
    }

    case 'ADD_SECTION_VOICE_AUDIO': {
      const { sectionId, audio } = action;
      if (!state.production.voiceGeneration.sectionStatus[sectionId]) {
        state.production.voiceGeneration.sectionStatus[sectionId] = {
          status: 'processing',
          progress: 0,
          audioSegments: []
        };
      }
      state.production.voiceGeneration.sectionStatus[sectionId].audioSegments.push(audio);
      break;
    }

    case 'CLEAR_SECTION_VOICE': {
      const { sectionId } = action;
      if (state.production.voiceGeneration.sectionStatus[sectionId]) {
        state.production.voiceGeneration.sectionStatus[sectionId] = {
          status: 'idle',
          progress: 0,
          audioSegments: []
        };
      }
      break;
    }

    case 'REPLACE_SECTION_VOICE_AUDIO': {
      const { sectionId, audioIndex, audio } = action;
      const sectionSt = state.production.voiceGeneration.sectionStatus[sectionId];
      if (sectionSt && sectionSt.audioSegments[audioIndex]) {
        sectionSt.audioSegments[audioIndex] = audio;
      }
      break;
    }

    case 'SET_CURRENT_SECTION':
      state.production.voiceGeneration.currentSectionId = action.sectionId;
      break;

    case 'RESTORE_DRAFT': {
      const rs = action.snapshot.reducerState;
      state.selectedTemplateId = rs.selectedTemplateId;
      state.selectedTemplate = rs.selectedTemplate;
      state.spec = rs.spec;
      state.contentInput = {
        textContent: rs.contentInput.textContent,
        uploadedFiles: [], // Files are not serializable – user will re-upload if needed
      };
      state.scriptSections = rs.scriptSections;
      state.characters = rs.characters;
      state.production = rs.production;
      break;
    }

    case 'RESET_ALL':
      return initialState;
  }
}, initialState);

// Action creators
export const actions = {
  // Template selection
  selectTemplate: (templateId: string): Action => 
    ({ type: 'SELECT_TEMPLATE', templateId }),
  clearTemplate: (): Action => 
    ({ type: 'CLEAR_TEMPLATE' }),
  
  // Spec management
  setSpec: (payload: Partial<SpecData>): Action => ({ type: 'SET_SPEC', payload }),
  updateSpecField: <K extends keyof SpecData>(field: K, value: SpecData[K]): Action => 
    ({ type: 'UPDATE_SPEC_FIELD', field, value }),
  toggleCharacterSelection: (voiceId: string): Action => 
    ({ type: 'TOGGLE_CHARACTER_SELECTION', voiceId }),
  
  // Content input
  setTextContent: (content: string): Action => 
    ({ type: 'SET_TEXT_CONTENT', content }),
  addUploadedFiles: (files: File[]): Action => 
    ({ type: 'ADD_UPLOADED_FILES', files }),
  removeUploadedFile: (index: number): Action => 
    ({ type: 'REMOVE_UPLOADED_FILE', index }),
  clearContentInput: (): Action => 
    ({ type: 'CLEAR_CONTENT_INPUT' }),
  
  // Script sections
  setScriptSections: (payload: ScriptSection[]): Action => 
    ({ type: 'SET_SCRIPT_SECTIONS', payload }),
  updateSectionCover: (sectionId: string, coverImageDescription: string): Action => 
    ({ type: 'UPDATE_SECTION_COVER', sectionId, coverImageDescription }),
  updateTimelineItem: (sectionId: string, itemId: string, field: string, value: string): Action => 
    ({ type: 'UPDATE_TIMELINE_ITEM', sectionId, itemId, field, value }),
  updateScriptLine: (sectionId: string, itemId: string, lineIndex: number, field: 'speaker' | 'line', value: string): Action => 
    ({ type: 'UPDATE_SCRIPT_LINE', sectionId, itemId, lineIndex, field, value }),
  addScriptLine: (sectionId: string, itemId: string): Action => 
    ({ type: 'ADD_SCRIPT_LINE', sectionId, itemId }),
  splitScriptLine: (sectionId: string, itemId: string, lineIndex: number, cursorPos: number): Action =>
    ({ type: 'SPLIT_SCRIPT_LINE', sectionId, itemId, lineIndex, cursorPos }),
  removeScriptLine: (sectionId: string, itemId: string, lineIndex: number): Action => 
    ({ type: 'REMOVE_SCRIPT_LINE', sectionId, itemId, lineIndex }),
  setLinePause: (sectionId: string, itemId: string, lineIndex: number, pauseAfterMs: number | undefined): Action =>
    ({ type: 'SET_LINE_PAUSE', sectionId, itemId, lineIndex, pauseAfterMs }),
  addTimelineItem: (sectionId: string): Action => 
    ({ type: 'ADD_TIMELINE_ITEM', sectionId }),
  removeTimelineItem: (sectionId: string, itemId: string): Action => 
    ({ type: 'REMOVE_TIMELINE_ITEM', sectionId, itemId }),
  
  // Characters
  setCharacters: (payload: EpisodeCharacter[]): Action => 
    ({ type: 'SET_CHARACTERS', payload }),
  assignVoiceToCharacter: (characterIndex: number, voiceId: string): Action => 
    ({ type: 'ASSIGN_VOICE_TO_CHARACTER', characterIndex, voiceId }),
  extractCharactersFromScript: (): Action => 
    ({ type: 'EXTRACT_CHARACTERS_FROM_SCRIPT' }),
  updateCharacterTags: (tags: Record<string, { tags: string[]; voiceDescription: string }>): Action =>
    ({ type: 'UPDATE_CHARACTER_TAGS', tags }),
  
  // Production progress
  updateProductionPhase: (
    phase: ProductionPhase, 
    status: 'idle' | 'processing' | 'completed' | 'error', 
    progress: number, 
    detail?: string
  ): Action => ({ type: 'UPDATE_PRODUCTION_PHASE', phase, status, progress, detail }),
  resetProduction: (): Action => 
    ({ type: 'RESET_PRODUCTION' }),
  setMixedOutput: (output: MixedAudioOutput): Action =>
    ({ type: 'SET_MIXED_OUTPUT', output }),
  setMixingError: (error: string): Action =>
    ({ type: 'SET_MIXING_ERROR', error }),
  setBgmAudio: (audio: { audioData?: string; audioUrl?: string; mimeType: string }): Action =>
    ({ type: 'SET_BGM_AUDIO', audio }),
  addSfxAudio: (sfx: { name: string; prompt: string; audioData: string; mimeType: string }): Action =>
    ({ type: 'ADD_SFX_AUDIO', sfx }),
  updateSfxAudio: (index: number, sfx: { name: string; prompt: string; audioData: string; mimeType: string }): Action =>
    ({ type: 'UPDATE_SFX_AUDIO', index, sfx }),
  
  // Section-level voice generation
  updateSectionVoiceStatus: (
    sectionId: string,
    status: SectionVoiceStatus['status'],
    progress?: number,
    error?: string
  ): Action => ({ type: 'UPDATE_SECTION_VOICE_STATUS', sectionId, status, progress, error }),
  addSectionVoiceAudio: (sectionId: string, audio: SectionVoiceAudio): Action =>
    ({ type: 'ADD_SECTION_VOICE_AUDIO', sectionId, audio }),
  clearSectionVoice: (sectionId: string): Action =>
    ({ type: 'CLEAR_SECTION_VOICE', sectionId }),
  replaceSectionVoiceAudio: (sectionId: string, audioIndex: number, audio: SectionVoiceAudio): Action =>
    ({ type: 'REPLACE_SECTION_VOICE_AUDIO', sectionId, audioIndex, audio }),
  setCurrentSection: (sectionId: string | undefined): Action =>
    ({ type: 'SET_CURRENT_SECTION', sectionId }),
  
  // Draft restoration
  restoreDraft: (snapshot: DraftSnapshot): Action =>
    ({ type: 'RESTORE_DRAFT', snapshot }),

  // Global
  resetAll: (): Action => 
    ({ type: 'RESET_ALL' }),
};
