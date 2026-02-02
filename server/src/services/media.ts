import { GoogleGenAI } from '@google/genai';

// Models for media generation
const IMAGE_MODEL = 'imagen-3.0-generate-002';

export interface ImageGenerateOptions {
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  numberOfImages?: number;
  apiKey?: string;
}

export interface MusicGenerateOptions {
  durationSeconds?: number;
  genre?: string;
  mood?: string;
  apiKey?: string;
}

export interface SoundEffectOptions {
  durationSeconds?: number;
  apiKey?: string;
}

function getClient(apiKey?: string): GoogleGenAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Generate image using Imagen 3
 * Returns base64 encoded image data
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerateOptions = {}
): Promise<{ imageData: string; mimeType: string }[]> {
  const client = getClient(options.apiKey);

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
 * Generate background music using Gemini
 * Note: This uses Gemini's audio generation capabilities
 */
export async function generateMusic(
  description: string,
  options: MusicGenerateOptions = {}
): Promise<{ audioData: string; mimeType: string }> {
  const client = getClient(options.apiKey);
  
  const prompt = `Generate background music: ${buildMusicPrompt(description, options)}. 
This should be instrumental music suitable for podcast background.`;

  // Use Gemini 2.0 Flash with audio output
  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
    config: {
      responseModalities: ['AUDIO'],
    }
  });

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
 * Generate sound effect
 */
export async function generateSoundEffect(
  description: string,
  options: SoundEffectOptions = {}
): Promise<{ audioData: string; mimeType: string }> {
  const client = getClient(options.apiKey);
  
  const durationHint = options.durationSeconds 
    ? `Duration: approximately ${options.durationSeconds} seconds.` 
    : '';
  
  const prompt = `Generate a sound effect: ${description}. ${durationHint}
This should be a realistic sound effect, not music.`;

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
    config: {
      responseModalities: ['AUDIO'],
    }
  });

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
