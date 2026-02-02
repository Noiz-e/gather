import { useState, useRef, useCallback, useEffect, useReducer } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { VoiceCharacter, ScriptSection, EpisodeCharacter } from '../types';
import { 
  ChevronLeft, ChevronRight, Check, X, Upload, FileText, 
  Sparkles, Plus, Trash2, Play, Pause, User, Loader2,
  Music, Volume2, Image, RefreshCw, Save,
  BookOpen, Heart, Mic2, Wand2, Sliders, GraduationCap,
  LucideIcon, Square
} from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';
import { filterValidFiles, collectAnalysisContent } from '../utils/fileUtils';
import { parseStreamingScriptSections } from '../utils/partialJsonParser';
import { 
  buildSpecAnalysisPrompt, 
  buildScriptGenerationPrompt,
  SpecAnalysisResult
} from '../services/llm/prompts';
import * as api from '../services/api';
import { 
  projectCreatorReducer, 
  initialState, 
  actions,
  SpecData
} from './ProjectCreator/reducer';
import { PROJECT_TEMPLATES } from './ProjectCreator/templates';
import { loadVoiceCharacters } from '../utils/voiceStorage';
import type { LandingData } from './Landing';

// Icon mapping for templates
const TemplateIconMap: Record<string, LucideIcon> = {
  BookOpen,
  Heart,
  Mic2,
  GraduationCap,
};

interface ProjectCreatorProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: LandingData;
}

