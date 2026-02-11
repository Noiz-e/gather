// Project Templates - Simplified categories with configurable options
// Users select a category, then configure voice count and media options
// 
// Two tiers:
// - Basic templates: Simple category-based (Audiobook, Podcast, etc.)
// - Advanced templates: Professional workflow templates (from Gather Workflow Templates MVP)

export interface TechnicalSpec {
  loudnessTarget: string;      // e.g., "-23dB to -18dB RMS" or "-16 LUFS"
  peakAmplitude: string;       // e.g., "-3dB" or "-1.0dB True Peak"
  silenceStart: string;        // e.g., "0.5s to 1s"
  silenceEnd: string;          // e.g., "1s to 5s"
  sampleRate: string;          // e.g., "44.1kHz"
  bitDepth: string;            // e.g., "16-bit"
  outputFormat: string[];      // e.g., ["WAV", "MP3"]
}

/**
 * Audio mixing configuration for professional output
 * Controls silence, gaps, volumes, and fade effects
 */
export interface AudioMixConfig {
  // Silence padding (in milliseconds)
  silenceStartMs: number;      // Silence at the beginning (e.g., 500-1000ms)
  silenceEndMs: number;        // Silence at the end (e.g., 1000-5000ms)
  
  // Inter-segment gaps (in milliseconds)
  sameSpeakerGapMs: number;    // Gap between same speaker's lines (e.g., 300-500ms)
  differentSpeakerGapMs: number; // Gap between different speakers (e.g., 800-1200ms)
  sectionGapMs: number;        // Gap between sections/chapters (e.g., 2000-3000ms)
  
  // Volume levels (0-1)
  voiceVolume: number;         // Main voice volume (usually 1.0)
  bgmVolume: number;           // Background music volume (e.g., 0.10-0.20)
  sfxVolume: number;           // Sound effects volume (e.g., 0.30-0.50)
  
  // Fade effects (in milliseconds)
  bgmFadeInMs: number;         // BGM fade in duration
  bgmFadeOutMs: number;        // BGM fade out duration
  
  // Advanced options
  normalizeAudio: boolean;     // Apply volume normalization
  compressAudio: boolean;      // Apply light compression
}

// Default audio mix configs for different project types
export const AUDIO_MIX_PRESETS: Record<string, AudioMixConfig> = {
  // Audiobook preset - ACX/Audible compliant
  audiobook: {
    silenceStartMs: 750,       // 0.5-1s room tone
    silenceEndMs: 3000,        // 1-5s at end
    sameSpeakerGapMs: 400,     // Brief pause for same speaker
    differentSpeakerGapMs: 800, // Longer pause for speaker change
    sectionGapMs: 3000,        // Chapter breaks
    voiceVolume: 1.0,
    bgmVolume: 0.08,           // Very subtle if used
    sfxVolume: 0.25,
    bgmFadeInMs: 2000,
    bgmFadeOutMs: 3000,
    normalizeAudio: true,
    compressAudio: false,
  },
  
  // Podcast preset - Conversational, dynamic
  podcast: {
    silenceStartMs: 500,
    silenceEndMs: 1000,
    sameSpeakerGapMs: 300,     // Natural speech rhythm
    differentSpeakerGapMs: 600, // Quick back-and-forth
    sectionGapMs: 2000,
    voiceVolume: 1.0,
    bgmVolume: 0.12,           // Background presence
    sfxVolume: 0.35,
    bgmFadeInMs: 1500,
    bgmFadeOutMs: 2000,
    normalizeAudio: true,
    compressAudio: true,       // More consistent levels
  },
  
  // Educational preset - Clear, deliberate pacing
  educational: {
    silenceStartMs: 800,
    silenceEndMs: 1500,
    sameSpeakerGapMs: 500,     // Allow absorption time
    differentSpeakerGapMs: 1000, // Clear speaker transitions
    sectionGapMs: 2500,
    voiceVolume: 1.0,
    bgmVolume: 0.06,           // Minimal distraction
    sfxVolume: 0.30,
    bgmFadeInMs: 1000,
    bgmFadeOutMs: 1500,
    normalizeAudio: true,
    compressAudio: false,
  },
  
  // Immersive/Cinematic preset - Rich audio layers
  immersive: {
    silenceStartMs: 1000,
    silenceEndMs: 2000,
    sameSpeakerGapMs: 350,
    differentSpeakerGapMs: 700,
    sectionGapMs: 3000,
    voiceVolume: 1.0,
    bgmVolume: 0.18,           // Prominent but not overwhelming
    sfxVolume: 0.45,           // Noticeable effects
    bgmFadeInMs: 2500,
    bgmFadeOutMs: 3500,
    normalizeAudio: true,
    compressAudio: false,
  },
  
  // Short-form/News preset - Tight, punchy
  shortform: {
    silenceStartMs: 300,
    silenceEndMs: 500,
    sameSpeakerGapMs: 200,     // Rapid delivery
    differentSpeakerGapMs: 400,
    sectionGapMs: 1000,
    voiceVolume: 1.0,
    bgmVolume: 0.10,
    sfxVolume: 0.30,
    bgmFadeInMs: 500,
    bgmFadeOutMs: 800,
    normalizeAudio: true,
    compressAudio: true,
  },
  
  // Default fallback
  default: {
    silenceStartMs: 500,
    silenceEndMs: 1000,
    sameSpeakerGapMs: 400,
    differentSpeakerGapMs: 800,
    sectionGapMs: 2000,
    voiceVolume: 1.0,
    bgmVolume: 0.15,
    sfxVolume: 0.35,
    bgmFadeInMs: 1500,
    bgmFadeOutMs: 2000,
    normalizeAudio: true,
    compressAudio: false,
  },
};

