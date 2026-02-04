// ProjectCreator state management with Immer
import { produce } from 'immer';
import { ScriptSection, EpisodeCharacter } from '../../types';
import { ProjectTemplate, getTemplateById } from './templates';

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
}

export interface SectionVoiceStatus {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  audioSegments: SectionVoiceAudio[];
  error?: string;
}

export interface ProductionProgress {
  voiceGeneration: {
    status: 'idle' | 'processing' | 'completed';
    progress: number;
    currentSectionId?: string;
    currentChunk?: string;
    // Section-level tracking for progressive generation
    sectionStatus: Record<string, SectionVoiceStatus>;
  };
  mediaProduction: {
    status: 'idle' | 'processing' | 'completed';
    progress: number;
    currentTask?: string;
  };
  mixingEditing: {
    status: 'idle' | 'processing' | 'completed';
    progress: number;
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
  | { type: 'ADD_SCRIPT_LINE'; sectionId: string; itemId: string }
  | { type: 'REMOVE_SCRIPT_LINE'; sectionId: string; itemId: string; lineIndex: number }
  | { type: 'ADD_TIMELINE_ITEM'; sectionId: string }
  | { type: 'REMOVE_TIMELINE_ITEM'; sectionId: string; itemId: string }
  // Characters
  | { type: 'SET_CHARACTERS'; payload: EpisodeCharacter[] }
  | { type: 'ASSIGN_VOICE_TO_CHARACTER'; characterIndex: number; voiceId: string }
  | { type: 'EXTRACT_CHARACTERS_FROM_SCRIPT' }
  // Production progress
  | { type: 'UPDATE_PRODUCTION_PHASE'; phase: ProductionPhase; status: 'idle' | 'processing' | 'completed'; progress: number; detail?: string }
  | { type: 'RESET_PRODUCTION' }
  // Section-level voice generation
  | { type: 'UPDATE_SECTION_VOICE_STATUS'; sectionId: string; status: SectionVoiceStatus['status']; progress?: number; error?: string }
  | { type: 'ADD_SECTION_VOICE_AUDIO'; sectionId: string; audio: SectionVoiceAudio }
  | { type: 'CLEAR_SECTION_VOICE'; sectionId: string }
  | { type: 'SET_CURRENT_SECTION'; sectionId: string | undefined }
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

    case 'ADD_SCRIPT_LINE': {
      const item = findTimelineItem(state.scriptSections, action.sectionId, action.itemId);
      if (item) {
        if (!item.lines) item.lines = [];
        item.lines.push({ speaker: '', line: '' });
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
        section.timeline.push({
          id: `item-${Date.now()}`,
          timeStart: '',
          timeEnd: '',
          lines: [{ speaker: '', line: '' }],
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
              if (speaker && speaker.toLowerCase() !== 'n/a') {
                speakers.add(speaker);
              }
            }
          }
        }
      }
      state.characters = Array.from(speakers).map(name => ({
        name,
        description: '',
        assignedVoiceId: undefined
      }));
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
        state.production.mediaProduction = { status, progress, currentTask: detail };
      } else if (phase === 'mixing-editing') {
        state.production.mixingEditing = { status, progress };
      }
      break;
    }

    case 'RESET_PRODUCTION':
      state.production = initialProductionProgress;
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

    case 'SET_CURRENT_SECTION':
      state.production.voiceGeneration.currentSectionId = action.sectionId;
      break;

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
  removeScriptLine: (sectionId: string, itemId: string, lineIndex: number): Action => 
    ({ type: 'REMOVE_SCRIPT_LINE', sectionId, itemId, lineIndex }),
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
  
  // Production progress
  updateProductionPhase: (
    phase: ProductionPhase, 
    status: 'idle' | 'processing' | 'completed', 
    progress: number, 
    detail?: string
  ): Action => ({ type: 'UPDATE_PRODUCTION_PHASE', phase, status, progress, detail }),
  resetProduction: (): Action => 
    ({ type: 'RESET_PRODUCTION' }),
  
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
  setCurrentSection: (sectionId: string | undefined): Action =>
    ({ type: 'SET_CURRENT_SECTION', sectionId }),
  
  // Global
  resetAll: (): Action => 
    ({ type: 'RESET_ALL' }),
};
