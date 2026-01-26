import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Episode, Project, PROJECT_STAGES, ProjectStage, ScriptSection, ScriptLine, EpisodeCharacter } from '../types';
import { X, Save, FileText, ChevronRight, Plus, Trash2, User, Volume2 } from 'lucide-react';
import { ReligionIconMap, StageIconMap } from './icons/ReligionIcons';

// Storage key for voice characters (same as VoiceStudio)
const VOICE_CHARACTERS_KEY = 'sacred-voice-characters';

interface VoiceCharacter {
  id: string;
  name: string;
  description: string;
  audioSampleUrl?: string;
}

const loadVoiceCharacters = (): VoiceCharacter[] => {
  try {
    const data = localStorage.getItem(VOICE_CHARACTERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

interface EpisodeEditorProps {
  episode?: Episode;
  project: Project;
  onSave: (episode: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

export function EpisodeEditor({ episode, project, onSave, onClose }: EpisodeEditorProps) {
  const { theme, religion } = useTheme();
  const { t } = useLanguage();
  
  // Basic info
  const [formData, setFormData] = useState({
    title: episode?.title || '',
    subtitle: episode?.subtitle || '',
    description: episode?.description || '',
    notes: episode?.notes || '',
    stage: episode?.stage || 'planning' as ProjectStage,
  });
  
  // Script sections
  const [scriptSections, setScriptSections] = useState<ScriptSection[]>(episode?.scriptSections || []);
  const [editingSection, setEditingSection] = useState<string | null>(
    episode?.scriptSections?.[0]?.id || null
  );
  
  // Characters
  const [characters, setCharacters] = useState<EpisodeCharacter[]>(episode?.characters || []);
  const [availableVoices] = useState<VoiceCharacter[]>(loadVoiceCharacters());
  
  const [activeTab, setActiveTab] = useState<'info' | 'script' | 'characters' | 'notes'>('info');

  const ReligionIcon = ReligionIconMap[religion];
  const spec = project.spec;

  const handleSubmit = () => {
    if (!formData.title.trim()) { 
      alert(t.episodeEditor.validation.titleRequired); 
      return; 
    }
    onSave({ 
      ...formData, 
      script: '', // Legacy field
      scriptSections,
      characters,
      audioUrl: episode?.audioUrl, 
      duration: episode?.duration 
    });
  };

  // Timeline editing functions
  const updateTimelineItem = (sectionId: string, itemId: string, field: 'timeStart' | 'timeEnd' | 'soundMusic', value: string) => {
    setScriptSections(sections => 
      sections.map(section => 
        section.id === sectionId 
          ? { ...section, timeline: section.timeline.map(item => item.id === itemId ? { ...item, [field]: value } : item) }
          : section
      )
    );
  };

  const updateScriptLine = (sectionId: string, itemId: string, lineIndex: number, field: keyof ScriptLine, value: string) => {
    setScriptSections(sections =>
      sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              timeline: section.timeline.map(item =>
                item.id === itemId
                  ? {
                      ...item,
                      lines: item.lines.map((line, idx) =>
                        idx === lineIndex ? { ...line, [field]: value } : line
                      )
                    }
                  : item
              )
            }
          : section
      )
    );
  };

  const addScriptLine = (sectionId: string, itemId: string) => {
    setScriptSections(sections =>
      sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              timeline: section.timeline.map(item =>
                item.id === itemId
                  ? { ...item, lines: [...(item.lines || []), { speaker: '', line: '' }] }
                  : item
              )
            }
          : section
      )
    );
  };

  const removeScriptLine = (sectionId: string, itemId: string, lineIndex: number) => {
    setScriptSections(sections =>
      sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              timeline: section.timeline.map(item =>
                item.id === itemId
                  ? { ...item, lines: item.lines.filter((_, idx) => idx !== lineIndex) }
                  : item
              )
            }
          : section
      )
    );
  };

  const addTimelineItem = (sectionId: string) => {
    setScriptSections(sections =>
      sections.map(section =>
        section.id === sectionId
          ? { ...section, timeline: [...section.timeline, { id: `item-${Date.now()}`, timeStart: '', timeEnd: '', lines: [{ speaker: '', line: '' }], soundMusic: '' }] }
          : section
      )
    );
  };

  const removeTimelineItem = (sectionId: string, itemId: string) => {
    setScriptSections(sections =>
      sections.map(section =>
        section.id === sectionId
          ? { ...section, timeline: section.timeline.filter(item => item.id !== itemId) }
          : section
      )
    );
  };

  const addSection = () => {
    const newSection: ScriptSection = {
      id: `section-${Date.now()}`,
      name: `${t.episodeEditor.script.defaultSectionName} ${scriptSections.length + 1}`,
      description: '',
      timeline: [{ id: `item-${Date.now()}`, timeStart: '', timeEnd: '', lines: [{ speaker: '', line: '' }], soundMusic: '' }]
    };
    setScriptSections([...scriptSections, newSection]);
    setEditingSection(newSection.id);
  };

  const removeSection = (sectionId: string) => {
    setScriptSections(sections => sections.filter(s => s.id !== sectionId));
    if (editingSection === sectionId) {
      setEditingSection(scriptSections[0]?.id || null);
    }
  };

  const updateSectionInfo = (sectionId: string, field: 'name' | 'description' | 'coverImageDescription', value: string) => {
    setScriptSections(sections =>
      sections.map(section =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    );
  };

  // Character functions
  const assignVoiceToCharacter = (characterIndex: number, voiceId: string) => {
    setCharacters(chars => 
      chars.map((char, i) => i === characterIndex ? { ...char, assignedVoiceId: voiceId } : char)
    );
  };

  const tabs = [
    { id: 'info', label: t.episodeEditor.tabs.info },
    { id: 'script', label: t.episodeEditor.tabs.script },
    { id: 'characters', label: t.episodeEditor.tabs.characters },
    { id: 'notes', label: t.episodeEditor.tabs.notes },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up border border-white/10" style={{ background: theme.bgDark }}>
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${theme.primary}30` }}>
              <ReligionIcon size={20} color={theme.primaryLight} />
            </div>
            <div>
              <h2 className="text-lg font-serif text-white">{episode ? t.episodeEditor.editTitle : t.episodeEditor.createTitle}</h2>
              <p className="text-sm text-white/50">{project.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="text-white/50" size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-current text-white' : 'border-transparent text-white/40 hover:text-white/60'
              }`}
              style={activeTab === tab.id ? { borderColor: theme.primary } : {}}
            >
              <FileText size={16} />
              {tab.label}
              {tab.id === 'script' && scriptSections.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: `${theme.primary}30` }}>
                  {scriptSections.length}
                </span>
              )}
              {tab.id === 'characters' && characters.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: `${theme.primary}30` }}>
                  {characters.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {t.episodeEditor.form.title} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t.episodeEditor.form.titlePlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">{t.episodeEditor.form.description}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t.episodeEditor.form.descriptionPlaceholder}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all resize-none"
                />
              </div>
              {/* Stage Progress */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">{t.episodeEditor.form.stage}</label>
                <div className="rounded-xl border border-white/10 p-4" style={{ background: theme.bgCard }}>
                  {/* Combined Progress Bar and Stage Steps */}
                  <div className="relative">
                    {/* Progress Bar Container */}
                    <div className="relative pt-4 pb-6">
                      {/* Background Bar */}
                      <div className="absolute top-8 left-0 right-0 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        {/* Active Progress */}
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${((PROJECT_STAGES.findIndex(s => s.id === formData.stage) + 1) / PROJECT_STAGES.length) * 100}%`,
                            background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryLight})`
                          }}
                        />
                      </div>
                      
                      {/* Stage Steps - positioned over the bar */}
                      <div className="relative flex justify-between">
                        {PROJECT_STAGES.map((stage, index) => {
                          const stageT = t.stages[stage.id];
                          const StageIcon = StageIconMap[stage.id];
                          const currentIndex = PROJECT_STAGES.findIndex(s => s.id === formData.stage);
                          const isCompleted = index < currentIndex;
                          const isCurrent = index === currentIndex;
                          
                          return (
                            <div key={stage.id} className="flex flex-col items-center">
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all ${
                                  isCompleted ? 'bg-green-500/20' : isCurrent ? '' : 'bg-white/5'
                                }`}
                                style={isCurrent ? { background: `${theme.primary}30`, boxShadow: `0 0 12px ${theme.glow}` } : {}}
                              >
                                <StageIcon 
                                  size={16} 
                                  color={isCompleted ? '#22c55e' : isCurrent ? theme.primaryLight : 'rgba(255,255,255,0.3)'} 
                                />
                              </div>
                              <span className={`text-[10px] text-center max-w-[60px] ${
                                isCompleted ? 'text-green-400' : isCurrent ? 'text-white' : 'text-white/30'
                              }`}>
                                {stageT.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-4">
              {scriptSections.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto mb-4 text-white/20" />
                  <p className="text-white/50 mb-4">{t.episodeEditor.script.noScriptContent}</p>
                  <button
                    onClick={addSection}
                    className="px-4 py-2 rounded-xl text-white text-sm"
                    style={{ background: theme.primary }}
                  >
                    <Plus size={16} className="inline mr-2" />
                    {t.episodeEditor.script.addSection}
                  </button>
                </div>
              ) : (
                <>
                  {/* Section List */}
                  {scriptSections.map((section) => (
                    <div 
                      key={section.id} 
                      className="rounded-xl border border-white/10 overflow-hidden"
                      style={{ background: theme.bgCard }}
                    >
                      <div 
                        className="px-4 py-3 border-b border-white/10 cursor-pointer flex items-center justify-between"
                        onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                      >
                        <div className="flex-1">
                          <input
                            type="text"
                            value={section.name}
                            onChange={(e) => { e.stopPropagation(); updateSectionInfo(section.id, 'name', e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-white bg-transparent border-none focus:outline-none w-full"
                            placeholder={t.episodeEditor.script.sectionName}
                          />
                          <input
                            type="text"
                            value={section.description}
                            onChange={(e) => { e.stopPropagation(); updateSectionInfo(section.id, 'description', e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-white/50 bg-transparent border-none focus:outline-none w-full mt-1"
                            placeholder={t.episodeEditor.script.sectionDescription}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                            className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight 
                            size={20} 
                            className={`text-white/50 transition-transform ${editingSection === section.id ? 'rotate-90' : ''}`} 
                          />
                        </div>
                      </div>
                      
                      {editingSection === section.id && (
                        <div className="p-4 space-y-3">
                          {/* Cover Image Description */}
                          {spec?.hasVisualContent && (
                            <div className="mb-4">
                              <label className="block text-xs text-white/50 mb-1">{t.episodeEditor.script.coverDescription}</label>
                              <input
                                type="text"
                                value={section.coverImageDescription || ''}
                                onChange={(e) => updateSectionInfo(section.id, 'coverImageDescription', e.target.value)}
                                placeholder={t.episodeEditor.script.describeCoverImage}
                                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 text-sm"
                              />
                            </div>
                          )}

                          {section.timeline.map((item, itemIndex) => (
                            <div key={item.id} className="rounded-lg border border-white/10 p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-white/40 w-4">{itemIndex + 1}</span>
                                  <input type="text" value={item.timeStart} onChange={(e) => updateTimelineItem(section.id, item.id, 'timeStart', e.target.value)} placeholder="00:00" className="w-14 px-2 py-1 rounded border border-white/10 bg-white/5 text-white text-xs focus:outline-none" />
                                  <span className="text-white/30 text-xs">-</span>
                                  <input type="text" value={item.timeEnd} onChange={(e) => updateTimelineItem(section.id, item.id, 'timeEnd', e.target.value)} placeholder="00:15" className="w-14 px-2 py-1 rounded border border-white/10 bg-white/5 text-white text-xs focus:outline-none" />
                                </div>
                                <button onClick={() => removeTimelineItem(section.id, item.id)} className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400"><Trash2 size={14} /></button>
                              </div>
                              
                              {/* Lines */}
                              <div className="space-y-2">
                                <label className="block text-[10px] text-white/40">{t.episodeEditor.script.lines}</label>
                                {(item.lines || []).map((scriptLine, lineIndex) => (
                                  <div key={lineIndex} className="flex items-start gap-2">
                                    <input 
                                      type="text" 
                                      value={scriptLine.speaker} 
                                      onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'speaker', e.target.value)} 
                                      placeholder={t.episodeEditor.script.speaker}
                                      className="w-24 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-white text-xs focus:outline-none flex-shrink-0" 
                                    />
                                    <textarea 
                                      value={scriptLine.line} 
                                      onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'line', e.target.value)} 
                                      placeholder={t.episodeEditor.script.lineContent}
                                      rows={2}
                                      className="flex-1 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-white text-xs focus:outline-none resize-none" 
                                    />
                                    <button 
                                      onClick={() => removeScriptLine(section.id, item.id, lineIndex)} 
                                      className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 flex-shrink-0"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                                <button 
                                  onClick={() => addScriptLine(section.id, item.id)} 
                                  className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60"
                                >
                                  <Plus size={10} />{t.episodeEditor.script.addLine}
                                </button>
                              </div>

                              {/* Sound/Music - only show if BGM or SFX is enabled */}
                              {(spec?.addBgm || spec?.addSoundEffects) && (
                                <div>
                                  <label className="block text-[10px] text-white/40 mb-1">{t.episodeEditor.script.soundMusic}</label>
                                  <input type="text" value={item.soundMusic} onChange={(e) => updateTimelineItem(section.id, item.id, 'soundMusic', e.target.value)} placeholder={t.episodeEditor.script.bgmSoundEffects} className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none" />
                                </div>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addTimelineItem(section.id)} className="flex items-center gap-2 text-xs text-white/50 hover:text-white">
                            <Plus size={14} />{t.episodeEditor.script.addSegment}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Section Button */}
                  <button
                    onClick={addSection}
                    className="w-full py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    {t.episodeEditor.script.addSection}
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'characters' && (
            <div className="space-y-4">
              {characters.length === 0 ? (
                <div className="text-center py-12">
                  <User size={48} className="mx-auto mb-4 text-white/20" />
                  <p className="text-white/50">{t.episodeEditor.characters.noCharacters}</p>
                  <p className="text-white/30 text-sm mt-2">{t.episodeEditor.characters.charactersExtracted}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-white/50 mb-4">
                    {t.episodeEditor.characters.assignVoices}
                  </p>
                  {characters.map((char, index) => (
                    <div 
                      key={index}
                      className="rounded-xl p-4 border border-white/10"
                      style={{ background: theme.bgCard }}
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${theme.primary}20` }}
                        >
                          <User size={20} style={{ color: theme.primaryLight }} />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{char.name}</h4>
                          <p className="text-xs text-white/50">{char.description || t.episodeEditor.characters.selectVoice}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableVoices.length > 0 ? (
                          availableVoices.map((voice) => (
                            <button
                              key={voice.id}
                              onClick={() => assignVoiceToCharacter(index, voice.id)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                char.assignedVoiceId === voice.id ? 'text-white' : 'text-white/60 border border-white/10'
                              }`}
                              style={char.assignedVoiceId === voice.id ? { background: theme.primary } : {}}
                            >
                              <Volume2 size={14} />{voice.name}
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-white/40">{t.episodeEditor.characters.noVoicesAvailable}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <p className="text-sm text-white/50">{t.episodeEditor.form.notesDesc}</p>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t.episodeEditor.form.notesPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all resize-none"
                style={{ minHeight: '250px' }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors">
            {t.episodeEditor.buttons.cancel}
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all hover:scale-105"
            style={{ background: theme.accent, color: theme.primaryDark }}
          >
            <Save size={18} />
            {episode ? t.episodeEditor.buttons.save : t.episodeEditor.buttons.create}
          </button>
        </div>
      </div>
    </div>
  );
}
