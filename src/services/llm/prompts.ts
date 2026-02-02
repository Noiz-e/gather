// LLM Prompts for content generation

export interface SpecAnalysisResult {
  storyTitle: string;
  subtitle?: string;
  targetAudience: string;
  formatAndDuration: string;
  toneAndExpression: string;
  addBgm: boolean;
  addSoundEffects: boolean;
  hasVisualContent: boolean;
}

export interface ScriptGenerationConfig {
  title: string;
  targetAudience: string;
  formatAndDuration: string;
  toneAndExpression: string;
  addBgm: boolean;
  addSoundEffects: boolean;
  hasVisualContent: boolean;
  // Optional template hints for better script generation
  styleHint?: string;
  structureHint?: string;
  voiceDirectionHint?: string;
}

export interface SpecAnalysisConfig {
  templateName?: string;
  targetAudience?: string;
  formatAndDuration?: string;
  toneAndExpression?: string;
}

export function buildSpecAnalysisPrompt(content: string, config?: SpecAnalysisConfig): string {
  const contextSection = config && (config.templateName || config.targetAudience) 
    ? `
Project Context (use this to better understand what the user wants):
${config.templateName ? `- Template/Type: ${config.templateName}` : ''}
${config.targetAudience ? `- Target Audience: ${config.targetAudience}` : ''}
${config.formatAndDuration ? `- Format: ${config.formatAndDuration}` : ''}
${config.toneAndExpression ? `- Tone/Style: ${config.toneAndExpression}` : ''}
`
    : '';

  return `Analyze the following content and extract podcast/audio production specifications. Return a JSON object with these fields:
- storyTitle: The main title of the story/content (extract from content, considering the project context)
- subtitle: A short subtitle or tagline for the content (optional, can be empty)
- targetAudience: Who this content is for (e.g., "Students ages 11-15", "General audience")
- formatAndDuration: Format and estimated duration (e.g., "Audio podcast mp3, ~5 minutes")
- toneAndExpression: The tone and style (e.g., "Contemplative acoustic instrumental, himalayan-influenced")
- addBgm: boolean - whether background music is recommended
- addSoundEffects: boolean - whether sound effects are recommended
- hasVisualContent: boolean - whether visual content is requested
${contextSection}
Content to analyze:
${content}

Return ONLY the JSON object, no other text.`;
}

export function buildScriptGenerationPrompt(content: string, config: ScriptGenerationConfig): string {
  const visualInstruction = config.hasVisualContent 
    ? 'Include a "coverImageDescription" field for each section describing the visual.'
    : '';
  
  const soundInstruction = config.addBgm || config.addSoundEffects
    ? '  - soundMusic: sound/music instructions'
    : '';

  return `Based on the following content and specifications, generate a podcast script with multiple sections.

Content: ${content}

Specifications:
- Title: ${config.title}
- Audience: ${config.targetAudience}
- Format: ${config.formatAndDuration}
- Tone: ${config.toneAndExpression}
- Background Music: ${config.addBgm ? 'Yes' : 'No'}
- Sound Effects: ${config.addSoundEffects ? 'Yes' : 'No'}
- Visual Content: ${config.hasVisualContent ? 'Yes' : 'No'}

Generate a JSON array of sections, each with:
- id: unique identifier
- name: section name (e.g., "INTRO", "MAIN PART 1", "CONCLUSION")
- description: brief description of the section
${visualInstruction}
- timeline: array of timeline items, each with:
  - id: unique identifier
  - timeStart: start time (e.g., "00:00")
  - timeEnd: end time (e.g., "00:15")
  - lines: array of speaker-line pairs, each with:
    - speaker: the character name (e.g., "Narrator", "Host", "Guest A")
    - line: what that character says
${soundInstruction}

Return ONLY the JSON array, no other text.`;
}
