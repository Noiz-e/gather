import { Router, Request, Response } from 'express';
import { generateSpeech, TTSOptions } from '../services/gemini.js';

export const audioRouter = Router();

interface AudioSegment {
  text: string;
  voiceName?: string;
  speaker?: string;
}

interface BatchRequest {
  segments: AudioSegment[];
  apiKey?: string;
}

interface GeneratedSegment {
  index: number;
  speaker?: string;
  audioData: string;
  mimeType: string;
}

/**
 * POST /api/audio/batch
 * Generate audio for multiple segments (e.g., different speakers in a script)
 * Returns array of base64 audio segments
 */
audioRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const { segments, apiKey } = req.body as BatchRequest;
    
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      res.status(400).json({ error: 'segments array is required' });
      return;
    }
    
    if (segments.length > 50) {
      res.status(400).json({ error: 'Too many segments, max 50' });
      return;
    }
    
    const results: GeneratedSegment[] = [];
    const errors: { index: number; error: string }[] = [];
    
    // Process segments sequentially to avoid rate limiting
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      if (!segment.text) {
        errors.push({ index: i, error: 'Missing text' });
        continue;
      }
      
      try {
        const options: TTSOptions = { voiceName: segment.voiceName, apiKey };
        const result = await generateSpeech(segment.text, options);
        
        results.push({
          index: i,
          speaker: segment.speaker,
          audioData: result.audioData,
          mimeType: result.mimeType
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ index: i, error: message });
      }
    }
    
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
 * Generate audio segments with SSE progress updates
 */
audioRouter.post('/batch-stream', async (req: Request, res: Response) => {
  try {
    const { segments, apiKey } = req.body as BatchRequest;
    
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      res.status(400).json({ error: 'segments array is required' });
      return;
    }
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send initial progress
    res.write(`data: ${JSON.stringify({ type: 'start', total: segments.length })}\n\n`);
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Send progress update
      res.write(`data: ${JSON.stringify({ 
        type: 'progress', 
        index: i, 
        total: segments.length,
        speaker: segment.speaker 
      })}\n\n`);
      
      if (!segment.text) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          index: i, 
          error: 'Missing text' 
        })}\n\n`);
        continue;
      }
      
      try {
        const options: TTSOptions = { voiceName: segment.voiceName, apiKey };
        const result = await generateSpeech(segment.text, options);
        
        res.write(`data: ${JSON.stringify({
          type: 'segment',
          index: i,
          speaker: segment.speaker,
          audioData: result.audioData,
          mimeType: result.mimeType
        })}\n\n`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          index: i, 
          error: message 
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
