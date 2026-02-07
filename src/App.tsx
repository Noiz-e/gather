import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProjectProvider, useProjects } from './contexts/ProjectContext';
import './i18n'; // Initialize i18next
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Project, Episode } from './types';
import { Layout } from './components/Layout';
import { Landing, LandingData } from './components/Landing';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { ProjectCreator } from './components/ProjectCreator';
import { ProjectDetail } from './components/ProjectDetail';
import { EpisodeCreator } from './components/EpisodeCreator';
import { EpisodeEditor } from './components/EpisodeEditor';
import { VoiceStudio } from './components/VoiceStudio';
import { MediaLibrary } from './components/MediaLibrary';
import { Settings } from './components/Settings';
import { AuthPage } from './components/AuthPage';
import { Loader2 } from 'lucide-react';

type Page = 'dashboard' | 'projects' | 'voice' | 'media' | 'settings' | 'project-detail';

interface AppContentProps {
  initialLandingData: LandingData | null;
  onClearLandingData: () => void;
}

function AppContent({ initialLandingData, onClearLandingData }: AppContentProps) {
  const { projects, currentProject, setCurrentProject, addEpisode, updateEpisode } = useProjects();
  
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showProjectCreator, setShowProjectCreator] = useState(!!initialLandingData);
  const [showEpisodeCreator, setShowEpisodeCreator] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [showEpisodeEditor, setShowEpisodeEditor] = useState(false);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setCurrentProject(null);
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
      case 'media':
        return <MediaLibrary />;
      case 'settings':
        return <Settings />;
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
          onClose={() => { setShowProjectCreator(false); onClearLandingData(); }}
          onSuccess={(projectId?: string) => { 
            setShowProjectCreator(false); 
            onClearLandingData(); 
            // Navigate to project detail if projectId is provided
            if (projectId) {
              const project = projects.find(p => p.id === projectId);
              if (project) {
                setCurrentProject(project);
                setCurrentPage('project-detail');
                return;
              }
            }
            setCurrentPage('projects'); 
          }}
          initialData={initialLandingData || undefined}
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

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--t-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={40} className="animate-spin text-t-primary" />
        <p className="text-t-text3 text-sm">加载中...</p>
      </div>
    </div>
  );
}

// Authenticated app content wrapper
function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showLanding, setShowLanding] = useState(false);
  const [landingData, setLandingData] = useState<LandingData | null>(null);

  const handleEnterWorkspace = (data?: LandingData) => {
    if (data) {
      setLandingData(data);
    }
    setShowLanding(false);
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Show main app content
  return (
    <>
      {showLanding ? (
        <Landing onEnterWorkspace={handleEnterWorkspace} />
      ) : (
        <ProjectProvider>
          <AppContent initialLandingData={landingData} onClearLandingData={() => setLandingData(null)} />
        </ProjectProvider>
      )}
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
