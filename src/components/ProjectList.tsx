import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Project } from '../types';
import { Plus, Search, MoreVertical, Trash2, Edit, Eye, Mic2 } from 'lucide-react';

interface ProjectListProps {
  onCreateProject: () => void;
  onViewProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
}

export function ProjectList({ onCreateProject, onViewProject, onEditProject }: ProjectListProps) {
  const { theme, religion } = useTheme();
  const { getProjectsByReligion, deleteProject } = useProjects();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const myProjects = getProjectsByReligion(religion);
  
  const filteredProjects = myProjects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleDelete = (projectId: string) => {
    if (window.confirm(t.projectList.deleteConfirm)) {
      deleteProject(projectId);
    }
    setMenuOpenId(null);
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-t-text1 tracking-wide">
            {t.projectList.title}
          </h1>
          <p className="text-t-text3 mt-1 text-sm md:text-base">
            {t.projectList.subtitle}
          </p>
        </div>
        <button
          onClick={onCreateProject}
          className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm md:text-base"
          style={{ background: theme.accent, color: theme.primaryDark }}
        >
          <Plus size={18} />
          {t.projectList.newProject}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-t-text3" size={18} />
        <input
          type="text"
          placeholder={t.projectList.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 rounded-xl border border-t-border bg-t-card text-t-text1 placeholder-t-text3 focus:outline-none focus:border-t-border transition-all text-sm md:text-base"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl md:rounded-2xl overflow-hidden border border-t-border hover:border-t-border transition-all duration-300 group cursor-pointer"
              style={{ background: 'var(--t-bg-card)' }}
              onClick={() => onViewProject(project)}
            >
              {/* Cover */}
              <div 
                className="h-24 md:h-32 flex items-center justify-center relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${theme.primary}30, ${theme.primaryDark})` }}
              >
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{ 
                    background: `radial-gradient(circle at 50% 50%, ${theme.glow}, transparent 70%)`,
                  }}
                />
                <Mic2 size={36} className="md:hidden text-t-surface-m" />
                <Mic2 size={48} className="hidden md:block text-t-surface-m" />
              </div>
              
              {/* Content */}
              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base md:text-lg text-t-text1 truncate group-hover:text-t-text1 transition-colors">
                      {project.title}
                    </h3>
                    {project.subtitle && (
                      <p className="text-t-text2 text-xs md:text-sm italic truncate">{project.subtitle}</p>
                    )}
                    <p className="text-t-text3 text-xs md:text-sm mt-1 line-clamp-2">
                      {project.description || t.projectDetail.noEpisodes}
                    </p>
                  </div>
                  
                  {/* Menu */}
                  <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                      className="p-1.5 md:p-2 hover:bg-t-card-hover rounded-lg transition-colors"
                    >
                      <MoreVertical size={16} className="md:hidden text-t-text3" />
                      <MoreVertical size={18} className="hidden md:block text-t-text3" />
                    </button>
                    
                    {menuOpenId === project.id && (
                      <div 
                        className="absolute right-0 top-full mt-1 rounded-xl border border-t-border py-1 z-10 min-w-[140px] md:min-w-[160px] backdrop-blur-xl"
                        style={{ background: 'var(--t-bg-base)' }}
                      >
                        <button
                          onClick={() => { onViewProject(project); setMenuOpenId(null); }}
                          className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-t-text2 hover:text-t-text1 hover:bg-t-card flex items-center gap-2 transition-colors"
                        >
                          <Eye size={14} />
                          {t.projectList.viewDetails}
                        </button>
                        <button
                          onClick={() => { onEditProject(project); setMenuOpenId(null); }}
                          className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-t-text2 hover:text-t-text1 hover:bg-t-card flex items-center gap-2 transition-colors"
                        >
                          <Edit size={14} />
                          {t.projectList.editProject}
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 size={14} />
                          {t.projectList.deleteProject}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2 md:mt-3">
                    {project.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs"
                        style={{ background: `${theme.primary}20`, color: theme.primaryLight }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4 border-t border-t-border-lt">
                  <div className="text-xs md:text-sm text-t-text3">
                    {project.episodes.length} {t.dashboard.episodes}
                  </div>
                  <div className="text-xs md:text-sm text-t-text3">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div 
          className="rounded-xl md:rounded-2xl p-8 md:p-16 text-center border border-t-border"
          style={{ background: 'var(--t-bg-card)' }}
        >
          <div 
            className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6"
            style={{ background: `${theme.primary}20` }}
          >
            <Mic2 size={28} className="md:hidden" color={theme.primaryLight} style={{ opacity: 0.5 }} />
            <Mic2 size={36} className="hidden md:block" color={theme.primaryLight} style={{ opacity: 0.5 }} />
          </div>
          <h3 className="text-lg md:text-xl font-serif text-t-text1 mb-2">
            {searchTerm ? t.projectList.noProjectsFound : t.projectList.noProjectsYet}
          </h3>
          <p className="text-t-text3 mb-6 md:mb-8 text-sm md:text-base">
            {searchTerm ? t.projectList.adjustSearch : t.projectList.createFirstDesc}
          </p>
          {!searchTerm && (
            <button
              onClick={onCreateProject}
              className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm md:text-base"
              style={{ background: theme.accent, color: theme.primaryDark }}
            >
              <Plus size={18} />
              {t.projectList.createFirst}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
