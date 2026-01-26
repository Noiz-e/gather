// ProjectCreator state management with Immer
import { produce } from 'immer';
import { ScriptSection, EpisodeCharacter } from '../../types';

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

export interface ProjectCreatorState {
  spec: SpecData;
  scriptSections: ScriptSection[];
  characters: EpisodeCharacter[];
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

export const initialState: ProjectCreatorState = {
  spec: initialSpecData,
  scriptSections: [],
  characters: []
};

type Action =
  | { type: 'SET_SPEC'; payload: Partial<SpecData> }
  | { type: 'UPDATE_SPEC_FIELD'; field: keyof SpecData; value: SpecData[keyof SpecData] }
  | { type: 'TOGGLE_CHARACTER_SELECTION'; voiceId: string }
  | { type: 'RESET_SPEC' }
  | { type: 'SET_SCRIPT_SECTIONS'; payload: ScriptSection[] }
  | { type: 'UPDATE_SECTION_COVER'; sectionId: string; coverImageDescription: string }
  | { type: 'UPDATE_TIMELINE_ITEM'; sectionId: string; itemId: string; field: string; value: string }
  | { type: 'UPDATE_SCRIPT_LINE'; sectionId: string; itemId: string; lineIndex: number; field: 'speaker' | 'line'; value: string }
  | { type: 'ADD_SCRIPT_LINE'; sectionId: string; itemId: string }
  | { type: 'REMOVE_SCRIPT_LINE'; sectionId: string; itemId: string; lineIndex: number }
  | { type: 'ADD_TIMELINE_ITEM'; sectionId: string }
  | { type: 'REMOVE_TIMELINE_ITEM'; sectionId: string; itemId: string }
  | { type: 'SET_CHARACTERS'; payload: EpisodeCharacter[] }
  | { type: 'ASSIGN_VOICE_TO_CHARACTER'; characterIndex: number; voiceId: string }
  | { type: 'EXTRACT_CHARACTERS_FROM_SCRIPT' }
  | { type: 'RESET_ALL' };

function findTimelineItem(sections: ScriptSection[], sectionId: string, itemId: string) {
  const section = sections.find(s => s.id === sectionId);
  return section?.timeline.find(t => t.id === itemId) ?? null;
}

export const projectCreatorReducer = produce((state: ProjectCreatorState, action: Action) => {
  switch (action.type) {
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

    case 'RESET_ALL':
      return initialState;
  }
}, initialState);

// Action creators
export const actions = {
  setSpec: (payload: Partial<SpecData>): Action => ({ type: 'SET_SPEC', payload }),
  updateSpecField: <K extends keyof SpecData>(field: K, value: SpecData[K]): Action => 
    ({ type: 'UPDATE_SPEC_FIELD', field, value }),
  toggleCharacterSelection: (voiceId: string): Action => 
    ({ type: 'TOGGLE_CHARACTER_SELECTION', voiceId }),
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
  setCharacters: (payload: EpisodeCharacter[]): Action => 
    ({ type: 'SET_CHARACTERS', payload }),
  assignVoiceToCharacter: (characterIndex: number, voiceId: string): Action => 
    ({ type: 'ASSIGN_VOICE_TO_CHARACTER', characterIndex, voiceId }),
  extractCharactersFromScript: (): Action => 
    ({ type: 'EXTRACT_CHARACTERS_FROM_SCRIPT' })
};
