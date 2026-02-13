export type Religion = 
  | 'default'      // Apple-style modern minimalist
  | 'educational'  // Educational content
  | 'faithful';    // Faith community

export type ColorMode = 'light' | 'dark';

export interface ReligionInfo {
  id: Religion;
  name: string;
  nameEn: string;
  description: string;
}

export type ProjectStage = 
  | 'planning'      // 规划阶段
  | 'scripting'     // 脚本撰写
  | 'recording'     // 录制阶段
  | 'editing'       // 剪辑阶段
  | 'review'        // 审核阶段
  | 'published';    // 已发布

// Script line for timeline item
export interface ScriptLine {
  speaker: string;
  line: string;
  pauseAfterMs?: number; // Custom pause after this line (overrides default gap)
}

/**
 * Check if a speaker name is a valid human character (not a sound effect, annotation, etc.)
 * Filters out common non-speaker values that LLMs sometimes generate.
 */
export function isValidSpeaker(speaker: string | undefined | null): boolean {
  if (!speaker) return false;
  const s = speaker.trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  // Filter out common non-speaker patterns
  const invalidPatterns = [
    'n/a', 'none', 'sfx', 'sound', 'music', 'bgm', 'transition',
    'sound effect', 'sound effects', 'audio', 'ambience', 'ambient',
    '[sfx]', '[sound]', '[music]', '[bgm]', '[transition]', '[fx]',
    'fx', 'foley',
  ];
  if (invalidPatterns.includes(lower)) return false;
  // Filter out anything that looks like a bracketed annotation: [Something]
  if (/^\[.*\]$/.test(s)) return false;
  // Filter out anything that looks like a stage direction: (Something)
  if (/^\(.*\)$/.test(s)) return false;
  return true;
}

// Script timeline item for episode
export interface ScriptTimelineItem {
  id: string;
  timeStart: string;
  timeEnd: string;
  lines: ScriptLine[]; // Array of speaker-line pairs
  soundMusic: string;
}

// Script section for episode
export interface ScriptSection {
  id: string;
  name: string;
  description: string;
  coverImageDescription?: string;
  timeline: ScriptTimelineItem[];
}

// Character assignment for episode
export interface EpisodeCharacter {
  name: string;
  description: string;
  assignedVoiceId?: string;
  /** Tags extracted from script analysis (e.g. gender, age group, voice style) */
  tags?: string[];
  /** English voice description for TTS (~50 chars, e.g. "Warm deep male voice, moderate pace, studio-quality") */
  voiceDescription?: string;
}

export interface Episode {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  script: string; // Legacy simple script
  scriptSections?: ScriptSection[]; // Rich script with timeline
  characters?: EpisodeCharacter[]; // Characters in this episode
  audioUrl?: string;
  audioData?: string; // Base64-encoded final mixed audio
  audioMimeType?: string; // e.g. 'audio/wav'
  audioDurationMs?: number; // Duration in milliseconds
  duration?: number;
  stage: ProjectStage;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

// Project spec - reusable for creating episodes
export interface ProjectSpec {
  targetAudience: string;
  formatAndDuration: string;
  toneAndExpression: string;
  addBgm: boolean;
  addSoundEffects: boolean;
  hasVisualContent: boolean;
}

export interface Project {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  religion: Religion;
  coverImage?: string;
  spec?: ProjectSpec; // Project spec for episode creation
  episodes: Episode[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface StageInfo {
  id: ProjectStage;
  name: string;
  description: string;
  order: number;
}

export const RELIGIONS: ReligionInfo[] = [
  {
    id: 'default',
    name: '默认',
    nameEn: 'Default',
    description: '简洁优雅的现代设计风格',
  },
  {
    id: 'educational',
    name: '教育',
    nameEn: 'Educational',
    description: '适合教育类内容创作',
  },
  {
    id: 'faithful',
    name: '信仰社区',
    nameEn: 'Faithful Community',
    description: '为信仰社区打造的温暖主题',
  },
];

// Voice Character 音色/角色
export interface VoiceCharacter {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  audioSampleUrl?: string;  // 音色样本 (also used as reference audio for TTS)
  // Reference audio for voice cloning
  refAudioDataUrl?: string; // Reference audio as base64 data URL
  refText?: string;         // Reference text for the audio sample
  tags: string[];
  projectIds?: string[];    // 关联的项目 (可多个或为空)
  createdAt: string;
  updatedAt: string;
}

// Media Library Types
export type MediaType = 'image' | 'bgm' | 'sfx';

export interface MediaItem {
  id: string;
  name: string;
  description: string;
  type: MediaType;
  mimeType: string;
  dataUrl: string;        // base64 data URL or blob URL
  thumbnailUrl?: string;  // for images
  duration?: number;      // for audio (seconds)
  size?: number;          // file size in bytes
  tags: string[];
  projectIds?: string[];  // 关联的项目 (可多个或为空)
  source: 'generated' | 'uploaded';  // how the media was added
  prompt?: string;        // generation prompt if AI-generated
  createdAt: string;
  updatedAt: string;
}

export const PROJECT_STAGES: StageInfo[] = [
  {
    id: 'planning',
    name: '规划',
    description: '确定主题、目标受众和节目形式',
    order: 1,
  },
  {
    id: 'scripting',
    name: '脚本',
    description: '撰写节目脚本和内容大纲',
    order: 2,
  },
  {
    id: 'recording',
    name: '录制',
    description: '录制音频内容',
    order: 3,
  },
  {
    id: 'editing',
    name: '剪辑',
    description: '编辑和优化音频',
    order: 4,
  },
  {
    id: 'review',
    name: '审核',
    description: '最终检查和质量审核',
    order: 5,
  },
  {
    id: 'published',
    name: '发布',
    description: '节目已发布',
    order: 6,
  },
];
