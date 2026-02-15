// Voice character storage utilities
// Cloud is the sole source of truth — no localStorage for user data.
// An in-memory cache is kept so synchronous reads (loadVoiceCharacters)
// return the latest known state between cloud loads.

import { VoiceCharacter } from '../types';
import { 
  loadVoicesFromCloud, 
  saveVoicesToCloud, 
  uploadVoiceSampleToCloud,
  deleteVoiceFromCloud,
} from '../services/api';

// ============ In-Memory Cache ============
let _cache: VoiceCharacter[] = [];

// ============ Cloud Save Queue ============

let _pendingSave: VoiceCharacter[] | null = null;
let _saveInFlight = false;

async function drainSaveQueue(): Promise<void> {
  if (_saveInFlight) return;

  while (_pendingSave !== null) {
    const voices = _pendingSave;
    _pendingSave = null;
    _saveInFlight = true;
    try {
      await saveVoicesToCloud(voices as unknown as { id: string; [key: string]: unknown }[]);
      console.log(`Cloud sync: saved ${voices.length} voice characters`);
    } catch (error) {
      console.error('Cloud sync failed for voices:', error);
    } finally {
      _saveInFlight = false;
    }
  }
}

function enqueueCloudSave(voices: VoiceCharacter[]): void {
  _pendingSave = voices;
  drainSaveQueue();
}

function flushPendingSave(): void {
  if (_pendingSave === null) return;
  const voices = _pendingSave;
  _pendingSave = null;
  try {
    const url = `${import.meta.env.VITE_API_BASE || '/api'}/storage/voices`;
    const blob = new Blob(
      [JSON.stringify({ voices })],
      { type: 'application/json' }
    );
    navigator.sendBeacon(url, blob);
  } catch (error) {
    console.error('Failed to flush pending voice save:', error);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingSave);
}

/**
 * Synchronous read from in-memory cache.
 * Returns the latest known voice characters (populated by cloud load or saves).
 */
export function loadVoiceCharacters(): VoiceCharacter[] {
  return _cache;
}

export function saveVoiceCharacters(characters: VoiceCharacter[]): void {
  _cache = characters;
  enqueueCloudSave(characters);
}

/**
 * Load voice characters from cloud (source of truth).
 * Always calls the server; never falls back to localStorage.
 * Updates the in-memory cache on success.
 */
export async function loadVoiceCharactersFromCloud(): Promise<VoiceCharacter[]> {
  try {
    const cloudVoices = await loadVoicesFromCloud();
    // Map server field names to client field names
    // Server returns refAudioUrl (signed GCS URL), client expects refAudioDataUrl
    const mapped: VoiceCharacter[] = cloudVoices.map((v: Record<string, unknown>) => ({
      ...v,
      // Map refAudioUrl -> refAudioDataUrl if the client field is missing
      refAudioDataUrl: (v.refAudioDataUrl as string) || (v.refAudioUrl as string) || undefined,
      // audioSampleUrl is returned with the same name from server
    })) as unknown as VoiceCharacter[];
    _cache = mapped;
    console.log(`Loaded ${mapped.length} voice characters from cloud`);
    return mapped;
  } catch (error) {
    console.error('Failed to load voices from cloud:', error);
    return _cache; // return whatever is in memory
  }
}

/**
 * Upload voice sample to cloud and return URL
 */
export async function uploadVoiceSample(voiceId: string, dataUrl: string): Promise<string> {
  try {
    const url = await uploadVoiceSampleToCloud(voiceId, dataUrl);
    console.log(`Uploaded voice sample for ${voiceId}: ${url}`);
    return url;
  } catch (error) {
    console.error('Failed to upload voice sample:', error);
    return dataUrl;
  }
}

/**
 * Delete a voice character from cloud storage
 */
export async function deleteVoiceCharacterFromCloud(voiceId: string): Promise<boolean> {
  try {
    const deleted = await deleteVoiceFromCloud(voiceId);
    if (deleted) {
      console.log(`Deleted voice character from cloud: ${voiceId}`);
    }
    return deleted;
  } catch (error) {
    console.error('Failed to delete voice from cloud:', error);
    return false;
  }
}

export function addVoiceCharacter(
  characters: VoiceCharacter[],
  newCharacter: Omit<VoiceCharacter, 'id' | 'createdAt' | 'updatedAt'>
): VoiceCharacter[] {
  const now = new Date().toISOString();
  const character: VoiceCharacter = {
    ...newCharacter,
    id: crypto.randomUUID(),
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
