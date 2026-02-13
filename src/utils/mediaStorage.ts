// Media library storage utilities

import { MediaItem, MediaType } from '../types';
import { 
  loadMediaItemsFromCloud, 
  saveMediaItemsToCloud, 
  uploadMediaFileToCloud,
  deleteMediaFileFromCloud,
  checkStorageStatus
} from '../services/api';

const STORAGE_KEY = 'gather-media-library';

// Track if cloud storage is available
let cloudStorageAvailable = false;
let cloudSyncInProgress = false;

// Check cloud storage status on module load
checkStorageStatus()
  .then(status => {
    cloudStorageAvailable = status.configured;
  })
  .catch(() => {
    cloudStorageAvailable = false;
  });

/**
 * Debounce function to prevent too many cloud sync calls
 */
function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => void | Promise<void>, 
  wait: number
): (...args: TArgs) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sync media items to cloud storage (debounced)
 */
const syncMediaToCloud = debounce(async (items: MediaItem[]) => {
  if (!cloudStorageAvailable || cloudSyncInProgress) return;
  
  cloudSyncInProgress = true;
  try {
    await saveMediaItemsToCloud(items as unknown as { id: string; type: 'image' | 'bgm' | 'sfx'; [key: string]: unknown }[]);
    console.log(`Cloud sync: saved ${items.length} media items`);
  } catch (error) {
    console.error('Cloud sync failed for media:', error);
  } finally {
    cloudSyncInProgress = false;
  }
}, 2000);

export function loadMediaItems(): MediaItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load media items:', error);
    return [];
  }
}

export function saveMediaItems(items: MediaItem[]): void {
  try {
    // Save to localStorage first (fast, offline-capable)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    
    // Then sync to cloud (async, debounced)
    syncMediaToCloud(items);
  } catch (error) {
    console.error('Failed to save media items:', error);
  }
}

/**
 * Load media items from cloud and merge with local
 */
export async function loadMediaItemsFromCloudStorage(): Promise<MediaItem[]> {
  if (!cloudStorageAvailable) {
    console.log('Cloud storage not available for media, using local data');
    return loadMediaItems();
  }
  
  try {
    const cloudItems = await loadMediaItemsFromCloud();
    if (cloudItems.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudItems));
      console.log(`Loaded ${cloudItems.length} media items from cloud`);
      return cloudItems as unknown as MediaItem[];
    }
    
    // If cloud is empty, push local data to cloud
    const localItems = loadMediaItems();
    if (localItems.length > 0) {
      await saveMediaItemsToCloud(localItems as unknown as { id: string; type: 'image' | 'bgm' | 'sfx'; [key: string]: unknown }[]);
      console.log(`Pushed ${localItems.length} local media items to cloud`);
    }
    
    return localItems;
  } catch (error) {
    console.error('Failed to load media from cloud:', error);
    return loadMediaItems();
  }
}

/**
 * Upload media file to cloud and return URL
 * If the dataUrl is a base64 data URL, it will be uploaded to GCS
 * and the returned URL will be a public GCS URL
 */
export async function uploadMediaToCloud(
  mediaId: string, 
  dataUrl: string, 
  type: MediaType
): Promise<string> {
  if (!cloudStorageAvailable) {
    console.log('Cloud storage not available, returning original dataUrl');
    return dataUrl;
  }
  
  // Only upload if it's a base64 data URL (not already a cloud URL)
  if (!dataUrl.startsWith('data:')) {
    console.log('Media is already a URL, skipping upload');
    return dataUrl;
  }
  
  try {
    const url = await uploadMediaFileToCloud(mediaId, dataUrl, type);
    console.log(`Uploaded media ${type} for ${mediaId}: ${url}`);
    return url;
  } catch (error) {
    console.error('Failed to upload media file:', error);
    return dataUrl;
  }
}

/**
 * Check if a string is a valid UUID format
 */
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Delete media file from cloud storage
 */
export async function deleteMediaFromCloud(
  mediaId: string, 
  type: MediaType, 
  fileUrl?: string
): Promise<boolean> {
  if (!cloudStorageAvailable) {
    return true; // Nothing to delete in cloud
  }
  
  // Skip cloud delete for client-side temporary IDs (not stored in DB)
  if (!isValidUUID(mediaId)) {
    console.log(`Skipping cloud delete for local media ID: ${mediaId}`);
    return true;
  }
  
  try {
    const deleted = await deleteMediaFileFromCloud(mediaId, type, fileUrl);
    if (deleted) {
      console.log(`Deleted media file from cloud: ${mediaId}`);
    }
    return deleted;
  } catch (error) {
    console.error('Failed to delete media from cloud:', error);
    return false;
  }
}

export function addMediaItem(
  items: MediaItem[],
  newItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>
): MediaItem[] {
  const now = new Date().toISOString();
  const item: MediaItem = {
    ...newItem,
    id: `media-${Date.now()}`,
    createdAt: now,
    updatedAt: now
  };
  
  const updated = [...items, item];
  saveMediaItems(updated);
  return updated;
}

export function updateMediaItem(
  items: MediaItem[],
  id: string,
  updates: Partial<MediaItem>
): MediaItem[] {
  const updated = items.map(item =>
    item.id === id
      ? { ...item, ...updates, updatedAt: new Date().toISOString() }
      : item
  );
  saveMediaItems(updated);
  return updated;
}

export function deleteMediaItem(
  items: MediaItem[],
  id: string
): MediaItem[] {
  const updated = items.filter(item => item.id !== id);
  saveMediaItems(updated);
  return updated;
}

export function getMediaByType(items: MediaItem[], type: MediaType): MediaItem[] {
  return items.filter(item => item.type === type);
}

export function getMediaByProject(items: MediaItem[], projectId: string): MediaItem[] {
  return items.filter(item => item.projectIds?.includes(projectId));
}

export function linkMediaToProject(
  items: MediaItem[],
  mediaId: string,
  projectId: string
): MediaItem[] {
  const updated = items.map(item => {
    if (item.id === mediaId) {
      const projectIds = item.projectIds || [];
      if (!projectIds.includes(projectId)) {
        return { ...item, projectIds: [...projectIds, projectId], updatedAt: new Date().toISOString() };
      }
    }
    return item;
  });
  saveMediaItems(updated);
  return updated;
}

export function unlinkMediaFromProject(
  items: MediaItem[],
  mediaId: string,
  projectId: string
): MediaItem[] {
  const updated = items.map(item => {
    if (item.id === mediaId && item.projectIds) {
      return { 
        ...item, 
        projectIds: item.projectIds.filter(id => id !== projectId),
        updatedAt: new Date().toISOString()
      };
    }
    return item;
  });
  saveMediaItems(updated);
  return updated;
}

export function setMediaProjects(
  items: MediaItem[],
  mediaId: string,
  projectIds: string[]
): MediaItem[] {
  const updated = items.map(item => {
    if (item.id === mediaId) {
      return { ...item, projectIds, updatedAt: new Date().toISOString() };
    }
    return item;
  });
  saveMediaItems(updated);
  return updated;
}

export function searchMedia(items: MediaItem[], query: string): MediaItem[] {
  const lowerQuery = query.toLowerCase();
  return items.filter(item =>
    item.name.toLowerCase().includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery) ||
    item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

// Helper to convert file to base64 data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper to get audio duration
export function getAudioDuration(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(dataUrl);
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    audio.onerror = () => resolve(0);
  });
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper to format duration
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
