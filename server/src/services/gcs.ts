/**
 * Google Cloud Storage service
 * Only handles static file storage (images, audio, etc.)
 * Structured data (projects, voices, media items) is stored in PostgreSQL.
 * Each GCS file has a corresponding record in the `files` table.
 */

import { Storage, Bucket } from '@google-cloud/storage';

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

// Path prefixes for static files
const PATHS = {
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
 * Get the GCS bucket name
 */
export function getBucketName(): string {
  return GCS_BUCKET;
}

/**
 * Upload a binary file to GCS
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

export { PATHS };
