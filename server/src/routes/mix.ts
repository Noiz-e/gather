import { Router, Request, Response } from 'express';

export const mixRouter = Router();

// Audio track for mixing (from API request)
interface AudioTrack {
  audioData?: string;  // base64 (optional if audioUrl is provided)
  audioUrl?: string;   // GCS/HTTP URL to fetch audio from (fallback when audioData is missing)
  mimeType: string;
  speaker?: string;   // Speaker identifier for gap calculation
  sectionStart?: boolean; // True if this is the first segment of a new section
  pauseAfterMs?: number; // Custom pause after this track (overrides default gap)
  startMs?: number;   // Start time offset (for future timeline editing)
  volume?: number;    // 0-1, default 1
}

// Audio track with resolved audioData (after URL fetch)
interface ResolvedAudioTrack extends AudioTrack {
  audioData: string;  // guaranteed to be present
}

// Audio mix configuration
interface AudioMixConfig {
  // Silence padding (in milliseconds)
  silenceStartMs: number;      // Silence at the beginning
  silenceEndMs: number;        // Silence at the end
  
  // Inter-segment gaps (in milliseconds)
  sameSpeakerGapMs: number;    // Gap between same speaker's lines
  differentSpeakerGapMs: number; // Gap between different speakers
  sectionGapMs: number;        // Gap between sections
  
  // Volume levels (0-1)
  voiceVolume: number;         // Main voice volume
  bgmVolume: number;           // Background music volume
  sfxVolume: number;           // Sound effects volume
  
  // Fade effects (in milliseconds)
  bgmFadeInMs: number;         // BGM fade in duration
  bgmFadeOutMs: number;        // BGM fade out duration
  
  // Advanced options
  normalizeAudio: boolean;
  compressAudio: boolean;
}

// Default config
const DEFAULT_MIX_CONFIG: AudioMixConfig = {
  silenceStartMs: 500,
  silenceEndMs: 1000,
  sameSpeakerGapMs: 400,
  differentSpeakerGapMs: 800,
  sectionGapMs: 2000,
  voiceVolume: 1.0,
  bgmVolume: 0.30,
  sfxVolume: 0.35,
  bgmFadeInMs: 1500,
  bgmFadeOutMs: 2000,
  normalizeAudio: true,
  compressAudio: false,
};

/**
 * Fetch audio from a URL (GCS public URL, signed URL, or any HTTP URL)
 * and return as base64 string
 */
async function fetchAudioFromUrl(url: string): Promise<{ audioData: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = response.headers.get('content-type') || 'audio/wav';
  
  return { audioData: base64, mimeType };
}

// Mix request
interface MixRequest {
  voiceTracks: AudioTrack[];           // Voice segments to concatenate
  bgmTrack?: AudioTrack;               // Background music (optional)
  sfxTracks?: AudioTrack[];            // Sound effects (optional)
  config?: Partial<AudioMixConfig>;    // Mix configuration
  outputFormat?: 'wav' | 'mp3';        // Output format
}

// Mix result
interface MixResult {
  audioData: string;    // base64 of final mixed audio
  mimeType: string;
  durationMs: number;
  trackCount: number;
}

/**
 * Simple WAV header parser to extract audio data info
 */
function parseWavHeader(buffer: Buffer): { 
  sampleRate: number; 
  channels: number; 
  bitsPerSample: number;
  dataOffset: number;
  dataSize: number;
} | null {
  // Check RIFF header
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buffer.toString('ascii', 8, 12) !== 'WAVE') return null;
  
  // Find fmt chunk
  let offset = 12;
  let sampleRate = 44100;
  let channels = 1;
  let bitsPerSample = 16;
  let dataOffset = 0;
  let dataSize = 0;
  
  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    
    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }
    
    offset += 8 + chunkSize;
    // Ensure even alignment
    if (chunkSize % 2 !== 0) offset++;
  }
  
  return { sampleRate, channels, bitsPerSample, dataOffset, dataSize };
}

/**
 * Create WAV header for given audio parameters
 */
function createWavHeader(
  dataSize: number,
  sampleRate: number = 24000,
  channels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  
  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);  // File size - 8
  header.write('WAVE', 8);
  
  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);             // fmt chunk size
  header.writeUInt16LE(1, 20);              // Audio format (1 = PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  
  return header;
}

/**
 * Extract raw PCM data from base64 audio (handles WAV and raw PCM)
 */
