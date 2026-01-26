import { useState } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ProjectProvider, useProjects } from './contexts/ProjectContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { Religion, Project, Episode } from './types';
import { ReligionSelector } from './components/ReligionSelector';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { ProjectCreator } from './components/ProjectCreator';
import { ProjectDetail } from './components/ProjectDetail';
import { EpisodeCreator } from './components/EpisodeCreator';
import { EpisodeEditor } from './components/EpisodeEditor';
import { VoiceStudio } from './components/VoiceStudio';
import { Settings } from './components/Settings';

type Page = 'dashboard' | 'projects' | 'voice' | 'settings' | 'religion-select' | 'project-detail';

function AppContent() {
  const { setReligion } = useTheme();
  const { projects, currentProject, setCurrentProject, addEpisode, updateEpisode } = useProjects();
  
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [showEpisodeCreator, setShowEpisodeCreator] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [showEpisodeEditor, setShowEpisodeEditor] = useState(false);

  // Show religion selector only when explicitly navigating to it
  if (currentPage === 'religion-select') {
    return (
      <ReligionSelector 
        onSelect={(selectedReligion: Religion) => {
          setReligion(selectedReligion);
          setCurrentPage('dashboard');
        }} 
      />
    );
  }

  const handleNavigate = (page: string) => {
    if (page === 'religion-select') {
      setCurrentPage('religion-select');
    } else {
      setCurrentPage(page as Page);
      setCurrentProject(null);
    }
  };

  const handleViewProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentPage('project-detail');
  };

  const handleEditProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentPage('project-detail');
  };

  const handleCreateEpisode = () => {
    // Use EpisodeCreator for new episodes (with script generation)
    setShowEpisodeCreator(true);
  };

  const handleEditEpisode = (episode: Episode) => {
    setEditingEpisode(episode);
    setShowEpisodeEditor(true);
  };

  const handleSaveEpisode = (episodeData: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentProject) return;

    if (editingEpisode) {
      updateEpisode(currentProject.id, {
        ...editingEpisode,
        ...episodeData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      addEpisode(currentProject.id, episodeData);
    }

    setShowEpisodeEditor(false);
    setEditingEpisode(null);
  };

  const renderContent = () => {
    if (currentPage === 'project-detail' && currentProject) {
      return (
        <ProjectDetail
          project={currentProject}
          onBack={() => { setCurrentProject(null); setCurrentPage('projects'); }}
          onEditEpisode={handleEditEpisode}
          onCreateEpisode={handleCreateEpisode}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onCreateProject={() => setShowProjectCreator(true)} onViewProjects={() => setCurrentPage('projects')} />;
      case 'projects':
        return <ProjectList onCreateProject={() => setShowProjectCreator(true)} onViewProject={handleViewProject} onEditProject={handleEditProject} />;
      case 'voice':
        return <VoiceStudio />;
      case 'settings':
        return <Settings onChangeReligion={() => setCurrentPage('religion-select')} />;
      default:
        return <Dashboard onCreateProject={() => setShowProjectCreator(true)} onViewProjects={() => setCurrentPage('projects')} />;
    }
  };

  return (
    <>
      <Layout onNavigate={handleNavigate} currentPage={currentPage}>
        {renderContent()}
      </Layout>

      {showProjectCreator && (
        <ProjectCreator
          onClose={() => setShowProjectCreator(false)}
          onSuccess={() => { setShowProjectCreator(false); setCurrentPage('projects'); }}
        />
      )}

      {showEpisodeCreator && currentProject && (
        <EpisodeCreator
          project={currentProject}
          onClose={() => setShowEpisodeCreator(false)}
          onSuccess={() => { 
            setShowEpisodeCreator(false);
            // Refresh the project to show new episode
            const updatedProject = projects.find(p => p.id === currentProject.id);
            if (updatedProject) setCurrentProject(updatedProject);
          }}
        />
      )}

      {showEpisodeEditor && currentProject && (
        <EpisodeEditor
          episode={editingEpisode || undefined}
          project={currentProject}
          onSave={handleSaveEpisode}
          onClose={() => { setShowEpisodeEditor(false); setEditingEpisode(null); }}
        />
      )}
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ProjectProvider>
          <AppContent />
        </ProjectProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
