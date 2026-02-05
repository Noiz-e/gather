/**
 * Custom TTS Service - Voice cloning with reference audio
 * Based on the TTS endpoint pattern from batch_tts_tool.py
 */

import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const TTS_ENDPOINT = process.env.TTS_ENDPOINT || '';

// Check if custom TTS is configured
export function isCustomTTSConfigured(): boolean {
  return !!TTS_ENDPOINT;
}

export interface CustomTTSOptions {
  /** Reference audio file path (for voice cloning) */
  refAudioPath?: string;
  /** Reference audio as base64 data URL */
  refAudioDataUrl?: string;
  /** Reference text (prompt text for the reference audio) */
  refText?: string;
  /** Target duration in milliseconds (0 = auto) */
  targetDuration?: number;
  /** Speech speed (0.7 - 1.3, default 1.0) */
  speed?: number;
  /** Speaker ID (-1 = use reference audio) */
  spkId?: number;
  /** Target language */
  targetLanguage?: string;
  /** Prompt language */
  promptLanguage?: string;
  /** Quality preset (0 = default) */
  qualityPreset?: number;
  /** Balance volume */
  balanceVolume?: boolean;
  /** Emotion enhancement */
  emotionEnh?: string;
}

export interface CustomTTSResult {
  audioData: string;  // base64 WAV
  mimeType: string;
  durationMs?: number;
}

/**
 * Sanitize text for HTTP request
 */
function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Remove control characters (except newline and tab)
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize newlines
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\n\s*\n/g, '\n').replace(/[ \t]+/g, ' ');
  
  // Trim
  sanitized = sanitized.trim();
  
  // Limit length
  const maxLength = 10000;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '...';
  }
  
  return sanitized;
}

/**
 * Pad short text for better TTS processing
 */
function padText(text: string): string {
  const sanitized = sanitizeText(text);
  if (sanitized.length < 10) {
    return ` ${sanitized} `;
  }
  return sanitized;
}

/**
 * Convert data URL to Buffer
 */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64')
  };
}

/**
 * Generate speech using custom TTS endpoint
 */
export async function generateCustomSpeech(
  text: string,
  options: CustomTTSOptions = {}
): Promise<CustomTTSResult> {
  if (!TTS_ENDPOINT) {
    throw new Error('Custom TTS endpoint not configured');
  }

  const targetText = padText(text);
  
  // Prepare form data
  const formData = new FormData();
  formData.append('synthesis_text', targetText);
  formData.append('prompt_text', options.refText || '');
  formData.append('spk_id', String(options.spkId ?? -1));
  formData.append('quality_preset', String(options.qualityPreset ?? 0));
  formData.append('balance_volume', String(options.balanceVolume ?? false));

  // Optional parameters
  if (options.targetLanguage) {
    formData.append('target_language', options.targetLanguage);
  }
  if (options.promptLanguage) {
    formData.append('prompt_language', options.promptLanguage);
  }
  
  // Speed or duration
  if (options.speed && options.speed !== 0) {
    const speed = Math.max(0.7, Math.min(1.3, options.speed));
    formData.append('speech_speed', String(speed));
  } else if (options.targetDuration && options.targetDuration > 0) {
    formData.append('duration', String(options.targetDuration / 1000));
  }
  
  if (options.emotionEnh) {
    formData.append('emotion_enh', options.emotionEnh);
  }

  // Add reference audio if provided
  if (options.refAudioDataUrl) {
    const { buffer, mimeType } = dataUrlToBuffer(options.refAudioDataUrl);
    const ext = mimeType.split('/')[1] || 'wav';
    formData.append('wav', buffer, {
      filename: `reference.${ext}`,
      contentType: mimeType
    });
  } else if (options.refAudioPath && fs.existsSync(options.refAudioPath)) {
    const audioBuffer = fs.readFileSync(options.refAudioPath);
    const ext = path.extname(options.refAudioPath).slice(1) || 'wav';
    formData.append('wav', audioBuffer, {
      filename: path.basename(options.refAudioPath),
      contentType: `audio/${ext}`
    });
  }

  // Make request with retry logic
  let lastError: Error | null = null;
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS error: ${response.status}, ${errorText}`);
      }

      // Read response as buffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      
      // The response is already WAV format from the TTS endpoint
      const audioData = audioBuffer.toString('base64');
      
      return {
        audioData,
        mimeType: 'audio/wav'
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`TTS attempt ${attempt + 1} failed:`, lastError.message);
      
      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(3, attempt), 9000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('TTS generation failed after retries');
}

/**
 * Batch TTS generation with concurrent processing
 */
export interface BatchTTSItem {
  id: string;
  text: string;
  refAudioDataUrl?: string;
  refAudioPath?: string;
  refText?: string;
  speed?: number;
  targetDuration?: number;
}

export interface BatchTTSResult {
  id: string;
  audioData?: string;
  mimeType?: string;
  durationMs?: number;
  error?: string;
}

export async function generateBatchCustomSpeech(
  items: BatchTTSItem[],
  defaultRefAudioDataUrl?: string,
  defaultRefText?: string,
  maxConcurrent: number = 5
): Promise<BatchTTSResult[]> {
  const results: BatchTTSResult[] = [];
  
  // Process in batches to limit concurrency
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          const result = await generateCustomSpeech(item.text, {
            refAudioDataUrl: item.refAudioDataUrl || defaultRefAudioDataUrl,
            refAudioPath: item.refAudioPath,
            refText: item.refText || defaultRefText,
            speed: item.speed,
            targetDuration: item.targetDuration
          });
          
          return {
            id: item.id,
            audioData: result.audioData,
            mimeType: result.mimeType,
            durationMs: result.durationMs
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          return {
            id: item.id,
            error: message
          };
        }
      })
    );
    
    results.push(...batchResults);
  }
  
  // Sort by original order
  const itemOrder = new Map(items.map((item, i) => [item.id, i]));
  results.sort((a, b) => (itemOrder.get(a.id) ?? 0) - (itemOrder.get(b.id) ?? 0));
  
  return results;
}