function extractPcmData(audioData: string, mimeType: string): {
  pcmData: Buffer;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
} {
  const buffer = Buffer.from(audioData, 'base64');
  
  // Try to parse as WAV
  const wavInfo = parseWavHeader(buffer);
  if (wavInfo && wavInfo.dataOffset > 0) {
    return {
      pcmData: buffer.subarray(wavInfo.dataOffset, wavInfo.dataOffset + wavInfo.dataSize),
      sampleRate: wavInfo.sampleRate,
      channels: wavInfo.channels,
      bitsPerSample: wavInfo.bitsPerSample
    };
  }
  
  // Assume raw PCM with default params (Gemini TTS defaults)
  return {
    pcmData: buffer,
    sampleRate: 24000,
    channels: 1,
    bitsPerSample: 16
  };
}

/**
 * Create silence buffer of given duration
 */
function createSilence(
  durationMs: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Buffer {
  const bytesPerSample = bitsPerSample / 8;
  const samplesPerChannel = Math.floor((durationMs / 1000) * sampleRate);
  const totalBytes = samplesPerChannel * channels * bytesPerSample;
  return Buffer.alloc(totalBytes, 0);  // All zeros = silence
}

/**
 * Apply volume to PCM data (simple linear scaling)
 */
function applyVolume(pcmData: Buffer, volume: number, bitsPerSample: number): Buffer {
  if (volume === 1) return pcmData;
  
  const result = Buffer.alloc(pcmData.length);
  
  if (bitsPerSample === 16) {
    for (let i = 0; i < pcmData.length; i += 2) {
      let sample = pcmData.readInt16LE(i);
      sample = Math.round(sample * volume);
      // Clamp to prevent clipping
      sample = Math.max(-32768, Math.min(32767, sample));
      result.writeInt16LE(sample, i);
    }
  } else {
    // For other bit depths, just copy
    pcmData.copy(result);
  }
  
  return result;
}

/**
 * Apply fade effect to PCM data
 */
function applyFade(
  pcmData: Buffer,
  fadeInMs: number,
  fadeOutMs: number,
  sampleRate: number,
  bitsPerSample: number
): Buffer {
  const result = Buffer.alloc(pcmData.length);
  pcmData.copy(result);
  
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = pcmData.length / bytesPerSample;
  
  const fadeInSamples = Math.floor((fadeInMs / 1000) * sampleRate);
  const fadeOutSamples = Math.floor((fadeOutMs / 1000) * sampleRate);
  const fadeOutStart = totalSamples - fadeOutSamples;
  
  if (bitsPerSample === 16) {
    for (let sampleIdx = 0; sampleIdx < totalSamples; sampleIdx++) {
      const byteOffset = sampleIdx * bytesPerSample;
      let sample = result.readInt16LE(byteOffset);
      
      // Apply fade in
      if (sampleIdx < fadeInSamples && fadeInSamples > 0) {
        const fadeRatio = sampleIdx / fadeInSamples;
        sample = Math.round(sample * fadeRatio);
      }
      
      // Apply fade out
      if (sampleIdx >= fadeOutStart && fadeOutSamples > 0) {
        const fadeRatio = (totalSamples - sampleIdx) / fadeOutSamples;
        sample = Math.round(sample * fadeRatio);
      }
      
      result.writeInt16LE(sample, byteOffset);
    }
  }
  
  return result;
}

/**
 * Concatenate multiple audio tracks with gaps based on speaker
 */
function concatenateWithGaps(
  tracks: ResolvedAudioTrack[],
  config: AudioMixConfig
): {
  audioData: string;
  mimeType: string;
  durationMs: number;
} {
  if (tracks.length === 0) {
    throw new Error('No tracks to concatenate');
  }
  
  // Extract PCM data from all tracks
  const pcmSegments: Buffer[] = [];
  let sampleRate = 24000;
  let channels = 1;
  let bitsPerSample = 16;
  let previousSpeaker: string | undefined;
  
  // Add silence at start
  if (config.silenceStartMs > 0) {
    // We need to determine sample rate first from first track
    const firstExtracted = extractPcmData(tracks[0].audioData, tracks[0].mimeType);
    sampleRate = firstExtracted.sampleRate;
    channels = firstExtracted.channels;
    bitsPerSample = firstExtracted.bitsPerSample;
    
    const startSilence = createSilence(config.silenceStartMs, sampleRate, channels, bitsPerSample);
    pcmSegments.push(startSilence);
  }
  
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const extracted = extractPcmData(track.audioData, track.mimeType);
    
    // Use first track's parameters as reference
    if (i === 0 && config.silenceStartMs <= 0) {
      sampleRate = extracted.sampleRate;
      channels = extracted.channels;
      bitsPerSample = extracted.bitsPerSample;
    }
    
    // Add gap before this track (not before first track)
    if (i > 0) {
      let gapMs: number;
      const prevTrack = tracks[i - 1];
      
      // Priority: previous track's custom pauseAfterMs > section gap > speaker-based gap
      if (prevTrack.pauseAfterMs != null && prevTrack.pauseAfterMs > 0) {
        // Custom per-line pause set by user
        gapMs = prevTrack.pauseAfterMs;
      } else if (track.sectionStart && config.sectionGapMs > 0) {
        // Section boundary - use longer section gap
        gapMs = config.sectionGapMs;
      } else {
        const currentSpeaker = track.speaker;
        
        if (currentSpeaker && previousSpeaker && currentSpeaker === previousSpeaker) {
          // Same speaker - shorter gap
          gapMs = config.sameSpeakerGapMs;
        } else {
          // Different speaker or no speaker info - longer gap
          gapMs = config.differentSpeakerGapMs;
        }
      }
      
      if (gapMs > 0) {
        const gapSilence = createSilence(gapMs, sampleRate, channels, bitsPerSample);
        pcmSegments.push(gapSilence);
      }
    }
    
    // Apply volume and add PCM data
    let pcmData = extracted.pcmData;
    const volume = (track.volume ?? 1) * config.voiceVolume;
    if (volume !== 1) {
      pcmData = applyVolume(pcmData, volume, bitsPerSample);
    }
    
    pcmSegments.push(pcmData);
    previousSpeaker = track.speaker;
  }
  
  // Add silence at end
  if (config.silenceEndMs > 0) {
    const endSilence = createSilence(config.silenceEndMs, sampleRate, channels, bitsPerSample);
    pcmSegments.push(endSilence);
  }
  
  // Concatenate all segments
  const totalPcmSize = pcmSegments.reduce((sum, buf) => sum + buf.length, 0);
  const combinedPcm = Buffer.concat(pcmSegments, totalPcmSize);
  
  // Create WAV file
  const wavHeader = createWavHeader(totalPcmSize, sampleRate, channels, bitsPerSample);
  const wavFile = Buffer.concat([wavHeader, combinedPcm]);
  
  // Calculate duration
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = totalPcmSize / bytesPerSample / channels;
  const durationMs = (totalSamples / sampleRate) * 1000;
  
  return {
    audioData: wavFile.toString('base64'),
    mimeType: 'audio/wav',
    durationMs: Math.round(durationMs)
  };
}

