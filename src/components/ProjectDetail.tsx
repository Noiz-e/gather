import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Project, Episode, PROJECT_STAGES, ProjectStage } from '../types';
import { ArrowLeft, Plus, Edit2, Trash2, MoreVertical, CheckCircle2, Circle, FileText } from 'lucide-react';
import { StageIconMap } from './icons/ReligionIcons';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onEditEpisode: (episode: Episode) => void;
  onCreateEpisode: () => void;
}

export function ProjectDetail({ project, onBack, onEditEpisode, onCreateEpisode }: ProjectDetailProps) {
  const { theme } = useTheme();
  const { deleteEpisode, updateEpisode } = useProjects();
  const { t, language } = useLanguage();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleDeleteEpisode = (episodeId: string) => {
    if (window.confirm(t.projectList.deleteConfirm)) deleteEpisode(project.id, episodeId);
    setMenuOpenId(null);
  };

  const handleEpisodeStageChange = (episode: Episode, newStage: ProjectStage) => {
    updateEpisode(project.id, { ...episode, stage: newStage });
    setMenuOpenId(null);
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 md:gap-4">
        <button onClick={onBack} className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 mt-1">
          <ArrowLeft size={20} className="md:hidden text-white/70" />
          <ArrowLeft size={24} className="hidden md:block text-white/70" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-white tracking-wide">{project.title}</h1>
          {project.subtitle && <p className="text-white/70 mt-0.5 text-sm md:text-base italic">{project.subtitle}</p>}
          <p className="text-white/50 mt-1 text-sm md:text-base line-clamp-2">{project.description || t.projectDetail.noEpisodes}</p>
        </div>
      </div>

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {project.tags.map((tag, i) => (
            <span key={i} className="px-2 md:px-3 py-0.5 md:py-1 rounded-md md:rounded-lg text-xs md:text-sm" style={{ background: `${theme.primary}20`, color: theme.primaryLight }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Project Spec Info */}
      {project.spec && (
        <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
          <h2 className="text-base md:text-lg font-serif text-white mb-3 md:mb-4">{language === 'zh' ? '项目规格' : 'Project Spec'}</h2>
          <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
            {project.spec.targetAudience && (
              <div><span className="text-white/40">{language === 'zh' ? '目标受众' : 'Audience'}</span><p className="text-white font-medium">{project.spec.targetAudience}</p></div>
            )}
            {project.spec.formatAndDuration && (
              <div><span className="text-white/40">{language === 'zh' ? '时长格式' : 'Format'}</span><p className="text-white font-medium">{project.spec.formatAndDuration}</p></div>
            )}
            {project.spec.toneAndExpression && (
              <div className="col-span-2"><span className="text-white/40">{language === 'zh' ? '风格基调' : 'Tone'}</span><p className="text-white font-medium">{project.spec.toneAndExpression}</p></div>
            )}
          </div>
        </div>
      )}

      {/* Episodes */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
        <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
          <h2 className="text-base md:text-lg font-serif text-white">{t.projectDetail.episodeList}</h2>
          <button
            onClick={onCreateEpisode}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all hover:scale-105 flex-shrink-0"
            style={{ background: theme.accent, color: theme.primaryDark }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{t.projectDetail.addEpisode}</span>
            <span className="sm:hidden">{language === 'en' ? 'Add' : '添加'}</span>
          </button>
        </div>

        {project.episodes.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {project.episodes.map((episode, index) => {
              const episodeStage = PROJECT_STAGES.find((s) => s.id === episode.stage);
              const stageT = episodeStage ? t.stages[episodeStage.id] : null;
              const StageIcon = episodeStage ? StageIconMap[episodeStage.id] : null;
              
              return (
                <div key={episode.id} className="flex items-center gap-2 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl border border-white/5 hover:border-white/10 transition-all group" style={{ background: `${theme.primary}05` }}>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-medium text-white flex-shrink-0 text-sm md:text-base" style={{ background: theme.primary }}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate text-sm md:text-base">{episode.title}</h3>
                    <p className="text-xs md:text-sm text-white/40 truncate">{episode.description || t.projectDetail.noEpisodes}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs flex-shrink-0" style={{ background: `${theme.primary}20`, color: theme.primaryLight }}>
                    {StageIcon && <StageIcon size={12} color={theme.primaryLight} />}
                    {stageT?.name}
                  </div>
                  <div className="relative flex-shrink-0">
                    <button onClick={() => setMenuOpenId(menuOpenId === episode.id ? null : episode.id)} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <MoreVertical size={16} className="md:hidden text-white/40" />
                      <MoreVertical size={18} className="hidden md:block text-white/40" />
                    </button>
                    {menuOpenId === episode.id && (
                      <div className="absolute right-0 top-full mt-1 rounded-xl border border-white/10 py-1 z-10 min-w-[140px] md:min-w-[160px] backdrop-blur-xl" style={{ background: theme.bgDark }}>
                        <button onClick={() => { onEditEpisode(episode); setMenuOpenId(null); }} className="w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2">
                          <Edit2 size={14} />{t.projectDetail.editContent}
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <div className="px-3 md:px-4 py-1 text-[10px] md:text-xs text-white/30">{t.projectDetail.changeStatus}</div>
                        {PROJECT_STAGES.map((stage) => {
                          const stageItemT = t.stages[stage.id];
                          const StageItemIcon = StageIconMap[stage.id];
                          return (
                            <button key={stage.id} onClick={() => handleEpisodeStageChange(episode, stage.id)} className="w-full px-3 md:px-4 py-1.5 md:py-2 text-left text-xs md:text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2">
                              {episode.stage === stage.id ? <CheckCircle2 size={14} style={{ color: theme.primary }} /> : <Circle size={14} className="text-white/20" />}
                              <StageItemIcon size={12} color="currentColor" />
                              {stageItemT.name}
                            </button>
                          );
                        })}
                        <div className="border-t border-white/10 my-1" />
                        <button onClick={() => handleDeleteEpisode(episode.id)} className="w-full px-3 md:px-4 py-1.5 md:py-2 text-left text-xs md:text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                          <Trash2 size={14} />{t.projectDetail.deleteEpisode}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 md:py-16">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4" style={{ background: `${theme.primary}20` }}>
              <FileText size={20} className="md:hidden" color={theme.primaryLight} />
              <FileText size={24} className="hidden md:block" color={theme.primaryLight} />
            </div>
            <p className="text-white/40 mb-3 md:mb-4 text-sm md:text-base">{t.projectDetail.noEpisodes}</p>
            <button onClick={onCreateEpisode} className="inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all hover:scale-105" style={{ background: theme.accent, color: theme.primaryDark }}>
              <Plus size={16} />{t.projectDetail.addFirstEpisode}
            </button>
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
        <h2 className="text-base md:text-lg font-serif text-white mb-3 md:mb-4">{t.projectDetail.projectInfo}</h2>
        <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
          <div><span className="text-white/40">{t.projectDetail.createdAt}</span><p className="text-white font-medium">{new Date(project.createdAt).toLocaleDateString()}</p></div>
          <div><span className="text-white/40">{t.projectDetail.lastUpdated}</span><p className="text-white font-medium">{new Date(project.updatedAt).toLocaleDateString()}</p></div>
          <div><span className="text-white/40">{t.projectDetail.episodeCount}</span><p className="text-white font-medium">{project.episodes.length} {t.dashboard.episodes}</p></div>
        </div>
      </div>
    </div>
  );
}
