import { GoogleGenAI, Modality } from '@google/genai';

// Gemini model configurations
const TEXT_MODEL = 'gemini-2.0-flash';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface TTSOptions {
  voiceName?: string;  // Gemini TTS voice names: Puck, Charon, Kore, Fenrir, Aoede, etc.
  apiKey?: string;
}

export interface StreamChunk {
  text: string;
  accumulated: string;
}

function getClient(apiKey?: string): GoogleGenAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Generate text using Gemini
 */
export async function generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
  const client = getClient(options.apiKey);
  
  const response = await client.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
    }
  });

  return response.text || '';
}

/**
 * Generate text with streaming
 */
export async function* generateTextStream(
  prompt: string, 
  options: GenerateOptions = {}
): AsyncGenerator<StreamChunk> {
  const client = getClient(options.apiKey);
  
  const response = await client.models.generateContentStream({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
    }
  });

  let accumulated = '';
  
  for await (const chunk of response) {
    const text = chunk.text || '';
    if (text) {
      accumulated += text;
      yield { text, accumulated };
    }
  }
}

/**
 * Generate speech using Gemini TTS
 * Returns base64 encoded audio data
 */
export async function generateSpeech(
  text: string, 
  options: TTSOptions = {}
): Promise<{ audioData: string; mimeType: string }> {
  const client = getClient(options.apiKey);
  
  const voiceName = options.voiceName || 'Kore';
  
  const response = await client.models.generateContent({
    model: TTS_MODEL,
    contents: text,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName
          }
        }
      }
    }
  });

  // Extract audio data from response
  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('audio/')) {
      return {
        audioData: part.inlineData.data || '',
        mimeType: part.inlineData.mimeType
      };
    }
  }
  
  throw new Error('No audio data in response');
}

/**
 * Available Gemini TTS voices with sample text
 */
export const AVAILABLE_VOICES = [
  { 
    id: 'Puck', 
    name: 'Puck', 
    description: 'Energetic, youthful voice',
    descriptionZh: '充满活力的年轻声音',
    sampleText: 'Hey there! Ready for an adventure? Let\'s explore something amazing together!',
    sampleTextZh: '嘿！准备好冒险了吗？让我们一起探索精彩的世界！'
  },
  { 
    id: 'Charon', 
    name: 'Charon', 
    description: 'Deep, authoritative voice',
    descriptionZh: '深沉、权威的声音',
    sampleText: 'Welcome. I shall guide you through the depths of knowledge and wisdom.',
    sampleTextZh: '欢迎。我将引领你穿越知识与智慧的深渊。'
  },
  { 
    id: 'Kore', 
    name: 'Kore', 
    description: 'Warm, friendly female voice',
    descriptionZh: '温暖、亲切的女声',
    sampleText: 'Hello! It\'s wonderful to meet you. I\'m here to help with anything you need.',
    sampleTextZh: '你好！很高兴认识你。我随时为你提供帮助。'
  },
  { 
    id: 'Fenrir', 
    name: 'Fenrir', 
    description: 'Strong, dramatic voice',
    descriptionZh: '强劲、戏剧性的声音',
    sampleText: 'The time has come. Every great story begins with a single brave step forward.',
    sampleTextZh: '时机已到。每个伟大的故事都始于勇敢迈出的第一步。'
  },
  { 
    id: 'Aoede', 
    name: 'Aoede', 
    description: 'Melodic, expressive voice',
    descriptionZh: '悦耳、富有表现力的声音',
    sampleText: 'Listen closely, and let the melody of words paint pictures in your imagination.',
    sampleTextZh: '仔细聆听，让文字的旋律在你的想象中描绘画卷。'
  },
  { 
    id: 'Leda', 
    name: 'Leda', 
    description: 'Gentle, soothing voice',
    descriptionZh: '温柔、舒缓的声音',
    sampleText: 'Take a deep breath and relax. Everything will unfold beautifully in its own time.',
    sampleTextZh: '深呼吸，放松。一切都会在最好的时刻美丽地展开。'
  },
  { 
    id: 'Orus', 
    name: 'Orus', 
    description: 'Clear, professional voice',
    descriptionZh: '清晰、专业的声音',
    sampleText: 'Good day. Let me present the information clearly and concisely for you.',
    sampleTextZh: '您好。让我为您清晰简洁地呈现相关信息。'
  },
  { 
    id: 'Zephyr', 
    name: 'Zephyr', 
    description: 'Light, airy voice',
    descriptionZh: '轻盈、飘逸的声音',
    sampleText: 'Like a gentle breeze, let these words carry you to new horizons.',
    sampleTextZh: '如微风般轻柔，让这些话语带你飞向新的地平线。'
  },
];

/**
 * Voice sample cache (in-memory)
 */
export interface VoiceSample {
  voiceId: string;
  audioData: string;
  mimeType: string;
  generatedAt: number;
}

const voiceSampleCache = new Map<string, VoiceSample>();

/**
 * Get or generate a voice sample
 */
export async function getVoiceSample(
  voiceId: string,
  language: 'en' | 'zh' = 'en',
  options: { apiKey?: string } = {}
): Promise<VoiceSample> {
  const cacheKey = `${voiceId}-${language}`;
  
  // Check cache first
  const cached = voiceSampleCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Find voice config
  const voice = AVAILABLE_VOICES.find(v => v.id === voiceId);
  if (!voice) {
    throw new Error(`Voice not found: ${voiceId}`);
  }
  
  // Generate sample
  const sampleText = language === 'zh' ? voice.sampleTextZh : voice.sampleText;
  const result = await generateSpeech(sampleText, { voiceName: voiceId, apiKey: options.apiKey });
  
  const sample: VoiceSample = {
    voiceId,
    audioData: result.audioData,
    mimeType: result.mimeType,
    generatedAt: Date.now()
  };
  
  // Cache the result
  voiceSampleCache.set(cacheKey, sample);
  
  return sample;
}

/**
 * Pre-generate all voice samples (call on server start)
 */
export async function preGenerateVoiceSamples(language: 'en' | 'zh' = 'en'): Promise<void> {
  console.log(`Pre-generating voice samples (${language})...`);
  
  for (const voice of AVAILABLE_VOICES) {
    try {
      await getVoiceSample(voice.id, language);
      console.log(`  ✓ ${voice.id} sample generated`);
    } catch (error) {
      console.error(`  ✗ ${voice.id} failed:`, error instanceof Error ? error.message : error);
    }
  }
  
  console.log('Voice sample pre-generation complete.');
}

/**
 * Check if samples are cached
 */
export function hasCachedSamples(language: 'en' | 'zh' = 'en'): boolean {
  return AVAILABLE_VOICES.every(v => voiceSampleCache.has(`${v.id}-${language}`));
}
