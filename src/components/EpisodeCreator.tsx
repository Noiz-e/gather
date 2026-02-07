import { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Project, VoiceCharacter, ScriptSection, EpisodeCharacter, ScriptTimelineItem } from '../types';
import { 
  ChevronLeft, ChevronRight, ChevronDown, Check, X, FileText, 
  Plus, Trash2, Play, Pause, User, Loader2,
  Music, Volume2, Image, Save, Upload, Sparkles,
  Mic2, Wand2, Sliders, RefreshCw, Square
} from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';
import { filterValidFiles, collectAnalysisContent } from '../utils/fileUtils';
import { buildScriptGenerationPrompt } from '../services/llm/prompts';
import * as api from '../services/api';
import { loadVoiceCharacters } from '../utils/voiceStorage';
import { getAudioMixConfig } from './ProjectCreator/templates';
import { VoicePickerModal } from './VoicePickerModal';
import type { SectionVoiceAudio, SectionVoiceStatus, ProductionProgress, MixedAudioOutput } from './ProjectCreator/reducer';
import { loadMediaItems, addMediaItem } from '../utils/mediaStorage';
import type { MediaItem } from '../types';

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

const initialProductionProgress: ProductionProgress = {
  voiceGeneration: { status: 'idle', progress: 0, sectionStatus: {} },
  mediaProduction: { status: 'idle', progress: 0 },
  mixingEditing: { status: 'idle', progress: 0 },
};

