import { GoogleGenAI, Modality } from '@google/genai';
import fs from 'fs';
import path from 'path';

/** Browser-playable audio types; PCM from Gemini is not supported by <audio> */
const BROWSER_PLAYABLE_MIMES = ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm'];

/**
 * Build WAV file from raw PCM (16-bit, mono, 24000 Hz - Gemini TTS default).
 * Returns base64-encoded WAV for browser playback.
 */
function pcmBase64ToWavBase64(pcmBase64: string): string {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const header = Buffer.alloc(headerSize);
  let offset = 0;
  header.write('RIFF', offset); offset += 4;
  header.writeUInt32LE(fileSize - 8, offset); offset += 4;
  header.write('WAVE', offset); offset += 4;
  header.write('fmt ', offset); offset += 4;
  header.writeUInt32LE(16, offset); offset += 4;  // fmt chunk size
  header.writeUInt16LE(1, offset); offset += 2;  // PCM format
  header.writeUInt16LE(numChannels, offset); offset += 2;
  header.writeUInt32LE(sampleRate, offset); offset += 4;
  header.writeUInt32LE(byteRate, offset); offset += 4;
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), offset); offset += 2;
  header.writeUInt16LE(bitsPerSample, offset); offset += 2;
  header.write('data', offset); offset += 4;
  header.writeUInt32LE(dataSize, offset);

  return Buffer.concat([header, pcm]).toString('base64');
}

/** Ensure sample is in a browser-playable format (WAV); convert from PCM if needed. */
function ensureBrowserPlayable(sample: VoiceSample): VoiceSample {
  if (BROWSER_PLAYABLE_MIMES.includes(sample.mimeType)) {
    return sample;
  }
  return {
    ...sample,
    audioData: pcmBase64ToWavBase64(sample.audioData),
    mimeType: 'audio/wav'
  };
}

// Gemini model configurations
// TTS: https://ai.google.dev/gemini-api/docs/speech-generation
const TEXT_MODEL = 'gemini-2.5-flash';
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

/** Input for voice recommendation */
export interface CharacterForRecommend {
  name: string;
  description?: string;
}

export interface VoiceForRecommend {
  id: string;
  name: string;
  description?: string;
  descriptionZh?: string;
}

export interface RecommendVoicesOptions {
  apiKey?: string;
  language?: 'en' | 'zh';
}

/**
 * Use Gemini Flash to recommend the best preset voice for each character.
 * Returns voice IDs in the same order as characters (index i => voice for characters[i]).
 */
export async function recommendVoicesForCharacters(
  characters: CharacterForRecommend[],
  voices: VoiceForRecommend[],
  options: RecommendVoicesOptions = {}
): Promise<string[]> {
  if (characters.length === 0 || voices.length === 0) {
    return [];
  }
  const lang = options.language === 'zh' ? 'zh' : 'en';
  const voicesList = voices
    .map((v) => {
      const desc = lang === 'zh' ? (v.descriptionZh ?? v.description ?? '') : (v.description ?? '');
      return `- id: "${v.id}", name: "${v.name}", description: "${desc}"`;
    })
    .join('\n');
  const charactersList = characters
    .map((c, i) => `[${i}] name: "${c.name}", description: "${c.description || ''}"`)
    .join('\n');
  const prompt = lang === 'zh'
    ? `你是一个配音导演。根据以下角色列表，为每个角色从可用音色中选出最合适的一个。每个音色只能被分配一次。只输出一个 JSON 数组，按角色顺序列出每个角色对应的音色 id，不要其他文字。

角色列表（索引、名字、描述）：
${charactersList}

可用音色（id、name、description）：
${voicesList}

输出格式示例：["Puck","Kore","Charon"]`
    : `You are a voice director. For each character below, pick the single best matching voice from the available voices. Each voice can be assigned at most once. Output only a JSON array of voice ids in the same order as the characters (index i = voice for character i). No other text.

Characters (index, name, description):
${charactersList}

Available voices (id, name, description):
${voicesList}

Example output: ["Puck","Kore","Charon"]`;

  const raw = await generateText(prompt, {
    temperature: 0.2,
    maxTokens: 1024,
    apiKey: options.apiKey
  });
  const trimmed = raw.trim().replace(/^```\w*\n?|\n?```$/g, '').trim();
  let arr: unknown;
  try {
    arr = JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    arr = match ? JSON.parse(match[0]) : [];
  }
  const ids = Array.isArray(arr) ? arr.map(String) : [];
  const voiceIdSet = new Set(voices.map((v) => v.id));
  return characters.map((_, i) => {
    const id = ids[i];
    return voiceIdSet.has(id) ? id : (voices[0]?.id ?? '');
  });
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
      let audioData = part.inlineData.data || '';
      let mimeType = part.inlineData.mimeType || '';
      // Gemini TTS returns raw PCM; browsers need WAV/MP3/OGG. Convert to WAV for playback.
      if (!BROWSER_PLAYABLE_MIMES.includes(mimeType)) {
        audioData = pcmBase64ToWavBase64(audioData);
        mimeType = 'audio/wav';
      }
      return { audioData, mimeType };
    }
  }

  throw new Error('No audio data in response');
}

/**
 * Available Gemini TTS voices with sample text (short samples for preview)
 */
