import { Router, Request, Response } from 'express';
import { generateSpeech, AVAILABLE_VOICES, TTSOptions, getVoiceSample, preGenerateVoiceSamples, hasCachedSamples, recommendVoicesForCharacters } from '../services/gemini.js';

export const voiceRouter = Router();

interface SpeechRequest {
  text: string;
  voiceName?: string;
  apiKey?: string;
}

interface RecommendRequest {
  characters: Array<{ name: string; description?: string }>;
  voices: Array<{ id: string; name: string; description?: string; descriptionZh?: string }>;
  language?: 'en' | 'zh';
}

/**
 * POST /api/voice/recommend
 * Use Gemini Flash to recommend best preset voice for each character
 */
voiceRouter.post('/recommend', async (req: Request, res: Response) => {
  try {
    const { characters, voices, language } = req.body as RecommendRequest;
    if (!Array.isArray(characters) || !Array.isArray(voices)) {
      res.status(400).json({ error: 'characters and voices must be arrays' });
      return;
    }
    const assignments = await recommendVoicesForCharacters(characters, voices, { language });
    res.json({ assignments });
  } catch (error) {
    console.error('Voice recommend error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/voice/voices
 * List available voices with sample URLs
 */
voiceRouter.get('/voices', (_req: Request, res: Response) => {
  const voices = AVAILABLE_VOICES.map(v => ({
    id: v.id,
    name: v.name,
    description: v.description,
    descriptionZh: v.descriptionZh,
    sampleUrl: `/api/voice/sample/${v.id}`
  }));
  res.json({ voices });
});

/**
 * GET /api/voice/sample/:voiceId
 * Get pre-generated voice sample for preview
 */
voiceRouter.get('/sample/:voiceId', async (req: Request, res: Response) => {
  try {
    const { voiceId } = req.params;
    const language = (req.query.lang as string) === 'zh' ? 'zh' : 'en';
    
    const sample = await getVoiceSample(voiceId, language);
    
    res.json({
      voiceId: sample.voiceId,
      audioData: sample.audioData,
      mimeType: sample.mimeType,
      format: sample.mimeType.split('/')[1] || 'wav'
    });
  } catch (error) {
    console.error('Voice sample error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
      return;
    }
    
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/voice/pregenerate
 * Pre-generate all voice samples (admin endpoint)
 */
voiceRouter.post('/pregenerate', async (req: Request, res: Response) => {
  try {
    const language = (req.body?.language as string) === 'zh' ? 'zh' : 'en';
    
    // Don't wait for completion, return immediately
    preGenerateVoiceSamples(language).catch(console.error);
    
    res.json({ 
      message: 'Pre-generation started',
      language,
      voiceCount: AVAILABLE_VOICES.length
    });
  } catch (error) {
    console.error('Pre-generation error:', error);
    res.status(500).json({ error: 'Failed to start pre-generation' });
  }
});

/**
 * GET /api/voice/samples/status
 * Check if voice samples are cached
 */
voiceRouter.get('/samples/status', (_req: Request, res: Response) => {
  res.json({
    en: hasCachedSamples('en'),
    zh: hasCachedSamples('zh'),
    voiceCount: AVAILABLE_VOICES.length
  });
});

/**
 * POST /api/voice/synthesize
 * Generate speech from text
 * Returns base64 audio data
 */
voiceRouter.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, voiceName, apiKey } = req.body as SpeechRequest;
    
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    
    if (text.length > 5000) {
      res.status(400).json({ error: 'Text too long, max 5000 characters' });
      return;
    }
    
    const options: TTSOptions = { voiceName, apiKey };
    const result = await generateSpeech(text, options);
    
    res.json({
      audioData: result.audioData,
      mimeType: result.mimeType,
      format: result.mimeType.split('/')[1] || 'wav'
    });
  } catch (error) {
    console.error('Voice synthesis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('API_KEY')) {
      res.status(401).json({ error: 'Invalid or missing API key', code: 'API_KEY_INVALID' });
      return;
    }
    
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/voice/preview
 * Generate a short preview of a voice (max 100 chars)
 */
voiceRouter.post('/preview', async (req: Request, res: Response) => {
  try {
    const { text, voiceName, apiKey } = req.body as SpeechRequest;
    
    const previewText = text?.slice(0, 100) || 'Hello, this is a voice preview sample.';
    
    const options: TTSOptions = { voiceName, apiKey };
    const result = await generateSpeech(previewText, options);
    
    res.json({
      audioData: result.audioData,
      mimeType: result.mimeType,
      format: result.mimeType.split('/')[1] || 'wav'
    });
  } catch (error) {
    console.error('Voice preview error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
