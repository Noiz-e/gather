import { Router, Request, Response } from 'express';
import { 
  generateMusic, 
  generateSoundEffect, 
  MUSIC_GENRES, 
  MUSIC_MOODS,
  MusicGenerateOptions,
  SoundEffectOptions
} from '../services/media.js';

export const musicRouter = Router();

interface MusicRequest {
  description: string;
  genre?: string;
  mood?: string;
  durationSeconds?: number;
  apiKey?: string;
}

interface SoundEffectRequest {
  description: string;
  durationSeconds?: number;
  apiKey?: string;
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
 * Generate background music
 */
musicRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { description, genre, mood, durationSeconds, apiKey } = req.body as MusicRequest;
    
    if (!description) {
      res.status(400).json({ error: 'description is required' });
      return;
    }
    
    const options: MusicGenerateOptions = { 
      genre, 
      mood, 
      durationSeconds: Math.min(durationSeconds || 30, 60),  // Max 60 seconds
      apiKey 
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
    
    if (message.includes('API_KEY') || message.includes('API key')) {
      res.status(401).json({ error: 'Invalid or missing API key', code: 'API_KEY_INVALID' });
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
    const { description, mood, durationSeconds, apiKey } = req.body as MusicRequest;
    
    // Default description for podcast BGM
    const bgmDescription = description || 'Gentle background music for podcast';
    
    const enhancedDescription = `${bgmDescription}. 
Characteristics: Subtle, non-intrusive, suitable for playing under voice narration. 
No sudden changes or loud sections. Consistent volume throughout.`;
    
    const options: MusicGenerateOptions = { 
      genre: 'ambient',
      mood: mood || 'peaceful', 
      durationSeconds: Math.min(durationSeconds || 30, 60),
      apiKey 
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
 * Generate sound effect
 */
musicRouter.post('/sfx', async (req: Request, res: Response) => {
  try {
    const { description, durationSeconds, apiKey } = req.body as SoundEffectRequest;
    
    if (!description) {
      res.status(400).json({ error: 'description is required' });
      return;
    }
    
    const options: SoundEffectOptions = { 
      durationSeconds: Math.min(durationSeconds || 5, 15),  // Max 15 seconds for SFX
      apiKey 
    };
    
    const result = await generateSoundEffect(description, options);
    
    res.json({
      audioData: result.audioData,
      mimeType: result.mimeType,
      format: result.mimeType.split('/')[1] || 'wav'
    });
  } catch (error) {
    console.error('Sound effect generation error:', error);
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