/**
 * Mix BGM with voice track
 * BGM is mixed at configured volume with fade in/out and loops if shorter
 */
function mixWithBgm(
  voiceData: { audioData: string; mimeType: string; durationMs: number },
  bgmTrack: ResolvedAudioTrack,
  config: AudioMixConfig
): { audioData: string; mimeType: string; durationMs: number } {
  // Extract voice PCM
  const voice = extractPcmData(voiceData.audioData, voiceData.mimeType);
  
  // Extract BGM PCM
  const bgm = extractPcmData(bgmTrack.audioData, bgmTrack.mimeType);
  
  // Use voice parameters as reference
  const { sampleRate, channels, bitsPerSample } = voice;
  
  // Prepare result buffer (same size as voice)
  const result = Buffer.alloc(voice.pcmData.length);
  
  // Mix parameters
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = voice.pcmData.length / bytesPerSample;
  const bgmVolume = (bgmTrack.volume ?? 1) * config.bgmVolume;
  
  // Calculate fade samples
  const fadeInSamples = Math.floor((config.bgmFadeInMs / 1000) * sampleRate);
  const fadeOutSamples = Math.floor((config.bgmFadeOutMs / 1000) * sampleRate);
  const fadeOutStart = totalSamples - fadeOutSamples;
  
  for (let sampleIdx = 0; sampleIdx < totalSamples; sampleIdx++) {
    const byteOffset = sampleIdx * bytesPerSample;
    
    // Get voice sample
    const voiceSample = voice.pcmData.readInt16LE(byteOffset);
    
    // Get BGM sample (with looping)
    const bgmByteOffset = (byteOffset % bgm.pcmData.length);
    let bgmSample = 0;
    if (bgmByteOffset + bytesPerSample <= bgm.pcmData.length) {
      bgmSample = bgm.pcmData.readInt16LE(bgmByteOffset);
    }
    
    // Apply BGM fade
    let fadeMultiplier = 1;
    if (sampleIdx < fadeInSamples && fadeInSamples > 0) {
      fadeMultiplier = sampleIdx / fadeInSamples;
    } else if (sampleIdx >= fadeOutStart && fadeOutSamples > 0) {
      fadeMultiplier = (totalSamples - sampleIdx) / fadeOutSamples;
    }
    
    // Mix: voice + scaled BGM with fade
    let mixed = voiceSample + Math.round(bgmSample * bgmVolume * fadeMultiplier);
    
    // Soft clipping to prevent harsh distortion
    if (mixed > 32767) mixed = 32767;
    if (mixed < -32768) mixed = -32768;
    
    result.writeInt16LE(mixed, byteOffset);
  }
  
  // Create WAV file
  const wavHeader = createWavHeader(result.length, sampleRate, channels, bitsPerSample);
  const wavFile = Buffer.concat([wavHeader, result]);
  
  return {
    audioData: wavFile.toString('base64'),
    mimeType: 'audio/wav',
    durationMs: voiceData.durationMs
  };
}

