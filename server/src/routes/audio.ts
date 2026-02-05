import { Router, Request, Response } from 'express';
import { generateBatchCustomSpeech, isCustomTTSConfigured } from '../services/tts.js';

export const audioRouter = Router();

interface AudioSegment {
  text: string;
  speaker?: string;
  // Custom TTS options per segment
  refAudioDataUrl?: string;
  refText?: string;
  speed?: number;
}

interface BatchRequest {
  segments: AudioSegment[];
  // Default custom TTS options for all segments
  defaultRefAudioDataUrl?: string;
  defaultRefText?: string;
}

interface GeneratedSegment {
  index: number;
  speaker?: string;
  audioData: string;
  mimeType: string;
}

/**
 * POST /api/audio/batch
 * Generate audio for multiple segments using custom TTS
 * Returns array of base64 audio segments
 */
audioRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const { segments, defaultRefAudioDataUrl, defaultRefText } = req.body as BatchRequest;
    
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      res.status(400).json({ error: 'segments array is required' });
      return;
    }
    
    if (segments.length > 50) {
      res.status(400).json({ error: 'Too many segments, max 50' });
      return;
    }
    
    if (!isCustomTTSConfigured()) {
      res.status(503).json({ error: 'TTS service not configured' });
      return;
    }
    
    const results: GeneratedSegment[] = [];
    const errors: { index: number; error: string }[] = [];
    
    // Filter valid segments
    const validSegments: { index: number; segment: AudioSegment }[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment.text) {
        errors.push({ index: i, error: 'Missing text' });
        continue;
      }
      validSegments.push({ index: i, segment });
    }
    
    // Process with batch custom TTS
    const batchItems = validSegments.map(({ index, segment }) => ({
      id: String(index),
      text: segment.text,
      refAudioDataUrl: segment.refAudioDataUrl || defaultRefAudioDataUrl,
      refText: segment.refText || defaultRefText,
      speed: segment.speed
    }));
    
    const batchResults = await generateBatchCustomSpeech(batchItems);
    
    for (const result of batchResults) {
      const index = parseInt(result.id);
      const segment = segments[index];
      
      if (result.error) {
        errors.push({ index, error: result.error });
      } else {
        results.push({
          index,
          speaker: segment.speaker,
          audioData: result.audioData!,
          mimeType: result.mimeType!
        });
      }
    }
    
    // Sort results by original index
    results.sort((a, b) => a.index - b.index);
    
    res.json({
      segments: results,
      errors: errors.length > 0 ? errors : undefined,
      totalRequested: segments.length,
      totalGenerated: results.length
    });
  } catch (error) {
    console.error('Audio batch error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/audio/batch-stream
 * Generate audio segments with SSE progress updates using custom TTS
 */
audioRouter.post('/batch-stream', async (req: Request, res: Response) => {
  try {
    const { segments, defaultRefAudioDataUrl, defaultRefText } = req.body as BatchRequest;
    
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      res.status(400).json({ error: 'segments array is required' });
      return;
    }
    
    if (!isCustomTTSConfigured()) {
      res.status(503).json({ error: 'TTS service not configured' });
      return;
    }
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send initial progress
    res.write(`data: ${JSON.stringify({ type: 'start', total: segments.length })}\n\n`);
    
    // Process with batch custom TTS (concurrent)
    const batchItems = segments.map((segment, index) => ({
      id: String(index),
      text: segment.text || '',
      refAudioDataUrl: segment.refAudioDataUrl || defaultRefAudioDataUrl,
      refText: segment.refText || defaultRefText,
      speed: segment.speed
    }));
    
    const batchResults = await generateBatchCustomSpeech(batchItems);
    
    for (const result of batchResults) {
      const index = parseInt(result.id);
      const segment = segments[index];
      
      if (result.error) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          index, 
          error: result.error 
        })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({
          type: 'segment',
          index,
          speaker: segment.speaker,
          audioData: result.audioData,
          mimeType: result.mimeType
        })}\n\n`);
      }
    }
    
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Audio batch stream error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
});
