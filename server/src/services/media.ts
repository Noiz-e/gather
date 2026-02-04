import { GoogleGenAI } from '@google/genai';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Models for media generation
const IMAGE_MODEL = 'imagen-3.0-generate-002';

// Sound effect types (from noizagent)
export type SoundEffectType = 'env' | 'foley' | 'fx' | 'bgm' | 'ambient';

// Constants (aligned with sound_effect_design_tool.py)
const MAX_BATCH_SIZE = 12;
const MIN_SHORT_DURATION_MS = 300;
const MIN_GENERATION_DURATION_MS = 500;
const MAX_SFX_DURATION_MS = 22000;  // ElevenLabs max
const MAX_BGM_DURATION_MS = 180000; // 3 minutes for BGM

export interface ImageGenerateOptions {
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  numberOfImages?: number;
  apiKey?: string;
}

export interface MusicGenerateOptions {
  durationSeconds?: number;
  genre?: string;
  mood?: string;
  instrumental?: boolean;
  apiKey?: string;
  falApiKey?: string;
}

export interface SoundEffectOptions {
  durationSeconds?: number;
  type?: SoundEffectType;
  promptInfluence?: number;  // 0-1, how closely to follow the prompt
  apiKey?: string;  // ElevenLabs API key
}

export interface SoundEffectParam {
  id: string;
  description: string;
  type: SoundEffectType;
  durationMs: number;
  loopable?: boolean;
}

export interface SoundEffectResult {
  id: string;
  type: SoundEffectType;
  audioData?: string;
  mimeType?: string;
  durationMs?: number;
  fromCache?: boolean;
  error?: string;
}

function getGeminiClient(apiKey?: string): GoogleGenAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenAI({ apiKey: key });
}

function getElevenLabsClient(apiKey?: string): ElevenLabsClient {
  const key = apiKey || process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error('ELEVENLABS_API_KEY not configured. Get one at https://elevenlabs.io');
  }
  return new ElevenLabsClient({ apiKey: key });
}

/**
 * Generate image using Imagen 3
 * Returns base64 encoded image data
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerateOptions = {}
): Promise<{ imageData: string; mimeType: string }[]> {
  const client = getGeminiClient(options.apiKey);

  const response = await client.models.generateImages({
    model: IMAGE_MODEL,
    prompt: prompt,
    config: {
      numberOfImages: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || '1:1',
    }
  });

  const images = response.generatedImages || [];
  
  if (images.length === 0) {
    throw new Error('No images generated');
  }

  return images.map(img => ({
    imageData: img.image?.imageBytes || '',
    mimeType: 'image/png'
  }));
}

/**
 * Generate music description prompt for better results
 */
export function buildMusicPrompt(description: string, options: MusicGenerateOptions = {}): string {
  const parts = [description];
  
  if (options.genre) {
    parts.push(`Genre: ${options.genre}`);
  }
  if (options.mood) {
    parts.push(`Mood: ${options.mood}`);
  }
  if (options.durationSeconds) {
    parts.push(`Duration: approximately ${options.durationSeconds} seconds`);
  }
  
  return parts.join('. ');
}

/**
 * Call fal.ai ACE-Step API for BGM generation
 * Requires FAL_KEY environment variable
 */
async function callAceStepApi(
  prompt: string, 
  durationSeconds: number = 60,
  instrumental: boolean = true,
  falApiKey?: string
): Promise<{ audioUrl: string; seed?: number; tags?: string; lyrics?: string }> {
  const apiKey = falApiKey || process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error('FAL_KEY not configured. Get one at https://fal.ai');
  }

  const response = await fetch('https://queue.fal.run/fal-ai/ace-step/prompt-to-audio', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      duration: durationSeconds,
      instrumental,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ACE-Step API error: ${response.status} - ${errorText}`);
  }

  // fal.ai returns a request_id for async processing
  const { request_id } = await response.json() as { request_id: string };
  
  // Poll for result
  const result = await pollFalResult(request_id, apiKey);
  
  if (!result.audio?.url) {
    throw new Error('No audio URL in ACE-Step response');
  }

  return {
    audioUrl: result.audio.url,
    seed: result.seed,
    tags: result.tags,
    lyrics: result.lyrics,
  };
}

/**
 * Poll fal.ai for async result
 */
async function pollFalResult(requestId: string, apiKey: string, maxAttempts = 60): Promise<any> {
  const statusUrl = `https://queue.fal.run/fal-ai/ace-step/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/fal-ai/ace-step/requests/${requestId}`;
  
  for (let i = 0; i < maxAttempts; i++) {
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${apiKey}` },
    });
    
    if (!statusResponse.ok) {
      throw new Error(`Failed to check status: ${statusResponse.status}`);
    }
    
    const status = await statusResponse.json() as { status: string };
    
    if (status.status === 'COMPLETED') {
      const resultResponse = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${apiKey}` },
      });
      return resultResponse.json();
    }
    
    if (status.status === 'FAILED') {
      throw new Error('ACE-Step generation failed');
    }
    
    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('ACE-Step generation timed out');
}