/**
 * Get audio mix config for a template ID
 */
export function getAudioMixConfig(templateId: string | null): AudioMixConfig {
  if (!templateId) return AUDIO_MIX_PRESETS.default;
  
  // Map template IDs to preset names
  const presetMap: Record<string, string> = {
    // Basic templates
    'audiobook': 'audiobook',
    'podcast': 'podcast',
    'educational': 'educational',
    // Advanced templates
    'adv-unabridged-audiobook': 'audiobook',
    'adv-multivoice-audiobook': 'audiobook',
    'adv-immersive-audiobook': 'immersive',
    'adv-solo-podcast': 'podcast',
    'adv-interview-podcast': 'podcast',
    'adv-daily-briefing': 'shortform',
    'adv-elearning-modules': 'educational',
    'adv-custom': 'default',
  };
  
  const presetName = presetMap[templateId] || 'default';
  return AUDIO_MIX_PRESETS[presetName];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon: string; // Lucide icon name
  
  // Template tier
  tier: 'basic' | 'advanced';
  
  // For advanced templates: professional standard compliance
  standard?: string;
  genre?: string;
  
  // Default spec configuration
  defaultSpec: {
    targetAudience: string;
    formatAndDuration: string;
    toneAndExpression: string;
  };
  
  // LLM prompt hints for script generation (varies by voiceCount)
  promptHints: {
    single: {
      style: string;
      structure: string;
      voiceDirection: string;
    };
    multiple: {
      style: string;
      structure: string;
      voiceDirection: string;
    };
  };
  
  // Suggested defaults for the config options
  suggestedDefaults: {
    voiceCount: 'single' | 'multiple';
    addBgm: boolean;
    addSoundEffects: boolean;
    hasVisualContent: boolean;
  };
  
  // Technical specifications (for advanced templates)
  technicalSpec?: TechnicalSpec;
  
  // Structure hints for the workflow
  structureHints?: string[];
  
  // Media requirements description
  mediaRequirements?: string;
}