/**
 * POST /api/mix
 * Mix multiple audio tracks into a single output
 * 
 * Request body:
 * - voiceTracks: Array of voice segments (with optional speaker field)
 * - bgmTrack: Optional background music
 * - sfxTracks: Optional sound effects (future)
 * - config: Audio mix configuration (gaps, volumes, fades)
 * - outputFormat: 'wav' or 'mp3' (currently only wav)
 */
mixRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { voiceTracks, bgmTrack, sfxTracks, config: userConfig, outputFormat } = req.body as MixRequest;
    
    // Merge user config with defaults
    const config: AudioMixConfig = { ...DEFAULT_MIX_CONFIG, ...userConfig };
    
    // Validate input
    if (!voiceTracks || !Array.isArray(voiceTracks) || voiceTracks.length === 0) {
      res.status(400).json({ error: 'voiceTracks array is required and must not be empty' });
      return;
    }
    
    // Resolve audioUrl → audioData for tracks that only have a URL
    let urlResolvedCount = 0;
    for (let i = 0; i < voiceTracks.length; i++) {
      const track = voiceTracks[i];
      if (!track.audioData && track.audioUrl) {
        try {
          const downloaded = await fetchAudioFromUrl(track.audioUrl);
          track.audioData = downloaded.audioData;
          if (!track.mimeType || track.mimeType === 'audio/wav') {
            track.mimeType = downloaded.mimeType || track.mimeType;
          }
          urlResolvedCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          res.status(400).json({ error: `Voice track ${i}: failed to fetch audio from URL: ${msg}` });
          return;
        }
      }
    }
    
    // Validate each track has audioData (either provided or resolved from URL)
    for (let i = 0; i < voiceTracks.length; i++) {
      const track = voiceTracks[i];
      if (!track.audioData) {
        res.status(400).json({ error: `Voice track ${i} is missing audioData and audioUrl` });
        return;
      }
    }
    
    if (urlResolvedCount > 0) {
      console.log(`Resolved ${urlResolvedCount} voice tracks from URLs`);
    }
    
    // Also resolve BGM audioUrl if needed
    if (bgmTrack && !bgmTrack.audioData && bgmTrack.audioUrl) {
      try {
        const downloaded = await fetchAudioFromUrl(bgmTrack.audioUrl);
        bgmTrack.audioData = downloaded.audioData;
        if (!bgmTrack.mimeType) {
          bgmTrack.mimeType = downloaded.mimeType || bgmTrack.mimeType;
        }
        console.log('Resolved BGM track from URL');
      } catch (err) {
        console.warn('Failed to fetch BGM from URL, skipping BGM:', err);
      }
    }
    
    console.log(`Mixing ${voiceTracks.length} voice tracks${bgmTrack ? ' with BGM' : ''}`);
    console.log(`Config: silenceStart=${config.silenceStartMs}ms, silenceEnd=${config.silenceEndMs}ms, ` +
      `sameSpeakerGap=${config.sameSpeakerGapMs}ms, diffSpeakerGap=${config.differentSpeakerGapMs}ms, ` +
      `sectionGap=${config.sectionGapMs}ms, ` +
      `bgmVolume=${config.bgmVolume}, bgmFadeIn=${config.bgmFadeInMs}ms, bgmFadeOut=${config.bgmFadeOutMs}ms`);
    
    // All tracks are now guaranteed to have audioData (resolved from URL if needed)
    const resolvedVoiceTracks = voiceTracks as ResolvedAudioTrack[];
    
    // Step 1: Concatenate all voice tracks with gaps
    let result = concatenateWithGaps(resolvedVoiceTracks, config);
    console.log(`Concatenated voice with gaps: ${result.durationMs}ms`);
    
    // Step 2: Mix with BGM if provided
    if (bgmTrack && bgmTrack.audioData) {
      console.log('Mixing with BGM...');
      result = mixWithBgm(result, bgmTrack as ResolvedAudioTrack, config);
      console.log(`Mixed with BGM: ${result.durationMs}ms`);
    }
    
    // Step 3: Add sound effects (future enhancement)
    // TODO: Implement SFX mixing at specific timestamps
    
    const response: MixResult = {
      audioData: result.audioData,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      trackCount: resolvedVoiceTracks.length + (bgmTrack ? 1 : 0) + (sfxTracks?.length || 0)
    };
    
    res.json(response);
  } catch (error) {
    console.error('Mix error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/mix/preview
 * Quick preview - concatenate voice tracks only with minimal gaps
 */
mixRouter.post('/preview', async (req: Request, res: Response) => {
  try {
    const { voiceTracks, config: userConfig } = req.body as MixRequest;
    
    if (!voiceTracks || voiceTracks.length === 0) {
      res.status(400).json({ error: 'voiceTracks required' });
      return;
    }
    
    // Resolve audioUrl → audioData for tracks that only have a URL
    for (let i = 0; i < voiceTracks.length; i++) {
      const track = voiceTracks[i];
      if (!track.audioData && track.audioUrl) {
        try {
          const downloaded = await fetchAudioFromUrl(track.audioUrl);
          track.audioData = downloaded.audioData;
          if (!track.mimeType) track.mimeType = downloaded.mimeType;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          res.status(400).json({ error: `Preview track ${i}: failed to fetch audio from URL: ${msg}` });
          return;
        }
      }
      if (!track.audioData) {
        res.status(400).json({ error: `Preview track ${i} is missing audioData and audioUrl` });
        return;
      }
    }
    
    // Use minimal config for preview (faster)
    const previewConfig: AudioMixConfig = {
      ...DEFAULT_MIX_CONFIG,
      ...userConfig,
      silenceStartMs: 100,
      silenceEndMs: 100,
    };
    
    const resolvedTracks = voiceTracks as ResolvedAudioTrack[];
    const result = concatenateWithGaps(resolvedTracks, previewConfig);
    
    res.json({
      audioData: result.audioData,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      trackCount: resolvedTracks.length
    });
  } catch (error) {
    console.error('Preview mix error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/mix/presets
 * Get available mix configuration presets
 */
mixRouter.get('/presets', (_req: Request, res: Response) => {
  const presets = {
    audiobook: {
      name: 'Audiobook',
      description: 'ACX/Audible compliant with professional pacing',
      config: {
        silenceStartMs: 750,
        silenceEndMs: 3000,
        sameSpeakerGapMs: 400,
        differentSpeakerGapMs: 800,
        bgmVolume: 0.18,
        bgmFadeInMs: 2000,
        bgmFadeOutMs: 3000,
      }
    },
    podcast: {
      name: 'Podcast',
      description: 'Conversational pacing with dynamic flow',
      config: {
        silenceStartMs: 500,
        silenceEndMs: 1000,
        sameSpeakerGapMs: 300,
        differentSpeakerGapMs: 600,
        bgmVolume: 0.25,
        bgmFadeInMs: 1500,
        bgmFadeOutMs: 2000,
      }
    },
    educational: {
      name: 'Educational',
      description: 'Clear pacing for learning content',
      config: {
        silenceStartMs: 800,
        silenceEndMs: 1500,
        sameSpeakerGapMs: 500,
        differentSpeakerGapMs: 1000,
        bgmVolume: 0.15,
        bgmFadeInMs: 1000,
        bgmFadeOutMs: 1500,
      }
    },
    immersive: {
      name: 'Immersive',
      description: 'Cinematic audio with rich layers',
      config: {
        silenceStartMs: 1000,
        silenceEndMs: 2000,
        sameSpeakerGapMs: 350,
        differentSpeakerGapMs: 700,
        bgmVolume: 0.35,
        bgmFadeInMs: 2500,
        bgmFadeOutMs: 3500,
      }
    },
    shortform: {
      name: 'Short-form',
      description: 'Tight pacing for news and briefings',
      config: {
        silenceStartMs: 300,
        silenceEndMs: 500,
        sameSpeakerGapMs: 200,
        differentSpeakerGapMs: 400,
        bgmVolume: 0.22,
        bgmFadeInMs: 500,
        bgmFadeOutMs: 800,
      }
    }
  };
  
  res.json({ presets, default: DEFAULT_MIX_CONFIG });
});
