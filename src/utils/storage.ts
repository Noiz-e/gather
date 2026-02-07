import { Project, Religion, ColorMode } from '../types';
import { 
  loadProjectsFromCloud, 
  saveProjectsToCloud,
  checkStorageStatus 
} from '../services/api';

const STORAGE_KEYS = {
  PROJECTS: 'gather_projects',
  CURRENT_RELIGION: 'gather_religion',
  COLOR_MODE: 'gather_color_mode',
  USER_PREFERENCES: 'gather_preferences',
  CLOUD_SYNC_ENABLED: 'gather_cloud_sync',
};

// Track if cloud storage is available
let cloudStorageAvailable = false;
let cloudSyncInProgress = false;

// Check cloud storage status on module load
checkStorageStatus()
  .then(status => {
    cloudStorageAvailable = status.configured;
    console.log(`Cloud storage: ${status.message}`);
  })
  .catch(() => {
    cloudStorageAvailable = false;
    console.log('Cloud storage: unavailable');
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
 * Sync projects to cloud storage (debounced)
 */
const syncProjectsToCloud = debounce(async (projects: Project[]) => {
  if (!cloudStorageAvailable || cloudSyncInProgress) return;
  
  cloudSyncInProgress = true;
  try {
    await saveProjectsToCloud(projects as unknown as { id: string; [key: string]: unknown }[]);
    console.log(`Cloud sync: saved ${projects.length} projects`);
  } catch (error) {
    console.error('Cloud sync failed:', error);
  } finally {
    cloudSyncInProgress = false;
  }
}, 2000); // Debounce for 2 seconds

export const storage = {
  // Cloud storage status
  isCloudAvailable(): boolean {
    return cloudStorageAvailable;
  },

  // Projects
  getProjects(): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return data ? JSON.parse(data) : [];
    } catch {
      console.error('Failed to load projects from storage');
      return [];
    }
  },

  saveProjects(projects: Project[]): void {
    try {
      // Save to localStorage first (fast, offline-capable)
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
      
      // Then sync to cloud (async, debounced)
      syncProjectsToCloud(projects);
    } catch {
      console.error('Failed to save projects to storage');
    }
  },

  /**
   * Load projects from cloud and merge with local
   * Cloud data takes precedence if newer
   */
  async loadFromCloud(): Promise<Project[]> {
    if (!cloudStorageAvailable) {
      console.log('Cloud storage not available, using local data');
      return this.getProjects();
    }
    
    try {
      const cloudProjects = await loadProjectsFromCloud();
      if (cloudProjects.length > 0) {
        // Save cloud data to local storage
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(cloudProjects));
        console.log(`Loaded ${cloudProjects.length} projects from cloud`);
        return cloudProjects as unknown as Project[];
      }
      
      // If cloud is empty, push local data to cloud
      const localProjects = this.getProjects();
      if (localProjects.length > 0) {
        await saveProjectsToCloud(localProjects as unknown as { id: string; [key: string]: unknown }[]);
        console.log(`Pushed ${localProjects.length} local projects to cloud`);
      }
      
      return localProjects;
    } catch (error) {
      console.error('Failed to load from cloud:', error);
      return this.getProjects();
    }
  },

  /**
   * Force sync local data to cloud
   */
  async forceCloudSync(): Promise<void> {
    if (!cloudStorageAvailable) {
      throw new Error('Cloud storage is not available');
    }
    
    const projects = this.getProjects();
    await saveProjectsToCloud(projects as unknown as { id: string; [key: string]: unknown }[]);
    console.log(`Force synced ${projects.length} projects to cloud`);
  },

  addProject(project: Project): void {
    const projects = this.getProjects();
    projects.push(project);
    this.saveProjects(projects);
  },

  updateProject(updatedProject: Project): void {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === updatedProject.id);
    if (index !== -1) {
      projects[index] = updatedProject;
      this.saveProjects(projects);
    }
  },

  deleteProject(projectId: string): void {
    const projects = this.getProjects();
    const filtered = projects.filter((p) => p.id !== projectId);
    this.saveProjects(filtered);
  },

  getProjectById(projectId: string): Project | undefined {
    const projects = this.getProjects();
    return projects.find((p) => p.id === projectId);
  },

  getProjectsByReligion(religion: Religion): Project[] {
    const projects = this.getProjects();
    return projects.filter((p) => p.religion === religion);
  },

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