/**
 * Download audio from URL and return as base64
 */
async function downloadAudioAsBase64(url: string): Promise<{ audioData: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const contentType = response.headers.get('content-type') || 'audio/wav';
  
  return {
    audioData: base64,
    mimeType: contentType,
  };
}

/**
 * Generate background music using fal.ai ACE-Step API
 * Best for: BGM, ambient music, cinematic scores
 * See: https://fal.ai/models/fal-ai/ace-step
 */
export async function generateMusic(
  description: string,
  options: MusicGenerateOptions = {}
): Promise<{ audioData: string; mimeType: string }> {
  const prompt = buildMusicPrompt(description, options);
  const durationSeconds = Math.min(options.durationSeconds || 30, MAX_BGM_DURATION_MS / 1000);
  
  const result = await callAceStepApi(
    prompt, 
    durationSeconds, 
    options.instrumental !== false,
    options.falApiKey
  );
  
  return downloadAudioAsBase64(result.audioUrl);
}

/**
 * Generate sound effect using ElevenLabs API
 * Best for: foley, fx, env sounds, short audio clips
 * See: https://elevenlabs.io/docs/api-reference/sound-effects
 */
export async function generateSoundEffect(
  description: string,
  options: SoundEffectOptions = {}
): Promise<{ audioData: string; mimeType: string }> {
  const client = getElevenLabsClient(options.apiKey);
  
  // Clamp duration to valid range
  const durationSeconds = options.durationSeconds 
    ? Math.min(Math.max(options.durationSeconds, MIN_GENERATION_DURATION_MS / 1000), MAX_SFX_DURATION_MS / 1000)
    : 5;
  
  // Add quality hint (from sound_effect_design_tool.py)
  const enhancedPrompt = `${description} [studio-quality]`;
  
  const response = await client.textToSoundEffects.convert({
    text: enhancedPrompt,
    durationSeconds: durationSeconds,
    promptInfluence: options.promptInfluence ?? 1.0,
  });

  // Collect chunks from the generator
  const chunks: Buffer[] = [];
  for await (const chunk of response) {
    chunks.push(Buffer.from(chunk));
  }
  
  const audioBuffer = Buffer.concat(chunks);
  const audioData = audioBuffer.toString('base64');

  return {
    audioData,
    mimeType: 'audio/mpeg',  // ElevenLabs returns MP3
  };
}

/**
 * Batch generate sound effects
 * Processes multiple sound effects in parallel (up to MAX_BATCH_SIZE)
 */
export async function generateSoundEffectsBatch(
  params: SoundEffectParam[],
  options: { apiKey?: string; falApiKey?: string } = {}
): Promise<SoundEffectResult[]> {
  if (params.length > MAX_BATCH_SIZE) {
    throw new Error(`At most ${MAX_BATCH_SIZE} items per batch`);
  }

  const results: SoundEffectResult[] = [];
  
  // Separate BGM from other types
  const bgmParams = params.filter(p => p.type === 'bgm');
  const sfxParams = params.filter(p => p.type !== 'bgm');
  
  // Process BGM with ACE-Step (sequentially, as they're usually longer)
  for (const param of bgmParams) {
    try {
      const result = await generateMusic(param.description, {
        durationSeconds: param.durationMs / 1000,
        falApiKey: options.falApiKey,
      });
      
      results.push({
        id: param.id,
        type: param.type,
        audioData: result.audioData,
        mimeType: result.mimeType,
        durationMs: param.durationMs,
        fromCache: false,
      });
    } catch (error) {
      results.push({
        id: param.id,
        type: param.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  // Process SFX with ElevenLabs (in parallel, up to 3 concurrent)
  const sfxPromises = sfxParams.map(async (param) => {
    try {
      const result = await generateSoundEffect(param.description, {
        durationSeconds: param.durationMs / 1000,
        type: param.type,
        apiKey: options.apiKey,
      });
      
      return {
        id: param.id,
        type: param.type,
        audioData: result.audioData,
        mimeType: result.mimeType,
        durationMs: param.durationMs,
        fromCache: false,
      } as SoundEffectResult;
    } catch (error) {
      return {
        id: param.id,
        type: param.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as SoundEffectResult;
    }
  });
  
  const sfxResults = await Promise.all(sfxPromises);
  results.push(...sfxResults);
  
  return results;
}

/**
 * Available music genres for generation
 */
export const MUSIC_GENRES = [
  'ambient',
  'classical',
  'electronic',
  'jazz',
  'acoustic',
  'cinematic',
  'lo-fi',
  'world',
  'meditation',
  'orchestral'
];

/**
 * Available moods for music generation
 */
export const MUSIC_MOODS = [
  'peaceful',
  'uplifting',
  'dramatic',
  'mysterious',
  'joyful',
  'melancholic',
  'energetic',
  'contemplative',
  'inspiring',
  'relaxing'
];
