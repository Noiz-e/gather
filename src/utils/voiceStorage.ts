// Voice character storage utilities

import { VoiceCharacter } from '../types';
import { 
  loadVoicesFromCloud, 
  saveVoicesToCloud, 
  uploadVoiceSampleToCloud,
  checkStorageStatus
} from '../services/api';

const STORAGE_KEY = 'gather-voice-characters';

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
 * Sync voices to cloud storage (debounced)
 */
const syncVoicesToCloud = debounce(async (voices: VoiceCharacter[]) => {
  if (!cloudStorageAvailable || cloudSyncInProgress) return;
  
  cloudSyncInProgress = true;
  try {
    await saveVoicesToCloud(voices as unknown as { id: string; [key: string]: unknown }[]);
    console.log(`Cloud sync: saved ${voices.length} voice characters`);
  } catch (error) {
    console.error('Cloud sync failed for voices:', error);
  } finally {
    cloudSyncInProgress = false;
  }
}, 2000);

export function loadVoiceCharacters(): VoiceCharacter[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load voice characters:', error);
    return [];
  }
}

export function saveVoiceCharacters(characters: VoiceCharacter[]): void {
  try {
    // Save to localStorage first (fast, offline-capable)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    
    // Then sync to cloud (async, debounced)
    syncVoicesToCloud(characters);
  } catch (error) {
    console.error('Failed to save voice characters:', error);
  }
}

/**
 * Load voice characters from cloud and merge with local
 */
export async function loadVoiceCharactersFromCloud(): Promise<VoiceCharacter[]> {
  if (!cloudStorageAvailable) {
    console.log('Cloud storage not available for voices, using local data');
    return loadVoiceCharacters();
  }
  
  try {
    const cloudVoices = await loadVoicesFromCloud();
    if (cloudVoices.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudVoices));
      console.log(`Loaded ${cloudVoices.length} voice characters from cloud`);
      return cloudVoices as unknown as VoiceCharacter[];
    }
    
    // If cloud is empty, push local data to cloud
    const localVoices = loadVoiceCharacters();
    if (localVoices.length > 0) {
      await saveVoicesToCloud(localVoices as unknown as { id: string; [key: string]: unknown }[]);
      console.log(`Pushed ${localVoices.length} local voice characters to cloud`);
    }
    
    return localVoices;
  } catch (error) {
    console.error('Failed to load voices from cloud:', error);
    return loadVoiceCharacters();
  }
}

/**
 * Upload voice sample to cloud and return URL
 */
export async function uploadVoiceSample(voiceId: string, dataUrl: string): Promise<string> {
  if (!cloudStorageAvailable) {
    console.log('Cloud storage not available, returning original dataUrl');
    return dataUrl;
  }
  
  try {
    const url = await uploadVoiceSampleToCloud(voiceId, dataUrl);
    console.log(`Uploaded voice sample for ${voiceId}: ${url}`);
    return url;
  } catch (error) {
    console.error('Failed to upload voice sample:', error);
    return dataUrl;
  }
}

export function addVoiceCharacter(
  characters: VoiceCharacter[],
  newCharacter: Omit<VoiceCharacter, 'id' | 'createdAt' | 'updatedAt'>
): VoiceCharacter[] {
  const now = new Date().toISOString();
  const character: VoiceCharacter = {
    ...newCharacter,
    id: `char-${Date.now()}`,
    createdAt: now,
    updatedAt: now
  };
  
  const updated = [...characters, character];
  saveVoiceCharacters(updated);
  return updated;
}

export function updateVoiceCharacter(
  characters: VoiceCharacter[],
  id: string,
  updates: Partial<VoiceCharacter>
): VoiceCharacter[] {
  const updated = characters.map(char =>
    char.id === id
      ? { ...char, ...updates, updatedAt: new Date().toISOString() }
      : char
  );
  saveVoiceCharacters(updated);
  return updated;
}

export function deleteVoiceCharacter(
  characters: VoiceCharacter[],
  id: string
): VoiceCharacter[] {
  const updated = characters.filter(char => char.id !== id);
  saveVoiceCharacters(updated);
  return updated;
}

export function getVoicesByProject(characters: VoiceCharacter[], projectId: string): VoiceCharacter[] {
  return characters.filter(char => char.projectIds?.includes(projectId));
}

export function linkVoiceToProject(
  characters: VoiceCharacter[],
  voiceId: string,
  projectId: string
): VoiceCharacter[] {
  const updated = characters.map(char => {
    if (char.id === voiceId) {
      const projectIds = char.projectIds || [];
      if (!projectIds.includes(projectId)) {
        return { ...char, projectIds: [...projectIds, projectId], updatedAt: new Date().toISOString() };
      }
    }
    return char;
  });
  saveVoiceCharacters(updated);
  return updated;
}

export function unlinkVoiceFromProject(
  characters: VoiceCharacter[],
  voiceId: string,
  projectId: string
): VoiceCharacter[] {
  const updated = characters.map(char => {
    if (char.id === voiceId && char.projectIds) {
      return { 
        ...char, 
        projectIds: char.projectIds.filter(id => id !== projectId),
        updatedAt: new Date().toISOString()
      };
    }
    return char;
  });
  saveVoiceCharacters(updated);
  return updated;
}

export function setVoiceProjects(
  characters: VoiceCharacter[],
  voiceId: string,
  projectIds: string[]
): VoiceCharacter[] {
  const updated = characters.map(char => {
    if (char.id === voiceId) {
      return { ...char, projectIds, updatedAt: new Date().toISOString() };
    }
    return char;
  });
  saveVoiceCharacters(updated);
  return updated;
}
