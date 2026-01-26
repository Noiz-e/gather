import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Plus, Mic2, TrendingUp, ArrowRight, FileText } from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';

interface DashboardProps {
  onCreateProject: () => void;
  onViewProjects: () => void;
}

export function Dashboard({ onCreateProject, onViewProjects }: DashboardProps) {
  const { theme, religion } = useTheme();
  const { getProjectsByReligion } = useProjects();
  const { t } = useLanguage();

  const myProjects = getProjectsByReligion(religion);
  const totalEpisodes = myProjects.reduce((acc, p) => acc + p.episodes.length, 0);

  const recentProjects = [...myProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const religionT = t.religions[religion];
  const ReligionIcon = ReligionIconMap[religion];

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div 
        className="rounded-2xl md:rounded-3xl p-5 sm:p-6 lg:p-10 relative overflow-hidden border border-white/10"
        style={{ background: theme.bgCard }}
      >
        {/* Decorative glow */}
        <div 
          className="absolute top-0 right-0 w-40 md:w-80 h-40 md:h-80 rounded-full blur-[60px] md:blur-[100px] opacity-30"
          style={{ background: theme.primary }}
        />
        
        <div className="relative flex flex-col gap-4 md:gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div 
              className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}10)`,
                boxShadow: `0 0 40px ${theme.glow}`,
              }}
            >
              <ReligionIcon size={28} className="md:hidden" color={theme.primaryLight} />
              <ReligionIcon size={40} className="hidden md:block" color={theme.primaryLight} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-serif font-light text-white tracking-wide">
                {t.dashboard.welcome}
              </h1>
              <p className="text-white/50 mt-1 text-sm md:text-base line-clamp-2">
                {religionT.description}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCreateProject}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm md:text-base"
              style={{ 
                background: theme.accent,
                color: theme.primaryDark,
              }}
            >
              <Plus size={18} />
              {t.dashboard.createNew}
            </button>
            <button
              onClick={onViewProjects}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 transition-all duration-300 text-white text-sm md:text-base"
            >
              {t.dashboard.viewAll}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {[
          { label: t.dashboard.podcastProjects, value: myProjects.length, icon: Mic2 },
          { label: t.dashboard.totalEpisodes, value: totalEpisodes, icon: TrendingUp },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className="rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-white/20"
              style={{ background: theme.bgCard }}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${theme.primary}20` }}
                >
                  <Icon size={18} className="md:hidden" color={theme.primaryLight} />
                  <Icon size={22} className="hidden md:block" color={theme.primaryLight} />
                </div>
                <div>
                  <p className="text-white/50 text-[10px] sm:text-xs md:text-sm line-clamp-1">{stat.label}</p>
                  <p 
                    className="text-xl sm:text-2xl md:text-3xl font-light tracking-wide"
                    style={{ color: theme.textOnDark }}
                  >
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Projects */}
      <div 
        className="rounded-xl md:rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/10"
        style={{ background: theme.bgCard }}
      >
        <h2 className="text-lg md:text-xl font-serif text-white mb-4 md:mb-6 tracking-wide">
          {t.dashboard.recentProjects}
        </h2>
        {recentProjects.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 md:p-4 rounded-lg md:rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer group gap-3"
                style={{ background: `${theme.primary}05` }}
                onClick={onViewProjects}
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                  <div 
                    className="w-1.5 md:w-2 h-8 md:h-10 rounded-full flex-shrink-0"
                    style={{ background: theme.primary }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-white group-hover:text-white/90 transition-colors text-sm md:text-base truncate">
                      {project.title}
                    </h3>
                    <p className="text-xs md:text-sm text-white/40 truncate">
                      {project.episodes.length} {t.dashboard.episodes} · {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div 
                  className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-sm flex-shrink-0"
                  style={{ 
                    background: `${theme.primary}20`,
                    color: theme.primaryLight,
                  }}
                >
                  <FileText size={12} className="md:hidden" color={theme.primaryLight} />
                  <FileText size={14} className="hidden md:block" color={theme.primaryLight} />
                  <span>{project.episodes.length}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 md:py-16">
            <div 
              className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4"
              style={{ background: `${theme.primary}20` }}
            >
              <Mic2 size={24} className="md:hidden" color={theme.primaryLight} style={{ opacity: 0.5 }} />
              <Mic2 size={28} className="hidden md:block" color={theme.primaryLight} style={{ opacity: 0.5 }} />
            </div>
            <p className="text-white/40 text-sm md:text-base">{t.dashboard.noProjects}</p>
          </div>
        )}
      </div>
    </div>
  );
}
