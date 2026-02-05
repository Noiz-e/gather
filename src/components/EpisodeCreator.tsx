import { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Project, VoiceCharacter, ScriptSection, EpisodeCharacter, ScriptTimelineItem } from '../types';
import { 
  ChevronLeft, ChevronRight, Check, X, FileText, 
  Plus, Trash2, Play, User, Loader2,
  Music, Volume2, Image, Save, Upload, Sparkles
} from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';
import { filterValidFiles, collectAnalysisContent } from '../utils/fileUtils';
import { buildScriptGenerationPrompt } from '../services/llm/prompts';
import * as api from '../services/api';

// Storage key for voice characters (same as VoiceStudio)
const VOICE_CHARACTERS_KEY = 'gather-voice-characters';

const loadVoiceCharacters = (): VoiceCharacter[] => {
  try {
    const data = localStorage.getItem(VOICE_CHARACTERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

interface EpisodeCreatorProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

// Extracted character from script
interface ExtractedCharacter {
  name: string;
  description: string;
  assignedVoiceId?: string;
}

export function EpisodeCreator({ project, onClose, onSuccess }: EpisodeCreatorProps) {
  const { theme, religion } = useTheme();
  const { addEpisode } = useProjects();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Episode data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scriptSections, setScriptSections] = useState<ScriptSection[]>([]);
  const [characters, setCharacters] = useState<ExtractedCharacter[]>([]);
  
  // UI state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<VoiceCharacter[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  
  // Script upload and analysis state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [textContent, setTextContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const ReligionIcon = ReligionIconMap[religion];
  const spec = project.spec;

  const STEPS = [
    { id: 1, title: t.projectCreator.steps.scriptGeneration.title, description: t.projectCreator.steps.scriptGeneration.description },
    { id: 2, title: t.projectCreator.steps.characterVoices.title, description: t.projectCreator.steps.characterVoices.description },
    { id: 3, title: t.projectCreator.steps.generation.title, description: t.projectCreator.steps.generation.description },
    { id: 4, title: t.projectCreator.steps.postProcessing.title, description: t.projectCreator.steps.postProcessing.description },
  ];

  // Load available voices on mount
  useEffect(() => {
    setAvailableVoices(loadVoiceCharacters());
  }, []);

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const validFiles = filterValidFiles(files);
      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles]);
      } else {
        alert(t.projectCreator?.errors?.uploadFileType || 'Invalid file type');
      }
    }
  };

  // Remove uploaded file
  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validFiles = filterValidFiles(files);
      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles]);
      } else {
        alert(t.projectCreator?.errors?.uploadFileType || 'Invalid file type');
      }
    }
  };

  // Generate script from uploaded content using LLM
  const generateScriptFromContent = async () => {
    setIsGeneratingScript(true);
    setStreamingText('');

    try {
      // Collect content from text input and files
      const content = await collectAnalysisContent(textContent, uploadedFiles, { includeLabels: false });

      if (!content.trim()) {
        alert(t.projectCreator?.errors?.inputOrUpload || 'Please input or upload content');
        setIsGeneratingScript(false);
        return;
      }

      const prompt = buildScriptGenerationPrompt(content, {
        title: title || 'Episode',
        targetAudience: spec?.targetAudience || '',
        formatAndDuration: spec?.formatAndDuration || '',
        toneAndExpression: spec?.toneAndExpression || '',
        addBgm: spec?.addBgm || false,
        addSoundEffects: spec?.addSoundEffects || false,
        hasVisualContent: spec?.hasVisualContent || false,
      });

      // Use backend streaming API for progressive generation
      const finalText = await api.generateTextStream(
        prompt,
        (chunk) => {
          setStreamingText(chunk.accumulated);
        }
      );

      // Parse JSON from final response
      const jsonMatch = finalText.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                        finalText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : finalText;
      const sections = JSON.parse(jsonStr) as ScriptSection[];

      if (sections && sections.length > 0) {
        setScriptSections(sections);
        // Auto-expand the first section
        setEditingSection(sections[0].id);
      }
    } catch (error) {
      console.error('Script generation error:', error);
      alert(t.projectCreator?.errors?.unknownError || 'An error occurred');
    } finally {
      setIsGeneratingScript(false);
      setStreamingText('');
    }
  };

  // Check if there's content to analyze
  const hasContentToAnalyze = textContent.trim().length > 0 || uploadedFiles.length > 0;

  // Script editing functions
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

  const updateTimelineItem = useCallback(
    (sectionId: string, itemId: string, field: 'timeStart' | 'timeEnd' | 'soundMusic', value: string) => {
      setScriptSections(sections =>
        sections.map(section =>
          section.id === sectionId
            ? { ...section, timeline: section.timeline.map(item => item.id === itemId ? { ...item, [field]: value } : item) }
            : section
        )
      );
    },
    []
  );

  const updateScriptLine = useCallback(
    (sectionId: string, itemId: string, lineIndex: number, field: 'speaker' | 'line', value: string) => {
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
    },
    []
  );

  const addScriptLine = useCallback(
    (sectionId: string, itemId: string) => {
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
    },
    []
  );

  const removeScriptLine = useCallback(
    (sectionId: string, itemId: string, lineIndex: number) => {
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
    },
    []
  );

  const addTimelineItem = useCallback(
    (sectionId: string) => {
      setScriptSections(sections =>
        sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                timeline: [
                  ...section.timeline,
                  { id: `item-${Date.now()}`, timeStart: '', timeEnd: '', lines: [{ speaker: '', line: '' }], soundMusic: '' }
                ]
              }
            : section
        )
      );
    },
    []
  );

  const removeTimelineItem = useCallback(
    (sectionId: string, itemId: string) => {
      setScriptSections(sections =>
        sections.map(section =>
          section.id === sectionId
            ? { ...section, timeline: section.timeline.filter(item => item.id !== itemId) }
            : section
        )
      );
    },
    []
  );

  // Extract characters from script
  const extractCharacters = useCallback(() => {
    const speakerSet = new Set<string>();
    scriptSections.forEach(section => {
      section.timeline.forEach((item: ScriptTimelineItem) => {
        (item.lines || []).forEach(line => {
          if (line.speaker && line.speaker.trim()) {
            speakerSet.add(line.speaker.trim());
          }
        });
      });
    });
    const extractedChars: ExtractedCharacter[] = Array.from(speakerSet).map(name => ({
      name,
      description: '',
      assignedVoiceId: undefined,
    }));
    setCharacters(extractedChars);
  }, [scriptSections]);

  const assignVoiceToCharacter = useCallback(
    (characterIndex: number, voiceId: string) => {
      setCharacters(chars =>
        chars.map((char, idx) =>
          idx === characterIndex
            ? { ...char, assignedVoiceId: voiceId }
            : char
        )
      );
    },
    []
  );

  // Simulate generation process
  const simulateGeneration = async () => {
    const steps = [
      { progress: 10, status: t.projectCreator.generation.preparingAudio },
      { progress: 25, status: t.projectCreator.generation.synthesizingVoice },
      { progress: 50, status: t.projectCreator.generation.addingBgm },
      { progress: 75, status: t.projectCreator.generation.processingSoundEffects },
      { progress: 90, status: t.projectCreator.generation.finalProcessing },
      { progress: 100, status: t.projectCreator.generation.complete },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setGenerationProgress(step.progress);
      setGenerationStatus(step.status);
    }
  };

  // Handle save episode
  const handleSave = () => {
    if (!title.trim()) {
      alert(t.episodeEditor.validation.titleRequired);
      return;
    }

    const episodeCharacters: EpisodeCharacter[] = characters.map(char => ({
      name: char.name,
      description: char.description,
      assignedVoiceId: char.assignedVoiceId,
    }));

    addEpisode(project.id, {
      title: title || `Episode ${project.episodes.length + 1}`,
      description,
      script: '',
      scriptSections,
      characters: episodeCharacters,
      stage: 'scripting',
      notes: '',
    });

    onSuccess();
  };

  // Navigation validation
  const canProceed = () => {
    switch (currentStep) {
      case 1: return scriptSections.length > 0 && title.trim().length > 0;
      case 2: return true;
      case 3: return generationProgress === 100;
      default: return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && scriptSections.length > 0) {
      setIsProcessingNext(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      extractCharacters();
      setIsProcessingNext(false);
    }
    if (currentStep === 2) {
      setIsProcessingNext(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      simulateGeneration();
      setIsProcessingNext(false);
    }
    if (currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Render Step 1: Script Creation
  const renderScriptStep = () => (
    <div className="space-y-6">
      {/* Episode Title */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          {t.episodeEditor.form.title} <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.episodeEditor.form.titlePlaceholder}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all"
        />
      </div>

      {/* Episode Description */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          {t.episodeEditor.form.description}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.episodeEditor.form.descriptionPlaceholder}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all resize-none"
        />
      </div>

      {/* Script Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-medium">{t.projectCreator.spec.fileUpload}</h4>
          {hasContentToAnalyze && (
            <button
              onClick={generateScriptFromContent}
              disabled={isGeneratingScript}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm transition-all hover:scale-105"
              style={{ background: theme.primary }}
            >
              {isGeneratingScript ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t.common.loading}
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {t.projectCreator.script.generateScript}
                </>
              )}
            </button>
          )}
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            isDragging ? 'border-white/40 bg-white/10' : 'border-white/10 hover:border-white/20'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload size={32} className="mx-auto mb-3 text-white/30" />
          <p className="text-white/60 text-sm mb-1">
            {t.projectCreator.spec.uploadHint}
          </p>
          <p className="text-white/40 text-xs">
            .txt, .pdf, .doc, .docx
          </p>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-2 rounded-lg border border-white/10"
                style={{ background: theme.bgCard }}
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-white/50" />
                  <span className="text-white/80 text-sm">{file.name}</span>
                  <span className="text-white/40 text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeUploadedFile(index); }}
                  className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input */}
        <div>
          <label className="block text-xs text-white/50 mb-2">
            {t.projectCreator.spec.textInput}
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder={t.projectCreator.spec.contentPlaceholder}
            rows={6}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all resize-none text-sm"
          />
        </div>

        {/* Streaming Preview */}
        {isGeneratingScript && streamingText && (
          <div 
            className="rounded-xl p-4 border border-white/10 max-h-64 overflow-auto"
            style={{ background: theme.bgCard }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Loader2 size={14} className="animate-spin text-white/50" />
              <span className="text-xs text-white/50">{t.projectCreator.script.generating}</span>
            </div>
            <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono">
              {streamingText.slice(0, 500)}{streamingText.length > 500 ? '...' : ''}
            </pre>
          </div>
        )}
      </div>

      {/* Script Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-medium">{t.episodeEditor.tabs.script}</h4>
        </div>

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

                    {section.timeline.map((item: ScriptTimelineItem, itemIndex: number) => (
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

                        {/* Sound/Music */}
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
    </div>
  );

  // Render Step 2: Character Extraction
  const renderCharacterStep = () => (
    <div className="space-y-6">
      {characters.length === 0 ? (
        <div className="text-center py-8">
          <User size={48} className="mx-auto mb-4 text-white/30" />
          <p className="text-white/50">{t.episodeEditor.characters.noCharacters}</p>
          <p className="text-xs text-white/40 mt-2">{t.episodeEditor.characters.charactersExtracted}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-white/50">
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
  );

  // Render Step 3: Generation
  const renderGenerationStep = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        {generationProgress < 100 ? (
          <>
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div 
                className="absolute inset-0 rounded-full border-4 border-transparent transition-all duration-500"
                style={{ 
                  borderTopColor: theme.primary,
                  borderRightColor: generationProgress > 25 ? theme.primary : 'transparent',
                  borderBottomColor: generationProgress > 50 ? theme.primary : 'transparent',
                  borderLeftColor: generationProgress > 75 ? theme.primary : 'transparent',
                  transform: `rotate(${generationProgress * 3.6}deg)`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-light text-white">{generationProgress}%</span>
              </div>
            </div>
            <p className="text-white/70">{generationStatus}</p>
          </>
        ) : (
          <>
            <div 
              className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: `${theme.primary}30` }}
            >
              <Check size={48} style={{ color: theme.primaryLight }} />
            </div>
            <h3 className="text-xl font-serif text-white mb-2">
              {t.projectCreator.generation.complete}
            </h3>
            <p className="text-white/50 text-sm">
              {t.projectCreator.generation.audioReady}
            </p>
          </>
        )}
      </div>

      {/* Preview Cards */}
      {generationProgress === 100 && (
        <div className="grid grid-cols-2 gap-4">
          <div 
            className="rounded-xl p-3 border border-white/10"
            style={{ background: theme.bgCard }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Music size={16} style={{ color: theme.primaryLight }} />
              <span className="text-white text-sm font-medium">{t.projectCreator.generation.audioPreview}</span>
            </div>
            <div className="h-12 rounded-lg flex items-center justify-center" style={{ background: `${theme.primary}10` }}>
              <Play size={20} className="text-white/40" />
            </div>
          </div>
          {spec?.hasVisualContent && (
            <div 
              className="rounded-xl p-3 border border-white/10"
              style={{ background: theme.bgCard }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Image size={16} style={{ color: theme.primaryLight }} />
                <span className="text-white text-sm font-medium">{t.projectCreator.generation.visualPreview}</span>
              </div>
              <div className="h-12 rounded-lg flex items-center justify-center" style={{ background: `${theme.primary}10` }}>
                <Image size={20} className="text-white/40" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render Step 4: Post-processing
  const renderPostProcessingStep = () => (
    <div className="space-y-6">
      <div 
        className="rounded-xl p-6 border border-white/10"
        style={{ background: `${theme.primary}10` }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${theme.primary}30` }}
          >
            <ReligionIcon size={24} color={theme.primaryLight} />
          </div>
          <div>
            <h3 className="text-xl font-serif text-white">{title}</h3>
            <p className="text-sm text-white/50">{project.title}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-white/70 line-clamp-2">{description}</p>
          <div className="flex items-center gap-4 text-xs text-white/60">
            <span>{scriptSections.length} {t.projectCreator.postProcessing.scriptSections}</span>
            <span>·</span>
            <span>{characters.length} {t.projectCreator.postProcessing.characterCount}</span>
            {spec?.addBgm && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Music size={12} /> BGM
                </span>
              </>
            )}
            {spec?.addSoundEffects && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Volume2 size={12} /> SFX
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-white/40 text-xs">
        {t.projectCreator.postProcessing.confirmSave}
      </p>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderScriptStep();
      case 2: return renderCharacterStep();
      case 3: return renderGenerationStep();
      case 4: return renderPostProcessingStep();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up border border-white/10"
        style={{ background: theme.bgDark }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${theme.primary}30` }}
            >
              <ReligionIcon size={20} color={theme.primaryLight} />
            </div>
            <div>
              <h2 className="text-lg font-serif text-white">{t.episodeEditor.createTitle}</h2>
              <p className="text-xs text-white/50">
                {project.title} · {t.projectCreator.step} {currentStep} {t.projectCreator.of} {STEPS.length}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="text-white/50" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Progress Bar */}
        <div className="relative h-1.5 bg-white/5">
          <div 
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{ 
              width: `${(currentStep / STEPS.length) * 100}%`,
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryLight})`
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={currentStep === 1 ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={20} />
            {currentStep === 1 ? t.projectCreator.buttons.cancel : t.projectCreator.buttons.back}
          </button>

          {currentStep < STEPS.length ? (
            canProceed() && (
              <button
                onClick={handleNext}
                disabled={isProcessingNext}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 ${
                  isProcessingNext ? 'animate-pulse' : ''
                }`}
                style={{ background: theme.primary }}
              >
                {isProcessingNext ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {t.common.loading}
                  </>
                ) : (
                  <>
                    {t.projectCreator.buttons.next}
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            )
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all hover:scale-105"
              style={{ background: theme.accent, color: theme.primaryDark }}
            >
              <Save size={20} />
              {t.episodeEditor.buttons.create}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