// =============================================================================
// BASIC TEMPLATES - Simple category-based templates (default view)
// =============================================================================
export const BASIC_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'audiobook',
    name: 'Audiobook',
    nameZh: '有声书',
    description: 'Book chapters, stories, and long-form narration',
    descriptionZh: '书籍章节、故事和长篇叙述',
    icon: 'BookOpen',
    tier: 'basic',
    defaultSpec: {
      targetAudience: 'Audiobook listeners and readers',
      formatAndDuration: 'Audiobook chapter, 15-45 minutes',
      toneAndExpression: 'Engaging, clear, emotionally expressive',
    },
    promptHints: {
      single: {
        style: 'Professional audiobook narration with clear pacing',
        structure: 'Continuous narrative with natural paragraph breaks',
        voiceDirection: 'Single narrator voice, maintain consistent tone',
      },
      multiple: {
        style: 'Full-cast audiobook with distinct character voices',
        structure: 'Dialogue-heavy with character attribution',
        voiceDirection: 'Each character needs distinct voice and personality',
      },
    },
    suggestedDefaults: {
      voiceCount: 'single',
      addBgm: false,
      addSoundEffects: false,
      hasVisualContent: false,
    },
  },
  {
    id: 'podcast',
    name: 'Podcast',
    nameZh: '播客',
    description: 'Discussions, interviews, and episodic content',
    descriptionZh: '讨论、访谈和系列节目',
    icon: 'Mic2',
    tier: 'basic',
    defaultSpec: {
      targetAudience: 'Podcast listeners interested in discussions',
      formatAndDuration: 'Podcast episode, 15-45 minutes',
      toneAndExpression: 'Conversational, engaging, informative',
    },
    promptHints: {
      single: {
        style: 'Solo podcast with personal storytelling',
        structure: 'Introduction, main segments, conclusion',
        voiceDirection: 'Warm, personable host voice',
      },
      multiple: {
        style: 'Natural conversation between hosts',
        structure: 'Introduction, discussion segments, conclusion',
        voiceDirection: 'Each speaker has distinct personality',
      },
    },
    suggestedDefaults: {
      voiceCount: 'multiple',
      addBgm: true,
      addSoundEffects: false,
      hasVisualContent: false,
    },
  },
  {
    id: 'educational',
    name: 'Educational',
    nameZh: '教育',
    description: 'Learning content for all ages',
    descriptionZh: '适合各年龄段的学习内容',
    icon: 'GraduationCap',
    tier: 'basic',
    defaultSpec: {
      targetAudience: 'Learners seeking educational content',
      formatAndDuration: 'Educational audio, 5-30 minutes',
      toneAndExpression: 'Clear, engaging, informative',
    },
    promptHints: {
      single: {
        style: 'Clear instructional narration',
        structure: 'Introduction, learning segments, summary',
        voiceDirection: 'Friendly, clear teaching voice',
      },
      multiple: {
        style: 'Interactive educational dialogue',
        structure: 'Hook, learning segments, activities, conclusion',
        voiceDirection: 'Engaging voices with varied energy',
      },
    },
    suggestedDefaults: {
      voiceCount: 'single',
      addBgm: false,
      addSoundEffects: true,
      hasVisualContent: true,
    },
  },
];

// =============================================================================
// ADVANCED TEMPLATES - Professional workflow templates
// Based on "Gather Workflow Templates MVP" specification
// =============================================================================

// ACX/Audible Technical Spec (for audiobooks)
const AUDIOBOOK_TECH_SPEC: TechnicalSpec = {
  loudnessTarget: '-23dB to -18dB RMS',
  peakAmplitude: '-3dB',
  silenceStart: '0.5s to 1s',
  silenceEnd: '1s to 5s',
  sampleRate: '44.1kHz',
  bitDepth: '16-bit',
  outputFormat: ['WAV', 'MP3'],
};

// Podcast Technical Spec
const PODCAST_TECH_SPEC: TechnicalSpec = {
  loudnessTarget: '-16 LUFS',
  peakAmplitude: '-1.0dB True Peak',
  silenceStart: '0.5s',
  silenceEnd: '1s',
  sampleRate: '44.1kHz',
  bitDepth: '16-bit',
  outputFormat: ['MP3'],
};

