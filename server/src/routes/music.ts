import { Router, Request, Response } from 'express';
import { 
  generateMusic, 
  generateSoundEffect,
  generateSoundEffectsBatch,
  MUSIC_GENRES, 
  MUSIC_MOODS,
  MusicGenerateOptions,
  SoundEffectOptions,
  SoundEffectParam,
  SoundEffectType
} from '../services/media.js';

export const musicRouter = Router();

// Max durations (aligned with sound_effect_design_tool.py)
const MAX_SFX_DURATION_SECONDS = 22;
const MAX_BGM_DURATION_SECONDS = 180;

interface MusicRequest {
  description: string;
  genre?: string;
  mood?: string;
  durationSeconds?: number;
  instrumental?: boolean;
  apiKey?: string;      // Gemini API key (legacy)
  falApiKey?: string;   // fal.ai API key for ACE-Step
}

interface SoundEffectRequest {
  description: string;
  durationSeconds?: number;
  type?: SoundEffectType;
  promptInfluence?: number;
  apiKey?: string;  // ElevenLabs API key
}

interface BatchSoundEffectRequest {
  effects: SoundEffectParam[];
  apiKey?: string;      // ElevenLabs API key
  falApiKey?: string;   // fal.ai API key
}

/**
 * GET /api/music/options
 * Get available genres and moods for music generation
 */
musicRouter.get('/options', (_req: Request, res: Response) => {
  res.json({
    genres: MUSIC_GENRES,
    moods: MUSIC_MOODS
  });
});

/**
 * POST /api/music/generate
 * Generate background music using fal.ai ACE-Step
 */
musicRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { description, genre, mood, durationSeconds, instrumental, falApiKey } = req.body as MusicRequest;
    
    if (!description) {
      res.status(400).json({ error: 'description is required' });
      return;
    }
    
    const options: MusicGenerateOptions = { 
      genre, 
      mood, 
      instrumental: instrumental !== false,
      durationSeconds: Math.min(durationSeconds || 30, MAX_BGM_DURATION_SECONDS),
      falApiKey 
    };
    
    const result = await generateMusic(description, options);
    
    res.json({
      audioData: result.audioData,
      mimeType: result.mimeType,
      format: result.mimeType.split('/')[1] || 'wav'
    });
  } catch (error) {
    console.error('Music generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('FAL_KEY') || message.includes('fal.ai')) {
      res.status(401).json({ error: 'Invalid or missing fal.ai API key', code: 'FAL_KEY_INVALID' });
      return;
    }
    
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/music/bgm
 * Generate background music with podcast-optimized settings
 */
musicRouter.post('/bgm', async (req: Request, res: Response) => {
  try {
    const { description, mood, durationSeconds, falApiKey } = req.body as MusicRequest;
    
    // Default description for podcast BGM
    const bgmDescription = description || 'Gentle background music for podcast';
    
    const enhancedDescription = `${bgmDescription}. 
Characteristics: Subtle, non-intrusive, suitable for playing under voice narration. 
No sudden changes or loud sections. Consistent volume throughout.`;
    
    const options: MusicGenerateOptions = { 
      genre: 'ambient',
      mood: mood || 'peaceful', 
      instrumental: true,
      durationSeconds: Math.min(durationSeconds || 30, MAX_BGM_DURATION_SECONDS),
      falApiKey 
    };
    
    const result = await generateMusic(enhancedDescription, options);
    
    res.json({
      audioData: result.audioData,
      mimeType: result.mimeType,
      format: result.mimeType.split('/')[1] || 'wav'
    });
  } catch (error) {
    console.error('BGM generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/music/sfx
 * Generate sound effect using ElevenLabs
 */
musicRouter.post('/sfx', async (req: Request, res: Response) => {
  try {
    const { description, durationSeconds, type, promptInfluence, apiKey } = req.body as SoundEffectRequest;
    
    if (!description) {
      res.status(400).json({ error: 'description is required' });
      return;
    }
    
    const options: SoundEffectOptions = { 
      durationSeconds: Math.min(durationSeconds || 5, MAX_SFX_DURATION_SECONDS),
      type: type || 'fx',
      promptInfluence: promptInfluence ?? 1.0,
      apiKey 
    };
    
    const result = await generateSoundEffect(description, options);
    
    res.json({
      audioData: result.audioData,
      mimeType: result.mimeType,
      format: result.mimeType.split('/')[1] || 'mp3'
    });
  } catch (error) {
    console.error('Sound effect generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('ELEVENLABS') || message.includes('ElevenLabs')) {
      res.status(401).json({ error: 'Invalid or missing ElevenLabs API key', code: 'ELEVENLABS_KEY_INVALID' });
      return;
    }
    
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/music/sfx/batch
 * Generate multiple sound effects in batch
 * Supports both SFX (ElevenLabs) and BGM (ACE-Step)
 */
musicRouter.post('/sfx/batch', async (req: Request, res: Response) => {
  try {
    const { effects, apiKey, falApiKey } = req.body as BatchSoundEffectRequest;
    
    if (!effects || !Array.isArray(effects) || effects.length === 0) {
      res.status(400).json({ error: 'effects array is required' });
      return;
    }
    
    if (effects.length > 12) {
      res.status(400).json({ error: 'At most 12 effects per batch' });
      return;
    }
    
    const results = await generateSoundEffectsBatch(effects, { apiKey, falApiKey });
    
    res.json({ results });
  } catch (error) {
    console.error('Batch sound effect generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * Common podcast sound effects suggestions
 */
const COMMON_SFX = [
  { id: 'intro-whoosh', description: 'Smooth whoosh transition for intro' },
  { id: 'transition-chime', description: 'Gentle chime for section transitions' },
  { id: 'notification-ding', description: 'Soft notification sound' },
  { id: 'page-turn', description: 'Book page turning sound' },
  { id: 'bell-ring', description: 'Meditation bell ringing' },
  { id: 'nature-birds', description: 'Birds chirping in nature' },
  { id: 'water-stream', description: 'Gentle stream water flowing' },
  { id: 'wind-soft', description: 'Soft wind blowing' },
  { id: 'fire-crackling', description: 'Cozy fireplace crackling' },
  { id: 'applause-light', description: 'Light applause from small audience' },
];

/**
 * GET /api/music/sfx-suggestions
 * Get common sound effect suggestions
 */
musicRouter.get('/sfx-suggestions', (_req: Request, res: Response) => {
  res.json({ suggestions: COMMON_SFX });
});
