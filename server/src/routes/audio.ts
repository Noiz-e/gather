import { Router, Request, Response } from 'express';
import { generateBatchCustomSpeech, isCustomTTSConfigured } from '../services/tts.js';
import { generateSpeech } from '../services/gemini.js';
import { isGCSConfigured, uploadFile, getBucketName } from '../services/gcs.js';
import { applyLexicon } from '../services/lexicon.js';
import { randomUUID } from 'crypto';

export const audioRouter = Router();

interface AudioSegment {
  text: string;
  speaker?: string;
  // System voice (Gemini TTS) - identified by voiceName
  voiceName?: string;
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
  audioUrl?: string; // GCS URL for persistent storage
}

/**
 * Upload a generated audio segment to GCS
 * Returns the public URL, or null if GCS is not configured
 */
async function uploadSegmentToGCS(
  audioData: string,
  mimeType: string,
  batchId: string,
  index: number
): Promise<string | null> {
  if (!isGCSConfigured()) return null;
  
  try {
    const ext = mimeType.includes('mp3') || mimeType.includes('mpeg') ? 'mp3' : 'wav';
    const gcsPath = `killagent/voice-segments/${batchId}/${index}.${ext}`;
    const buffer = Buffer.from(audioData, 'base64');
    const url = await uploadFile(gcsPath, buffer, mimeType);
    return url;
  } catch (err) {
    console.warn(`Failed to upload segment ${index} to GCS:`, err);
    return null;
  }
}

/**
 * POST /api/audio/batch
 * Generate audio for multiple segments using system voices (Gemini TTS) or custom TTS
 * Returns array of base64 audio segments with GCS URLs for persistent storage
 */
audioRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const { segments, defaultRefAudioDataUrl, defaultRefText } = req.body as BatchRequest;
    
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      res.status(400).json({ error: 'segments array is required' });
      return;
    }
    
    if (segments.length > 100) {
      res.status(400).json({ error: 'Too many segments, max 100' });
      return;
    }
    
    const results: GeneratedSegment[] = [];
    const errors: { index: number; error: string }[] = [];
    
    // Generate a batch ID for GCS storage
    const batchId = randomUUID();
    
    // Separate segments into system voice (Gemini TTS) and custom TTS
    const systemVoiceSegments: { index: number; segment: AudioSegment }[] = [];
    const customTTSSegments: { index: number; segment: AudioSegment }[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment.text) {
        errors.push({ index: i, error: 'Missing text' });
        continue;
      }
      if (segment.voiceName) {
        systemVoiceSegments.push({ index: i, segment });
      } else {
        customTTSSegments.push({ index: i, segment });
      }
    }
    
    // Process system voice segments (Gemini TTS) concurrently
    if (systemVoiceSegments.length > 0) {
      const systemResults = await Promise.all(
        systemVoiceSegments.map(async ({ index, segment }) => {
          try {
            const spokenText = applyLexicon(segment.text);
            const result = await generateSpeech(spokenText, { voiceName: segment.voiceName });
            return { index, segment, result, error: null };
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return { index, segment, result: null, error: message };
          }
        })
      );
      
      for (const { index, segment, result, error } of systemResults) {
        if (error || !result) {
          errors.push({ index, error: error || 'Unknown error' });
        } else {
          results.push({
            index,
            speaker: segment.speaker,
            audioData: result.audioData,
            mimeType: result.mimeType
          });
        }
      }
    }
    
    // Process custom TTS segments
    if (customTTSSegments.length > 0) {
      if (!isCustomTTSConfigured()) {
        for (const { index } of customTTSSegments) {
          errors.push({ index, error: 'Custom TTS service not configured' });
        }
      } else {
        const batchItems = customTTSSegments.map(({ index, segment }) => ({
          id: String(index),
          text: applyLexicon(segment.text),
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
      }
    }
    
    // Upload all generated segments to GCS in parallel (non-blocking)
    const uploadPromises = results.map(async (seg) => {
      const url = await uploadSegmentToGCS(seg.audioData, seg.mimeType, batchId, seg.index);
      if (url) {
        seg.audioUrl = url;
      }
    });
    await Promise.all(uploadPromises);
    
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
 * Generate audio segments with SSE progress updates using system voices (Gemini TTS) or custom TTS
 */
audioRouter.post('/batch-stream', async (req: Request, res: Response) => {
  try {
    const { segments, defaultRefAudioDataUrl, defaultRefText } = req.body as BatchRequest;
    
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      res.status(400).json({ error: 'segments array is required' });
      return;
    }
    
    if (segments.length > 100) {
      res.status(400).json({ error: 'Too many segments, max 100' });
      return;
    }
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send initial progress
    res.write(`data: ${JSON.stringify({ type: 'start', total: segments.length })}\n\n`);
    
    // Separate segments into system voice (Gemini TTS) and custom TTS
    const systemVoiceSegments: { index: number; segment: AudioSegment }[] = [];
    const customTTSSegments: { index: number; segment: AudioSegment }[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.voiceName) {
        systemVoiceSegments.push({ index: i, segment });
      } else {
        customTTSSegments.push({ index: i, segment });
      }
    }
    
    // Generate a batch ID for GCS storage
    const batchId = randomUUID();
    
    // Process system voice segments (Gemini TTS) concurrently
    if (systemVoiceSegments.length > 0) {
      const systemResults = await Promise.all(
        systemVoiceSegments.map(async ({ index, segment }) => {
          try {
            const spokenText = applyLexicon(segment.text || '');
            const result = await generateSpeech(spokenText, { voiceName: segment.voiceName });
            return { index, segment, result, error: null };
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return { index, segment, result: null, error: message };
          }
        })
      );
      
      for (const { index, segment, result, error } of systemResults) {
        if (error || !result) {
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            index, 
            error: error || 'Unknown error' 
          })}\n\n`);
        } else {
          // Upload to GCS in background (don't block SSE)
          const audioUrl = await uploadSegmentToGCS(result.audioData, result.mimeType, batchId, index);
          res.write(`data: ${JSON.stringify({
            type: 'segment',
            index,
            speaker: segment.speaker,
            audioData: result.audioData,
            mimeType: result.mimeType,
            ...(audioUrl ? { audioUrl } : {})
          })}\n\n`);
        }
      }
    }
    
    // Process custom TTS segments
    if (customTTSSegments.length > 0) {
      if (!isCustomTTSConfigured()) {
        for (const { index } of customTTSSegments) {
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            index, 
            error: 'Custom TTS service not configured' 
          })}\n\n`);
        }
      } else {
        const batchItems = customTTSSegments.map(({ index, segment }) => ({
          id: String(index),
          text: applyLexicon(segment.text || ''),
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
            // Upload to GCS
            const audioUrl = await uploadSegmentToGCS(result.audioData!, result.mimeType!, batchId, index);
            res.write(`data: ${JSON.stringify({
              type: 'segment',
              index,
              speaker: segment.speaker,
              audioData: result.audioData,
              mimeType: result.mimeType,
              ...(audioUrl ? { audioUrl } : {})
            })}\n\n`);
          }
        }
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
