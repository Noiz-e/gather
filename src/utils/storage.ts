import { Project, Religion, ColorMode } from '../types';
import { 
  loadProjectsFromCloud, 
  saveProjectsToCloud,
} from '../services/api';

const STORAGE_KEYS = {
  CURRENT_RELIGION: 'gather_religion',
  COLOR_MODE: 'gather_color_mode',
  USER_PREFERENCES: 'gather_preferences',
};

// ============ Cloud Save Queue ============
// Ensures saves are serialized and the latest state is always persisted.
// If a save is in-flight, any new save request is queued and will fire
// immediately after the current one completes, using the latest data.

let _pendingSave: Project[] | null = null;
let _saveInFlight = false;

async function drainSaveQueue(): Promise<void> {
  if (_saveInFlight) return; // another call is already draining

  while (_pendingSave !== null) {
    const projects = _pendingSave;
    _pendingSave = null;
    _saveInFlight = true;
    try {
      await saveProjectsToCloud(projects as unknown as { id: string; [key: string]: unknown }[]);
      console.log(`Cloud sync: saved ${projects.length} projects`);
    } catch (error) {
      console.error('Cloud sync failed:', error);
    } finally {
      _saveInFlight = false;
    }
  }
}

/**
 * Enqueue a save. If a save is already in progress, the latest data
 * is stored and will be flushed once the current save finishes.
 */
function enqueueCloudSave(projects: Project[]): void {
  _pendingSave = projects;
  drainSaveQueue();
}

/**
 * Flush any pending save synchronously (best-effort).
 * Used on beforeunload to avoid losing data when the user refreshes.
 */
function flushPendingSave(): void {
  if (_pendingSave === null) return;
  const projects = _pendingSave;
  _pendingSave = null;
  try {
    // Use sendBeacon for reliability during page unload
    const url = `${import.meta.env.VITE_API_BASE || '/api'}/storage/projects`;
    const blob = new Blob(
      [JSON.stringify({ projects })],
      { type: 'application/json' }
    );
    navigator.sendBeacon(url, blob);
    console.log(`Flushed ${projects.length} projects via sendBeacon`);
  } catch (error) {
    console.error('Failed to flush pending save:', error);
  }
}

// Flush pending saves when the page is about to unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingSave);
}

export const storage = {
  // Projects – cloud is the sole source of truth.
  // No localStorage is used for user data.

  /**
   * Save projects to cloud.
   * The save is enqueued and serialized so rapid successive calls
   * always end up persisting the latest state.
   */
  saveProjects(projects: Project[]): void {
    enqueueCloudSave(projects);
  },

  /**
   * Load projects from cloud (source of truth).
   * Always calls the server; never falls back to localStorage.
   */
  async loadFromCloud(): Promise<Project[]> {
    try {
      const cloudProjects = await loadProjectsFromCloud();
      console.log(`Loaded ${cloudProjects.length} projects from cloud`);
      return cloudProjects as unknown as Project[];
    } catch (error) {
      console.error('Failed to load from cloud:', error);
      return [];
    }
  },

  /**
   * Force sync to cloud – waits for the save to complete.
   */
  async forceCloudSync(projects: Project[]): Promise<void> {
    await saveProjectsToCloud(projects as unknown as { id: string; [key: string]: unknown }[]);
    console.log(`Force synced ${projects.length} projects to cloud`);
  },

  // ============ UI Preferences (OK to keep in localStorage) ============

  // Current Religion
  getCurrentReligion(): Religion | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_RELIGION);
      return data as Religion | null;
    } catch {
      return null;
    }
  },

  setCurrentReligion(religion: Religion): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_RELIGION, religion);
    } catch {
      console.error('Failed to save religion preference');
    }
  },

  // Color Mode
  getColorMode(): ColorMode | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COLOR_MODE);
      return data as ColorMode | null;
    } catch {
      return null;
    }
  },

  setColorMode(mode: ColorMode): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COLOR_MODE, mode);
    } catch {
      console.error('Failed to save color mode preference');
    }
  },

  // User Preferences
  getPreferences(): Record<string, unknown> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  setPreferences(preferences: Record<string, unknown>): void {
    try {
      localStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(preferences)
      );
    } catch {
      console.error('Failed to save preferences');
    }
  },
};