export const AVAILABLE_VOICES = [
  { 
    id: 'Puck', 
    name: 'Puck', 
    description: 'Energetic, youthful voice',
    descriptionZh: '充满活力的年轻声音',
    sampleText: 'Hey! This is Puck, ready for adventure!',
    sampleTextZh: '嘿！我是 Puck，准备好冒险了！'
  },
  { 
    id: 'Charon', 
    name: 'Charon', 
    description: 'Deep, authoritative voice',
    descriptionZh: '深沉、权威的声音',
    sampleText: 'Welcome. I am Charon, your guide.',
    sampleTextZh: '欢迎。我是 Charon，你的向导。'
  },
  { 
    id: 'Kore', 
    name: 'Kore', 
    description: 'Warm, friendly female voice',
    descriptionZh: '温暖、亲切的女声',
    sampleText: 'Hello! I\'m Kore, nice to meet you!',
    sampleTextZh: '你好！我是 Kore，很高兴认识你！'
  },
  { 
    id: 'Fenrir', 
    name: 'Fenrir', 
    description: 'Strong, dramatic voice',
    descriptionZh: '强劲、戏剧性的声音',
    sampleText: 'I am Fenrir. The time has come.',
    sampleTextZh: '我是 Fenrir。时机已到。'
  },
  { 
    id: 'Aoede', 
    name: 'Aoede', 
    description: 'Melodic, expressive voice',
    descriptionZh: '悦耳、富有表现力的声音',
    sampleText: 'This is Aoede, listen to my melody.',
    sampleTextZh: '我是 Aoede，聆听我的旋律。'
  },
  { 
    id: 'Leda', 
    name: 'Leda', 
    description: 'Gentle, soothing voice',
    descriptionZh: '温柔、舒缓的声音',
    sampleText: 'Hi, I\'m Leda. Take a deep breath.',
    sampleTextZh: '嗨，我是 Leda。深呼吸吧。'
  },
  { 
    id: 'Orus', 
    name: 'Orus', 
    description: 'Clear, professional voice',
    descriptionZh: '清晰、专业的声音',
    sampleText: 'Good day. I am Orus, at your service.',
    sampleTextZh: '您好。我是 Orus，随时为您服务。'
  },
  { 
    id: 'Zephyr', 
    name: 'Zephyr', 
    description: 'Light, airy voice',
    descriptionZh: '轻盈、飘逸的声音',
    sampleText: 'I\'m Zephyr, like a gentle breeze.',
    sampleTextZh: '我是 Zephyr，如微风般轻柔。'
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

// Voice sample cache (in-memory + disk persistence)
const voiceSampleCache = new Map<string, VoiceSample>();
const CACHE_DIR = path.join(process.cwd(), '.voice-cache');

// Initialize cache directory
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Get cache file path for a voice sample
 */
function getCacheFilePath(voiceId: string, language: string): string {
  return path.join(CACHE_DIR, `${voiceId}-${language}.json`);
}

/**
 * Load sample from disk cache
 */
function loadFromDisk(voiceId: string, language: string): VoiceSample | null {
  const filePath = getCacheFilePath(voiceId, language);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as VoiceSample;
    }
  } catch (error) {
    console.error(`Failed to load cache for ${voiceId}-${language}:`, error);
  }
  return null;
}

/**
 * Save sample to disk cache
 */
function saveToDisk(voiceId: string, language: string, sample: VoiceSample): void {
  const filePath = getCacheFilePath(voiceId, language);
  try {
    fs.writeFileSync(filePath, JSON.stringify(sample));
  } catch (error) {
    console.error(`Failed to save cache for ${voiceId}-${language}:`, error);
  }
}

/**
 * Get or generate a voice sample
 */
export async function getVoiceSample(
  voiceId: string,
  language: 'en' | 'zh' = 'en',
  options: { apiKey?: string } = {}
): Promise<VoiceSample> {
  const cacheKey = `${voiceId}-${language}`;
  
  // Check memory cache first
  const memoryCached = voiceSampleCache.get(cacheKey);
  if (memoryCached) {
    return ensureBrowserPlayable(memoryCached);
  }

  // Check disk cache
  const diskCached = loadFromDisk(voiceId, language);
  if (diskCached) {
    const playable = ensureBrowserPlayable(diskCached);
    voiceSampleCache.set(cacheKey, playable);
    return playable;
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

  // Cache the result (memory + disk)
  voiceSampleCache.set(cacheKey, sample);
  saveToDisk(voiceId, language, sample);

  return ensureBrowserPlayable(sample);
}

/**
 * Pre-generate all voice samples (call on server start)
 * Skips samples that are already cached on disk
 */
export async function preGenerateVoiceSamples(language: 'en' | 'zh' = 'en'): Promise<void> {
  // Count how many need to be generated
  const toGenerate = AVAILABLE_VOICES.filter(v => !loadFromDisk(v.id, language));
  
  if (toGenerate.length === 0) {
    console.log(`Voice samples (${language}): All ${AVAILABLE_VOICES.length} cached ✓`);
    // Load all into memory cache
    for (const voice of AVAILABLE_VOICES) {
      const cached = loadFromDisk(voice.id, language);
      if (cached) {
        voiceSampleCache.set(`${voice.id}-${language}`, cached);
      }
    }
    return;
  }
  
  console.log(`Pre-generating ${toGenerate.length}/${AVAILABLE_VOICES.length} voice samples (${language})...`);
  
  for (const voice of toGenerate) {
    try {
      await getVoiceSample(voice.id, language);
      console.log(`  ✓ ${voice.id} generated`);
    } catch (error) {
      console.error(`  ✗ ${voice.id} failed:`, error instanceof Error ? error.message : error);
    }
  }
  
  console.log(`Voice samples (${language}) complete.`);
}

/**
 * Check if samples are cached
 */
export function hasCachedSamples(language: 'en' | 'zh' = 'en'): boolean {
  return AVAILABLE_VOICES.every(v => {
    const cacheKey = `${v.id}-${language}`;
    return voiceSampleCache.has(cacheKey) || loadFromDisk(v.id, language) !== null;
  });
}
