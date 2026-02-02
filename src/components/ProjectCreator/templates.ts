// Project Templates - Simplified categories with configurable options
// Users select a category, then configure voice count and media options

export interface ProjectTemplate {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon: string; // Lucide icon name
  
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
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'audiobook',
    name: 'Audiobook',
    nameZh: '有声书',
    description: 'Book chapters, stories, and long-form narration',
    descriptionZh: '书籍章节、故事和长篇叙述',
    icon: 'BookOpen',
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
    id: 'devotional',
    name: 'Devotional / Meditation',
    nameZh: '灵修 / 冥想',
    description: 'Spiritual content, guided meditation, reflections',
    descriptionZh: '灵修内容、引导冥想、心灵反思',
    icon: 'Heart',
    defaultSpec: {
      targetAudience: 'Spiritual seekers and meditation practitioners',
      formatAndDuration: 'Devotional or meditation, 5-20 minutes',
      toneAndExpression: 'Calm, contemplative, peaceful',
    },
    promptHints: {
      single: {
        style: 'Intimate, calming guidance',
        structure: 'Opening, reflection/guidance, closing',
        voiceDirection: 'Gentle, sincere voice with contemplative pace',
      },
      multiple: {
        style: 'Guided session with multiple voices',
        structure: 'Opening, guided segments, closing blessing',
        voiceDirection: 'Calm, harmonious voices',
      },
    },
    suggestedDefaults: {
      voiceCount: 'single',
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

// Helper to get template by ID
export function getTemplateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find(t => t.id === id);
}

// Helper to get default spec from template
export function getDefaultSpecFromTemplate(templateId: string) {
  const template = getTemplateById(templateId);
  return template?.defaultSpec || null;
}
