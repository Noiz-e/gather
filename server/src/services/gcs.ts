/**
 * Google Cloud Storage service for persistent data storage
 * Handles projects, voice characters, and media files
 */

import { Storage, Bucket } from '@google-cloud/storage';
import path from 'path';

// Initialize GCS client
const GCS_BUCKET = process.env.GCS_BUCKET || '';
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || '';
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';

let storage: Storage;
let bucket: Bucket;

// Initialize storage client
function initStorage(): void {
  if (storage && bucket) return;
  
  try {
    if (GOOGLE_APPLICATION_CREDENTIALS) {
      storage = new Storage({
        projectId: GCS_PROJECT_ID,
        keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
      });
      console.log(`GCS: Using credentials from ${GOOGLE_APPLICATION_CREDENTIALS}`);
    } else {
      storage = new Storage({
        projectId: GCS_PROJECT_ID,
      });
      console.log('GCS: Using default credentials');
    }
    
    if (!GCS_BUCKET) {
      console.warn('GCS: GCS_BUCKET environment variable not set');
    } else {
      bucket = storage.bucket(GCS_BUCKET);
      console.log(`GCS: Connected to bucket ${GCS_BUCKET}`);
    }
  } catch (error) {
    console.error('GCS: Failed to initialize storage:', error);
  }
}

// Ensure storage is initialized
initStorage();

// Path prefixes for different data types
const PATHS = {
  PROJECTS: 'killagent/data/projects.json',
  VOICES: 'killagent/data/voices.json',
  MEDIA_ITEMS: 'killagent/data/media-items.json',
  MEDIA_FILES: 'killagent/media/',
  VOICE_SAMPLES: 'killagent/voice-samples/',
};

/**
 * Check if GCS is properly configured
 */
export function isGCSConfigured(): boolean {
  return !!(GCS_BUCKET && bucket);
}

/**
 * Upload JSON data to GCS
 */
export async function uploadJSON(gcsPath: string, data: unknown): Promise<string> {
  if (!isGCSConfigured()) {
    throw new Error('GCS is not configured');
  }
  
  const blob = bucket.file(gcsPath);
  const jsonContent = JSON.stringify(data, null, 2);
  
  await blob.save(jsonContent, {
    contentType: 'application/json',
    metadata: {
      cacheControl: 'no-cache',
    },
  });
  
  return `gs://${GCS_BUCKET}/${gcsPath}`;
}

/**
 * Download JSON data from GCS
 */
export async function downloadJSON<T>(gcsPath: string): Promise<T | null> {
  if (!isGCSConfigured()) {
    console.warn('GCS is not configured, returning null');
    return null;
  }
  
  try {
    const blob = bucket.file(gcsPath);
    const [exists] = await blob.exists();
    
    if (!exists) {
      console.log(`GCS: File ${gcsPath} does not exist`);
      return null;
    }
    
    const [content] = await blob.download();
    return JSON.parse(content.toString()) as T;
  } catch (error) {
    console.error(`GCS: Failed to download ${gcsPath}:`, error);
    return null;
  }
}

/**
 * Upload a binary file (image, audio) to GCS
 * Returns the public URL
 */
