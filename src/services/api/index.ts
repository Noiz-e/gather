// Backend API Client
// Provides typed interfaces to communicate with the backend

// In dev mode with Vite proxy, use relative path. In production, use env var.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

interface RequestOptions {
  apiKey?: string;
}

// ============ LLM API ============

export interface LLMGenerateOptions extends RequestOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
}

export interface StreamChunk {
  text: string;
  accumulated: string;
}

/**
 * Generate text using Gemini via backend
 */
export async function generateText(prompt: string, options: LLMGenerateOptions = {}): Promise<string> {
  const response = await fetch(`${API_BASE}/llm/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      apiKey: options.apiKey
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate text');
  }
  
  const data = await response.json() as LLMResponse;
  return data.text;
}

/**
 * Generate text with streaming
 */
export async function generateTextStream(
  prompt: string,
  onChunk: (chunk: StreamChunk) => void,
  options: LLMGenerateOptions = {}
): Promise<string> {
  const response = await fetch(`${API_BASE}/llm/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      apiKey: options.apiKey
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate text');
  }
  
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data && data !== '[DONE]') {
          try {
            const chunk = JSON.parse(data) as StreamChunk;
            accumulated = chunk.accumulated;
            onChunk(chunk);
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
  
  return accumulated;
}

// ============ Voice API ============

export interface Voice {
  id: string;
  name: string;
  description: string;
  descriptionZh?: string;
  sampleUrl?: string;
}

export interface VoiceSampleResult {
  voiceId: string;
  audioData: string;  // base64
  mimeType: string;
  format: string;
}

export interface SynthesizeOptions extends RequestOptions {
  voiceName?: string;
}

export interface SynthesizeResult {
  audioData: string;  // base64
  mimeType: string;
  format: string;
}

/**
 * Get available voices
 */
export async function getVoices(): Promise<Voice[]> {
  const response = await fetch(`${API_BASE}/voice/voices`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch voices');
  }
  
  const data = await response.json();
  return data.voices;
}

export interface RecommendVoicesParams {
  characters: Array<{ name: string; description?: string }>;
  voices: Array<{ id: string; name: string; description?: string; descriptionZh?: string }>;
  language?: 'en' | 'zh';
}

/**
 * Recommend best preset voice for each character via Gemini Flash
 * Returns voice IDs in same order as characters
 */
export async function recommendVoices(params: RecommendVoicesParams): Promise<string[]> {
  const response = await fetch(`${API_BASE}/voice/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      characters: params.characters,
      voices: params.voices,
      language: params.language
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to recommend voices');
  }
  const data = await response.json();
  return data.assignments ?? [];
}

/**
 * Get voice sample for preview (pre-generated)
 */
export async function getVoiceSample(voiceId: string, language: 'en' | 'zh' = 'en'): Promise<VoiceSampleResult> {
  const response = await fetch(`${API_BASE}/voice/sample/${voiceId}?lang=${language}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch voice sample');
  }
  
  return response.json();
}

/**
 * Voice sample cache for frontend
 */
const voiceSampleCache = new Map<string, VoiceSampleResult>();

/**
 * Get voice sample with caching
 */
export async function getVoiceSampleCached(voiceId: string, language: 'en' | 'zh' = 'en'): Promise<VoiceSampleResult> {
  const cacheKey = `${voiceId}-${language}`;
  
  const cached = voiceSampleCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const sample = await getVoiceSample(voiceId, language);
  voiceSampleCache.set(cacheKey, sample);
  
  return sample;
}

/**
 * Play voice sample
 */
export async function playVoiceSample(voiceId: string, language: 'en' | 'zh' = 'en'): Promise<HTMLAudioElement> {
  console.log(`Playing voice sample: ${voiceId} (${language})`);
  
  const sample = await getVoiceSampleCached(voiceId, language);
  console.log(`Got sample, mimeType: ${sample.mimeType}, data length: ${sample.audioData?.length || 0}`);
  
  if (!sample.audioData) {
    throw new Error('No audio data in voice sample');
  }
  
  return playAudio(sample.audioData, sample.mimeType);
}

/**
 * Synthesize speech from text
 */
export async function synthesizeSpeech(
  text: string, 
  options: SynthesizeOptions = {}
): Promise<SynthesizeResult> {
  const response = await fetch(`${API_BASE}/voice/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voiceName: options.voiceName,
      apiKey: options.apiKey
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to synthesize speech');
  }
  
  return response.json();
}

/**
 * Preview a voice with sample text
 */
export async function previewVoice(
  voiceName: string, 
  text?: string,
  apiKey?: string
): Promise<SynthesizeResult> {
  const response = await fetch(`${API_BASE}/voice/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voiceName,
      apiKey
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to preview voice');
  }
  
  return response.json();
}

// ============ Audio API ============

export interface AudioSegment {
  text: string;
  voiceName?: string;
  speaker?: string;
}

export interface GeneratedSegment {
  index: number;
  speaker?: string;
  audioData: string;
  mimeType: string;
}

export interface BatchResult {
  segments: GeneratedSegment[];
  errors?: { index: number; error: string }[];
  totalRequested: number;
  totalGenerated: number;
}

export interface BatchProgressEvent {
  type: 'start' | 'progress' | 'segment' | 'error' | 'done';
  index?: number;
  total?: number;
  speaker?: string;
  audioData?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Generate audio for multiple segments
 */
export async function generateAudioBatch(
  segments: AudioSegment[],
  apiKey?: string
): Promise<BatchResult> {
  const response = await fetch(`${API_BASE}/audio/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments, apiKey })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate audio batch');
  }
  
  return response.json();
}

/**
 * Generate audio batch with progress streaming
 */
export async function generateAudioBatchStream(
  segments: AudioSegment[],
  onProgress: (event: BatchProgressEvent) => void,
  apiKey?: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/audio/batch-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments, apiKey })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate audio batch');
  }
  
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data) {
          try {
            const event = JSON.parse(data) as BatchProgressEvent;
            onProgress(event);
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

// ============ Utility Functions ============

/**
 * Convert base64 audio to playable URL
 */
export function audioDataToUrl(audioData: string, mimeType: string): string {
  return `data:${mimeType};base64,${audioData}`;
}

/**
 * Convert base64 audio to Blob
 */
export function audioDataToBlob(audioData: string, mimeType: string): Blob {
  const byteCharacters = atob(audioData);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Play audio from base64 data
 */
export async function playAudio(audioData: string, mimeType: string): Promise<HTMLAudioElement> {
  const url = audioDataToUrl(audioData, mimeType);
  const audio = new Audio(url);
  
  try {
    await audio.play();
  } catch (error) {
    console.error('Audio playback failed:', error);
    throw error;
  }
  
  return audio;
}

/**
 * Download audio file
 */
export function downloadAudio(audioData: string, mimeType: string, filename: string): void {
  const blob = audioDataToBlob(audioData, mimeType);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check if backend is available
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// ============ Image API ============

export interface ImageGenerateOptions extends RequestOptions {
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  numberOfImages?: number;
}

export interface GeneratedImage {
  index: number;
  imageData: string;  // base64
  mimeType: string;
}

/**
 * Generate images from prompt
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerateOptions = {}
): Promise<GeneratedImage[]> {
  const response = await fetch(`${API_BASE}/image/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspectRatio: options.aspectRatio,
      numberOfImages: options.numberOfImages,
      apiKey: options.apiKey
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate image');
  }
  
  const data = await response.json();
  return data.images;
}

/**
 * Generate podcast cover image
 */
export async function generateCoverImage(
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1',
  apiKey?: string
): Promise<{ imageData: string; mimeType: string }> {
  const response = await fetch(`${API_BASE}/image/cover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio, apiKey })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate cover');
  }
  
  return response.json();
}

// ============ Music API ============

export interface MusicOptions extends RequestOptions {
  genre?: string;
  mood?: string;
  durationSeconds?: number;
}

export interface MusicResult {
  audioData: string;  // base64
  mimeType: string;
  format: string;
}

export interface MusicOptionsData {
  genres: string[];
  moods: string[];
}

export interface SfxSuggestion {
  id: string;
  description: string;
}

/**
 * Get available music generation options
 */
export async function getMusicOptions(): Promise<MusicOptionsData> {
  const response = await fetch(`${API_BASE}/music/options`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch music options');
  }
  
  return response.json();
}

/**
 * Generate background music
 */
export async function generateMusic(
  description: string,
  options: MusicOptions = {}
): Promise<MusicResult> {
  const response = await fetch(`${API_BASE}/music/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description,
      genre: options.genre,
      mood: options.mood,
      durationSeconds: options.durationSeconds,
      apiKey: options.apiKey
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate music');
  }
  
  return response.json();
}

/**
 * Generate podcast-optimized background music
 */
export async function generateBGM(
  description?: string,
  mood?: string,
  durationSeconds?: number,
  apiKey?: string
): Promise<MusicResult> {
  const response = await fetch(`${API_BASE}/music/bgm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, mood, durationSeconds, apiKey })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate BGM');
  }
  
  return response.json();
}

/**
 * Generate sound effect
 */
export async function generateSoundEffect(
  description: string,
  durationSeconds?: number,
  apiKey?: string
): Promise<MusicResult> {
  const response = await fetch(`${API_BASE}/music/sfx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, durationSeconds, apiKey })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate sound effect');
  }
  
  return response.json();
}

/**
 * Get common sound effect suggestions
 */
export async function getSfxSuggestions(): Promise<SfxSuggestion[]> {
  const response = await fetch(`${API_BASE}/music/sfx-suggestions`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch SFX suggestions');
  }
  
  const data = await response.json();
  return data.suggestions;
}

// ============ Image Utility Functions ============

/**
 * Convert base64 image to displayable URL
 */
export function imageDataToUrl(imageData: string, mimeType: string): string {
  return `data:${mimeType};base64,${imageData}`;
}

/**
 * Download image file
 */
export function downloadImage(imageData: string, mimeType: string, filename: string): void {
  const byteCharacters = atob(imageData);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
