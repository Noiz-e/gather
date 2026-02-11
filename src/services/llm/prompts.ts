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

  return `Based on the following content and specifications, convert the content into a structured podcast script with multiple sections.

CRITICAL RULES:
1. Only include lines that are ACTUAL SPOKEN CONTENT — meaningful narrative or dialogue that a speaker would read aloud.
2. Do NOT include as lines:
   - Chapter titles, section headers, volume/chapter numbers (e.g. "Volume X - Chapter 3", "Pre-Chapter Audio")
   - Stage directions or performance notes (e.g. "[Tone: warm, conversational]", "[pause]", "[music fades in]")
   - Production metadata, timestamps, or annotations
   Instead, use these as context to inform the section "name", "description", or soundMusic fields.
3. Preserve the wording of actual dialogue/narrative lines exactly as they appear in the source. Do NOT rewrite, paraphrase, or summarize spoken content.

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
- name: section name (e.g., "INTRO", "MAIN PART 1", "CONCLUSION") — use chapter titles/headers from the source here
- description: brief description of the section — incorporate any tone/style/stage directions from the source here
${visualInstruction}
- timeline: array of timeline items, each with:
  - id: unique identifier
  - timeStart: start time (e.g., "00:00")
  - timeEnd: end time (e.g., "00:15")
  - lines: array of speaker-line pairs, each with:
    - speaker: the character name (e.g., "Narrator", "Host", "Guest A")
    - line: ONLY actual spoken narrative/dialogue — never titles, headers, or stage directions
${soundInstruction}

REMINDER: Each "line" must be something a voice actor would actually speak aloud. Titles, annotations, and directions belong in the section metadata, not in lines.

Return ONLY the JSON array, no other text.`;
}

/**
 * Build a prompt to analyze characters from a generated script,
 * extracting tags such as gender, age group, voice style, etc.
 * Returns a JSON object mapping character name → string[] tags.
 */
export function buildCharacterAnalysisPrompt(
  scriptJson: string,
  characterNames: string[],
  language: 'en' | 'zh' = 'en'
): string {
  const namesList = characterNames.map(n => `"${n}"`).join(', ');

  if (language === 'zh') {
    return `你是一个专业的配音导演。请根据以下播客脚本内容，分析每个角色的特征，并为每个角色生成描述性标签。

脚本内容（JSON 格式）:
${scriptJson}

需要分析的角色: [${namesList}]

为每个角色生成 2-4 个标签，标签类型包括：
- 性别（如：男性、女性）
- 年龄段（如：儿童、青年、中年、老年）
- 声音风格（如：温暖、低沉、活泼、严肃、专业、温柔）
- 角色类型（如：主持人、旁白、嘉宾、叙述者）

以 JSON 对象格式返回，key 是角色名，value 是标签数组。示例：
{"主持人": ["男性", "中年", "专业", "主持人"], "嘉宾": ["女性", "青年", "活泼", "嘉宾"]}

只输出 JSON，不要其他文字。`;
  }

  return `You are a professional voice director. Analyze the following podcast script and extract descriptive tags for each character.

Script (JSON):
${scriptJson}

Characters to analyze: [${namesList}]

Generate 2-4 tags for each character. Tag categories include:
- Gender (e.g. Male, Female)
- Age group (e.g. Child, Young, Middle-aged, Elderly)
- Voice style (e.g. Warm, Deep, Energetic, Serious, Professional, Gentle)
- Role type (e.g. Host, Narrator, Guest, Storyteller)

Return a JSON object where keys are character names and values are tag arrays. Example:
{"Host": ["Male", "Middle-aged", "Professional", "Host"], "Guest": ["Female", "Young", "Energetic", "Guest"]}

Return ONLY the JSON, no other text.`;
}