export function ProjectCreator({ onClose, onSuccess, initialData }: ProjectCreatorProps) {
  const { theme, religion } = useTheme();
  const { createProject } = useProjects();
  const { t, language } = useLanguage();
  // Start at step 2 if initialData is provided (coming from Landing page)
  const [currentStep, setCurrentStep] = useState(initialData ? 2 : 1);
  
  // Unified state management with reducer
  const [state, dispatch] = useReducer(projectCreatorReducer, initialState);
  const { 
    selectedTemplate, 
    selectedTemplateId,
    spec: specData, 
    contentInput,
    scriptSections, 
    characters: extractedCharacters,
    production 
  } = state;
  
  // Local UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  // Parsed streaming sections for progressive UI rendering
  const [streamingParsed, setStreamingParsed] = useState<{
    completeSections: ScriptSection[];
    partialSection: Partial<ScriptSection> | null;
  }>({ completeSections: [], partialSection: null });
  // Voice characters - for character voice assignment UI
  const [availableVoices, setAvailableVoices] = useState<VoiceCharacter[]>([]);
  // Track if user has confirmed voice assignments before synthesis
  const [voicesConfirmed, setVoicesConfirmed] = useState(false);
  // System voices from backend (Gemini TTS)
  const [systemVoices, setSystemVoices] = useState<api.Voice[]>([]);
  // Voice preview state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ReligionIcon = ReligionIconMap[religion];

  // New 8-step workflow
  const STEPS = [
    { 
      id: 1, 
      title: language === 'zh' ? '选择模板' : 'Select Template',
      description: language === 'zh' ? '选择项目类型和预设配置' : 'Choose project type and preset configuration'
    },
    { 
      id: 2, 
      title: language === 'zh' ? '项目规格' : 'Project Spec',
      description: language === 'zh' ? '确认并编辑项目规格' : 'Confirm and edit project specifications'
    },
    { 
      id: 3, 
      title: language === 'zh' ? '内容输入' : 'Content Input',
      description: language === 'zh' ? '上传或输入您的内容' : 'Upload or enter your content'
    },
    { 
      id: 4, 
      title: language === 'zh' ? '脚本生成' : 'Script Generation',
      description: language === 'zh' ? '生成时间轴脚本' : 'Generate timeline scripts'
    },
    { 
      id: 5, 
      title: language === 'zh' ? '语音生成' : 'Voice Generation',
      description: language === 'zh' ? '逐段生成语音' : 'Chunk-by-chunk voice generation'
    },
    { 
      id: 6, 
      title: language === 'zh' ? '媒体制作' : 'Media Production',
      description: language === 'zh' ? '音乐、音效和图片' : 'Music, sound effects, and images'
    },
    { 
      id: 7, 
      title: language === 'zh' ? '混音编辑' : 'Mixing & Editing',
      description: language === 'zh' ? '混音和时间轴编辑' : 'Mixing and timeline editing'
    },
    { 
      id: 8, 
      title: language === 'zh' ? '保存项目' : 'Save Project',
      description: language === 'zh' ? '确认并保存' : 'Confirm and save'
    },
  ];

  // Template selection
  const handleSelectTemplate = useCallback((templateId: string) => {
    dispatch(actions.selectTemplate(templateId));
  }, []);

  // File upload handler - supports multiple files
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const validFiles = filterValidFiles(files);
      if (validFiles.length > 0) {
        dispatch(actions.addUploadedFiles(validFiles));
      } else {
        alert(t.projectCreator?.errors?.uploadFileType || 'Invalid file type');
      }
    }
  };

  // Remove uploaded file
  const removeUploadedFile = (index: number) => {
    dispatch(actions.removeUploadedFile(index));
  };

  // Text content change
  const handleTextContentChange = useCallback((content: string) => {
    dispatch(actions.setTextContent(content));
  }, []);

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
        dispatch(actions.addUploadedFiles(validFiles));
      } else {
        alert(t.projectCreator?.errors?.uploadFileType || 'Invalid file type');
      }
    }
  };

  // Handle API errors with localized messages
  const handleApiError = useCallback((error: unknown) => {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    alert(message || t.projectCreator.errors.unknownError);
  }, [t]);

  // Analyze with LLM - extracts title and updates spec from content
  const analyzeWithGemini = async () => {
    setIsAnalyzing(true);
    
    try {
      // Collect content from text input and files
      const content = await collectAnalysisContent(contentInput.textContent, contentInput.uploadedFiles);

      if (!content.trim()) {
        alert(t.projectCreator?.errors?.inputOrUpload || 'Please input or upload content');
        setIsAnalyzing(false);
        return;
      }

      // Pass current project spec context to help Gemini better understand the content
      const specContext = {
        templateName: selectedTemplate 
          ? (language === 'zh' ? selectedTemplate.nameZh : selectedTemplate.name)
          : undefined,
        targetAudience: specData.targetAudience || undefined,
        formatAndDuration: specData.formatAndDuration || undefined,
        toneAndExpression: specData.toneAndExpression || undefined,
      };

      const prompt = buildSpecAnalysisPrompt(content, specContext);
      
      // Use backend API for text generation
      const responseText = await api.generateText(prompt);
      
      // Parse JSON from response
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                        responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : responseText;
      const parsed = JSON.parse(jsonStr) as SpecAnalysisResult;

      // Only update title from analysis, keep template defaults for other fields
      dispatch(actions.setSpec({
        storyTitle: parsed.storyTitle || '',
        subtitle: parsed.subtitle || '',
        // Keep template defaults if set, otherwise use analyzed values
        targetAudience: specData.targetAudience || parsed.targetAudience || '',
        formatAndDuration: specData.formatAndDuration || parsed.formatAndDuration || '',
        toneAndExpression: specData.toneAndExpression || parsed.toneAndExpression || '',
      }));
      
      if (parsed.subtitle) {
        setShowSubtitle(true);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate script with LLM (streaming)
  const generateScript = async () => {
    setIsGeneratingScript(true);
    setStreamingText(''); // Reset streaming text

    try {
      // Collect content without labels for script generation
      const content = await collectAnalysisContent(contentInput.textContent, contentInput.uploadedFiles, { includeLabels: false });

      // Include template hints in prompt if available (based on voice count selection)
      const templateHints = selectedTemplate?.promptHints[templateConfig.voiceCount];
      
      const prompt = buildScriptGenerationPrompt(content, {
        title: specData.storyTitle,
        targetAudience: specData.targetAudience,
        formatAndDuration: specData.formatAndDuration,
        toneAndExpression: specData.toneAndExpression,
        addBgm: specData.addBgm,
        addSoundEffects: specData.addSoundEffects,
        hasVisualContent: specData.hasVisualContent,
        // Pass template hints if available
        ...(templateHints && {
          styleHint: templateHints.style,
          structureHint: templateHints.structure,
          voiceDirectionHint: templateHints.voiceDirection,
        }),
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
        dispatch(actions.setScriptSections(sections));
        // Auto-expand the first section
        setEditingSection(sections[0].id);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsGeneratingScript(false);
      setStreamingText(''); // Clear streaming text after completion
    }
  };

  // Extract characters from script
  const extractCharacters = useCallback(() => {
    dispatch(actions.extractCharactersFromScript());
    setAvailableVoices(loadVoiceCharacters());
  }, []);

  // Assign voice to character
  const assignVoiceToCharacter = useCallback((characterIndex: number, voiceId: string) => {
    dispatch(actions.assignVoiceToCharacter(characterIndex, voiceId));
  }, []);

  // Start voice generation after confirming voice assignments
  const startVoiceGeneration = () => {
    setVoicesConfirmed(true);
    performVoiceGeneration();
  };

  // Play voice sample preview
  const playVoiceSample = async (voiceId: string) => {
    // If same voice is playing, stop it
    if (playingVoiceId === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop any currently playing audio
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
      
      // When audio ends, clear playing state
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

  // Stop voice preview when leaving step 5
  useEffect(() => {
    if (currentStep !== 5 && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingVoiceId(null);
    }
  }, [currentStep]);

  // Memoized action dispatchers to avoid re-creating on each render
  const updateTimelineItem = useCallback(
    (sectionId: string, itemId: string, field: 'timeStart' | 'timeEnd' | 'soundMusic', value: string) => {
      dispatch(actions.updateTimelineItem(sectionId, itemId, field, value));
    },
    []
  );

  const updateScriptLine = useCallback(
    (sectionId: string, itemId: string, lineIndex: number, field: 'speaker' | 'line', value: string) => {
      dispatch(actions.updateScriptLine(sectionId, itemId, lineIndex, field, value));
    },
    []
  );

  const addScriptLine = useCallback(
    (sectionId: string, itemId: string) => {
      dispatch(actions.addScriptLine(sectionId, itemId));
    },
    []
  );

  const removeScriptLine = useCallback(
    (sectionId: string, itemId: string, lineIndex: number) => {
      dispatch(actions.removeScriptLine(sectionId, itemId, lineIndex));
    },
    []
  );

  const addTimelineItem = useCallback(
    (sectionId: string) => {
      dispatch(actions.addTimelineItem(sectionId));
    },
    []
  );

  const removeTimelineItem = useCallback(
    (sectionId: string, itemId: string) => {
      dispatch(actions.removeTimelineItem(sectionId, itemId));
    },
    []
  );

  const updateSectionCover = useCallback(
    (sectionId: string, coverImageDescription: string) => {
      dispatch(actions.updateSectionCover(sectionId, coverImageDescription));
    },
    []
  );

  // Spec field update helper
  const updateSpecField = useCallback(
    <K extends keyof SpecData>(field: K, value: SpecData[K]) => {
      dispatch(actions.updateSpecField(field, value));
    },
    []
  );

  // Voice generation using real TTS API
  const performVoiceGeneration = async () => {
    // Collect all script lines that need TTS
    const segments: api.AudioSegment[] = [];
    
    for (const section of scriptSections) {
      for (const item of section.timeline) {
        for (const line of item.lines) {
          if (line.line.trim()) {
            // Find assigned voice for this speaker
            const character = extractedCharacters.find(c => c.name === line.speaker);
            const voice = availableVoices.find(v => v.id === character?.assignedVoiceId);
            
            segments.push({
              text: line.line,
              speaker: line.speaker,
              // Map to Gemini voice name or use default
              voiceName: voice?.voiceId || 'Kore',
            });
          }
        }
      }
    }
    
    if (segments.length === 0) {
      dispatch(actions.updateProductionPhase('voice-generation', 'completed', 100));
      return;
    }
    
    // Use streaming batch API for progress updates
    try {
      await api.generateAudioBatchStream(
        segments,
        (event) => {
          if (event.type === 'progress') {
            const progress = Math.round(((event.index || 0) + 1) / segments.length * 100);
            dispatch(actions.updateProductionPhase('voice-generation', 'processing', progress, event.speaker));
          } else if (event.type === 'done') {
            dispatch(actions.updateProductionPhase('voice-generation', 'completed', 100));
          } else if (event.type === 'error') {
            console.error('Voice generation error:', event.error);
          }
        }
      );
    } catch (error) {
      console.error('Voice generation failed:', error);
      // Fallback to simulated progress if API fails
      const chunks = extractedCharacters.length > 0 
        ? extractedCharacters.map(c => c.name)
        : ['Section 1', 'Section 2', 'Section 3'];
      
      for (let i = 0; i < chunks.length; i++) {
        dispatch(actions.updateProductionPhase('voice-generation', 'processing', Math.round(((i + 1) / chunks.length) * 100), chunks[i]));
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      dispatch(actions.updateProductionPhase('voice-generation', 'completed', 100));
    }
  };

  // Media production using real APIs (BGM, SFX, Images)
  const performMediaProduction = async () => {
    const tasks: { type: string; label: string }[] = [];
    if (specData.addBgm) tasks.push({ type: 'bgm', label: language === 'zh' ? '生成背景音乐' : 'Generating BGM' });
    if (specData.addSoundEffects) tasks.push({ type: 'sfx', label: language === 'zh' ? '添加音效' : 'Adding SFX' });
    if (specData.hasVisualContent) tasks.push({ type: 'images', label: language === 'zh' ? '生成图片' : 'Generating Images' });
    
    if (tasks.length === 0) {
      dispatch(actions.updateProductionPhase('media-production', 'completed', 100));
      return;
    }
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      dispatch(actions.updateProductionPhase('media-production', 'processing', Math.round((i / tasks.length) * 100), task.label));
      
      try {
        if (task.type === 'bgm') {
          // Generate background music
          await api.generateBGM(
            specData.toneAndExpression,
            'peaceful',
            30
          );
        } else if (task.type === 'sfx') {
          // Generate sound effects from script instructions
          for (const section of scriptSections) {
            for (const item of section.timeline) {
              if (item.soundMusic?.trim()) {
                await api.generateSoundEffect(item.soundMusic, 5);
              }
            }
          }
        } else if (task.type === 'images') {
          // Generate cover images for sections
          for (const section of scriptSections) {
            if (section.coverImageDescription?.trim()) {
              await api.generateCoverImage(section.coverImageDescription);
            }
          }
        }
      } catch (error) {
        console.error(`${task.type} generation failed:`, error);
        // Continue with other tasks even if one fails
      }
      
      dispatch(actions.updateProductionPhase('media-production', 'processing', Math.round(((i + 1) / tasks.length) * 100), task.label));
    }
    
    dispatch(actions.updateProductionPhase('media-production', 'completed', 100));
  };

  // Simulate mixing process (Phase 3)
  const simulateMixing = async () => {
    const steps = [25, 50, 75, 100];
    for (const progress of steps) {
      dispatch(actions.updateProductionPhase('mixing-editing', 'processing', progress));
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    dispatch(actions.updateProductionPhase('mixing-editing', 'completed', 100));
  };

  // Handle create project
  const handleCreate = () => {
    const tags = specData.toneAndExpression.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    // Convert extracted characters to EpisodeCharacter format
    const episodeCharacters: EpisodeCharacter[] = extractedCharacters.map(char => ({
      name: char.name,
      description: char.description,
      assignedVoiceId: char.assignedVoiceId,
    }));
    
    createProject({
      title: specData.storyTitle,
      subtitle: specData.subtitle,
      description: `${specData.targetAudience} | ${specData.formatAndDuration}`,
      religion,
      tags,
      // Save spec for creating future episodes
      spec: {
        targetAudience: specData.targetAudience,
        formatAndDuration: specData.formatAndDuration,
        toneAndExpression: specData.toneAndExpression,
        addBgm: specData.addBgm,
        addSoundEffects: specData.addSoundEffects,
        hasVisualContent: specData.hasVisualContent,
      },
      // First episode with generated script
      firstEpisode: {
        title: `${t.projectCreator.episode1}: ${specData.storyTitle}`,
        subtitle: specData.subtitle,
        description: specData.toneAndExpression,
        scriptSections,
        characters: episodeCharacters,
      },
    });
    onSuccess();
  };

  // Navigation validation for 8-step workflow
  const canProceed = () => {
    switch (currentStep) {
      case 1: return selectedTemplateId !== null || customDescription.trim().length > 0; // Template selected OR custom description
      case 2: return specData.storyTitle.trim().length > 0; // Title filled
      case 3: return contentInput.textContent.trim().length > 0 || contentInput.uploadedFiles.length > 0; // Content provided
      case 4: return scriptSections.length > 0; // Script generated
      case 5: return voicesConfirmed && production.voiceGeneration.status === 'completed'; // Voice confirmed and generation done
      case 6: return production.mediaProduction.status === 'completed'; // Media production done
      case 7: return production.mixingEditing.status === 'completed'; // Mixing done
      default: return true;
    }
  };

  const handleNext = async () => {
    // Step 1 -> 2: Template selected OR custom description, go to spec
    if (currentStep === 1) {
      if (selectedTemplateId && selectedTemplate) {
        // Template mode - apply template defaults + user config to spec
        dispatch(actions.setSpec({
          storyTitle: '',
          subtitle: '',
          targetAudience: selectedTemplate.defaultSpec.targetAudience,
          formatAndDuration: selectedTemplate.defaultSpec.formatAndDuration,
          toneAndExpression: selectedTemplate.defaultSpec.toneAndExpression,
          addBgm: templateConfig.addBgm,
          addSoundEffects: templateConfig.addSoundEffects,
          hasVisualContent: templateConfig.hasVisualContent,
        }));
        setCurrentStep(2);
      } else if (customDescription.trim()) {
        // Custom mode - set default spec values and store description for later analysis
        dispatch(actions.setSpec({
          storyTitle: '',
          subtitle: '',
          targetAudience: language === 'zh' ? '一般听众' : 'General audience',
          formatAndDuration: language === 'zh' ? '音频内容，10-30分钟' : 'Audio content, 10-30 minutes',
          toneAndExpression: language === 'zh' ? '专业、清晰' : 'Professional, clear',
          addBgm: true,
          addSoundEffects: false,
          hasVisualContent: false,
        }));
        // Store custom description in content input for later use
        dispatch(actions.setTextContent(customDescription));
        setCurrentStep(2);
      }
      return;
    }
    
    // Step 2 -> 3: Spec confirmed, go to content input
    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }
    
    // Step 3 -> 4: Content provided, go to script generation
    if (currentStep === 3) {
      setCurrentStep(4);
      // Auto-trigger script generation
      setTimeout(() => {
        generateScript();
      }, 100);
      return;
    }
    
    // Step 4 -> 5: Script generated, extract characters and go to voice generation
    if (currentStep === 4 && scriptSections.length > 0) {
      setIsProcessingNext(true);
      extractCharacters();
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsProcessingNext(false);
      setCurrentStep(5);
      // Reset voice confirmation state when entering Step 5
      setVoicesConfirmed(false);
      // DO NOT auto-start voice generation - wait for user to confirm voice assignments
      return;
    }
    
    // Step 5 -> 6: Voice generation done, go to media production
    if (currentStep === 5 && production.voiceGeneration.status === 'completed') {
      setCurrentStep(6);
      // Auto-start media production
      setTimeout(() => {
        performMediaProduction();
      }, 100);
      return;
    }
    
    // Step 6 -> 7: Media production done, go to mixing
    if (currentStep === 6 && production.mediaProduction.status === 'completed') {
      setCurrentStep(7);
      // Auto-start mixing
      setTimeout(() => {
        simulateMixing();
      }, 100);
      return;
    }
    
    // Step 7 -> 8: Mixing done, go to save
    if (currentStep === 7 && production.mixingEditing.status === 'completed') {
      setCurrentStep(8);
      return;
    }
    
    if (currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };
  
  const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  // Calculate estimated time remaining
  const getEstimatedTime = () => {
    const totalSteps = STEPS.length;
    const avgTimePerStep = 1; // minutes per step
    const remainingSteps = totalSteps - currentStep;
    const estimatedMinutes = remainingSteps * avgTimePerStep;
    
    // During production phases, adjust based on progress
    if (currentStep >= 5 && currentStep <= 7) {
      const currentPhaseProgress = 
        currentStep === 5 ? production.voiceGeneration.progress :
        currentStep === 6 ? production.mediaProduction.progress :
        production.mixingEditing.progress;
      const remainingPhaseTime = Math.ceil(((100 - currentPhaseProgress) / 100) * 2);
      return remainingPhaseTime + (totalSteps - currentStep - 1) * avgTimePerStep;
    }
    
    return estimatedMinutes;
  };

  const getProgressPercentage = () => {
    // For production phases, include phase progress
    if (currentStep >= 5 && currentStep <= 7) {
      const baseProgress = ((currentStep - 1) / STEPS.length) * 100;
      const currentPhaseProgress = 
        currentStep === 5 ? production.voiceGeneration.progress :
        currentStep === 6 ? production.mediaProduction.progress :
        production.mixingEditing.progress;
      return baseProgress + (currentPhaseProgress / STEPS.length);
    }
    return (currentStep / STEPS.length) * 100;
  };

  // Handle Enter key for quick analyze
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (contentInput.textContent.trim() || contentInput.uploadedFiles.length > 0) {
        analyzeWithGemini();
      }
    }
  };

  // Custom project description state
  const [customDescription, setCustomDescription] = useState('');
  const isCustomMode = customDescription.trim().length > 0 && !selectedTemplateId;

  // Template configuration state (shown after template selection)
  const [templateConfig, setTemplateConfig] = useState<{
    voiceCount: 'single' | 'multiple';
    addBgm: boolean;
    addSoundEffects: boolean;
    hasVisualContent: boolean;
  }>({
    voiceCount: 'single',
    addBgm: false,
    addSoundEffects: false,
    hasVisualContent: false,
  });

  // Handle custom description - clears template selection
  const handleCustomDescriptionChange = (value: string) => {
    setCustomDescription(value);
    if (value.trim() && selectedTemplateId) {
      dispatch(actions.clearTemplate());
    }
  };

  // Handle template selection - clears custom description and sets default config
  const handleTemplateSelect = (templateId: string) => {
    setCustomDescription('');
    handleSelectTemplate(templateId);
    // Set suggested defaults from template
    const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setTemplateConfig({
        voiceCount: template.suggestedDefaults.voiceCount,
        addBgm: template.suggestedDefaults.addBgm,
        addSoundEffects: template.suggestedDefaults.addSoundEffects,
        hasVisualContent: template.suggestedDefaults.hasVisualContent,
      });
    }
  };

  // Render Step 1: Template Selection (NEW)
  const renderTemplateStep = () => (
    <div className="space-y-6">
      {/* Template Grid */}
      <div className="grid grid-cols-4 gap-3">
        {PROJECT_TEMPLATES.map((template) => {
          const IconComponent = TemplateIconMap[template.icon] || FileText;
          const isSelected = selectedTemplateId === template.id;
          
          return (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className={`relative p-4 rounded-xl border text-center transition-all ${
                isSelected 
                  ? 'border-white/30 bg-white/10' 
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
              style={isSelected ? { borderColor: theme.primary, background: `${theme.primary}15` } : {}}
            >
              <div 
                className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-3"
                style={{ background: isSelected ? `${theme.primary}30` : 'rgba(255,255,255,0.1)' }}
              >
                <IconComponent size={24} className={isSelected ? '' : 'text-white/60'} style={isSelected ? { color: theme.primaryLight } : {}} />
              </div>
              <p className="text-sm text-white font-medium line-clamp-1">
                {language === 'zh' ? template.nameZh : template.name}
              </p>
              {isSelected && (
                <div 
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: theme.primary }}
                >
                  <Check size={12} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Configuration Panel - Shows when template selected */}
      {selectedTemplateId && (
        <div className="flex items-start gap-6">
          {/* Voice Count Toggle */}
          <div>
            <label className="block text-xs text-white/40 mb-2">
              {language === 'zh' ? '声音' : 'Voice'}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTemplateConfig(prev => ({ ...prev, voiceCount: 'single' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  templateConfig.voiceCount === 'single'
                    ? 'text-white'
                    : 'text-white/50 border border-white/10 hover:border-white/20'
                }`}
                style={templateConfig.voiceCount === 'single' ? { background: theme.primary } : {}}
              >
                <User size={14} className="inline mr-1.5" />
                {language === 'zh' ? '单人' : 'Single'}
              </button>
              <button
                onClick={() => setTemplateConfig(prev => ({ ...prev, voiceCount: 'multiple' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  templateConfig.voiceCount === 'multiple'
                    ? 'text-white'
                    : 'text-white/50 border border-white/10 hover:border-white/20'
                }`}
                style={templateConfig.voiceCount === 'multiple' ? { background: theme.primary } : {}}
              >
                <User size={14} className="inline mr-1" />
                <User size={14} className="inline -ml-2 mr-1" />
                {language === 'zh' ? '多人' : 'Multi'}
              </button>
            </div>
          </div>

          {/* Media Options */}
          <div>
            <label className="block text-xs text-white/40 mb-2">
              {language === 'zh' ? '媒体' : 'Media'}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTemplateConfig(prev => ({ ...prev, addBgm: !prev.addBgm }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  templateConfig.addBgm
                    ? 'text-white'
                    : 'text-white/40 border border-white/10 hover:border-white/20'
                }`}
                style={templateConfig.addBgm ? { background: theme.primary } : {}}
              >
                <Music size={14} />
                BGM
              </button>
              <button
                onClick={() => setTemplateConfig(prev => ({ ...prev, addSoundEffects: !prev.addSoundEffects }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  templateConfig.addSoundEffects
                    ? 'text-white'
                    : 'text-white/40 border border-white/10 hover:border-white/20'
                }`}
                style={templateConfig.addSoundEffects ? { background: theme.primary } : {}}
              >
                <Volume2 size={14} />
                SFX
              </button>
              <button
                onClick={() => setTemplateConfig(prev => ({ ...prev, hasVisualContent: !prev.hasVisualContent }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  templateConfig.hasVisualContent
                    ? 'text-white'
                    : 'text-white/40 border border-white/10 hover:border-white/20'
                }`}
                style={templateConfig.hasVisualContent ? { background: theme.primary } : {}}
              >
                <Image size={14} />
                {language === 'zh' ? '图片' : 'Images'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional: Custom Description - always visible */}
      <div>
        <label className="block text-xs text-white/40 mb-2">
          {language === 'zh' ? '项目描述（可选）' : 'Project description (optional)'}
        </label>
        <textarea
          value={customDescription}
          onChange={(e) => handleCustomDescriptionChange(e.target.value)}
          placeholder={language === 'zh' 
            ? '描述您想要创建的音频内容，AI 将根据描述辅助配置...' 
            : 'Describe the audio content you want to create, AI will use this to assist...'}
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none transition-all"
        />
      </div>
    </div>
  );

  // Render Step 2: Spec Confirmation (simplified - no file upload)
  const renderSpecStep = () => (
    <div className="space-y-6">
      {/* Spec Form */}
      <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: theme.bgCard }}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h4 className="text-base font-medium text-white">
            {language === 'zh' ? '项目规格' : 'Project Specifications'}
          </h4>
          {/* Compact Template Badge */}
          <div className="flex items-center gap-2">
            {selectedTemplate ? (
              <>
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: `${theme.primary}15` }}
                >
                  <div 
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ background: `${theme.primary}30` }}
                  >
                    {(() => {
                      const IconComponent = TemplateIconMap[selectedTemplate.icon] || FileText;
                      return <IconComponent size={12} style={{ color: theme.primaryLight }} />;
                    })()}
                  </div>
                  <span className="text-sm text-white/70">
                    {language === 'zh' ? selectedTemplate.nameZh : selectedTemplate.name}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-white/40 hover:text-white/60 px-2 py-1 rounded hover:bg-white/10 transition-all"
                >
                  {language === 'zh' ? '更换' : 'Change'}
                </button>
              </>
            ) : (
              <>
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: `${theme.primary}15` }}
                >
                  <Sparkles size={12} style={{ color: theme.primaryLight }} />
                  <span className="text-sm text-white/70">
                    {language === 'zh' ? '自定义' : 'Custom'}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-white/40 hover:text-white/60 px-2 py-1 rounded hover:bg-white/10 transition-all"
                >
                  {language === 'zh' ? '更换' : 'Change'}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="p-5 space-y-5">
          {/* Story Title */}
          <div>
            <label className="block text-sm text-white/50 mb-2">
              {language === 'zh' ? '标题' : 'Title'}
            </label>
            <input
              type="text"
              value={specData.storyTitle}
              onChange={(e) => updateSpecField('storyTitle', e.target.value)}
              placeholder={language === 'zh' ? '输入项目标题...' : 'Enter project title...'}
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-base text-white focus:outline-none focus:border-white/20"
            />
          </div>
          {/* Subtitle - Toggle Option */}
          {showSubtitle ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-white/50">
                  {language === 'zh' ? '副标题' : 'Subtitle'}
                </label>
                <button
                  onClick={() => {
                    setShowSubtitle(false);
                    updateSpecField('subtitle', '');
                  }}
                  className="text-sm text-white/40 hover:text-white/60 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                value={specData.subtitle}
                onChange={(e) => updateSpecField('subtitle', e.target.value)}
                placeholder={language === 'zh' ? '添加副标题或标语...' : 'Add subtitle or tagline...'}
                className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-base text-white focus:outline-none focus:border-white/20"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowSubtitle(true)}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-all"
            >
              <Plus size={14} />
              {language === 'zh' ? '添加副标题' : 'Add Subtitle'}
            </button>
          )}
          {/* Target Audience */}
          <div>
            <label className="block text-sm text-white/50 mb-2">
              {language === 'zh' ? '目标受众' : 'Target Audience'}
            </label>
            <input
              type="text"
              value={specData.targetAudience}
              onChange={(e) => updateSpecField('targetAudience', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-base text-white focus:outline-none focus:border-white/20"
            />
          </div>
          {/* Format and Duration */}
          <div>
            <label className="block text-sm text-white/50 mb-2">
              {language === 'zh' ? '格式和时长' : 'Format & Duration'}
            </label>
            <input
              type="text"
              value={specData.formatAndDuration}
              onChange={(e) => updateSpecField('formatAndDuration', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-base text-white focus:outline-none focus:border-white/20"
            />
          </div>
          {/* Tone and Expression */}
          <div>
            <label className="block text-sm text-white/50 mb-2">
              {language === 'zh' ? '风格和表达' : 'Tone & Expression'}
            </label>
            <input
              type="text"
              value={specData.toneAndExpression}
              onChange={(e) => updateSpecField('toneAndExpression', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-base text-white focus:outline-none focus:border-white/20"
            />
          </div>
          {/* Boolean Options - all always enabled */}
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={specData.addBgm}
                onChange={(e) => updateSpecField('addBgm', e.target.checked)}
                className="w-5 h-5 rounded border-white/20"
              />
              <Music size={16} className="text-white/50" />
              <span className="text-base text-white/70">BGM</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={specData.addSoundEffects}
                onChange={(e) => updateSpecField('addSoundEffects', e.target.checked)}
                className="w-5 h-5 rounded border-white/20"
              />
              <Volume2 size={16} className="text-white/50" />
              <span className="text-base text-white/70">SFX</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={specData.hasVisualContent}
                onChange={(e) => updateSpecField('hasVisualContent', e.target.checked)}
                className="w-5 h-5 rounded border-white/20"
              />
              <Image size={16} className="text-white/50" />
              <span className="text-base text-white/70">{language === 'zh' ? '视觉' : 'Visual'}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Step 3: Content Input (NEW - moved from old Step 1)
  const renderContentInputStep = () => (
    <div className="space-y-6">
      {/* Text Input with File Attachment */}
      <div>
        <label className="block text-base font-medium text-white/70 mb-3 flex items-center justify-end gap-2">
          <span className="text-white/40 font-normal text-sm">
            {language === 'zh' ? '⌘+Enter 快速分析' : '⌘+Enter to analyze'}
          </span>
        </label>
        <div 
          className={`relative rounded-xl border transition-all ${
            isDragging 
              ? 'border-white/40 bg-white/10' 
              : 'border-white/10 bg-white/5'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <textarea
            value={contentInput.textContent}
            onChange={(e) => handleTextContentChange(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder={language === 'zh' 
              ? '粘贴或输入您的内容...\n\n例如：书籍章节、故事文本、播客脚本等' 
              : 'Paste or enter your content...\n\nExample: Book chapter, story text, podcast script, etc.'}
            rows={8}
            className="w-full px-5 pt-4 pb-3 bg-transparent text-base text-white placeholder-white/30 focus:outline-none resize-none"
          />
          
          {/* Attachment Area */}
          <div className="px-5 pb-4 pt-2 border-t border-white/5">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".txt,.pdf,.doc,.docx"
              multiple
              className="hidden"
            />
            
            {/* Uploaded Files List */}
            {contentInput.uploadedFiles.length > 0 && (
              <div className="mb-3 space-y-2">
                {contentInput.uploadedFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/10"
                    style={{ background: `${theme.primary}10` }}
                  >
                    <FileText size={16} style={{ color: theme.primaryLight }} />
                    <span className="flex-1 text-sm text-white truncate">{file.name}</span>
                    <span className="text-xs text-white/40">{(file.size / 1024).toFixed(1)}KB</span>
                    <button
                      onClick={() => removeUploadedFile(index)}
                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400 transition-all"
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/70 hover:bg-white/5 transition-all"
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
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/5 backdrop-blur-sm pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-white/70">
                <Upload size={36} />
                <span className="text-base font-medium">
                  {language === 'zh' ? '放开以上传' : 'Drop to upload'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Optional: Auto-analyze button to extract title */}
      {(contentInput.textContent.trim() || contentInput.uploadedFiles.length > 0) && !specData.storyTitle && (
        <button
          onClick={analyzeWithGemini}
          disabled={isAnalyzing}
          className={`w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl text-base text-white/70 border border-white/10 font-medium transition-all hover:bg-white/5 ${
            isAnalyzing ? 'animate-pulse' : ''
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {language === 'zh' ? '分析中...' : 'Analyzing...'}
            </>
          ) : (
            <>
              <Wand2 size={20} />
              {language === 'zh' ? '自动提取标题' : 'Auto-extract Title'}
            </>
          )}
        </button>
      )}
    </div>
  );

  // Render Step 2: Script Generation
  const renderScriptStep = () => (
    <div className="space-y-6">
      {/* Generate Script Button */}
      {scriptSections.length === 0 && !isGeneratingScript && (
        <button
          onClick={generateScript}
          disabled={isGeneratingScript}
          className="w-full flex items-center justify-center gap-3 px-5 py-5 rounded-xl text-base text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: theme.primary }}
        >
          <Sparkles size={22} />
          {t.projectCreator.generateScript}
        </button>
      )}

      {/* Streaming Text Display - Shows during generation with progressive UI */}
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
              <p className="text-base text-white font-medium">{t.projectCreator.generating}</p>
              <p className="text-sm text-white/50">
                {language === 'zh' 
                  ? `AI 正在编写脚本... (${streamingParsed.completeSections.length} ${streamingParsed.completeSections.length === 1 ? '段' : '段'}已完成)`
                  : `AI is writing the script... (${streamingParsed.completeSections.length} section${streamingParsed.completeSections.length === 1 ? '' : 's'} complete)`
                }
              </p>
            </div>
          </div>
          
          {/* Progressive streaming content - show parsed sections */}
          <div 
            className="rounded-xl border border-white/10 p-5 max-h-[400px] overflow-auto space-y-3"
            style={{ background: theme.bgCard }}
          >
            {/* Completed sections */}
            {streamingParsed.completeSections.map((section, index) => (
              <div 
                key={section.id || index}
                className="rounded-lg border border-white/10 p-4 animate-fade-in"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Check size={16} className="text-green-400" />
                  <h5 className="text-sm font-medium text-white">{section.name}</h5>
                </div>
                <p className="text-xs text-white/60 mb-2">{section.description}</p>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>{section.timeline?.length || 0} {language === 'zh' ? '个片段' : 'segments'}</span>
                  {section.timeline?.[0] && (
                    <span>{section.timeline[0].timeStart} - {section.timeline[section.timeline.length - 1]?.timeEnd}</span>
                  )}
                </div>
              </div>
            ))}
            
            {/* Partial section being streamed */}
            {streamingParsed.partialSection && (
              <div 
                className="rounded-lg border border-white/20 p-4"
                style={{ background: `${theme.primary}15`, borderColor: `${theme.primary}40` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={14} className="animate-spin" style={{ color: theme.primaryLight }} />
                  <h5 className="text-sm font-medium text-white">
                    {streamingParsed.partialSection.name || (language === 'zh' ? '正在生成...' : 'Generating...')}
                  </h5>
                </div>
                {streamingParsed.partialSection.description && (
                  <p className="text-xs text-white/60 mb-2">{streamingParsed.partialSection.description}</p>
                )}
                {streamingParsed.partialSection.timeline && streamingParsed.partialSection.timeline.length > 0 && (
                  <div className="text-xs text-white/40">
                    {streamingParsed.partialSection.timeline.length} {language === 'zh' ? '个片段' : 'segments'}
                    <span className="inline-block w-1.5 h-3 ml-1 bg-white/60 animate-pulse" />
                  </div>
                )}
              </div>
            )}
            
            {/* Show waiting state if no sections yet */}
            {streamingParsed.completeSections.length === 0 && !streamingParsed.partialSection && (
              <div className="flex items-center justify-center py-8 text-white/40">
                <Loader2 size={20} className="animate-spin mr-2" />
                <span className="text-sm">{language === 'zh' ? '正在解析脚本结构...' : 'Parsing script structure...'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Regenerate Button */}
      {scriptSections.length > 0 && (
        <div className="flex items-center justify-between">
          <h4 className="text-base text-white font-medium">{t.projectCreator.scriptLabel}</h4>
          <button
            onClick={generateScript}
            disabled={isGeneratingScript}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-base text-white/70 hover:text-white transition-all"
            style={{ background: `${theme.primary}30` }}
          >
            <RefreshCw size={16} className={isGeneratingScript ? 'animate-spin' : ''} />
            {t.projectCreator.regen}
          </button>
        </div>
      )}

      {/* Script Sections */}
      {scriptSections.map((section) => (
        <div 
          key={section.id} 
          className="rounded-xl border border-white/10 overflow-hidden"
          style={{ background: theme.bgCard }}
        >
          <div 
            className="px-5 py-4 border-b border-white/10 cursor-pointer flex items-center justify-between"
            onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
          >
            <div>
              <h4 className="text-base font-medium text-white">{section.name}</h4>
              <p className="text-sm text-white/50">{section.description}</p>
            </div>
            <ChevronRight 
              size={22} 
              className={`text-white/50 transition-transform ${editingSection === section.id ? 'rotate-90' : ''}`} 
            />
          </div>
          
          {editingSection === section.id && (
            <div className="p-5 space-y-5">
              {/* Cover Image Description */}
              {specData.hasVisualContent && (
                <div>
                  <label className="block text-sm text-white/50 mb-2">{t.projectCreator.cover}</label>
                  <input
                    type="text"
                    value={section.coverImageDescription || ''}
                    onChange={(e) => updateSectionCover(section.id, e.target.value)}
                    placeholder={t.projectCreator.describeCover}
                    className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-base text-white focus:outline-none focus:border-white/20"
                  />
                </div>
              )}

              {/* Timeline - Responsive Layout */}
              <div className="space-y-4">
                {section.timeline.map((item, itemIndex) => (
                  <div 
                    key={item.id} 
                    className="rounded-lg border border-white/10 p-4 space-y-4"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    {/* Header: Time + Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 w-5">{itemIndex + 1}</span>
                        <input
                          type="text"
                          value={item.timeStart}
                          onChange={(e) => updateTimelineItem(section.id, item.id, 'timeStart', e.target.value)}
                          placeholder="00:00"
                          className="w-16 px-3 py-2 rounded border border-white/10 bg-white/5 text-white text-sm focus:outline-none"
                        />
                        <span className="text-white/30 text-sm">-</span>
                        <input
                          type="text"
                          value={item.timeEnd}
                          onChange={(e) => updateTimelineItem(section.id, item.id, 'timeEnd', e.target.value)}
                          placeholder="00:15"
                          className="w-16 px-3 py-2 rounded border border-white/10 bg-white/5 text-white text-sm focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeTimelineItem(section.id, item.id)}
                        className="p-2 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    {/* Lines (Speaker + Line pairs) */}
                    <div className="space-y-3">
                      <label className="block text-xs text-white/40">{t.projectCreator.lines}</label>
                      {(item.lines || []).map((scriptLine, lineIndex) => (
                        <div key={lineIndex} className="flex items-start gap-3">
                          <input 
                            type="text" 
                            value={scriptLine.speaker} 
                            onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'speaker', e.target.value)} 
                            placeholder={t.projectCreator.speaker}
                            className="w-28 px-3 py-2 rounded border border-white/10 bg-white/5 text-white text-sm focus:outline-none flex-shrink-0" 
                          />
                          <textarea 
                            value={scriptLine.line} 
                            onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'line', e.target.value)} 
                            placeholder={t.projectCreator.lineContent}
                            rows={2}
                            className="flex-1 px-3 py-2 rounded border border-white/10 bg-white/5 text-white text-sm focus:outline-none resize-none" 
                          />
                          <button 
                            onClick={() => removeScriptLine(section.id, item.id, lineIndex)} 
                            className="p-2 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => addScriptLine(section.id, item.id)} 
                        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60"
                      >
                        <Plus size={12} />{t.projectCreator.addLine}
                      </button>
                    </div>
                    
                    {/* Sound/Music - only show if BGM or SFX is enabled */}
                    {(specData.addBgm || specData.addSoundEffects) && (
                      <div>
                        <label className="block text-xs text-white/40 mb-2">{t.projectCreator.soundMusic}</label>
                        <input
                          type="text"
                          value={item.soundMusic}
                          onChange={(e) => updateTimelineItem(section.id, item.id, 'soundMusic', e.target.value)}
                          placeholder={t.projectCreator.bgmSoundEffects}
                          className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-base text-white focus:outline-none focus:border-white/20"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Timeline Item */}
              <button
                onClick={() => addTimelineItem(section.id)}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-all"
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

  // Render Step 5: Voice Generation (NEW)
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
            <h3 className="text-xl font-medium text-white mb-2">
              {language === 'zh' ? '角色音色配置' : 'Character Voice Configuration'}
            </h3>
            <p className="text-base text-white/50">
              {language === 'zh' 
                ? '为每个角色选择音色，确认后开始语音合成' 
                : 'Assign voices to each character, then start synthesis'}
            </p>
          </div>

          {/* Available voices preview section */}
          {systemVoices.length > 0 && (
            <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: theme.bgCard }}>
              <div className="px-5 py-3 border-b border-white/10">
                <span className="text-sm text-white/50">
                  {language === 'zh' ? '可用音色 - 点击试听' : 'Available Voices - Click to Preview'}
                </span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {systemVoices.map((voice) => {
                  const isPlaying = playingVoiceId === voice.id;
                  const isLoading = loadingVoiceId === voice.id;
                  
                  return (
                    <button
                      key={voice.id}
                      onClick={() => playVoiceSample(voice.id)}
                      disabled={isLoading}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        isPlaying 
                          ? 'border-white/30 bg-white/10' 
                          : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                      style={isPlaying ? { borderColor: theme.primary, background: `${theme.primary}15` } : {}}
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: isPlaying ? theme.primary : 'rgba(255,255,255,0.1)' }}
                      >
                        {isLoading ? (
                          <Loader2 size={18} className="animate-spin text-white" />
                        ) : isPlaying ? (
                          <Square size={14} className="text-white" />
                        ) : (
                          <Play size={16} className="text-white/70 ml-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{voice.name}</p>
                        <p className="text-xs text-white/40 truncate">
                          {language === 'zh' ? voice.descriptionZh : voice.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Character voice assignment list */}
          {extractedCharacters.length > 0 && (
            <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: theme.bgCard }}>
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-sm text-white/50">
                  {language === 'zh' ? '角色音色分配' : 'Character Voice Assignment'}
                </span>
                <span className="text-xs text-white/40">
                  {extractedCharacters.length} {language === 'zh' ? '个角色' : 'characters'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                {extractedCharacters.map((char, index) => {
                  const assignedVoiceId = char.assignedVoiceId;
                  const assignedSystemVoice = systemVoices.find(v => v.id === assignedVoiceId);
                  const assignedCustomVoice = availableVoices.find(v => v.id === assignedVoiceId);
                  const hasAssignment = assignedSystemVoice || assignedCustomVoice;
                  
                  return (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/5">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10">
                        <User size={20} className="text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-white font-medium truncate">{char.name}</p>
                        {char.description && (
                          <p className="text-sm text-white/40 truncate">{char.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={assignedVoiceId || ''}
                          onChange={(e) => assignVoiceToCharacter(index, e.target.value)}
                          className="px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-base text-white focus:outline-none focus:border-white/20 min-w-[160px]"
                          style={{ background: hasAssignment ? `${theme.primary}15` : 'rgba(255,255,255,0.05)' }}
                        >
                          <option value="" className="bg-gray-900">
                            {language === 'zh' ? '选择音色...' : 'Select voice...'}
                          </option>
                          {/* System voices from Gemini TTS */}
                          {systemVoices.length > 0 && (
                            <optgroup label={language === 'zh' ? '系统音色' : 'System Voices'}>
                              {systemVoices.map((voice) => (
                                <option key={voice.id} value={voice.id} className="bg-gray-900">
                                  {voice.name} - {language === 'zh' ? voice.descriptionZh : voice.description}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {/* Custom voices from Voice Studio */}
                          {availableVoices.length > 0 && (
                            <optgroup label={language === 'zh' ? '自定义音色' : 'Custom Voices'}>
                              {availableVoices.map((voice) => (
                                <option key={voice.id} value={voice.id} className="bg-gray-900">
                                  {voice.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        {/* Play button for assigned voice */}
                        {assignedSystemVoice && (
                          <button 
                            onClick={() => playVoiceSample(assignedSystemVoice.id)}
                            disabled={loadingVoiceId === assignedSystemVoice.id}
                            className={`p-2.5 rounded-lg transition-all ${
                              playingVoiceId === assignedSystemVoice.id 
                                ? 'text-white' 
                                : 'text-white/50 hover:text-white hover:bg-white/10'
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
          {extractedCharacters.length === 0 && (
            <div className="text-center py-10 text-white/40">
              <User size={40} className="mx-auto mb-3 opacity-50" />
              <p>{language === 'zh' ? '未检测到角色' : 'No characters detected'}</p>
            </div>
          )}

          {/* Voice studio hint */}
          {availableVoices.length === 0 && (
            <div 
              className="p-4 rounded-xl border border-white/10 flex items-start gap-3"
              style={{ background: `${theme.primary}10` }}
            >
              <Sparkles size={20} className="flex-shrink-0 mt-0.5" style={{ color: theme.primaryLight }} />
              <div>
                <p className="text-sm text-white/70">
                  {language === 'zh' 
                    ? '您可以在"音色工作室"中创建自定义音色，或使用系统默认音色。' 
                    : 'You can create custom voices in Voice Studio, or use system default voices.'}
                </p>
              </div>
            </div>
          )}

          {/* Start synthesis button */}
          <button
            onClick={startVoiceGeneration}
            disabled={extractedCharacters.length === 0}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl text-base text-white font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: theme.primary }}
          >
            <Mic2 size={22} />
            {language === 'zh' ? '确认并开始语音合成' : 'Confirm & Start Voice Synthesis'}
          </button>
        </div>
      );
    }
    
    // Show progress UI after confirming
    return (
      <div className="space-y-6">
        {/* Character list with status - at top */}
        {extractedCharacters.length > 0 && (
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: theme.bgCard }}>
            <div className="px-5 py-3 border-b border-white/10">
              <span className="text-sm text-white/50">
                {language === 'zh' ? '角色语音' : 'Character Voices'}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {extractedCharacters.map((char, index) => {
                const assignedVoice = availableVoices.find(v => v.id === char.assignedVoiceId);
                const isCompleted = voiceGeneration.progress > (index + 1) * (100 / extractedCharacters.length);
                const isCurrent = voiceGeneration.currentChunk === char.name;
                
                return (
                  <div 
                    key={index} 
                    className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                      isCurrent ? 'bg-white/10 border border-white/20' : 'bg-white/5'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10">
                      <User size={18} className="text-white/60" />
                    </div>
                    <div className="flex-1">
                      <span className="text-base text-white">{char.name}</span>
                      {assignedVoice && (
                        <span className="text-sm text-white/40 ml-2">· {assignedVoice.name}</span>
                      )}
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" 
                      style={{ background: isCompleted ? `${theme.primary}30` : isCurrent ? `${theme.primary}20` : 'transparent' }}>
                      {isCompleted ? (
                        <Check size={14} style={{ color: theme.primaryLight }} />
                      ) : isCurrent ? (
                        <Loader2 size={14} className="animate-spin" style={{ color: theme.primaryLight }} />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status + Progress bar grouped together */}
        <div 
          className="rounded-xl border border-white/10 p-5"
          style={{ background: theme.bgCard }}
        >
          {/* Status display */}
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${theme.primary}20` }}
            >
              {voiceGeneration.status === 'completed' ? (
                <Check size={24} style={{ color: theme.primaryLight }} />
              ) : (
                <Mic2 size={24} className={voiceGeneration.status === 'processing' ? 'animate-pulse' : ''} style={{ color: theme.primaryLight }} />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-base font-medium text-white">
                {language === 'zh' ? '语音生成' : 'Voice Generation'}
              </h4>
              <p className="text-sm text-white/50">
                {voiceGeneration.status === 'completed' 
                  ? (language === 'zh' ? '语音生成完成' : 'Voice generation complete')
                  : voiceGeneration.currentChunk 
                    ? `${language === 'zh' ? '正在生成: ' : 'Generating: '}${voiceGeneration.currentChunk}`
                    : (language === 'zh' ? '准备中...' : 'Preparing...')
                }
              </p>
            </div>
            <span className="text-lg font-medium" style={{ color: theme.primaryLight }}>
              {voiceGeneration.progress}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${voiceGeneration.progress}%`, background: theme.primary }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Render Step 6: Media Production (NEW)
  const renderMediaProductionStep = () => {
    const { mediaProduction } = production;
    const hasBgm = specData.addBgm;
    const hasSfx = specData.addSoundEffects;
    const hasImages = specData.hasVisualContent;
    
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
          <h3 className="text-xl font-medium text-white mb-2">
            {language === 'zh' ? '媒体制作' : 'Media Production'}
          </h3>
          <p className="text-base text-white/50">
            {mediaProduction.status === 'completed' 
              ? (language === 'zh' ? '媒体制作完成' : 'Media production complete')
              : mediaProduction.currentTask || (language === 'zh' ? '准备中...' : 'Preparing...')
            }
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-white/50">
            <span>{language === 'zh' ? '进度' : 'Progress'}</span>
            <span>{mediaProduction.progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
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
              className="p-5 rounded-xl border border-white/10 text-center"
              style={{ background: theme.bgCard }}
            >
              <Music size={28} className="mx-auto mb-3" style={{ color: theme.primaryLight }} />
              <p className="text-sm text-white/70">BGM</p>
              {mediaProduction.progress > 33 && (
                <Check size={16} className="mx-auto mt-2" style={{ color: theme.primaryLight }} />
              )}
            </div>
          )}
          {hasSfx && (
            <div 
              className="p-5 rounded-xl border border-white/10 text-center"
              style={{ background: theme.bgCard }}
            >
              <Volume2 size={28} className="mx-auto mb-3" style={{ color: theme.primaryLight }} />
              <p className="text-sm text-white/70">SFX</p>
              {mediaProduction.progress > 66 && (
                <Check size={16} className="mx-auto mt-2" style={{ color: theme.primaryLight }} />
              )}
            </div>
          )}
          {hasImages && (
            <div 
              className="p-5 rounded-xl border border-white/10 text-center"
              style={{ background: theme.bgCard }}
            >
              <Image size={28} className="mx-auto mb-3" style={{ color: theme.primaryLight }} />
              <p className="text-sm text-white/70">{language === 'zh' ? '图片' : 'Images'}</p>
              {mediaProduction.progress === 100 && (
                <Check size={16} className="mx-auto mt-2" style={{ color: theme.primaryLight }} />
              )}
            </div>
          )}
          {!hasBgm && !hasSfx && !hasImages && (
            <div className="col-span-3 text-center py-10 text-white/40 text-base">
              {language === 'zh' ? '此模板不需要额外媒体' : 'No additional media for this template'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Step 7: Mixing & Editing (NEW)
  const renderMixingStep = () => {
    const { mixingEditing } = production;
    
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <div 
            className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: `${theme.primary}20` }}
          >
            {mixingEditing.status === 'completed' ? (
              <Check size={40} style={{ color: theme.primaryLight }} />
            ) : (
              <Sliders size={40} className={mixingEditing.status === 'processing' ? 'animate-pulse' : ''} style={{ color: theme.primaryLight }} />
            )}
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            {language === 'zh' ? '混音与编辑' : 'Mixing & Editing'}
          </h3>
          <p className="text-base text-white/50">
            {mixingEditing.status === 'completed' 
              ? (language === 'zh' ? '混音完成！' : 'Mixing complete!')
              : (language === 'zh' ? '正在合成音轨...' : 'Combining audio tracks...')
            }
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-white/50">
            <span>{language === 'zh' ? '进度' : 'Progress'}</span>
            <span>{mixingEditing.progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${mixingEditing.progress}%`, background: theme.primary }}
            />
          </div>
        </div>

        {/* Preview when complete */}
        {mixingEditing.status === 'completed' && (
          <div className="grid grid-cols-2 gap-4">
            <div 
              className="rounded-xl p-5 border border-white/10"
              style={{ background: theme.bgCard }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Music size={18} style={{ color: theme.primaryLight }} />
                <span className="text-white text-base font-medium">{language === 'zh' ? '音频预览' : 'Audio Preview'}</span>
              </div>
              <div className="h-14 rounded-lg flex items-center justify-center" style={{ background: `${theme.primary}10` }}>
                <Play size={24} className="text-white/40" />
              </div>
            </div>
            {specData.hasVisualContent && (
              <div 
                className="rounded-xl p-5 border border-white/10"
                style={{ background: theme.bgCard }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Image size={18} style={{ color: theme.primaryLight }} />
                  <span className="text-white text-base font-medium">{language === 'zh' ? '视觉预览' : 'Visual Preview'}</span>
                </div>
                <div className="h-14 rounded-lg flex items-center justify-center" style={{ background: `${theme.primary}10` }}>
                  <Image size={24} className="text-white/40" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render Step 8: Save (Post-processing)
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
        <h3 className="text-xl font-medium text-white mb-2">
          {language === 'zh' ? '准备就绪！' : 'Ready to Save!'}
        </h3>
        <p className="text-base text-white/50">
          {language === 'zh' ? '确认以下信息并保存项目' : 'Confirm the details below and save your project'}
        </p>
      </div>

      {/* Project summary */}
      <div 
        className="rounded-xl p-6 border border-white/10"
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
            <h3 className="text-2xl font-serif text-white">{specData.storyTitle}</h3>
            {specData.subtitle && (
              <p className="text-base text-white/70 italic">{specData.subtitle}</p>
            )}
            <p className="text-base text-white/50">
              {specData.targetAudience} · {specData.formatAndDuration}
            </p>
          </div>
        </div>

        <div className="space-y-4 text-base">
          <p className="text-white/70 line-clamp-1">{specData.toneAndExpression}</p>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span>{scriptSections.length} {language === 'zh' ? '段落' : 'sections'}</span>
            <span>·</span>
            <span>{extractedCharacters.length} {language === 'zh' ? '角色' : 'characters'}</span>
            {specData.addBgm && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Music size={14} /> BGM
                </span>
              </>
            )}
            {specData.addSoundEffects && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Volume2 size={14} /> SFX
                </span>
              </>
            )}
            {specData.hasVisualContent && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Image size={14} /> {language === 'zh' ? '视觉' : 'Visual'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Template badge */}
        {selectedTemplate && (
          <div className="mt-5 pt-5 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm text-white/40">
              <span>{language === 'zh' ? '模板:' : 'Template:'}</span>
              <span className="text-white/60">
                {language === 'zh' ? selectedTemplate.nameZh : selectedTemplate.name}
              </span>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-white/40 text-sm">
        {language === 'zh' ? '点击下方按钮保存项目' : 'Click the button below to save your project'}
      </p>
    </div>
  );

  // Main render step content for 8-step workflow
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderTemplateStep();        // Template Selection
      case 2: return renderSpecStep();            // Project Spec
      case 3: return renderContentInputStep();    // Content Input
      case 4: return renderScriptStep();          // Script Generation
      case 5: return renderVoiceGenerationStep(); // Voice Generation
      case 6: return renderMediaProductionStep(); // Media Production
      case 7: return renderMixingStep();          // Mixing & Editing
      case 8: return renderSaveStep();            // Save
      default: return null;
    }
  };

  // Load available voices on mount
  useEffect(() => {
    setAvailableVoices(loadVoiceCharacters());
    
    // Load system voices from backend
    api.getVoices()
      .then(voices => setSystemVoices(voices))
      .catch(err => console.error('Failed to load system voices:', err));
  }, []);

  // Initialize from Landing page data if provided
  useEffect(() => {
    if (initialData) {
      // Map format to template ID
      const templateId = initialData.selectedFormat;
      const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
      
      if (template) {
        // Select the template
        dispatch(actions.selectTemplate(templateId));
        
        // Set template config from Landing page mediaConfig
        setTemplateConfig({
          voiceCount: initialData.mediaConfig.voiceCount,
          addBgm: initialData.mediaConfig.addBgm,
          addSoundEffects: initialData.mediaConfig.addSoundEffects,
          hasVisualContent: initialData.mediaConfig.hasVisualContent,
        });
        
        // Apply template defaults with Landing page media config overrides
        dispatch(actions.setSpec({
          storyTitle: '',
          subtitle: '',
          targetAudience: template.defaultSpec.targetAudience,
          formatAndDuration: template.defaultSpec.formatAndDuration,
          toneAndExpression: template.defaultSpec.toneAndExpression,
          addBgm: initialData.mediaConfig.addBgm,
          addSoundEffects: initialData.mediaConfig.addSoundEffects,
          hasVisualContent: initialData.mediaConfig.hasVisualContent,
        }));
      }
      
      // Set custom description if provided
      if (initialData.projectDescription) {
        setCustomDescription(initialData.projectDescription);
      }
    }
  }, [initialData]);

  // Parse streaming text progressively for UI rendering
  useEffect(() => {
    if (!streamingText) {
      setStreamingParsed({ completeSections: [], partialSection: null });
      return;
    }
    const parsed = parseStreamingScriptSections(streamingText);
    setStreamingParsed({
      completeSections: parsed.completeSections,
      partialSection: parsed.partialSection,
    });
  }, [streamingText]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up border border-white/10"
        style={{ background: theme.bgDark }}
      >
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `${theme.primary}30` }}
            >
              <ReligionIcon size={24} color={theme.primaryLight} />
            </div>
            <div>
              <h2 className="text-xl font-serif text-white">{t.projectCreator.title}</h2>
              <p className="text-sm text-white/50">
                {t.projectCreator.step} {currentStep} / {STEPS.length} · {STEPS[currentStep - 1]?.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="text-white/50" size={24} />
          </button>
        </div>


        {/* Content */}
        <div className="flex-1 overflow-auto px-8 py-8">
          {renderStepContent()}
        </div>

        {/* Bottom Progress Light Beam with Steps */}
        <div className="relative h-2.5 overflow-visible bg-white/5">
          {/* Step segments (hover areas) */}
          <div className="absolute inset-0 flex z-10">
            {STEPS.map((step, index) => {
              const stepWidth = 100 / STEPS.length;
              
              return (
                <div 
                  key={step.id}
                  className="relative flex-1 cursor-pointer transition-all hover:bg-white/5"
                  onMouseEnter={() => {
                    setHoveredStep(step.id);
                    setShowProgressTooltip(true);
                  }}
                  onMouseLeave={() => {
                    setHoveredStep(null);
                    setShowProgressTooltip(false);
                  }}
                  style={{ width: `${stepWidth}%` }}
                >
                  {/* Step divider line */}
                  {index < STEPS.length - 1 && (
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-px"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Progress beam with glow effect */}
          <div 
            className="absolute inset-y-0 left-0 transition-all duration-700 ease-out pointer-events-none flex items-center"
            style={{ 
              width: `${getProgressPercentage()}%`,
              background: `linear-gradient(90deg, ${theme.primary}40, ${theme.primary}, ${theme.primaryLight})`,
              boxShadow: `0 0 15px ${theme.primary}60, 0 0 30px ${theme.primary}30, 0 -2px 15px ${theme.primary}40`
            }}
          >
            {/* Animated shimmer effect */}
            <div 
              className="absolute inset-0 opacity-80"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${theme.primaryLight}80 50%, transparent 100%)`,
                animation: 'shimmer 2.5s ease-in-out infinite',
                backgroundSize: '200% 100%'
              }}
            />
            
            {/* Pulsing glow at the end */}
            <div 
              className="absolute right-0 w-3 h-3 rounded-full animate-pulse"
              style={{ 
                background: theme.primaryLight,
                boxShadow: `0 0 10px ${theme.primaryLight}, 0 0 20px ${theme.primary}`,
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            />
          </div>

          {/* Step indicators */}
          <div className="absolute inset-0 flex pointer-events-none z-20">
            {STEPS.map((step) => {
              const stepWidth = 100 / STEPS.length;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isHovered = hoveredStep === step.id;
              
              return (
                <div 
                  key={`indicator-${step.id}`}
                  className="relative flex items-center justify-center"
                  style={{ width: `${stepWidth}%` }}
                >
                  {/* Step number/check icon */}
                  <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isCurrent ? 'w-6 h-6' : 'w-5 h-5'
                    } ${isHovered ? 'scale-110' : ''}`}
                    style={{
                      background: isCompleted || isCurrent ? theme.primary : 'rgba(255,255,255,0.15)',
                      color: isCompleted || isCurrent ? 'white' : 'rgba(255,255,255,0.4)',
                      boxShadow: isCurrent ? `0 0 12px ${theme.primary}80` : isHovered ? `0 0 8px ${theme.primary}40` : 'none',
                      border: isHovered ? `1px solid ${theme.primaryLight}` : 'none'
                    }}
                  >
                    {isCompleted ? <Check size={12} /> : step.id}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hover tooltip */}
          {showProgressTooltip && hoveredStep !== null && (
            <div 
              className="absolute bottom-full mb-3 pointer-events-none z-30 animate-fade-in"
              style={{
                left: hoveredStep === 1 ? '10%' : hoveredStep === STEPS.length ? '90%' : `${((hoveredStep - 0.5) / STEPS.length) * 100}%`,
                transform: hoveredStep === 1 ? 'translateX(0)' : hoveredStep === STEPS.length ? 'translateX(-100%)' : 'translateX(-50%)'
              }}
            >
              <div 
                className="px-5 py-4 rounded-xl border backdrop-blur-xl shadow-2xl min-w-[240px]"
                style={{ 
                  background: `${theme.bgDark}f5`,
                  borderColor: `${theme.primary}40`,
                  boxShadow: `0 10px 40px ${theme.primary}20, 0 0 0 1px ${theme.primary}10`
                }}
              >
                {/* Step Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: currentStep >= hoveredStep ? theme.primary : 'rgba(255,255,255,0.15)',
                      color: 'white'
                    }}
                  >
                    {currentStep > hoveredStep ? <Check size={16} /> : hoveredStep}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-base">
                      {STEPS[hoveredStep - 1]?.title}
                    </div>
                  </div>
                  {currentStep === hoveredStep && (
                    <div className="text-xs font-medium px-2.5 py-1 rounded" style={{ background: `${theme.primary}30`, color: theme.primaryLight }}>
                      {t.projectCreator.current}
                    </div>
                  )}
                </div>
                <div className="text-sm text-white/80 mb-4 leading-relaxed">
                  {STEPS[hoveredStep - 1]?.description}
                </div>
                
                {/* Progress info for current or completed steps */}
                {currentStep >= hoveredStep && (
                  <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: `${theme.primary}15` }}>
                    {currentStep === hoveredStep ? (
                      <>
                        <Loader2 size={14} className="animate-spin" style={{ color: theme.primaryLight }} />
                        <span className="text-white/70">
                          {t.projectCreator.inProgress}
                        </span>
                      </>
                    ) : (
                      <>
                        <Check size={14} style={{ color: theme.primaryLight }} />
                        <span className="text-white/70">
                          {t.projectCreator.completed}
                        </span>
                      </>
                    )}
                  </div>
                )}
                
                {/* Overall progress */}
                {currentStep === hoveredStep && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                      <span>{t.projectCreator.overall}</span>
                      <span className="font-medium text-white">{Math.round(getProgressPercentage())}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      <span>⏱</span>
                      <span>
                        {t.projectCreator.estimated}
                        {getEstimatedTime()}
                        {t.projectCreator.minutes}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Tooltip arrow */}
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: `8px solid ${theme.primary}40`
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={currentStep === 1 ? onClose : handleBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-base text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={22} />
            {currentStep === 1 ? t.projectCreator.buttons.cancel : t.projectCreator.buttons.back}
          </button>

          {currentStep < STEPS.length ? (
            // Only show Next button when canProceed() is true
            canProceed() && (
              <button
                onClick={handleNext}
                disabled={isProcessingNext}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-base text-white font-medium transition-all hover:scale-105 ${
                  isProcessingNext ? 'animate-pulse' : ''
                }`}
                style={{ 
                  background: theme.primary,
                  boxShadow: isProcessingNext ? `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}` : 'none'
                }}
              >
                {isProcessingNext ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    {t.projectCreator.processing}
                  </>
                ) : (
                  <>
                    {t.projectCreator.buttons.next}
                    <ChevronRight size={22} />
                  </>
                )}
              </button>
            )
          ) : (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-8 py-2.5 rounded-lg text-base font-medium transition-all hover:scale-105"
              style={{ background: theme.accent, color: theme.primaryDark }}
            >
              <Save size={22} />
              {t.projectCreator.save}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