export const ADVANCED_TEMPLATES: ProjectTemplate[] = [
  // Template 1: The Unabridged Narrated Audiobook
  {
    id: 'adv-unabridged-audiobook',
    name: 'Unabridged Narrated Audiobook',
    nameZh: '完整朗读有声书',
    description: 'Single narrator audiobook',
    descriptionZh: '单人朗读有声书',
    icon: 'BookOpen',
    tier: 'advanced',
    standard: 'ACX/Audible and Global Distribution Compliant',
    genre: 'Fiction or Non-Fiction, Single Voice',
    defaultSpec: {
      targetAudience: 'Audiobook listeners on Audible and Apple Books',
      formatAndDuration: 'Audiobook chapter, 15-45 minutes per chapter',
      toneAndExpression: 'Professional narration, emotionally expressive',
    },
    promptHints: {
      single: {
        style: 'Professional unabridged audiobook narration',
        structure: 'Sequential chapters with opening/closing credits',
        voiceDirection: 'Single narrator, may do accents for characters',
      },
      multiple: {
        style: 'Professional unabridged audiobook narration',
        structure: 'Sequential chapters with opening/closing credits',
        voiceDirection: 'Single narrator, may do accents for characters',
      },
    },
    suggestedDefaults: {
      voiceCount: 'single',
      addBgm: false,
      addSoundEffects: false,
      hasVisualContent: false,
    },
    technicalSpec: AUDIOBOOK_TECH_SPEC,
    structureHints: ['Opening credits', 'Chapter content', 'Closing credits'],
    mediaRequirements: 'Minimal; optional music for intro/outro segments',
  },

  // Template 2: The Multi-Voice Narrated Audiobook
  {
    id: 'adv-multivoice-audiobook',
    name: 'Multi-Voice Audiobook',
    nameZh: '多声优有声书',
    description: 'Multi-voice audiobook with characters',
    descriptionZh: '多声优有声书，角色配音',
    icon: 'Users',
    tier: 'advanced',
    standard: 'ACX/Audible and Global Distribution Compliant',
    genre: 'Fiction (Multi-Voice / Duet Narration)',
    defaultSpec: {
      targetAudience: 'Audiobook listeners seeking immersive experiences',
      formatAndDuration: 'Audiobook chapter, 15-45 minutes per chapter',
      toneAndExpression: 'Distinct character voices with strict continuity',
    },
    promptHints: {
      single: {
        style: 'Full-cast audiobook with character voices',
        structure: 'Sequential chapters with cast list',
        voiceDirection: 'Multiple voices with strict continuity',
      },
      multiple: {
        style: 'Full-cast audiobook with character voices',
        structure: 'Sequential chapters with dedicated cast list',
        voiceDirection: 'Specific voices for Narrator, Character A, B, etc.',
      },
    },
    suggestedDefaults: {
      voiceCount: 'multiple',
      addBgm: false,
      addSoundEffects: false,
      hasVisualContent: false,
    },
    technicalSpec: AUDIOBOOK_TECH_SPEC,
    structureHints: ['Opening credits', 'Cast introduction', 'Chapter content', 'Closing credits'],
    mediaRequirements: 'Minimal; optional music for intro/outro segments',
  },

  // Template 3: The Immersive Narrated Audiobook
  {
    id: 'adv-immersive-audiobook',
    name: 'Immersive Audiobook',
    nameZh: '沉浸式有声书',
    description: 'Cinematic audiobook with music, sound effects, and atmosphere',
    descriptionZh: '电影级有声书，配有音乐、音效和氛围',
    icon: 'Headphones',
    tier: 'advanced',
    standard: 'ACX/Audible and Global Distribution Compliant',
    genre: 'Fiction or Non-Fiction (Enhanced / Cinematic)',
    defaultSpec: {
      targetAudience: 'Listeners seeking cinematic audio experiences',
      formatAndDuration: 'Audiobook chapter, 15-45 minutes per chapter',
      toneAndExpression: 'Cinematic, immersive, high intelligibility',
    },
    promptHints: {
      single: {
        style: 'Cinematic audiobook with soundscapes',
        structure: 'Sequential chapters with audio layers',
        voiceDirection: 'Voice-forward mix against background layers',
      },
      multiple: {
        style: 'Full-cast cinematic audiobook',
        structure: 'Sequential chapters with environmental audio',
        voiceDirection: 'High intelligibility, automated ducking for speech',
      },
    },
    suggestedDefaults: {
      voiceCount: 'multiple',
      addBgm: true,
      addSoundEffects: true,
      hasVisualContent: false,
    },
    technicalSpec: AUDIOBOOK_TECH_SPEC,
    structureHints: ['Opening credits', 'Immersive chapter content', 'Closing credits'],
    mediaRequirements: 'Extensive: layered BGM, environmental ambience, situational SFX (Foley). Critical: automated ducking during speech.',
  },

  // Template 4: The Solo Editorial Podcast
  {
    id: 'adv-solo-podcast',
    name: 'Solo Editorial Podcast',
    nameZh: '单人观点播客',
    description: 'Voice-led podcast with a single presenter',
    descriptionZh: '单人主持的声音播客',
    icon: 'Mic',
    tier: 'advanced',
    standard: 'RSS/Podcast Distribution Compliant (Spotify, Apple Podcasts)',
    genre: 'Thought Leadership, Sermons, Op-Eds, Solo Storytelling',
    defaultSpec: {
      targetAudience: 'Podcast listeners seeking thought leadership',
      formatAndDuration: 'Podcast episode, 10-30 minutes',
      toneAndExpression: 'Voice-forward, highly intelligible, authoritative',
    },
    promptHints: {
      single: {
        style: 'Host-driven editorial podcast from manuscript',
        structure: 'Intro (Music + Hook), Body, Mid-roll, Conclusion, Outro',
        voiceDirection: 'Consistent host voice building brand trust',
      },
      multiple: {
        style: 'Host-driven editorial podcast from manuscript',
        structure: 'Intro (Music + Hook), Body, Mid-roll, Conclusion, Outro',
        voiceDirection: 'Consistent host voice building brand trust',
      },
    },
    suggestedDefaults: {
      voiceCount: 'single',
      addBgm: true,
      addSoundEffects: false,
      hasVisualContent: false,
    },
    technicalSpec: PODCAST_TECH_SPEC,
    structureHints: ['Intro (Music + Hook)', 'Body Narrative', 'Mid-roll Break', 'Conclusion', 'Outro'],
    mediaRequirements: 'Branded Intro/Outro music; transition stings between segments',
  },

  // Template 5: The Scripted Duo (Synthetic Interview)
  {
    id: 'adv-scripted-interview',
    name: 'Scripted Interview Podcast',
    nameZh: '脚本访谈播客',
    description: 'Scripted dialogue podcast with host and guest voices.',
    descriptionZh: '脚本对话播客，主持人与嘉宾配音',
    icon: 'MessageSquare',
    tier: 'advanced',
    standard: 'RSS/Podcast Distribution Compliant (Spotify, Apple Podcasts)',
    genre: 'Educational, Explainer, Expert and Host Dialogue',
    defaultSpec: {
      targetAudience: 'Podcast listeners seeking expert discussions',
      formatAndDuration: 'Podcast episode, 15-45 minutes',
      toneAndExpression: 'Natural conversation, same-room feel',
    },
    promptHints: {
      single: {
        style: 'Dynamic multi-voice dialogue from script',
        structure: 'Intro, Conversational segments, Mid-roll, Recap, Outro',
        voiceDirection: 'Host and Guest must sound in same room',
      },
      multiple: {
        style: 'Dynamic multi-voice dialogue from script',
        structure: 'Intro, Conversational segments, Mid-roll, Recap, Outro',
        voiceDirection: 'The Host (consistent) + Guest Personas (variable). Apply identical Virtual Room settings.',
      },
    },
    suggestedDefaults: {
      voiceCount: 'multiple',
      addBgm: true,
      addSoundEffects: false,
      hasVisualContent: false,
    },
    technicalSpec: PODCAST_TECH_SPEC,
    structureHints: ['Intro (Music + Lead In)', 'Conversational segments', 'Mid-roll Break', 'Synthesis/Recap', 'Outro'],
    mediaRequirements: 'Branded Intro/Outro music; transition stings; subtle Studio Ambience (Room Tone)',
  },

  // Template 6: The Daily Briefing / Short-Form Audio
  {
    id: 'adv-daily-briefing',
    name: 'Audio Brief',
    nameZh: '音频简报',
    description: 'Short, repeatable audio for updates and announcements',
    descriptionZh: '简短可重复的音频，用于更新和公告',
    icon: 'Newspaper',
    tier: 'advanced',
    standard: 'RSS/Podcast Distribution Compliant (Spotify, Apple Podcasts)',
    genre: 'News Digests, Daily Briefings, Bulletins',
    defaultSpec: {
      targetAudience: 'Listeners seeking rapid daily updates',
      formatAndDuration: 'Short-form audio, 2-10 minutes',
      toneAndExpression: 'Clear, concise, highly intelligible',
    },
    promptHints: {
      single: {
        style: 'Rapid-response short-form audio',
        structure: 'Hard-start or short sting (<2s), Briefing, Outro',
        voiceDirection: 'Consistent host voice for series branding',
      },
      multiple: {
        style: 'Rapid-response short-form audio',
        structure: 'Hard-start or short sting (<2s), Briefing, Outro',
        voiceDirection: 'Consistent host voice for series branding',
      },
    },
    suggestedDefaults: {
      voiceCount: 'single',
      addBgm: true,
      addSoundEffects: false,
      hasVisualContent: false,
    },
    technicalSpec: PODCAST_TECH_SPEC,
    structureHints: ['Hard-start or branded sting (<2s)', 'The Briefing', 'Outro'],
    mediaRequirements: 'Intro/outro music. Consistent branded signature sound for auditory branding.',
  },

  // Template 7: The Professional Learning And Training Library
  {
    id: 'adv-learning-library',
    name: 'Audio Library',
    nameZh: '音频库',
    description: 'Modular audio for projects and platforms.',
    descriptionZh: '模块化音频，用于项目和平台',
    icon: 'Library',
    tier: 'advanced',
    standard: 'Modular / Catch-All, External Media Ready',
    genre: 'eLearning, Training, Guides',
    defaultSpec: {
      targetAudience: 'Learners and educators using digital platforms',
      formatAndDuration: 'Segment-based, variable length',
      toneAndExpression: 'Clear, instructional, normalized volume',
    },
    promptHints: {
      single: {
        style: 'Discrete audio assets for learning integration',
        structure: 'Segment-based: individual vocabulary, steps, prompts',
        voiceDirection: 'Highly intelligible, normalized across batch',
      },
      multiple: {
        style: 'Discrete audio assets for learning integration',
        structure: 'Segment-based: individual vocabulary, steps, prompts',
        voiceDirection: 'Multiple voices as defined, normalized batch',
      },
    },
    suggestedDefaults: {
      voiceCount: 'single',
      addBgm: false,
      addSoundEffects: true,
      hasVisualContent: true,
    },
    technicalSpec: PODCAST_TECH_SPEC,
    structureHints: ['Individual labeled segments', 'Batch normalized output', 'Zip archive or master track'],
    mediaRequirements: 'User defined. Mix of vocals, music, SFX and ambience per segment.',
  },

  // Template 8: The Narration And Voice Over Template
  {
    id: 'adv-voiceover',
    name: 'Narration and Voice Over',
    nameZh: '旁白与配音',
    description: 'Voice-only audio for video, slides, and presentations.',
    descriptionZh: '纯语音音频，用于视频、幻灯片和演示',
    icon: 'Video',
    tier: 'advanced',
    standard: 'Modular / Catch-All, External Media Ready',
    genre: 'Video Scripts, Slide Presentations, Corporate Narrations',
    defaultSpec: {
      targetAudience: 'Video producers and presentation creators',
      formatAndDuration: 'Segment-based, variable length',
      toneAndExpression: 'Professional, clear, externally aligned',
    },
    promptHints: {
      single: {
        style: 'Professional vocal masters for external content',
        structure: 'Segment-based per user script organization',
        voiceDirection: 'Voice-forward, highly intelligible',
      },
      multiple: {
        style: 'Professional vocal masters for external content',
        structure: 'Segment-based per user script organization',
        voiceDirection: 'Multiple voices as defined, consistent quality',
      },
    },
    suggestedDefaults: {
      voiceCount: 'single',
      addBgm: false,
      addSoundEffects: false,
      hasVisualContent: true,
    },
    technicalSpec: PODCAST_TECH_SPEC,
    structureHints: ['Labeled segments matching script', 'Normalized batch output', 'Zip archive or master track'],
    mediaRequirements: 'Voice only',
  },
];

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

// All templates - only advanced templates (basic templates removed)
export const PROJECT_TEMPLATES: ProjectTemplate[] = [...ADVANCED_TEMPLATES];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Helper to get template by ID
export function getTemplateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find(t => t.id === id);
}

// Helper to get default spec from template
export function getDefaultSpecFromTemplate(templateId: string) {
  const template = getTemplateById(templateId);
  return template?.defaultSpec || null;
}

// Helper to get technical spec from template
export function getTechnicalSpec(templateId: string): TechnicalSpec | undefined {
  const template = getTemplateById(templateId);
  return template?.technicalSpec;
}
