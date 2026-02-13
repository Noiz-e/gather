import { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Episode, Project, PROJECT_STAGES, ProjectStage, ScriptSection, ScriptLine, EpisodeCharacter } from '../types';
import { X, Save, FileText, ChevronRight, Plus, Trash2, User, Volume2, Pause, Scissors } from 'lucide-react';
import { ReligionIconMap, StageIconMap } from './icons/ReligionIcons';

// Storage key for voice characters (same as VoiceStudio)
const VOICE_CHARACTERS_KEY = 'gather-voice-characters';

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

  // Split line: track which textarea is focused and cursor position
  const [splitCursor, setSplitCursor] = useState<{ sectionId: string; itemId: string; lineIndex: number; cursorPos: number } | null>(null);

  const ReligionIcon = ReligionIconMap[religion];
  const spec = project.spec;

  // Maximum number of script lines allowed (matches server-side batch limit)
  const MAX_SCRIPT_LINES = 100;
  
  // Compute total line count across all sections
  const totalLineCount = useMemo(() => {
    return scriptSections.reduce((total, section) => {
      return total + section.timeline.reduce((sectionTotal, item) => {
        return sectionTotal + (item.lines?.length || 0);
      }, 0);
    }, 0);
  }, [scriptSections]);

  // Compute known speaker names from characters + script lines (for dropdown selection)
  const knownSpeakers = useMemo(() => {
    const names = new Set<string>();
    characters.forEach(c => { if (c.name) names.add(c.name); });
    scriptSections.forEach(section => {
      section.timeline.forEach(item => {
        (item.lines || []).forEach(line => {
          if (line.speaker?.trim()) names.add(line.speaker.trim());
        });
      });
    });
    return Array.from(names);
  }, [characters, scriptSections]);

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

  const setLinePause = (sectionId: string, itemId: string, lineIndex: number, pauseAfterMs: number | undefined) => {
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
                        idx === lineIndex ? { ...line, pauseAfterMs } : line
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
    setScriptSections(sections => {
      // Count current total lines
      const currentTotal = sections.reduce((total, section) => {
        return total + section.timeline.reduce((sectionTotal, item) => {
          return sectionTotal + (item.lines?.length || 0);
        }, 0);
      }, 0);
      if (currentTotal >= MAX_SCRIPT_LINES) {
        return sections; // Limit reached, don't add
      }
      // Find the last speaker in this timeline item to use as default
      let lastSpeaker = '';
      for (const section of sections) {
        if (section.id === sectionId) {
          for (const item of section.timeline) {
            if (item.id === itemId && item.lines && item.lines.length > 0) {
              lastSpeaker = item.lines[item.lines.length - 1].speaker || '';
            }
          }
        }
      }
      return sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              timeline: section.timeline.map(item =>
                item.id === itemId
                  ? { ...item, lines: [...(item.lines || []), { speaker: lastSpeaker, line: '' }] }
                  : item
              )
            }
          : section
      );
    });
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

  // Split a script line at cursor position
  const splitScriptLine = (sectionId: string, itemId: string, lineIndex: number, cursorPos: number) => {
    setScriptSections(sections =>
      sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              timeline: section.timeline.map(item => {
                if (item.id !== itemId || !item.lines?.[lineIndex]) return item;
                const line = item.lines[lineIndex];
                const textBefore = line.line.slice(0, cursorPos);
                const textAfter = line.line.slice(cursorPos);
                const newLines = [...item.lines];
                newLines[lineIndex] = { ...line, line: textBefore };
                newLines.splice(lineIndex + 1, 0, { speaker: line.speaker, line: textAfter });
                return { ...item, lines: newLines };
              })
            }
          : section
      )
    );
  };

  const addTimelineItem = (sectionId: string) => {
    setScriptSections(sections => {
      // Find the last speaker used in this section
      let lastSpeaker = '';
      for (const section of sections) {
        if (section.id === sectionId) {
          for (const item of section.timeline) {
            if (item.lines && item.lines.length > 0) {
              const last = item.lines[item.lines.length - 1].speaker;
              if (last) lastSpeaker = last;
            }
          }
        }
      }
      return sections.map(section =>
        section.id === sectionId
          ? { ...section, timeline: [...section.timeline, { id: `item-${Date.now()}`, timeStart: '', timeEnd: '', lines: [{ speaker: lastSpeaker, line: '' }], soundMusic: '' }] }
          : section
      );
    });
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
      <div className="rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up border border-t-border" style={{ background: 'var(--t-bg-base)' }}>
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-t-border">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${theme.primary}30` }}>
              <ReligionIcon size={20} color={theme.primaryLight} />
            </div>
            <div>
              <h2 className="text-lg font-serif text-t-text1">{episode ? t.episodeEditor.editTitle : t.episodeEditor.createTitle}</h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-t-text3">{project.title}</p>
                {activeTab === 'script' && totalLineCount > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-t-border overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min((totalLineCount / MAX_SCRIPT_LINES) * 100, 100)}%`,
                          background: totalLineCount >= MAX_SCRIPT_LINES ? '#ef4444' : totalLineCount >= MAX_SCRIPT_LINES * 0.8 ? '#f59e0b' : theme.primary 
                        }}
                      />
                    </div>
                    <span className={`text-[10px] tabular-nums ${totalLineCount >= MAX_SCRIPT_LINES ? 'text-red-500' : totalLineCount >= MAX_SCRIPT_LINES * 0.8 ? 'text-amber-500' : 'text-t-text3/60'}`}>
                      {totalLineCount}/{MAX_SCRIPT_LINES}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-t-card-hover rounded-lg transition-colors">
            <X className="text-t-text3" size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-t-border flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-current text-t-text1' : 'border-transparent text-t-text3 hover:text-t-text2'
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
                <label className="block text-sm font-medium text-t-text2 mb-2">
                  {t.episodeEditor.form.title} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t.episodeEditor.form.titlePlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-t-border bg-t-card text-t-text1 placeholder-t-text3 focus:outline-none focus:border-t-border transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-t-text2 mb-2">{t.episodeEditor.form.description}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t.episodeEditor.form.descriptionPlaceholder}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-t-border bg-t-card text-t-text1 placeholder-t-text3 focus:outline-none focus:border-t-border transition-all resize-none"
                />
              </div>
              {/* Stage Progress */}
              <div>
                <label className="block text-sm font-medium text-t-text2 mb-3">{t.episodeEditor.form.stage}</label>
                <div className="rounded-xl border border-t-border p-4" style={{ background: 'var(--t-bg-card)' }}>
                  {/* Combined Progress Bar and Stage Steps */}
                  <div className="relative">
                    {/* Progress Bar Container */}
                    <div className="relative pt-4 pb-6">
                      {/* Background Bar */}
                      <div className="absolute top-8 left-0 right-0 h-1.5 bg-t-card-hover rounded-full overflow-hidden">
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
                                  isCompleted ? 'bg-green-500/20' : isCurrent ? '' : 'bg-t-card'
                                }`}
                                style={isCurrent ? { background: `${theme.primary}30`, boxShadow: `0 0 12px ${theme.glow}` } : {}}
                              >
                                <StageIcon 
                                  size={16} 
                                  color={isCompleted ? '#22c55e' : isCurrent ? theme.primaryLight : 'var(--t-text-3)'} 
                                />
                              </div>
                              <span className={`text-[10px] text-center max-w-[60px] ${
                                isCompleted ? 'text-green-400' : isCurrent ? 'text-t-text1' : 'text-t-text3'
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
                  <FileText size={48} className="mx-auto mb-4 text-t-text3" />
                  <p className="text-t-text3 mb-4">{t.episodeEditor.script.noScriptContent}</p>
                  <button
                    onClick={addSection}
                    className="px-4 py-2 rounded-xl text-t-text1 text-sm"
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
                      className="rounded-xl border border-t-border overflow-hidden"
                      style={{ background: 'var(--t-bg-card)' }}
                    >
                      <div 
                        className="px-4 py-3 border-b border-t-border cursor-pointer flex items-center justify-between"
                        onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                      >
                        <div className="flex-1">
                          <input
                            type="text"
                            value={section.name}
                            onChange={(e) => { e.stopPropagation(); updateSectionInfo(section.id, 'name', e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-t-text1 bg-transparent border-none focus:outline-none w-full"
                            placeholder={t.episodeEditor.script.sectionName}
                          />
                          <input
                            type="text"
                            value={section.description}
                            onChange={(e) => { e.stopPropagation(); updateSectionInfo(section.id, 'description', e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-t-text3 bg-transparent border-none focus:outline-none w-full mt-1"
                            placeholder={t.episodeEditor.script.sectionDescription}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                            className="p-1.5 rounded hover:bg-red-500/20 text-t-text3 hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight 
                            size={20} 
                            className={`text-t-text3 transition-transform ${editingSection === section.id ? 'rotate-90' : ''}`} 
                          />
                        </div>
                      </div>
                      
                      {editingSection === section.id && (
                        <div className="p-4 space-y-3">
                          {/* Cover Image Description */}
                          {spec?.hasVisualContent && (
                            <div className="mb-4">
                              <label className="block text-xs text-t-text3 mb-1">{t.episodeEditor.script.coverDescription}</label>
                              <input
                                type="text"
                                value={section.coverImageDescription || ''}
                                onChange={(e) => updateSectionInfo(section.id, 'coverImageDescription', e.target.value)}
                                placeholder={t.episodeEditor.script.describeCoverImage}
                                className="w-full px-3 py-2 rounded-lg border border-t-border bg-t-card text-t-text1 focus:outline-none focus:border-t-border text-sm"
                              />
                            </div>
                          )}

                          {section.timeline.map((item, itemIndex) => (
                            <div key={item.id} className="rounded-lg border border-t-border p-3 space-y-3" style={{ background: 'var(--t-bg-card)' }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-t-text3 w-4">{itemIndex + 1}</span>
                                  <input type="text" value={item.timeStart} onChange={(e) => updateTimelineItem(section.id, item.id, 'timeStart', e.target.value)} placeholder="00:00" className="w-14 px-2 py-1 rounded border border-t-border bg-t-card text-t-text1 text-xs focus:outline-none" />
                                  <span className="text-t-text3 text-xs">-</span>
                                  <input type="text" value={item.timeEnd} onChange={(e) => updateTimelineItem(section.id, item.id, 'timeEnd', e.target.value)} placeholder="00:15" className="w-14 px-2 py-1 rounded border border-t-border bg-t-card text-t-text1 text-xs focus:outline-none" />
                                </div>
                                <button onClick={() => removeTimelineItem(section.id, item.id)} className="p-1.5 rounded hover:bg-red-500/20 text-t-text3 hover:text-red-400"><Trash2 size={14} /></button>
                              </div>
                              
                              {/* Lines */}
                              <div className="space-y-0">
                                <label className="block text-[10px] text-t-text3 mb-2">{t.episodeEditor.script.lines}</label>
                                {(item.lines || []).map((scriptLine, lineIndex) => (
                                  <div key={lineIndex}>
                                    <div className="flex items-start gap-2">
                                      {knownSpeakers.length > 0 ? (
                                        <select
                                          value={scriptLine.speaker}
                                          onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'speaker', e.target.value)}
                                          className="w-24 px-1.5 py-1.5 rounded border border-t-border bg-t-card text-t-text1 text-xs focus:outline-none flex-shrink-0 appearance-none cursor-pointer"
                                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
                                        >
                                          {!scriptLine.speaker && <option value="">{t.episodeEditor.script.speaker}</option>}
                                          {knownSpeakers.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input 
                                          type="text" 
                                          value={scriptLine.speaker} 
                                          onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'speaker', e.target.value)} 
                                          placeholder={t.episodeEditor.script.speaker}
                                          className="w-24 px-2 py-1.5 rounded border border-t-border bg-t-card text-t-text1 text-xs focus:outline-none flex-shrink-0" 
                                        />
                                      )}
                                      <div className="flex-1 relative group/split">
                                        <textarea 
                                          value={scriptLine.line} 
                                          onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'line', e.target.value)} 
                                          placeholder={t.episodeEditor.script.lineContent}
                                          rows={2}
                                          className="w-full px-2 py-1.5 pr-7 rounded border border-t-border bg-t-card text-t-text1 text-xs focus:outline-none resize-none" 
                                          onSelect={(e) => {
                                            const ta = e.target as HTMLTextAreaElement;
                                            const pos = ta.selectionStart;
                                            if (pos > 0 && pos < scriptLine.line.length) {
                                              setSplitCursor({ sectionId: section.id, itemId: item.id, lineIndex, cursorPos: pos });
                                            } else {
                                              setSplitCursor(null);
                                            }
                                          }}
                                          onBlur={() => {
                                            setTimeout(() => setSplitCursor(prev => 
                                              prev?.sectionId === section.id && prev?.itemId === item.id && prev?.lineIndex === lineIndex ? null : prev
                                            ), 150);
                                          }}
                                        />
                                        {splitCursor?.sectionId === section.id && splitCursor?.itemId === item.id && splitCursor?.lineIndex === lineIndex && (
                                          <button
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                              splitScriptLine(section.id, item.id, lineIndex, splitCursor.cursorPos);
                                              setSplitCursor(null);
                                            }}
                                            className="absolute right-1 top-1 p-0.5 rounded bg-t-bg2/90 border border-t-border text-t-text3 hover:text-t-text1 hover:bg-t-bg2 transition-all shadow-sm"
                                            title={'Split at cursor'}
                                          >
                                            <Scissors size={10} />
                                          </button>
                                        )}
                                      </div>
                                      <button 
                                        onClick={() => removeScriptLine(section.id, item.id, lineIndex)} 
                                        className="p-1.5 rounded hover:bg-red-500/20 text-t-text3 hover:text-red-400 flex-shrink-0"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                    {/* Pause insertion zone between lines */}
                                    {lineIndex < (item.lines || []).length - 1 && (
                                      <div className="group/pause relative my-0.5 min-h-[14px] flex items-center">
                                        {scriptLine.pauseAfterMs == null ? (
                                          <div className="w-full opacity-0 group-hover/pause:opacity-100 transition-opacity duration-150 flex items-center gap-1.5">
                                            <div className="flex-1 border-t border-dashed border-t-border" />
                                            <button
                                              onClick={() => setLinePause(section.id, item.id, lineIndex, 500)}
                                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] text-t-text3 hover:text-t-text1 hover:bg-t-bg2 transition-all"
                                            >
                                              <Pause size={8} />{t.projectCreator.addPause}
                                            </button>
                                            <div className="flex-1 border-t border-dashed border-t-border" />
                                          </div>
                                        ) : (
                                          <div className="w-full flex items-center gap-1.5">
                                            <div className="flex-1 border-t border-dashed border-amber-500/40" />
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 rounded-full">
                                              <Pause size={8} className="text-amber-500" />
                                              <input
                                                type="number"
                                                value={scriptLine.pauseAfterMs}
                                                onChange={(e) => {
                                                  const v = parseInt(e.target.value);
                                                  if (v > 0) setLinePause(section.id, item.id, lineIndex, v);
                                                }}
                                                className="w-12 bg-transparent text-amber-600 dark:text-amber-400 text-[10px] text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                min={50}
                                                step={100}
                                              />
                                              <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70">{t.projectCreator.pauseMs}</span>
                                              <button
                                                onClick={() => setLinePause(section.id, item.id, lineIndex, undefined)}
                                                className="ml-0.5 p-0.5 rounded-full hover:bg-amber-500/20 text-amber-500/60 hover:text-amber-500 transition-all"
                                              >
                                                <X size={9} />
                                              </button>
                                            </div>
                                            <div className="flex-1 border-t border-dashed border-amber-500/40" />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                <button 
                                  onClick={() => addScriptLine(section.id, item.id)} 
                                  className={`flex items-center gap-1 text-[10px] mt-2 ${totalLineCount >= MAX_SCRIPT_LINES ? 'text-t-text3/40 cursor-not-allowed' : 'text-t-text3 hover:text-t-text2'}`}
                                  disabled={totalLineCount >= MAX_SCRIPT_LINES}
                                >
                                  <Plus size={10} />{t.episodeEditor.script.addLine}
                                </button>
                              </div>

                              {/* Sound/Music - only show if BGM or SFX is enabled */}
                              {(spec?.addBgm || spec?.addSoundEffects) && (
                                <div>
                                  <label className="block text-[10px] text-t-text3 mb-1">{t.episodeEditor.script.soundMusic}</label>
                                  <input type="text" value={item.soundMusic} onChange={(e) => updateTimelineItem(section.id, item.id, 'soundMusic', e.target.value)} placeholder={t.episodeEditor.script.bgmSoundEffects} className="w-full px-3 py-2 rounded-lg border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none" />
                                </div>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addTimelineItem(section.id)} className="flex items-center gap-2 text-xs text-t-text3 hover:text-t-text1">
                            <Plus size={14} />{t.episodeEditor.script.addSegment}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Section Button */}
                  <button
                    onClick={addSection}
                    className="w-full py-3 rounded-xl border border-dashed border-t-border text-t-text3 hover:text-t-text1 hover:border-t-border transition-all flex items-center justify-center gap-2"
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
                  <User size={48} className="mx-auto mb-4 text-t-text3" />
                  <p className="text-t-text3">{t.episodeEditor.characters.noCharacters}</p>
                  <p className="text-t-text3 text-sm mt-2">{t.episodeEditor.characters.charactersExtracted}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-t-text3 mb-4">
                    {t.episodeEditor.characters.assignVoices}
                  </p>
                  {characters.map((char, index) => (
                    <div 
                      key={index}
                      className="rounded-xl p-4 border border-t-border"
                      style={{ background: 'var(--t-bg-card)' }}
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${theme.primary}20` }}
                        >
                          <User size={20} style={{ color: theme.primaryLight }} />
                        </div>
                        <div>
                          <h4 className="text-t-text1 font-medium">{char.name}</h4>
                          <p className="text-xs text-t-text3">{char.description || t.episodeEditor.characters.selectVoice}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableVoices.length > 0 ? (
                          availableVoices.map((voice) => (
                            <button
                              key={voice.id}
                              onClick={() => assignVoiceToCharacter(index, voice.id)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                char.assignedVoiceId === voice.id ? 'text-t-text1' : 'text-t-text2 border border-t-border'
                              }`}
                              style={char.assignedVoiceId === voice.id ? { background: theme.primary } : {}}
                            >
                              <Volume2 size={14} />{voice.name}
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-t-text3">{t.episodeEditor.characters.noVoicesAvailable}</p>
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
              <p className="text-sm text-t-text3">{t.episodeEditor.form.notesDesc}</p>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t.episodeEditor.form.notesPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-t-border bg-t-card text-t-text1 placeholder-t-text3 focus:outline-none focus:border-t-border transition-all resize-none"
                style={{ minHeight: '250px' }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-t-border flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-t-text2 hover:text-t-text1 hover:bg-t-card transition-colors">
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