export function EpisodeCreator({ project, onClose, onSuccess }: EpisodeCreatorProps) {
  const { theme, religion } = useTheme();
  const { addEpisode } = useProjects();
  const { t, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  
  const ReligionIcon = ReligionIconMap[religion];
  const spec = project.spec;
  
  // Episode data - auto-generate default title
  const defaultTitle = `${t.projectCreator.episode1?.replace('1', '') || 'Episode '}${project.episodes.length + 1}: ${project.title}`;
  const [title] = useState(defaultTitle);
  const [description] = useState(spec?.toneAndExpression || '');
  const [scriptSections, setScriptSections] = useState<ScriptSection[]>([]);
  const [characters, setCharacters] = useState<ExtractedCharacter[]>([]);
  
  // UI state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  
  // Content input state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [textContent, setTextContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice state - matching ProjectCreator
  const [availableVoices, setAvailableVoices] = useState<VoiceCharacter[]>([]);
  const [systemVoices, setSystemVoices] = useState<api.Voice[]>([]);
  const [voicesConfirmed, setVoicesConfirmed] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [isRecommendingVoices, setIsRecommendingVoices] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Voice picker modal state
  const [voicePickerCharIndex, setVoicePickerCharIndex] = useState<number | null>(null);
  
  // Voice generation UI
  const [expandedVoiceSections, setExpandedVoiceSections] = useState<Set<string>>(new Set());
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const segmentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Production state - matching ProjectCreator
  const [production, setProduction] = useState<ProductionProgress>(initialProductionProgress);

  // 6-step workflow matching ProjectCreator Steps 3-8
  const STEPS = [
    { 
      id: 1, 
      title: language === 'zh' ? '内容输入' : 'Content Input',
      description: language === 'zh' ? '上传或输入您的内容' : 'Upload or enter your content'
    },
    { 
      id: 2, 
      title: language === 'zh' ? '脚本生成' : 'Script Generation',
      description: language === 'zh' ? '生成时间轴脚本' : 'Generate timeline scripts'
    },
    { 
      id: 3, 
      title: language === 'zh' ? '语音生成' : 'Voice Generation',
      description: language === 'zh' ? '逐段生成语音' : 'Chunk-by-chunk voice generation'
    },
    { 
      id: 4, 
      title: language === 'zh' ? '媒体制作' : 'Media Production',
      description: language === 'zh' ? '音乐、音效和图片' : 'Music, sound effects, and images'
    },
    { 
      id: 5, 
      title: language === 'zh' ? '混音编辑' : 'Mixing & Editing',
      description: language === 'zh' ? '混音和时间轴编辑' : 'Mixing and timeline editing'
    },
    { 
      id: 6, 
      title: language === 'zh' ? '保存' : 'Save',
      description: language === 'zh' ? '确认并保存' : 'Confirm and save'
    },
  ];

  // ============================================================
  // Production state helpers (replicate reducer actions via setState)
  // ============================================================
  const updateProductionPhase = useCallback((
    phase: 'voice-generation' | 'media-production' | 'mixing-editing',
    status: 'idle' | 'processing' | 'completed' | 'error',
    progress: number,
    detail?: string
  ) => {
    setProduction(prev => {
      const next = { ...prev };
      if (phase === 'voice-generation') {
        next.voiceGeneration = { ...prev.voiceGeneration, status, progress, currentChunk: detail };
      } else if (phase === 'media-production') {
        next.mediaProduction = { ...prev.mediaProduction, status, progress, currentTask: detail };
      } else if (phase === 'mixing-editing') {
        next.mixingEditing = { ...prev.mixingEditing, status, progress };
      }
      return next;
    });
  }, []);

  const updateSectionVoiceStatus = useCallback((
    sectionId: string,
    status: SectionVoiceStatus['status'],
    progress?: number,
    error?: string
  ) => {
    setProduction(prev => {
      const sectionStatus = { ...prev.voiceGeneration.sectionStatus };
      if (!sectionStatus[sectionId]) {
        sectionStatus[sectionId] = { status: 'idle', progress: 0, audioSegments: [] };
      }
      sectionStatus[sectionId] = {
        ...sectionStatus[sectionId],
        status,
        ...(progress !== undefined && { progress }),
        ...(error !== undefined && { error }),
      };
      return {
        ...prev,
        voiceGeneration: { ...prev.voiceGeneration, sectionStatus },
      };
    });
  }, []);

  const addSectionVoiceAudio = useCallback((sectionId: string, audio: SectionVoiceAudio) => {
    setProduction(prev => {
      const sectionStatus = { ...prev.voiceGeneration.sectionStatus };
      if (!sectionStatus[sectionId]) {
        sectionStatus[sectionId] = { status: 'processing', progress: 0, audioSegments: [] };
      }
      sectionStatus[sectionId] = {
        ...sectionStatus[sectionId],
        audioSegments: [...sectionStatus[sectionId].audioSegments, audio],
      };
      return {
        ...prev,
        voiceGeneration: { ...prev.voiceGeneration, sectionStatus },
      };
    });
  }, []);

  const clearSectionVoice = useCallback((sectionId: string) => {
    setProduction(prev => {
      const sectionStatus = { ...prev.voiceGeneration.sectionStatus };
      sectionStatus[sectionId] = { status: 'idle', progress: 0, audioSegments: [] };
      return {
        ...prev,
        voiceGeneration: { ...prev.voiceGeneration, sectionStatus },
      };
    });
  }, []);

  const setCurrentSection = useCallback((sectionId: string | undefined) => {
    setProduction(prev => ({
      ...prev,
      voiceGeneration: { ...prev.voiceGeneration, currentSectionId: sectionId },
    }));
  }, []);

  const setBgmAudio = useCallback((audio: { audioData: string; mimeType: string }) => {
    setProduction(prev => ({
      ...prev,
      mediaProduction: { ...prev.mediaProduction, bgmAudio: audio },
    }));
  }, []);

  const setMixedOutput = useCallback((output: MixedAudioOutput) => {
    setProduction(prev => ({
      ...prev,
      mixingEditing: { ...prev.mixingEditing, output, error: undefined },
    }));
  }, []);

  const setMixingError = useCallback((error: string) => {
    setProduction(prev => ({
      ...prev,
      mixingEditing: { ...prev.mixingEditing, error },
    }));
  }, []);

  // ============================================================
  // Load voices on mount
  // ============================================================
  useEffect(() => {
    setAvailableVoices(loadVoiceCharacters());
    api.getVoices()
      .then(voices => setSystemVoices(voices))
      .catch(err => console.error('Failed to load system voices:', err));
  }, []);

  // Stop voice preview when leaving voice generation step
  useEffect(() => {
    if (currentStep !== 3 && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingVoiceId(null);
    }
  }, [currentStep]);

  // ============================================================
  // File upload handlers
  // ============================================================
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

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

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

  // ============================================================
  // Script generation (streaming) - matching ProjectCreator
  // ============================================================
  const generateScript = async () => {
    setIsGeneratingScript(true);
    setStreamingText('');

    try {
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

      const finalText = await api.generateTextStream(
        prompt,
        (chunk) => {
          setStreamingText(chunk.accumulated);
        }
      );

      const jsonMatch = finalText.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                        finalText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : finalText;
      const sections = JSON.parse(jsonStr) as ScriptSection[];

      if (sections && sections.length > 0) {
        setScriptSections(sections);
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

  // ============================================================
  // Script editing functions
  // ============================================================
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

  // ============================================================
  // Character extraction & voice assignment
  // ============================================================
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
    setAvailableVoices(loadVoiceCharacters());
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

  // AI recommend voices for all characters
  const recommendVoicesForAll = useCallback(async () => {
    const allVoices = [
      ...systemVoices.map((v) => ({ id: v.id, name: v.name, description: v.description, descriptionZh: v.descriptionZh })),
      ...availableVoices.map((v) => ({ id: v.id, name: v.name, description: v.description }))
    ];
    if (characters.length === 0 || allVoices.length === 0) return;
    setIsRecommendingVoices(true);
    try {
      const assignments = await api.recommendVoices({
        characters: characters.map((c) => ({ name: c.name, description: c.description })),
        voices: allVoices,
        language: language === 'zh' ? 'zh' : 'en'
      });
      assignments.forEach((voiceId, index) => {
        if (index < characters.length && voiceId) {
          setCharacters(chars =>
            chars.map((char, idx) =>
              idx === index ? { ...char, assignedVoiceId: voiceId } : char
            )
          );
        }
      });
    } catch (err) {
      console.error('Recommend voices failed:', err);
    } finally {
      setIsRecommendingVoices(false);
    }
  }, [characters, systemVoices, availableVoices, language]);

  // Play voice sample preview
  const playVoiceSample = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      setLoadingVoiceId(voiceId);
      setPlayingVoiceId(null);
      
      const audio = await api.playVoiceSample(voiceId, language === 'zh' ? 'zh' : 'en');
      audioRef.current = audio;
      setPlayingVoiceId(voiceId);
      setLoadingVoiceId(null);
      
      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setPlayingVoiceId(null);
        setLoadingVoiceId(null);
        audioRef.current = null;
      };
    } catch (error) {
      console.error('Failed to play voice sample:', error);
      setLoadingVoiceId(null);
      setPlayingVoiceId(null);
    }
  };

  // Start voice generation after confirming voice assignments
  const startVoiceGeneration = () => {
    setVoicesConfirmed(true);
    performVoiceGeneration();
  };

  // ============================================================
  // Voice generation (real TTS) - ported from ProjectCreator
  // ============================================================
  const generateVoiceForSection = async (section: ScriptSection): Promise<boolean> => {
    const sectionId = section.id;
    
    const segments: Array<{ text: string; speaker: string; refAudioDataUrl?: string; lineIndex: number }> = [];
    let lineIndex = 0;
    
    for (const item of section.timeline) {
      for (const line of item.lines) {
        if (line.line.trim()) {
          const character = characters.find(c => c.name === line.speaker);
          const customVoice = availableVoices.find(v => v.id === character?.assignedVoiceId);
          const refAudioDataUrl = customVoice?.refAudioDataUrl || customVoice?.audioSampleUrl;
          
          segments.push({
            text: line.line,
            speaker: line.speaker || 'Narrator',
            refAudioDataUrl,
            lineIndex
          });
        }
        lineIndex++;
      }
    }
    
    if (segments.length === 0) {
      updateSectionVoiceStatus(sectionId, 'completed', 100);
      return true;
    }
    
    updateSectionVoiceStatus(sectionId, 'processing', 0);
    setCurrentSection(sectionId);
    
    let success = false;
    try {
      const batchSegments: api.AudioSegment[] = segments.map(seg => ({
        text: seg.text,
        speaker: seg.speaker,
        refAudioDataUrl: seg.refAudioDataUrl
      }));
      
      updateProductionPhase('voice-generation', 'processing', 0, `Generating ${segments.length} segments...`);
      
      const result = await api.generateAudioBatch(batchSegments);
      
      for (const generated of result.segments) {
        const segment = segments[generated.index];
        if (segment) {
          const audio: SectionVoiceAudio = {
            lineIndex: segment.lineIndex,
            speaker: segment.speaker,
            text: segment.text,
            audioData: generated.audioData,
            mimeType: generated.mimeType
          };
          addSectionVoiceAudio(sectionId, audio);
        }
      }
      
      if (result.errors && result.errors.length > 0) {
        console.warn('Some segments failed:', result.errors);
      }
      
      if (result.totalGenerated === 0 || (result.segments && result.segments.length === 0)) {
        const errorMessages = result.errors?.map(e => e.error).filter(Boolean) || [];
        const errorMsg = errorMessages.length > 0 
          ? errorMessages[0] 
          : (language === 'zh' ? '所有音频生成失败' : 'All audio segments failed to generate');
        updateSectionVoiceStatus(sectionId, 'error', 0, errorMsg);
        success = false;
      } else if (result.errors && result.errors.length > 0) {
        const failedCount = result.errors.length;
        const totalCount = segments.length;
        console.warn(`${failedCount}/${totalCount} segments failed`);
        updateSectionVoiceStatus(sectionId, 'completed', 100);
        success = true;
      } else {
        updateSectionVoiceStatus(sectionId, 'completed', 100);
        success = true;
      }
    } catch (error) {
      console.error('Section voice generation failed:', error);
      updateSectionVoiceStatus(sectionId, 'error', 0, 
        error instanceof Error ? error.message : 'Generation failed');
      success = false;
    }
    
    setCurrentSection(undefined);
    return success;
  };
  
  const performVoiceGeneration = async () => {
    if (scriptSections.length === 0) {
      updateProductionPhase('voice-generation', 'completed', 100);
      return;
    }
    
    updateProductionPhase('voice-generation', 'processing', 0);
    
    let failedSections = 0;
    for (let i = 0; i < scriptSections.length; i++) {
      const section = scriptSections[i];
      const success = await generateVoiceForSection(section);
      if (!success) failedSections++;
      
      const overallProgress = Math.round(((i + 1) / scriptSections.length) * 100);
      updateProductionPhase('voice-generation', 'processing', overallProgress, section.name);
    }
    
    if (failedSections === scriptSections.length) {
      updateProductionPhase('voice-generation', 'error', 0, 
        language === 'zh' ? '所有段落生成失败' : 'All sections failed');
    } else if (failedSections > 0) {
      updateProductionPhase('voice-generation', 'completed', 100, 
        language === 'zh' ? `${failedSections} 个段落失败` : `${failedSections} section(s) failed`);
    } else {
      updateProductionPhase('voice-generation', 'completed', 100);
    }
  };

  // ============================================================
  // Media production (BGM, SFX, Images) - ported from ProjectCreator
  // ============================================================
  const performMediaProduction = async () => {
    const tasks: { type: string; label: string }[] = [];
    if (spec?.addBgm) tasks.push({ type: 'bgm', label: language === 'zh' ? '生成背景音乐' : 'Generating BGM' });
    if (spec?.addSoundEffects) tasks.push({ type: 'sfx', label: language === 'zh' ? '添加音效' : 'Adding SFX' });
    if (spec?.hasVisualContent) tasks.push({ type: 'images', label: language === 'zh' ? '生成图片' : 'Generating Images' });
    
    if (tasks.length === 0) {
      updateProductionPhase('media-production', 'completed', 100);
      return;
    }
    
    // Load current media items for adding new ones
    let mediaItems = loadMediaItems();
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      updateProductionPhase('media-production', 'processing', Math.round((i / tasks.length) * 100), task.label);
      
      try {
        if (task.type === 'bgm') {
          const bgmResult = await api.generateBGM(
            spec?.toneAndExpression || '',
            'peaceful',
            30
          );
          setBgmAudio({
            audioData: bgmResult.audioData,
            mimeType: bgmResult.mimeType
          });
          
          // Save BGM to media library and link to project
          const bgmItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
            name: `${title} - BGM`,
            description: spec?.toneAndExpression || 'Background music',
            type: 'bgm',
            mimeType: bgmResult.mimeType,
            dataUrl: `data:${bgmResult.mimeType};base64,${bgmResult.audioData}`,
            duration: 30,
            tags: ['generated', 'bgm'],
            projectIds: [project.id],
            source: 'generated',
            prompt: spec?.toneAndExpression || ''
          };
          mediaItems = addMediaItem(mediaItems, bgmItem);
          console.log(`Added BGM to media library for project ${project.id}`);
        } else if (task.type === 'sfx') {
          for (const section of scriptSections) {
            for (const item of section.timeline) {
              if (item.soundMusic?.trim()) {
                const sfxResult = await api.generateSoundEffect(item.soundMusic, 5);
                
                // Save SFX to media library and link to project
                const sfxItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
                  name: `${section.name} - SFX`,
                  description: item.soundMusic,
                  type: 'sfx',
                  mimeType: sfxResult.mimeType,
                  dataUrl: `data:${sfxResult.mimeType};base64,${sfxResult.audioData}`,
                  duration: 5,
                  tags: ['generated', 'sfx'],
                  projectIds: [project.id],
                  source: 'generated',
                  prompt: item.soundMusic
                };
                mediaItems = addMediaItem(mediaItems, sfxItem);
                console.log(`Added SFX to media library for project ${project.id}`);
              }
            }
          }
        } else if (task.type === 'images') {
          for (const section of scriptSections) {
            if (section.coverImageDescription?.trim()) {
              const imageResult = await api.generateCoverImage(section.coverImageDescription);
              
              // Save image to media library and link to project
              const imageItem: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> = {
                name: `${section.name} - Cover`,
                description: section.coverImageDescription,
                type: 'image',
                mimeType: imageResult.mimeType || 'image/png',
                dataUrl: imageResult.imageUrl,
                tags: ['generated', 'cover'],
                projectIds: [project.id],
                source: 'generated',
                prompt: section.coverImageDescription
              };
              mediaItems = addMediaItem(mediaItems, imageItem);
              console.log(`Added image to media library for project ${project.id}`);
            }
          }
        }
      } catch (error) {
        console.error(`${task.type} generation failed:`, error);
      }
      
      updateProductionPhase('media-production', 'processing', Math.round(((i + 1) / tasks.length) * 100), task.label);
    }
    
    updateProductionPhase('media-production', 'completed', 100);
  };

  // ============================================================
  // Mixing - ported from ProjectCreator
  // ============================================================
  const performMixing = async () => {
    try {
      updateProductionPhase('mixing-editing', 'processing', 10);
      
      const mixConfig = getAudioMixConfig(null); // No template for episodes
      
      const voiceTracks: api.AudioTrack[] = [];
      
      for (const section of scriptSections) {
        const sectionStatus = production.voiceGeneration.sectionStatus[section.id];
        if (sectionStatus?.audioSegments) {
          for (const segment of sectionStatus.audioSegments) {
            if (segment.audioData) {
              voiceTracks.push({
                audioData: segment.audioData,
                mimeType: segment.mimeType || 'audio/wav',
                speaker: segment.speaker,
                volume: 1
              });
            }
          }
        }
      }
      
      if (voiceTracks.length === 0) {
        setMixingError(language === 'zh' ? '没有可用的语音数据' : 'No voice data available');
        updateProductionPhase('mixing-editing', 'completed', 100);
        return;
      }
      
      updateProductionPhase('mixing-editing', 'processing', 30);
      
      const mixRequest: api.MixRequest = {
        voiceTracks,
        config: {
          silenceStartMs: mixConfig.silenceStartMs,
          silenceEndMs: mixConfig.silenceEndMs,
          sameSpeakerGapMs: mixConfig.sameSpeakerGapMs,
          differentSpeakerGapMs: mixConfig.differentSpeakerGapMs,
          sectionGapMs: mixConfig.sectionGapMs,
          voiceVolume: mixConfig.voiceVolume,
          bgmVolume: mixConfig.bgmVolume,
          sfxVolume: mixConfig.sfxVolume,
          bgmFadeInMs: mixConfig.bgmFadeInMs,
          bgmFadeOutMs: mixConfig.bgmFadeOutMs,
        }
      };
      
      if (spec?.addBgm && production.mediaProduction.bgmAudio) {
        mixRequest.bgmTrack = {
          audioData: production.mediaProduction.bgmAudio.audioData,
          mimeType: production.mediaProduction.bgmAudio.mimeType,
        };
      }
      
      updateProductionPhase('mixing-editing', 'processing', 50);
      
      console.log(`Mixing ${voiceTracks.length} voice tracks${mixRequest.bgmTrack ? ' with BGM' : ''}...`);
      const result = await api.mixAudioTracks(mixRequest);
      
      updateProductionPhase('mixing-editing', 'processing', 90);
      
      setMixedOutput({
        audioData: result.audioData,
        mimeType: result.mimeType,
        durationMs: result.durationMs
      });
      
      console.log(`Mixing complete: ${result.durationMs}ms, ${result.trackCount} tracks`);
      updateProductionPhase('mixing-editing', 'completed', 100);
      
    } catch (error) {
      console.error('Mixing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMixingError(errorMessage);
      updateProductionPhase('mixing-editing', 'completed', 100);
    }
  };

  // ============================================================
  // Save episode
  // ============================================================
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

    // Get mixed audio output if available
    const mixedOutput = production.mixingEditing.output;
    
    // Determine stage based on production progress
    let stage: 'planning' | 'scripting' | 'recording' | 'editing' | 'review' | 'published' = 'scripting';
    if (mixedOutput?.audioData) {
      stage = 'review'; // Has final audio, ready for review
    } else if (production.voiceGeneration.status === 'completed') {
      stage = 'editing'; // Voice done, in editing phase
    } else if (scriptSections.length > 0) {
      stage = 'scripting'; // Has script
    }

    addEpisode(project.id, {
      title: title || `Episode ${project.episodes.length + 1}`,
      description,
      script: '',
      scriptSections,
      characters: episodeCharacters,
      audioData: mixedOutput?.audioData,
      audioMimeType: mixedOutput?.mimeType,
      audioDurationMs: mixedOutput?.durationMs,
      stage,
      notes: '',
    });

    onSuccess();
  };

  // ============================================================
  // Navigation
  // ============================================================
  const canProceed = () => {
    switch (currentStep) {
      case 1: return textContent.trim().length > 0 || uploadedFiles.length > 0; // Content provided
      case 2: return scriptSections.length > 0; // Script generated
      case 3: return voicesConfirmed && production.voiceGeneration.status === 'completed'; // Voice done
      case 4: return production.mediaProduction.status === 'completed'; // Media done
      case 5: return production.mixingEditing.status === 'completed'; // Mixing done
      default: return true;
    }
  };

  const handleNext = async () => {
    // Step 1 -> 2: Content provided, go to script generation (auto-trigger)
    if (currentStep === 1) {
      setCurrentStep(2);
      setTimeout(() => {
        generateScript();
      }, 100);
      return;
    }
    
    // Step 2 -> 3: Script generated, extract characters and go to voice generation
    if (currentStep === 2 && scriptSections.length > 0) {
      setIsProcessingNext(true);
      extractCharacters();
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsProcessingNext(false);
      setCurrentStep(3);
      setVoicesConfirmed(false);
      return;
    }
    
    // Step 3 -> 4: Voice generation done, go to media production
    if (currentStep === 3 && production.voiceGeneration.status === 'completed') {
      setCurrentStep(4);
      setTimeout(() => {
        performMediaProduction();
      }, 100);
      return;
    }
    
    // Step 4 -> 5: Media production done, go to mixing
    if (currentStep === 4 && production.mediaProduction.status === 'completed') {
      setCurrentStep(5);
      setTimeout(() => {
        performMixing();
      }, 100);
      return;
    }
    
    // Step 5 -> 6: Mixing done, go to save
    if (currentStep === 5 && production.mixingEditing.status === 'completed') {
      setCurrentStep(6);
      return;
    }
    
    if (currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Handle skip - save episode with current progress
  const handleSkipAndSave = () => {
    handleSave();
  };

  // Format duration from ms to mm:ss
  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ============================================================
  // Render Step 1: Content Input - matching ProjectCreator Step 3
  // ============================================================
  const renderContentInputStep = () => (
    <div className="space-y-6">
      {/* Text Input with File Attachment - same layout as ProjectCreator */}
      <div>
        <div 
          className={`relative rounded-xl border transition-all ${
            isDragging 
              ? 'border-t-border bg-t-card-hover' 
              : 'border-t-border bg-t-card'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder={language === 'zh' 
              ? '粘贴或输入您的内容...\n\n例如：书籍章节、故事文本、播客脚本等' 
              : 'Paste or enter your content...\n\nExample: Book chapter, story text, podcast script, etc.'}
            rows={8}
            className="w-full px-5 pt-4 pb-3 bg-transparent text-base text-t-text1 placeholder-t-text3 focus:outline-none resize-none"
          />
          
          {/* Attachment Area */}
          <div className="px-5 pb-4 pt-2 border-t border-t-border-lt">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".txt,.pdf,.doc,.docx"
              multiple
              className="hidden"
            />
            
            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mb-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-t-border"
                    style={{ background: `${theme.primary}10` }}
                  >
                    <FileText size={16} style={{ color: theme.primaryLight }} />
                    <span className="flex-1 text-sm text-t-text1 truncate">{file.name}</span>
                    <span className="text-xs text-t-text3">{(file.size / 1024).toFixed(1)}KB</span>
                    <button
                      onClick={() => removeUploadedFile(index)}
                      className="p-1 rounded hover:bg-t-card-hover text-t-text3 hover:text-red-400 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-t-text3 hover:text-t-text2 hover:bg-t-card transition-all"
            >
              <Upload size={16} />
              <span>
                {isDragging 
                  ? (language === 'zh' ? '放开以上传' : 'Drop to upload')
                  : (language === 'zh' ? '点击上传 TXT、PDF 或 Word 文件' : 'Click to upload TXT, PDF or Word file')}
              </span>
            </button>
          </div>
          
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-t-card backdrop-blur-sm pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-t-text2">
                <Upload size={36} />
                <span className="text-base font-medium">
                  {language === 'zh' ? '放开以上传' : 'Drop to upload'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================================
  // Render Step 2: Script Generation - matching ProjectCreator Step 4
  // ============================================================
  const renderScriptStep = () => (
    <div className="space-y-6">
      {/* Generate Script Button - shown when no sections and not generating */}
      {scriptSections.length === 0 && !isGeneratingScript && (
        <button
          onClick={generateScript}
          disabled={isGeneratingScript}
          className="w-full flex items-center justify-center gap-3 px-5 py-5 rounded-xl text-base text-t-text1 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: theme.primary }}
        >
          <Sparkles size={22} />
          {t.projectCreator.generateScript}
        </button>
      )}

      {/* Streaming Text Display - Shows during generation */}
      {isGeneratingScript && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: `${theme.primary}30` }}
            >
              <Loader2 size={20} className="animate-spin" style={{ color: theme.primaryLight }} />
            </div>
            <div>
              <p className="text-base text-t-text1 font-medium">{t.projectCreator.generating}</p>
              <p className="text-sm text-t-text3">
                {language === 'zh' 
                  ? 'AI 正在编写脚本...'
                  : 'AI is writing the script...'
                }
              </p>
            </div>
          </div>
          
          {/* Streaming content preview */}
          {streamingText && (
            <div 
              className="rounded-xl border border-t-border p-5 max-h-[400px] overflow-auto"
              style={{ background: 'var(--t-bg-card)' }}
            >
              <pre className="text-sm text-t-text2 whitespace-pre-wrap font-mono">
                {streamingText.slice(0, 1000)}{streamingText.length > 1000 ? '...' : ''}
              </pre>
            </div>
          )}

          {/* Waiting state */}
          {!streamingText && (
            <div className="flex items-center justify-center py-8 text-t-text3">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">{language === 'zh' ? '正在解析脚本结构...' : 'Parsing script structure...'}</span>
            </div>
          )}
        </div>
      )}

      {/* Regenerate Button - shown when sections exist */}
      {scriptSections.length > 0 && (
        <div className="flex items-center justify-between">
          <h4 className="text-base text-t-text1 font-medium">{t.projectCreator.scriptLabel}</h4>
          <button
            onClick={generateScript}
            disabled={isGeneratingScript}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-base text-t-text2 hover:text-t-text1 transition-all"
            style={{ background: `${theme.primary}30` }}
          >
            <RefreshCw size={16} className={isGeneratingScript ? 'animate-spin' : ''} />
            {t.projectCreator.regen}
          </button>
        </div>
      )}

      {/* Script Sections - matching ProjectCreator layout */}
      {scriptSections.map((section) => (
        <div 
          key={section.id} 
          className="rounded-xl border border-t-border overflow-hidden"
          style={{ background: 'var(--t-bg-card)' }}
        >
          <div 
            className="px-5 py-4 border-b border-t-border cursor-pointer flex items-center justify-between"
            onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
          >
            <div>
              <h4 className="text-base font-medium text-t-text1">{section.name}</h4>
              <p className="text-sm text-t-text3">{section.description}</p>
            </div>
            <ChevronRight 
              size={22} 
              className={`text-t-text3 transition-transform ${editingSection === section.id ? 'rotate-90' : ''}`} 
            />
          </div>
          
          {editingSection === section.id && (
            <div className="p-5 space-y-5">
              {/* Cover Image Description */}
              {spec?.hasVisualContent && (
                <div>
                  <label className="block text-sm text-t-text3 mb-2">{t.projectCreator.cover}</label>
                  <input
                    type="text"
                    value={section.coverImageDescription || ''}
                    onChange={(e) => updateSectionInfo(section.id, 'coverImageDescription', e.target.value)}
                    placeholder={t.projectCreator.describeCover}
                    className="w-full px-4 py-3 rounded-lg border border-t-border bg-t-card text-base text-t-text1 focus:outline-none focus:border-t-border"
                  />
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-4">
                {section.timeline.map((item: ScriptTimelineItem, itemIndex: number) => (
                  <div 
                    key={item.id} 
                    className="rounded-lg border border-t-border p-4 space-y-4 bg-t-card"
                  >
                    {/* Header: Time + Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-t-text3 w-5">{itemIndex + 1}</span>
                        <input
                          type="text"
                          value={item.timeStart}
                          onChange={(e) => updateTimelineItem(section.id, item.id, 'timeStart', e.target.value)}
                          placeholder="00:00"
                          className="w-16 px-3 py-2 rounded border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none"
                        />
                        <span className="text-t-text3 text-sm">-</span>
                        <input
                          type="text"
                          value={item.timeEnd}
                          onChange={(e) => updateTimelineItem(section.id, item.id, 'timeEnd', e.target.value)}
                          placeholder="00:15"
                          className="w-16 px-3 py-2 rounded border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeTimelineItem(section.id, item.id)}
                        className="p-2 rounded hover:bg-red-500/20 text-t-text3 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    {/* Lines (Speaker + Line pairs) */}
                    <div className="space-y-3">
                      <label className="block text-xs text-t-text3">{t.projectCreator.lines}</label>
                      {(item.lines || []).map((scriptLine, lineIndex) => (
                        <div key={lineIndex} className="flex items-start gap-3">
                          <input 
                            type="text" 
                            value={scriptLine.speaker} 
                            onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'speaker', e.target.value)} 
                            placeholder={t.projectCreator.speaker}
                            className="w-28 px-3 py-2 rounded border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none flex-shrink-0" 
                          />
                          <textarea 
                            value={scriptLine.line} 
                            onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'line', e.target.value)} 
                            placeholder={t.projectCreator.lineContent}
                            rows={2}
                            className="flex-1 px-3 py-2 rounded border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none resize-none" 
                          />
                          <button 
                            onClick={() => removeScriptLine(section.id, item.id, lineIndex)} 
                            className="p-2 rounded hover:bg-red-500/20 text-t-text3 hover:text-red-400 flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => addScriptLine(section.id, item.id)} 
                        className="flex items-center gap-1.5 text-xs text-t-text3 hover:text-t-text2"
                      >
                        <Plus size={12} />{t.projectCreator.addLine}
                      </button>
                    </div>
                    
                    {/* Sound/Music */}
                    {(spec?.addBgm || spec?.addSoundEffects) && (
                      <div>
                        <label className="block text-xs text-t-text3 mb-2">{t.projectCreator.soundMusic}</label>
                        <input
                          type="text"
                          value={item.soundMusic}
                          onChange={(e) => updateTimelineItem(section.id, item.id, 'soundMusic', e.target.value)}
                          placeholder={t.projectCreator.bgmSoundEffects}
                          className="w-full px-4 py-3 rounded-lg border border-t-border bg-t-card text-base text-t-text1 focus:outline-none focus:border-t-border"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Timeline Item */}
              <button
                onClick={() => addTimelineItem(section.id)}
                className="flex items-center gap-2 text-sm text-t-text3 hover:text-t-text1 transition-all"
              >
                <Plus size={16} />
                {t.projectCreator.addSegment}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // ============================================================
  // Render Step 3: Voice Generation - ported from ProjectCreator
  // ============================================================
  const renderVoiceGenerationStep = () => {
    const { voiceGeneration } = production;
    
    // Show voice assignment UI before confirming
    if (!voicesConfirmed) {
      return (
        <div className="space-y-6">
          <div className="text-center py-4">
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: `${theme.primary}20` }}
            >
              <Mic2 size={32} style={{ color: theme.primaryLight }} />
            </div>
            <h3 className="text-xl font-medium text-t-text1 mb-2">
              {language === 'zh' ? '角色音色配置' : 'Character Voice Configuration'}
            </h3>
            <p className="text-base text-t-text3">
              {language === 'zh' 
                ? '为每个角色选择音色，确认后开始语音合成' 
                : 'Assign voices to each character, then start synthesis'}
            </p>
          </div>

          {/* Character voice assignment list */}
          {characters.length > 0 && (
            <div className="rounded-xl border border-t-border overflow-hidden" style={{ background: 'var(--t-bg-card)' }}>
              <div className="px-5 py-3 border-b border-t-border flex items-center justify-between">
                <span className="text-sm text-t-text3">
                  {language === 'zh' ? '角色音色分配' : 'Character Voice Assignment'}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={recommendVoicesForAll}
                    disabled={isRecommendingVoices || systemVoices.length + availableVoices.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{ background: `${theme.primary}25`, color: theme.primaryLight }}
                    title={language === 'zh' ? '用 AI 为每个角色推荐最合适的预置音色' : 'Use AI to recommend the best preset voice for each character'}
                  >
                    {isRecommendingVoices ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Wand2 size={16} />
                    )}
                    {language === 'zh' ? 'AI 推荐音色' : 'Recommend with AI'}
                  </button>
                  <span className="text-xs text-t-text3">
                    {characters.length} {language === 'zh' ? '个角色' : 'characters'}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {characters.map((char, index) => {
                  const assignedVoiceId = char.assignedVoiceId;
                  const assignedSystemVoice = systemVoices.find(v => v.id === assignedVoiceId);
                  const assignedCustomVoice = availableVoices.find(v => v.id === assignedVoiceId);
                  const hasAssignment = assignedSystemVoice || assignedCustomVoice;
                  
                  return (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-t-card border border-t-border-lt">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-t-card-hover">
                        <User size={20} className="text-t-text2" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-t-text1 font-medium truncate">{char.name}</p>
                        {char.description && (
                          <p className="text-sm text-t-text3 truncate">{char.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setVoicePickerCharIndex(index)}
                          className="px-4 py-2.5 rounded-lg border text-base font-medium transition-all hover:scale-105 flex items-center gap-2 min-w-[160px]"
                          style={{ 
                            background: hasAssignment ? `${theme.primary}15` : 'var(--t-bg-card)',
                            borderColor: hasAssignment ? theme.primary : 'var(--t-border)',
                            color: hasAssignment ? theme.primaryLight : 'var(--t-text-2)',
                          }}
                        >
                          <Volume2 size={16} className="flex-shrink-0" />
                          <span className="truncate">
                            {hasAssignment 
                              ? (assignedSystemVoice?.name || assignedCustomVoice?.name || '')
                              : (language === 'zh' ? '选择音色...' : 'Select voice...')}
                          </span>
                        </button>
                        {assignedSystemVoice && (
                          <button 
                            onClick={() => playVoiceSample(assignedSystemVoice.id)}
                            disabled={loadingVoiceId === assignedSystemVoice.id}
                            className={`p-2.5 rounded-lg transition-all ${
                              playingVoiceId === assignedSystemVoice.id 
                                ? 'text-t-text1' 
                                : 'text-t-text3 hover:text-t-text1 hover:bg-t-card-hover'
                            }`}
                            style={playingVoiceId === assignedSystemVoice.id ? { background: theme.primary } : {}}
                            title={language === 'zh' ? '试听' : 'Preview'}
                          >
                            {loadingVoiceId === assignedSystemVoice.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : playingVoiceId === assignedSystemVoice.id ? (
                              <Square size={16} />
                            ) : (
                              <Play size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No characters message */}
          {characters.length === 0 && (
            <div className="text-center py-10 text-t-text3">
              <User size={40} className="mx-auto mb-3 opacity-50" />
              <p>{language === 'zh' ? '未检测到角色' : 'No characters detected'}</p>
            </div>
          )}

          {/* Voice studio hint */}
          {availableVoices.length === 0 && (
            <div 
              className="p-4 rounded-xl border border-t-border flex items-start gap-3"
              style={{ background: `${theme.primary}10` }}
            >
              <Sparkles size={20} className="flex-shrink-0 mt-0.5" style={{ color: theme.primaryLight }} />
              <div>
                <p className="text-sm text-t-text2">
                  {language === 'zh' 
                    ? '您可以在"音色工作室"中创建自定义音色，或使用系统默认音色。' 
                    : 'You can create custom voices in Voice Studio, or use system default voices.'}
                </p>
              </div>
            </div>
          )}

          {/* Voice Picker Modal */}
          {voicePickerCharIndex !== null && characters[voicePickerCharIndex] && (
            <VoicePickerModal
              character={characters[voicePickerCharIndex]}
              systemVoices={systemVoices}
              customVoices={availableVoices}
              playingVoiceId={playingVoiceId}
              loadingVoiceId={loadingVoiceId}
              isRecommending={isRecommendingVoices}
              onAssign={(voiceId) => {
                assignVoiceToCharacter(voicePickerCharIndex, voiceId);
              }}
              onPlayVoice={playVoiceSample}
              onCreateVoice={async (name, description, file) => {
                const charIndex = voicePickerCharIndex;
                try {
                  // Read file as data URL
                  const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });

                  // Create new voice character using the utility function
                  const updatedVoices = loadVoiceCharacters();
                  const newVoice: VoiceCharacter = {
                    id: crypto.randomUUID(),
                    name: name,
                    description: description || (language === 'zh' ? '自定义音色' : 'Custom voice'),
                    refAudioDataUrl: dataUrl,
                    audioSampleUrl: dataUrl,
                    tags: ['uploaded'],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };

                  const allVoices = [...updatedVoices, newVoice];
                  // Save using localStorage
                  localStorage.setItem('gather-voice-characters', JSON.stringify(allVoices));
                  
                  setAvailableVoices(allVoices);
                  
                  // Auto-assign to character
                  assignVoiceToCharacter(charIndex, newVoice.id);
                } catch (error) {
                  console.error('Failed to create voice:', error);
                  alert(language === 'zh' ? '创建音色失败' : 'Failed to create voice');
                  throw error;
                }
              }}
              onClose={() => setVoicePickerCharIndex(null)}
            />
          )}

        </div>
      );
    }
    
    // Show section-by-section voice generation UI after confirming
    const { sectionStatus } = voiceGeneration;
    const completedSections = scriptSections.filter(s => sectionStatus[s.id]?.status === 'completed').length;
    const allCompleted = completedSections === scriptSections.length && scriptSections.length > 0;
    
    return (
      <div className="space-y-6">
        {/* Overall progress header */}
        <div className="text-center py-4">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: `${theme.primary}20` }}
          >
            {allCompleted ? (
              <Check size={32} style={{ color: theme.primaryLight }} />
            ) : (
              <Mic2 size={32} className={voiceGeneration.status === 'processing' ? 'animate-pulse' : ''} style={{ color: theme.primaryLight }} />
            )}
          </div>
          <h3 className="text-xl font-medium text-t-text1 mb-2">
            {language === 'zh' ? '逐段语音生成' : 'Section-by-Section Voice Generation'}
          </h3>
          <p className="text-base text-t-text3">
            {allCompleted 
              ? (language === 'zh' ? '所有段落已完成' : 'All sections completed')
              : `${completedSections}/${scriptSections.length} ${language === 'zh' ? '段落已完成' : 'sections completed'}`
            }
          </p>
        </div>

        {/* Section list with individual controls */}
        <div className="space-y-4">
          {scriptSections.map((section, index) => {
            const status = sectionStatus[section.id] || { status: 'idle', progress: 0, audioSegments: [] };
            const isCurrentSection = voiceGeneration.currentSectionId === section.id;
            const lineCount = section.timeline.reduce((acc, item) => acc + (item.lines?.filter(l => l.line.trim()).length || 0), 0);
            
            return (
              <div 
                key={section.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isCurrentSection ? 'border-t-border' : 'border-t-border'
                }`}
                style={{ background: 'var(--t-bg-card)' }}
              >
                {/* Section header */}
                <div 
                  className={`px-5 py-4 flex items-center gap-4 ${
                    status.status === 'completed' && status.audioSegments.length > 0 
                      ? 'cursor-pointer hover:bg-t-card transition-colors' 
                      : ''
                  }`}
                  onClick={() => {
                    if (status.status === 'completed' && status.audioSegments.length > 0) {
                      setExpandedVoiceSections(prev => {
                        const next = new Set(prev);
                        if (next.has(section.id)) {
                          next.delete(section.id);
                          if (segmentAudioRef.current) {
                            segmentAudioRef.current.pause();
                            segmentAudioRef.current = null;
                          }
                          setPlayingSegmentId(null);
                        } else {
                          next.add(section.id);
                        }
                        return next;
                      });
                    }
                  }}
                >
                  {/* Status icon */}
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: status.status === 'completed' 
                        ? `${theme.primary}30` 
                        : status.status === 'processing' 
                          ? `${theme.primary}20` 
                          : status.status === 'error'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'var(--t-bg-card)'
                    }}
                  >
                    {status.status === 'completed' ? (
                      <Check size={20} style={{ color: theme.primaryLight }} />
                    ) : status.status === 'processing' ? (
                      <Loader2 size={20} className="animate-spin" style={{ color: theme.primaryLight }} />
                    ) : status.status === 'error' ? (
                      <X size={20} className="text-red-400" />
                    ) : (
                      <span className="text-t-text3 text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Section info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-medium text-t-text1 truncate">{section.name}</h4>
                    <p className="text-sm text-t-text3">
                      {lineCount} {language === 'zh' ? '条对话' : 'lines'}
                      {status.status === 'completed' && status.audioSegments.length > 0 && (
                        <span className="ml-2 text-green-400">
                          · {status.audioSegments.length} {language === 'zh' ? '条音频' : 'audio clips'}
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {status.status === 'processing' && (
                      <span className="text-sm font-medium" style={{ color: theme.primaryLight }}>
                        {status.progress}%
                      </span>
                    )}
                    
                    {(status.status === 'idle' || status.status === 'error') && (
                      <button
                        onClick={() => generateVoiceForSection(section)}
                        disabled={voiceGeneration.status === 'processing'}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{ background: theme.primary }}
                      >
                        <Mic2 size={16} />
                        {status.status === 'error' 
                          ? (language === 'zh' ? '重试' : 'Retry')
                          : (language === 'zh' ? '生成' : 'Generate')
                        }
                      </button>
                    )}
                    
                    {status.status === 'completed' && (
                      <button
                        onClick={() => {
                          clearSectionVoice(section.id);
                          generateVoiceForSection(section);
                        }}
                        disabled={voiceGeneration.status === 'processing'}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-t-text2 hover:text-t-text1 hover:bg-t-card-hover transition-all disabled:opacity-50"
                        title={language === 'zh' ? '重新生成' : 'Regenerate'}
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                    
                    {status.status === 'completed' && status.audioSegments.length > 0 && (
                      <ChevronDown 
                        size={18} 
                        className={`text-t-text3 transition-transform duration-200 ${
                          expandedVoiceSections.has(section.id) ? 'rotate-180' : ''
                        }`} 
                      />
                    )}
                  </div>
                </div>
                
                {/* Progress bar for processing sections */}
                {status.status === 'processing' && (
                  <div className="px-5 pb-4">
                    <div className="h-1.5 rounded-full bg-t-card-hover overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${status.progress}%`, background: theme.primary }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Error message */}
                {status.status === 'error' && status.error && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-red-400">{status.error}</p>
                  </div>
                )}
                
                {/* Expanded audio segment list */}
                {status.status === 'completed' && status.audioSegments.length > 0 && expandedVoiceSections.has(section.id) && (
                  <div className="border-t border-t-border-lt">
                    <div className="divide-y divide-t-border-lt">
                      {status.audioSegments.map((audio, audioIndex) => {
                        const segId = `${section.id}-${audioIndex}`;
                        const isPlaying = playingSegmentId === segId;
                        return (
                          <div 
                            key={audioIndex}
                            className="px-5 py-3 flex items-center gap-3 hover:bg-t-card transition-colors"
                          >
                            <button
                              onClick={() => {
                                if (isPlaying) {
                                  if (segmentAudioRef.current) {
                                    segmentAudioRef.current.pause();
                                    segmentAudioRef.current = null;
                                  }
                                  setPlayingSegmentId(null);
                                } else {
                                  if (segmentAudioRef.current) {
                                    segmentAudioRef.current.pause();
                                    segmentAudioRef.current = null;
                                  }
                                  const audioUrl = api.audioDataToUrl(audio.audioData, audio.mimeType);
                                  const audioEl = new Audio(audioUrl);
                                  audioEl.onended = () => {
                                    setPlayingSegmentId(null);
                                    segmentAudioRef.current = null;
                                  };
                                  audioEl.play().catch(() => {
                                    setPlayingSegmentId(null);
                                    segmentAudioRef.current = null;
                                  });
                                  segmentAudioRef.current = audioEl;
                                  setPlayingSegmentId(segId);
                                }
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                              style={{ background: isPlaying ? theme.primary : `${theme.primary}30` }}
                            >
                              {isPlaying ? (
                                <Pause size={14} className="text-t-text1" />
                              ) : (
                                <Play size={14} className="ml-0.5" style={{ color: theme.primaryLight }} />
                              )}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-t-text2">{audio.speaker}</span>
                              <p className="text-xs text-t-text3 truncate mt-0.5">{audio.text}</p>
                            </div>
                            
                            <span className="text-xs text-t-text3 flex-shrink-0">#{audio.lineIndex + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Generate all button */}
        {!allCompleted && (
          <button
            onClick={performVoiceGeneration}
            disabled={voiceGeneration.status === 'processing'}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl text-base text-t-text1 font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: `${theme.primary}80` }}
          >
            {voiceGeneration.status === 'processing' ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <Mic2 size={22} />
            )}
            {language === 'zh' ? '一键生成全部' : 'Generate All Sections'}
          </button>
        )}
      </div>
    );
  };

  // ============================================================
  // Render Step 4: Media Production - ported from ProjectCreator
  // ============================================================
  const renderMediaProductionStep = () => {
    const { mediaProduction } = production;
    const hasBgm = spec?.addBgm;
    const hasSfx = spec?.addSoundEffects;
    const hasImages = spec?.hasVisualContent;
    
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <div 
            className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: `${theme.primary}20` }}
          >
            {mediaProduction.status === 'completed' ? (
              <Check size={40} style={{ color: theme.primaryLight }} />
            ) : (
              <Music size={40} className={mediaProduction.status === 'processing' ? 'animate-pulse' : ''} style={{ color: theme.primaryLight }} />
            )}
          </div>
          <h3 className="text-xl font-medium text-t-text1 mb-2">
            {language === 'zh' ? '媒体制作' : 'Media Production'}
          </h3>
          <p className="text-base text-t-text3">
            {mediaProduction.status === 'completed' 
              ? (language === 'zh' ? '媒体制作完成' : 'Media production complete')
              : mediaProduction.currentTask || (language === 'zh' ? '准备中...' : 'Preparing...')
            }
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-t-text3">
            <span>{language === 'zh' ? '进度' : 'Progress'}</span>
            <span>{mediaProduction.progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-t-card-hover overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${mediaProduction.progress}%`, background: theme.primary }}
            />
          </div>
        </div>

        {/* Media tasks */}
        <div className="grid grid-cols-3 gap-4">
          {hasBgm && (
            <div 
              className="p-5 rounded-xl border border-t-border text-center"
              style={{ background: 'var(--t-bg-card)' }}
            >
              <Music size={28} className="mx-auto mb-3" style={{ color: theme.primaryLight }} />
              <p className="text-sm text-t-text2">BGM</p>
              {mediaProduction.progress > 33 && (
                <Check size={16} className="mx-auto mt-2" style={{ color: theme.primaryLight }} />
              )}
            </div>
          )}
          {hasSfx && (
            <div 
              className="p-5 rounded-xl border border-t-border text-center"
              style={{ background: 'var(--t-bg-card)' }}
            >
              <Volume2 size={28} className="mx-auto mb-3" style={{ color: theme.primaryLight }} />
              <p className="text-sm text-t-text2">SFX</p>
              {mediaProduction.progress > 66 && (
                <Check size={16} className="mx-auto mt-2" style={{ color: theme.primaryLight }} />
              )}
            </div>
          )}
          {hasImages && (
            <div 
              className="p-5 rounded-xl border border-t-border text-center"
              style={{ background: 'var(--t-bg-card)' }}
            >
              <Image size={28} className="mx-auto mb-3" style={{ color: theme.primaryLight }} />
              <p className="text-sm text-t-text2">{language === 'zh' ? '图片' : 'Images'}</p>
              {mediaProduction.progress === 100 && (
                <Check size={16} className="mx-auto mt-2" style={{ color: theme.primaryLight }} />
              )}
            </div>
          )}
          {!hasBgm && !hasSfx && !hasImages && (
            <div className="col-span-3 text-center py-10 text-t-text3 text-base">
              {language === 'zh' ? '此项目不需要额外媒体' : 'No additional media needed'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // Render Step 5: Mixing & Editing - ported from ProjectCreator
  // ============================================================
  const renderMixingStep = () => {
    const { mixingEditing } = production;
    const mixedOutput = mixingEditing.output;
    const mixingError = mixingEditing.error;
    
    const handlePlayMixedAudio = () => {
      if (mixedOutput?.audioData) {
        const audioUrl = api.audioDataToUrl(mixedOutput.audioData, mixedOutput.mimeType);
        const audio = new Audio(audioUrl);
        audio.play().catch(err => console.error('Playback failed:', err));
      }
    };
    
    const handleDownloadMixedAudio = () => {
      if (mixedOutput?.audioData) {
        const filename = `${title || 'episode-audio'}.wav`;
        api.downloadAudio(mixedOutput.audioData, mixedOutput.mimeType, filename);
      }
    };
    
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <div 
            className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: `${theme.primary}20` }}
          >
            {mixingEditing.status === 'completed' && mixedOutput ? (
              <Check size={40} style={{ color: theme.primaryLight }} />
            ) : mixingError ? (
              <X size={40} className="text-red-400" />
            ) : (
              <Sliders size={40} className={mixingEditing.status === 'processing' ? 'animate-pulse' : ''} style={{ color: theme.primaryLight }} />
            )}
          </div>
          <h3 className="text-xl font-medium text-t-text1 mb-2">
            {language === 'zh' ? '混音与编辑' : 'Mixing & Editing'}
          </h3>
          <p className="text-base text-t-text3">
            {mixingError 
              ? (language === 'zh' ? `混音失败: ${mixingError}` : `Mixing failed: ${mixingError}`)
              : mixingEditing.status === 'completed' && mixedOutput
                ? (language === 'zh' ? '混音完成！' : 'Mixing complete!')
                : (language === 'zh' ? '正在合成音轨...' : 'Combining audio tracks...')
            }
          </p>
        </div>

        {/* Progress bar */}
        {mixingEditing.status === 'processing' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-t-text3">
              <span>{language === 'zh' ? '进度' : 'Progress'}</span>
              <span>{mixingEditing.progress}%</span>
            </div>
            <div className="h-3 rounded-full bg-t-card-hover overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${mixingEditing.progress}%`, background: theme.primary }}
              />
            </div>
          </div>
        )}

        {/* Audio Player when complete */}
        {mixingEditing.status === 'completed' && mixedOutput && (
          <div 
            className="rounded-xl p-5 border border-t-border"
            style={{ background: 'var(--t-bg-card)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Music size={18} style={{ color: theme.primaryLight }} />
              <span className="text-t-text1 text-base font-medium">
                {language === 'zh' ? '最终音频' : 'Final Audio'}
              </span>
              <span className="text-t-text3 text-sm ml-auto">
                {formatDuration(mixedOutput.durationMs)}
              </span>
            </div>
            
            <audio 
              controls 
              className="w-full mb-4"
              src={api.audioDataToUrl(mixedOutput.audioData, mixedOutput.mimeType)}
              style={{ height: '40px' }}
            />
            
            <div className="flex gap-3">
              <button
                onClick={handlePlayMixedAudio}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-t-text1 text-sm font-medium transition-all hover:opacity-90"
                style={{ background: theme.primary }}
              >
                <Play size={16} />
                {language === 'zh' ? '播放' : 'Play'}
              </button>
              <button
                onClick={handleDownloadMixedAudio}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-t-text1 text-sm font-medium border border-t-border transition-all hover:bg-t-card-hover"
              >
                <Save size={16} />
                {language === 'zh' ? '下载' : 'Download'}
              </button>
            </div>
          </div>
        )}

        {/* Retry button on error */}
        {mixingError && (
          <button
            onClick={() => performMixing()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-t-text1 text-sm font-medium transition-all hover:opacity-90"
            style={{ background: theme.primary }}
          >
            <RefreshCw size={16} />
            {language === 'zh' ? '重试混音' : 'Retry Mixing'}
          </button>
        )}

        {/* Visual preview */}
        {mixingEditing.status === 'completed' && spec?.hasVisualContent && (
          <div 
            className="rounded-xl p-5 border border-t-border"
            style={{ background: 'var(--t-bg-card)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Image size={18} style={{ color: theme.primaryLight }} />
              <span className="text-t-text1 text-base font-medium">{language === 'zh' ? '视觉预览' : 'Visual Preview'}</span>
            </div>
            <div className="h-14 rounded-lg flex items-center justify-center text-t-text3 text-sm" style={{ background: `${theme.primary}10` }}>
              {language === 'zh' ? '即将推出' : 'Coming soon'}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // Render Step 6: Save Episode
  // ============================================================
  const renderSaveStep = () => (
    <div className="space-y-6">
      {/* Success message */}
      <div className="text-center py-6">
        <div 
          className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
          style={{ background: `${theme.primary}30` }}
        >
          <Check size={40} style={{ color: theme.primaryLight }} />
        </div>
        <h3 className="text-xl font-medium text-t-text1 mb-2">
          {language === 'zh' ? '准备就绪！' : 'Ready to Save!'}
        </h3>
        <p className="text-base text-t-text3">
          {language === 'zh' ? '确认以下信息并保存剧集' : 'Confirm the details below and save your episode'}
        </p>
      </div>

      {/* Episode summary */}
      <div 
        className="rounded-xl p-6 border border-t-border"
        style={{ background: `${theme.primary}10` }}
      >
        <div className="flex items-center gap-4 mb-5">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: `${theme.primary}30` }}
          >
            <ReligionIcon size={28} color={theme.primaryLight} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-serif text-t-text1">{title}</h3>
            <p className="text-base text-t-text3">{project.title}</p>
          </div>
        </div>

        <div className="space-y-4 text-base">
          {description && (
            <p className="text-t-text2 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-t-text2">
            <span>{scriptSections.length} {language === 'zh' ? '段落' : 'sections'}</span>
            <span>·</span>
            <span>{characters.length} {language === 'zh' ? '角色' : 'characters'}</span>
            {spec?.addBgm && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Music size={14} /> BGM
                </span>
              </>
            )}
            {spec?.addSoundEffects && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Volume2 size={14} /> SFX
                </span>
              </>
            )}
            {spec?.hasVisualContent && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Image size={14} /> {language === 'zh' ? '视觉' : 'Visual'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-t-text3 text-sm">
        {language === 'zh' ? '点击下方按钮保存剧集' : 'Click the button below to save your episode'}
      </p>
    </div>
  );

  // ============================================================
  // Main render
  // ============================================================
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderContentInputStep();
      case 2: return renderScriptStep();
      case 3: return renderVoiceGenerationStep();
      case 4: return renderMediaProductionStep();
      case 5: return renderMixingStep();
      case 6: return renderSaveStep();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up border border-t-border"
        style={{ background: 'var(--t-bg-base)' }}
      >
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between border-b border-t-border">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `${theme.primary}30` }}
            >
              <ReligionIcon size={24} color={theme.primaryLight} />
            </div>
            <div>
              <h2 className="text-xl font-serif text-t-text1">{t.episodeEditor.createTitle}</h2>
              <p className="text-sm text-t-text3">
                {project.title} · {t.projectCreator.step} {currentStep} / {STEPS.length} · {STEPS[currentStep - 1]?.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-t-card-hover rounded-lg transition-colors">
            <X className="text-t-text3" size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-8 py-8">
          {renderStepContent()}
        </div>

        {/* Progress Bar */}
        <div className="relative h-1.5 bg-t-card">
          <div 
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{ 
              width: `${(currentStep / STEPS.length) * 100}%`,
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryLight})`
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-t-border flex items-center justify-between">
          <button
            onClick={currentStep === 1 ? onClose : handleBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-base text-t-text2 hover:text-t-text1 hover:bg-t-card transition-colors"
          >
            <ChevronLeft size={22} />
            {currentStep === 1 ? t.projectCreator.buttons.cancel : t.projectCreator.buttons.back}
          </button>

          <div className="flex items-center gap-3">
            {/* Skip for now - available from step 2 onwards when script exists */}
            {currentStep >= 2 && scriptSections.length > 0 && (
              <button
                onClick={handleSkipAndSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-base text-t-text3 hover:text-t-text1 hover:bg-t-card-hover transition-colors border border-t-border"
              >
                {language === 'zh' ? '跳过，稍后继续' : 'Skip for now'}
              </button>
            )}

            {/* Confirm & Start Voice Synthesis - shown on step 3 before voices are confirmed */}
            {currentStep === 3 && !voicesConfirmed && (
              <button
                onClick={startVoiceGeneration}
                disabled={characters.length === 0 || characters.some(c => !c.assignedVoiceId)}
                className="flex items-center gap-2 px-8 py-2.5 rounded-lg text-base text-t-text1 font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: theme.primary }}
              >
                <Mic2 size={22} />
                {language === 'zh' ? '确认并开始语音合成' : 'Confirm & Start Voice Synthesis'}
              </button>
            )}

            {currentStep < STEPS.length ? (
              canProceed() && (
                <button
                  onClick={handleNext}
                  disabled={isProcessingNext}
                  className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-base text-t-text1 font-medium transition-all hover:scale-105 ${
                    isProcessingNext ? 'animate-pulse' : ''
                  }`}
                  style={{ background: theme.primary }}
                >
                  {isProcessingNext ? (
                    <>
                      <Loader2 size={22} className="animate-spin" />
                      {t.common.loading}
                    </>
                  ) : (
                    <>
                      {currentStep >= 2 ? (language === 'zh' ? '确认' : 'Approve') : t.projectCreator.buttons.next}
                      <ChevronRight size={22} />
                    </>
                  )}
                </button>
              )
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-8 py-2.5 rounded-lg text-base font-medium transition-all hover:scale-105"
                style={{ background: theme.accent, color: theme.primaryDark }}
              >
                <Save size={22} />
                {t.episodeEditor.buttons.create}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
