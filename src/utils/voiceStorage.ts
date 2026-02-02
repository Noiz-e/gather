// Voice character storage utilities

import { VoiceCharacter } from '../types';

const STORAGE_KEY = 'gather-voice-characters';

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  } catch (error) {
    console.error('Failed to save voice characters:', error);
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