export async function uploadFile(
  gcsPath: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  if (!isGCSConfigured()) {
    throw new Error('GCS is not configured');
  }
  
  const blob = bucket.file(gcsPath);
  
  await blob.save(data, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
  
  // Return public URL
  return `https://storage.googleapis.com/${GCS_BUCKET}/${gcsPath}`;
}

/**
 * Upload a base64-encoded file to GCS
 * Extracts data from data URL format: data:mime/type;base64,DATA
 */
export async function uploadBase64File(
  gcsPath: string,
  dataUrl: string
): Promise<string> {
  // Parse data URL
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  
  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  return uploadFile(gcsPath, buffer, contentType);
}

/**
 * Download a file from GCS
 */
export async function downloadFile(gcsPath: string): Promise<Buffer | null> {
  if (!isGCSConfigured()) {
    return null;
  }
  
  try {
    const blob = bucket.file(gcsPath);
    const [exists] = await blob.exists();
    
    if (!exists) {
      return null;
    }
    
    const [content] = await blob.download();
    return content;
  } catch (error) {
    console.error(`GCS: Failed to download file ${gcsPath}:`, error);
    return null;
  }
}

/**
 * Delete a file from GCS
 */
export async function deleteFile(gcsPath: string): Promise<boolean> {
  if (!isGCSConfigured()) {
    return false;
  }
  
  try {
    const blob = bucket.file(gcsPath);
    await blob.delete({ ignoreNotFound: true });
    return true;
  } catch (error) {
    console.error(`GCS: Failed to delete ${gcsPath}:`, error);
    return false;
  }
}

/**
 * Generate a signed URL for temporary access
 */
export async function getSignedUrl(
  gcsPath: string,
  expirationMinutes: number = 60
): Promise<string> {
  if (!isGCSConfigured()) {
    throw new Error('GCS is not configured');
  }
  
  const blob = bucket.file(gcsPath);
  const [url] = await blob.getSignedUrl({
    action: 'read',
    expires: Date.now() + expirationMinutes * 60 * 1000,
  });
  
  return url;
}

// ============ Projects Storage ============

export interface ProjectData {
  id: string;
  [key: string]: unknown;
}

export async function saveProjects(projects: ProjectData[]): Promise<void> {
  await uploadJSON(PATHS.PROJECTS, projects);
  console.log(`GCS: Saved ${projects.length} projects`);
}

export async function loadProjects(): Promise<ProjectData[]> {
  const projects = await downloadJSON<ProjectData[]>(PATHS.PROJECTS);
  console.log(`GCS: Loaded ${projects?.length ?? 0} projects`);
  return projects || [];
}

// ============ Voice Characters Storage ============

export interface VoiceCharacterData {
  id: string;
  [key: string]: unknown;
}

export async function saveVoiceCharacters(voices: VoiceCharacterData[]): Promise<void> {
  await uploadJSON(PATHS.VOICES, voices);
  console.log(`GCS: Saved ${voices.length} voice characters`);
}

export async function loadVoiceCharacters(): Promise<VoiceCharacterData[]> {
  const voices = await downloadJSON<VoiceCharacterData[]>(PATHS.VOICES);
  console.log(`GCS: Loaded ${voices?.length ?? 0} voice characters`);
  return voices || [];
}

/**
 * Upload a voice sample audio file
 */
export async function uploadVoiceSample(
  voiceId: string,
  dataUrl: string
): Promise<string> {
  const ext = dataUrl.startsWith('data:audio/wav') ? 'wav' : 'mp3';
  const gcsPath = `${PATHS.VOICE_SAMPLES}${voiceId}.${ext}`;
  return uploadBase64File(gcsPath, dataUrl);
}

// ============ Media Items Storage ============

export interface MediaItemData {
  id: string;
  type: 'image' | 'bgm' | 'sfx';
  [key: string]: unknown;
}

export async function saveMediaItems(items: MediaItemData[]): Promise<void> {
  await uploadJSON(PATHS.MEDIA_ITEMS, items);
  console.log(`GCS: Saved ${items.length} media items`);
}

export async function loadMediaItems(): Promise<MediaItemData[]> {
  const items = await downloadJSON<MediaItemData[]>(PATHS.MEDIA_ITEMS);
  console.log(`GCS: Loaded ${items?.length ?? 0} media items`);
  return items || [];
}

/**
 * Upload a media file (image, bgm, sfx)
 * Returns the public URL
 */
export async function uploadMediaFile(
  mediaId: string,
  dataUrl: string,
  type: 'image' | 'bgm' | 'sfx'
): Promise<string> {
  // Determine file extension from data URL
  let ext = 'bin';
  if (dataUrl.startsWith('data:image/png')) ext = 'png';
  else if (dataUrl.startsWith('data:image/jpeg')) ext = 'jpg';
  else if (dataUrl.startsWith('data:image/gif')) ext = 'gif';
  else if (dataUrl.startsWith('data:image/webp')) ext = 'webp';
  else if (dataUrl.startsWith('data:audio/wav')) ext = 'wav';
  else if (dataUrl.startsWith('data:audio/mp3') || dataUrl.startsWith('data:audio/mpeg')) ext = 'mp3';
  else if (dataUrl.startsWith('data:audio/ogg')) ext = 'ogg';
  
  const gcsPath = `${PATHS.MEDIA_FILES}${type}/${mediaId}.${ext}`;
  return uploadBase64File(gcsPath, dataUrl);
}

/**
 * Delete a media file from GCS
 */
export async function deleteMediaFile(
  mediaId: string,
  type: 'image' | 'bgm' | 'sfx',
  fileUrl: string
): Promise<boolean> {
  // Extract the path from the URL
  const urlPrefix = `https://storage.googleapis.com/${GCS_BUCKET}/`;
  if (fileUrl.startsWith(urlPrefix)) {
    const gcsPath = fileUrl.slice(urlPrefix.length);
    return deleteFile(gcsPath);
  }
  
  // Try common extensions
  const extensions = type === 'image' 
    ? ['png', 'jpg', 'gif', 'webp'] 
    : ['wav', 'mp3', 'ogg'];
    
  for (const ext of extensions) {
    const gcsPath = `${PATHS.MEDIA_FILES}${type}/${mediaId}.${ext}`;
    const deleted = await deleteFile(gcsPath);
    if (deleted) return true;
  }
  
  return false;
}

export { PATHS };
