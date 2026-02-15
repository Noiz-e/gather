import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, Episode, Religion, ProjectSpec, ScriptSection, EpisodeCharacter } from '../types';
import { storage } from '../utils/storage';
import { loadVoiceCharactersFromCloud } from '../utils/voiceStorage';
import { loadMediaItemsFromCloudStorage } from '../utils/mediaStorage';

interface CreateProjectData {
  title: string;
  subtitle?: string;
  description: string;
  religion: Religion;
  tags: string[];
  spec?: ProjectSpec;
  firstEpisode?: {
    title: string;
    subtitle?: string;
    description: string;
    scriptSections?: ScriptSection[];
    characters?: EpisodeCharacter[];
    audioData?: string;
    audioMimeType?: string;
    audioDurationMs?: number;
  };
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  createProject: (data: CreateProjectData) => Project;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  addEpisode: (projectId: string, episode: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>) => Episode;
  updateEpisode: (projectId: string, episode: Episode) => void;
  deleteEpisode: (projectId: string, episodeId: string) => void;
  getProjectsByReligion: (religion: Religion) => Project[];
  getProjectSpec: (projectId: string) => ProjectSpec | undefined;
  isCloudSynced: boolean;
  syncFromCloud: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Load all data from cloud (sole source of truth) on mount.
  // No localStorage fallback — cloud is always authoritative.
  useEffect(() => {
    const loadFromCloud = async () => {
      try {
        const cloudProjects = await storage.loadFromCloud();
        setProjects(cloudProjects);
        setIsCloudSynced(true);
        console.log('Synced projects from cloud');
        
        // Also pre-load voices and media from cloud in background
        loadVoiceCharactersFromCloud().catch(console.error);
        loadMediaItemsFromCloudStorage().catch(console.error);
      } catch (error) {
        console.error('Failed to sync from cloud:', error);
        setIsCloudSynced(false);
        // No fallback — show empty state; user can retry
      }
    };
    
    loadFromCloud();
  }, []);

  // Manual sync from cloud
  const syncFromCloud = useCallback(async () => {
    try {
      const cloudProjects = await storage.loadFromCloud();
      setProjects(cloudProjects);
      setIsCloudSynced(true);
      
      // Also sync voices and media
      await loadVoiceCharactersFromCloud();
      await loadMediaItemsFromCloudStorage();
      
      console.log('Manual cloud sync completed');
    } catch (error) {
      console.error('Manual cloud sync failed:', error);
      throw error;
    }
  }, []);

  const createProject = (data: CreateProjectData): Project => {
    const now = new Date().toISOString();
    
    // Create episodes array - include first episode if provided
    const episodes: Episode[] = [];
    if (data.firstEpisode) {
      const firstEpisode: Episode = {
        id: uuidv4(),
        title: data.firstEpisode.title,
        subtitle: data.firstEpisode.subtitle,
        description: data.firstEpisode.description,
        script: '', // Legacy field
        scriptSections: data.firstEpisode.scriptSections,
        characters: data.firstEpisode.characters,
        audioData: data.firstEpisode.audioData,
        audioMimeType: data.firstEpisode.audioMimeType,
        audioDurationMs: data.firstEpisode.audioDurationMs,
        stage: data.firstEpisode.audioData ? 'review' : 'scripting',
        createdAt: now,
        updatedAt: now,
        notes: '',
      };
      episodes.push(firstEpisode);
    }
    
    const newProject: Project = {
      id: uuidv4(),
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      religion: data.religion,
      tags: data.tags,
      spec: data.spec,
      episodes,
      createdAt: now,
      updatedAt: now,
    };
    
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    storage.saveProjects(updatedProjects);
    
    return newProject;
  };

  const updateProject = (updatedProject: Project) => {
    const updated = {
      ...updatedProject,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedProjects = projects.map((p) =>
      p.id === updated.id ? updated : p
    );
    setProjects(updatedProjects);
    storage.saveProjects(updatedProjects);
    
    if (currentProject?.id === updated.id) {
      setCurrentProject(updated);
    }
  };

  const deleteProject = (projectId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    setProjects(updatedProjects);
    storage.saveProjects(updatedProjects);
    
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
    }
  };

  const addEpisode = (
    projectId: string,
    episodeData: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>
  ): Episode => {
    const now = new Date().toISOString();
    const newEpisode: Episode = {
      ...episodeData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    const project = projects.find((p) => p.id === projectId);
    if (project) {
      const updatedProject = {
        ...project,
        episodes: [...project.episodes, newEpisode],
        updatedAt: now,
      };
      updateProject(updatedProject);
    }

    return newEpisode;
  };

  const updateEpisode = (projectId: string, updatedEpisode: Episode) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      const updatedEpisodes = project.episodes.map((e) =>
        e.id === updatedEpisode.id
          ? { ...updatedEpisode, updatedAt: new Date().toISOString() }
          : e
      );
      updateProject({ ...project, episodes: updatedEpisodes });
    }
  };

  const deleteEpisode = (projectId: string, episodeId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      const updatedEpisodes = project.episodes.filter((e) => e.id !== episodeId);
      updateProject({ ...project, episodes: updatedEpisodes });
    }
  };

  const getProjectsByReligion = (religion: Religion): Project[] => {
    return projects.filter((p) => p.religion === religion);
  };

  const getProjectSpec = (projectId: string): ProjectSpec | undefined => {
    const project = projects.find((p) => p.id === projectId);
    return project?.spec;
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        setCurrentProject,
        createProject,
        updateProject,
        deleteProject,
        addEpisode,
        updateEpisode,
        deleteEpisode,
        getProjectsByReligion,
        getProjectSpec,
        isCloudSynced,
        syncFromCloud,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
