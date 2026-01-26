import { Project, Religion } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'religious_podcast_projects',
  CURRENT_RELIGION: 'religious_podcast_religion',
  USER_PREFERENCES: 'religious_podcast_preferences',
};

export const storage = {
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
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch {
      console.error('Failed to save projects to storage');
    }
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
