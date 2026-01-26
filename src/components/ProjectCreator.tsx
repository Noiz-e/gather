import { useState, useRef, useCallback, useEffect, useReducer } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { VoiceCharacter, ScriptSection, EpisodeCharacter } from '../types';
import { 
  ChevronLeft, ChevronRight, Check, X, Upload, FileText, 
  Sparkles, Edit2, Plus, Trash2, Play, User, Loader2,
  Music, Volume2, Image, RefreshCw, Save
} from 'lucide-react';
import { ReligionIconMap } from './icons/ReligionIcons';
import { GeminiApiKeyDialog } from './GeminiApiKeyDialog';
import { filterValidFiles, collectAnalysisContent } from '../utils/fileUtils';
import { llm, LLMError } from '../services/llm';
import { 
  buildSpecAnalysisPrompt, 
  buildScriptGenerationPrompt,
  SpecAnalysisResult
} from '../services/llm/prompts';
import { 
  projectCreatorReducer, 
  initialState, 
  actions,
  SpecData
} from './ProjectCreator/reducer';
import { loadVoiceCharacters } from '../utils/voiceStorage';

interface ProjectCreatorProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ProjectCreator({ onClose, onSuccess }: ProjectCreatorProps) {
  const { theme, religion } = useTheme();
  const { createProject } = useProjects();
  const { t, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Unified state management with reducer
  const [state, dispatch] = useReducer(projectCreatorReducer, initialState);
  const { spec: specData, scriptSections, characters: extractedCharacters } = state;
  
  // Step 1: Spec Confirmation
  const [textInput, setTextInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  
  // Step 2: Script Generation
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
  // Step 3: Character Extraction
  const [availableVoices, setAvailableVoices] = useState<VoiceCharacter[]>([]);
  
  // Step 4: Generation Progress
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [showProgressTooltip, setShowProgressTooltip] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  
  // API Key dialog state
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [pendingApiAction, setPendingApiAction] = useState<'analyze' | 'generate' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ReligionIcon = ReligionIconMap[religion];

  const STEPS = [
    { 
      id: 1, 
      title: language === 'zh' ? '需求确认' : 'Spec',
      description: language === 'zh' ? '描述您的内容' : 'Describe your content'
    },
    { 
      id: 2, 
      title: language === 'zh' ? '脚本生成' : 'Script',
      description: language === 'zh' ? '生成时间轴脚本' : 'Generate timeline'
    },
    { 
      id: 3, 
      title: language === 'zh' ? '角色音色' : 'Voices',
      description: language === 'zh' ? '分配角色音色' : 'Assign voices'
    },
    { 
      id: 4, 
      title: language === 'zh' ? '开始生成' : 'Generate',
      description: language === 'zh' ? '生成音频内容' : 'Create audio'
    },
    { 
      id: 5, 
      title: language === 'zh' ? '完成' : 'Done',
      description: language === 'zh' ? '保存项目' : 'Save project'
    },
  ];

  // File upload handler - supports multiple files
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const validFiles = filterValidFiles(files);
      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles]);
      } else {
        alert(language === 'zh' ? '请上传 TXT、PDF 或 Word 文件' : 'Please upload TXT, PDF or Word file');
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
        alert(language === 'zh' ? '请上传 TXT、PDF 或 Word 文件' : 'Please upload TXT, PDF or Word file');
      }
    }
  };

  // Handle API key save
  const handleApiKeySave = (apiKey: string) => {
    llm.setApiKey(apiKey);
    // Execute the pending action
    if (pendingApiAction === 'analyze') {
      analyzeWithGemini();
    } else if (pendingApiAction === 'generate') {
      generateScript();
    }
    setPendingApiAction(null);
  };

  // Handle LLM errors with localized messages
  const handleLLMError = useCallback((error: unknown) => {
    console.error('LLM error:', error);
    if (error instanceof LLMError) {
      alert(error.getUserMessage(language === 'zh' ? 'zh' : 'en'));
    } else {
      alert(language === 'zh' ? '发生未知错误，请稍后重试' : 'An unknown error occurred, please try again');
    }
  }, [language]);

  // Analyze with LLM
  const analyzeWithGemini = async () => {
    if (!llm.hasApiKey()) {
      setPendingApiAction('analyze');
      setShowApiKeyDialog(true);
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Collect content from text input and files
      const content = await collectAnalysisContent(textInput, uploadedFiles);

      if (!content.trim()) {
        alert(language === 'zh' ? '请输入描述或上传文件' : 'Please input description or upload files');
        setIsAnalyzing(false);
        return;
      }

      const prompt = buildSpecAnalysisPrompt(content);
      const parsed = await llm.generateJson<SpecAnalysisResult>(prompt);

      dispatch(actions.setSpec({
        storyTitle: parsed.storyTitle || '',
        subtitle: parsed.subtitle || '',
        targetAudience: parsed.targetAudience || '',
        formatAndDuration: parsed.formatAndDuration || '',
        toneAndExpression: parsed.toneAndExpression || '',
        addBgm: parsed.addBgm !== false,
        addSoundEffects: parsed.addSoundEffects !== false,
        hasVisualContent: parsed.hasVisualContent || false,
      }));
      // Collapse inputs and show spec preview
      setIsInputCollapsed(true);
      if (parsed.subtitle) {
        setShowSubtitle(true);
      }
    } catch (error) {
      handleLLMError(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate script with LLM
  const generateScript = async () => {
    if (!llm.hasApiKey()) {
      setPendingApiAction('generate');
      setShowApiKeyDialog(true);
      return;
    }

    setIsGeneratingScript(true);

    try {
      // Collect content without labels for script generation
      const content = await collectAnalysisContent(textInput, uploadedFiles, { includeLabels: false });

      const prompt = buildScriptGenerationPrompt(content, {
        title: specData.storyTitle,
        targetAudience: specData.targetAudience,
        formatAndDuration: specData.formatAndDuration,
        toneAndExpression: specData.toneAndExpression,
        addBgm: specData.addBgm,
        addSoundEffects: specData.addSoundEffects,
        hasVisualContent: specData.hasVisualContent,
      });

      const sections = await llm.generateJson<ScriptSection[]>(prompt);
      
      if (sections && sections.length > 0) {
        dispatch(actions.setScriptSections(sections));
        // Auto-expand the first section
        setEditingSection(sections[0].id);
      }
    } catch (error) {
      handleLLMError(error);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Extract characters from script
  const extractCharacters = useCallback(() => {
    dispatch(actions.extractCharactersFromScript());
    setAvailableVoices(loadVoiceCharacters());
  }, []);

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

  const assignVoiceToCharacter = useCallback(
    (characterIndex: number, voiceId: string) => {
      dispatch(actions.assignVoiceToCharacter(characterIndex, voiceId));
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

  const toggleCharacterSelection = useCallback(
    (voiceId: string) => {
      dispatch(actions.toggleCharacterSelection(voiceId));
    },
    []
  );

  // Simulate generation process
  const simulateGeneration = async () => {
    const steps = [
      { progress: 10, status: language === 'zh' ? '正在准备音频资源...' : 'Preparing audio resources...' },
      { progress: 25, status: language === 'zh' ? '正在合成语音...' : 'Synthesizing voice...' },
      { progress: 50, status: language === 'zh' ? '正在添加背景音乐...' : 'Adding background music...' },
      { progress: 75, status: language === 'zh' ? '正在处理音效...' : 'Processing sound effects...' },
      { progress: 90, status: language === 'zh' ? '正在最终处理...' : 'Final processing...' },
      { progress: 100, status: language === 'zh' ? '生成完成！' : 'Generation complete!' },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGenerationProgress(step.progress);
      setGenerationStatus(step.status);
    }
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
        title: `${language === 'zh' ? '第1集' : 'Episode 1'}: ${specData.storyTitle}`,
        subtitle: specData.subtitle,
        description: specData.toneAndExpression,
        scriptSections,
        characters: episodeCharacters,
      },
    });
    onSuccess();
  };

  // Navigation validation
  const canProceed = () => {
    switch (currentStep) {
      case 1: return specData.storyTitle.trim().length > 0;
      case 2: return scriptSections.length > 0;
      case 3: return true;
      case 4: return generationProgress === 100;
      default: return true;
    }
  };

  const handleNext = async () => {
    // Step 1 -> 2: Auto generate script
    if (currentStep === 1) {
      setCurrentStep(2);
      // Auto-trigger script generation
      setTimeout(() => {
        generateScript();
      }, 100);
      return;
    }
    // Step 2 -> 3: Extract characters
    if (currentStep === 2 && scriptSections.length > 0) {
      setIsProcessingNext(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      extractCharacters();
      setIsProcessingNext(false);
    }
    // Step 3 -> 4: Start generation
    if (currentStep === 3) {
      setIsProcessingNext(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      simulateGeneration();
      setIsProcessingNext(false);
    }
    if (currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };
  
  const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  // Calculate estimated time remaining
  const getEstimatedTime = () => {
    const totalSteps = STEPS.length;
    const avgTimePerStep = 2; // minutes per step
    const remainingSteps = totalSteps - currentStep;
    const estimatedMinutes = remainingSteps * avgTimePerStep;
    
    if (currentStep === 4) {
      // During generation, calculate based on progress
      const remainingProgress = 100 - generationProgress;
      return Math.ceil((remainingProgress / 100) * 3); // ~3 minutes for generation
    }
    
    return estimatedMinutes;
  };

  const getProgressPercentage = () => {
    if (currentStep === 4 && generationProgress > 0) {
      // Step 4: use generation progress
      return ((currentStep - 1) / STEPS.length) * 100 + (generationProgress / STEPS.length);
    }
    return (currentStep / STEPS.length) * 100;
  };

  // Handle Enter key for quick analyze
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (textInput.trim() || uploadedFiles.length > 0) {
        analyzeWithGemini();
      }
    }
  };

  // Expand input section
  const expandInputSection = () => {
    setIsInputCollapsed(false);
  };

  // Render Step 1: Spec Confirmation
  const renderSpecStep = () => (
    <div className="space-y-6">
      {/* Collapsed Input Preview */}
      {isInputCollapsed && specData.storyTitle && (
        <div 
          className="rounded-xl border border-white/10 p-4 cursor-pointer hover:border-white/20 transition-all"
          style={{ background: `${theme.primary}10` }}
          onClick={expandInputSection}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${theme.primary}30` }}
              >
                <FileText size={18} style={{ color: theme.primaryLight }} />
              </div>
              <div>
                <p className="text-sm text-white font-medium">
                  {textInput.slice(0, 50)}{textInput.length > 50 ? '...' : ''}
                </p>
                <p className="text-xs text-white/50">
                  {uploadedFiles.length > 0 && `${uploadedFiles.length} ${language === 'zh' ? '个文件' : 'files'} · `}
                  {language === 'zh' ? '点击展开编辑' : 'Click to expand'}
                </p>
              </div>
            </div>
            <Edit2 size={16} className="text-white/40" />
          </div>
        </div>
      )}

      {/* Text Input with File Attachment - Show when not collapsed */}
      {!isInputCollapsed && (
        <>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2 flex items-center justify-end gap-2">
              <span className="text-white/40 font-normal text-xs">
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
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={
                  language === 'zh' 
                    ? '描述您想创建的内容...\n\n例如：5分钟冥想引导音频'
                    : language === 'es'
                    ? 'Describe tu contenido...\n\nEj: Audio de meditación de 5 min'
                    : 'Describe your content...\n\nE.g: 5-min meditation audio'
                }
                rows={5}
                className="w-full px-4 pt-3 pb-2 bg-transparent text-white placeholder-white/30 focus:outline-none resize-none"
              />
              
              {/* Attachment Area */}
              <div className="px-4 pb-3 pt-1 border-t border-white/5">
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
                  <div className="mb-2 space-y-1.5">
                    {uploadedFiles.map((file, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/10"
                        style={{ background: `${theme.primary}10` }}
                      >
                        <FileText size={14} style={{ color: theme.primaryLight }} />
                        <span className="flex-1 text-xs text-white truncate">{file.name}</span>
                        <span className="text-[10px] text-white/40">{(file.size / 1024).toFixed(1)}KB</span>
                        <button
                          onClick={() => removeUploadedFile(index)}
                          className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-red-400 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add Attachment Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/70 hover:bg-white/5 transition-all"
                >
                  <Upload size={14} />
                  <span>
                    {language === 'zh' 
                      ? isDragging ? '松开以上传文件' : '添加附件 (TXT, PDF, Word)'
                      : language === 'es'
                      ? isDragging ? 'Suelta para subir archivos' : 'Agregar archivos adjuntos (TXT, PDF, Word)'
                      : isDragging ? 'Drop to upload files' : 'Add attachments (TXT, PDF, Word)'}
                  </span>
                </button>
              </div>
              
              {/* Drag Overlay */}
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/5 backdrop-blur-sm pointer-events-none">
                  <div className="flex flex-col items-center gap-2 text-white/70">
                    <Upload size={32} />
                    <span className="text-sm font-medium">
                      {language === 'zh' ? '松开以上传文件' : language === 'es' ? 'Suelta los archivos para subir' : 'Drop files to upload'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={analyzeWithGemini}
            disabled={isAnalyzing || (!textInput.trim() && uploadedFiles.length === 0)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isAnalyzing ? 'animate-pulse' : ''
            }`}
            style={{ background: theme.primary }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {language === 'zh' ? '分析中' : 'Analyzing'}
              </>
            ) : (
              <>
                <Sparkles size={20} />
                {language === 'zh' ? '智能分析' : 'Analyze'}
              </>
            )}
          </button>
        </>
      )}

      {/* Spec Table - Spec Preview */}
      {specData.storyTitle && (
        <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: theme.bgCard }}>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h4 className="font-medium text-white">{language === 'zh' ? '项目规格' : 'Project Spec'}</h4>
            <span className="text-xs text-white/40">✏️</span>
          </div>
          <div className="p-4 space-y-4">
            {/* Story Title */}
            <div>
              <label className="block text-xs text-white/50 mb-1">{language === 'zh' ? '标题' : 'Title'}</label>
              <input
                type="text"
                value={specData.storyTitle}
                onChange={(e) => updateSpecField('storyTitle', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 text-sm"
              />
            </div>
            {/* Subtitle - Toggle Option */}
            {showSubtitle ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-white/50">{language === 'zh' ? '副标题' : 'Subtitle'}</label>
                  <button
                    onClick={() => {
                      setShowSubtitle(false);
                      updateSpecField('subtitle', '');
                    }}
                    className="text-xs text-white/40 hover:text-white/60 transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
                <input
                  type="text"
                  value={specData.subtitle}
                  onChange={(e) => updateSpecField('subtitle', e.target.value)}
                  placeholder={language === 'zh' ? '添加副标题或标语' : 'Add a subtitle or tagline'}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 text-sm"
                />
              </div>
            ) : (
              <button
                onClick={() => setShowSubtitle(true)}
                className="flex items-center gap-2 text-xs text-white/50 hover:text-white/70 transition-all"
              >
                <Plus size={12} />
                {language === 'zh' ? '添加副标题' : 'Add subtitle'}
              </button>
            )}
            {/* Target Audience */}
            <div>
              <label className="block text-xs text-white/50 mb-1">{language === 'zh' ? '受众' : 'Audience'}</label>
              <input
                type="text"
                value={specData.targetAudience}
                onChange={(e) => updateSpecField('targetAudience', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 text-sm"
              />
            </div>
            {/* Format and Duration */}
            <div>
              <label className="block text-xs text-white/50 mb-1">{language === 'zh' ? '时长' : 'Duration'}</label>
              <input
                type="text"
                value={specData.formatAndDuration}
                onChange={(e) => updateSpecField('formatAndDuration', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 text-sm"
              />
            </div>
            {/* Tone and Expression */}
            <div>
              <label className="block text-xs text-white/50 mb-1">{language === 'zh' ? '风格' : 'Style'}</label>
              <input
                type="text"
                value={specData.toneAndExpression}
                onChange={(e) => updateSpecField('toneAndExpression', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 text-sm"
              />
            </div>
            {/* Boolean Options */}
            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={specData.addBgm}
                  onChange={(e) => updateSpecField('addBgm', e.target.checked)}
                  className="w-4 h-4 rounded border-white/20"
                />
                <Music size={14} className="text-white/50" />
                <span className="text-sm text-white/70">BGM</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={specData.addSoundEffects}
                  onChange={(e) => updateSpecField('addSoundEffects', e.target.checked)}
                  className="w-4 h-4 rounded border-white/20"
                />
                <Volume2 size={14} className="text-white/50" />
                <span className="text-sm text-white/70">{language === 'zh' ? '音效' : 'SFX'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={specData.hasVisualContent}
                  onChange={(e) => updateSpecField('hasVisualContent', e.target.checked)}
                  className="w-4 h-4 rounded border-white/20"
                />
                <Image size={14} className="text-white/50" />
                <span className="text-sm text-white/70">{language === 'zh' ? '视觉' : 'Visual'}</span>
              </label>
            </div>
            {/* Existing Characters Selection */}
            {availableVoices.length > 0 && (
              <div>
                <label className="block text-xs text-white/50 mb-2">{language === 'zh' ? '已有角色' : 'Characters'}</label>
                <div className="flex flex-wrap gap-2">
                  {availableVoices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => toggleCharacterSelection(voice.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        specData.selectedCharacters.includes(voice.id)
                          ? 'text-white'
                          : 'text-white/60 border border-white/10 hover:border-white/20'
                      }`}
                      style={specData.selectedCharacters.includes(voice.id) ? { background: theme.primary } : {}}
                    >
                      {voice.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Render Step 2: Script Generation
  const renderScriptStep = () => (
    <div className="space-y-6">
      {/* Generate Script Button */}
      {scriptSections.length === 0 && (
        <button
          onClick={generateScript}
          disabled={isGeneratingScript}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: theme.primary }}
        >
          {isGeneratingScript ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {language === 'zh' ? '生成中...' : 'Generating...'}
            </>
          ) : (
            <>
              <Sparkles size={20} />
              {language === 'zh' ? '生成脚本' : 'Generate Script'}
            </>
          )}
        </button>
      )}

      {/* Regenerate Button */}
      {scriptSections.length > 0 && (
        <div className="flex items-center justify-between">
          <h4 className="text-white font-medium">{language === 'zh' ? '脚本' : 'Script'}</h4>
          <button
            onClick={generateScript}
            disabled={isGeneratingScript}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white transition-all"
            style={{ background: `${theme.primary}30` }}
          >
            <RefreshCw size={14} className={isGeneratingScript ? 'animate-spin' : ''} />
            {language === 'zh' ? '重新生成' : 'Regen'}
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
            className="px-4 py-3 border-b border-white/10 cursor-pointer flex items-center justify-between"
            onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
          >
            <div>
              <h4 className="font-medium text-white">{section.name}</h4>
              <p className="text-xs text-white/50">{section.description}</p>
            </div>
            <ChevronRight 
              size={20} 
              className={`text-white/50 transition-transform ${editingSection === section.id ? 'rotate-90' : ''}`} 
            />
          </div>
          
          {editingSection === section.id && (
            <div className="p-4 space-y-4">
              {/* Cover Image Description */}
              {specData.hasVisualContent && (
                <div>
                  <label className="block text-xs text-white/50 mb-1">{language === 'zh' ? '封面' : 'Cover'}</label>
                  <input
                    type="text"
                    value={section.coverImageDescription || ''}
                    onChange={(e) => updateSectionCover(section.id, e.target.value)}
                    placeholder={language === 'zh' ? '描述封面图' : 'Describe cover'}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 text-sm"
                  />
                </div>
              )}

              {/* Timeline - Responsive Layout */}
              <div className="space-y-3">
                {section.timeline.map((item, itemIndex) => (
                  <div 
                    key={item.id} 
                    className="rounded-lg border border-white/10 p-3 space-y-3"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    {/* Header: Time + Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/40 w-4">{itemIndex + 1}</span>
                        <input
                          type="text"
                          value={item.timeStart}
                          onChange={(e) => updateTimelineItem(section.id, item.id, 'timeStart', e.target.value)}
                          placeholder="00:00"
                          className="w-14 px-2 py-1 rounded border border-white/10 bg-white/5 text-white text-xs focus:outline-none"
                        />
                        <span className="text-white/30 text-xs">-</span>
                        <input
                          type="text"
                          value={item.timeEnd}
                          onChange={(e) => updateTimelineItem(section.id, item.id, 'timeEnd', e.target.value)}
                          placeholder="00:15"
                          className="w-14 px-2 py-1 rounded border border-white/10 bg-white/5 text-white text-xs focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeTimelineItem(section.id, item.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    {/* Lines (Speaker + Line pairs) */}
                    <div className="space-y-2">
                      <label className="block text-[10px] text-white/40">{language === 'zh' ? '台词' : 'Lines'}</label>
                      {(item.lines || []).map((scriptLine, lineIndex) => (
                        <div key={lineIndex} className="flex items-start gap-2">
                          <input 
                            type="text" 
                            value={scriptLine.speaker} 
                            onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'speaker', e.target.value)} 
                            placeholder={language === 'zh' ? '角色' : 'Speaker'}
                            className="w-24 px-2 py-1.5 rounded border border-white/10 bg-white/5 text-white text-xs focus:outline-none flex-shrink-0" 
                          />
                          <textarea 
                            value={scriptLine.line} 
                            onChange={(e) => updateScriptLine(section.id, item.id, lineIndex, 'line', e.target.value)} 
                            placeholder={language === 'zh' ? '台词内容...' : 'Line content...'}
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
                        <Plus size={10} />{language === 'zh' ? '添加台词' : 'Add line'}
                      </button>
                    </div>
                    
                    {/* Sound/Music - only show if BGM or SFX is enabled */}
                    {(specData.addBgm || specData.addSoundEffects) && (
                      <div>
                        <label className="block text-[10px] text-white/40 mb-1">{language === 'zh' ? '音效/音乐' : 'Sound/Music'}</label>
                        <input
                          type="text"
                          value={item.soundMusic}
                          onChange={(e) => updateTimelineItem(section.id, item.id, 'soundMusic', e.target.value)}
                          placeholder={language === 'zh' ? '背景音乐、音效说明' : 'BGM, sound effects...'}
                          className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-white/20"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Timeline Item */}
              <button
                onClick={() => addTimelineItem(section.id)}
                className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-all"
              >
                <Plus size={14} />
                {language === 'zh' ? '添加时间段' : 'Add segment'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Render Step 3: Character Extraction
  const renderCharacterStep = () => (
    <div className="space-y-6">
      {extractedCharacters.length === 0 ? (
        <div className="text-center py-8">
          <User size={48} className="mx-auto mb-4 text-white/30" />
          <p className="text-white/50">{language === 'zh' ? '未检测到角色' : 'No characters found'}</p>
          <p className="text-xs text-white/40 mt-2">{language === 'zh' ? '在脚本中使用 "角色名:" 格式' : 'Use "Name:" in scripts'}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-white/50">
            {language === 'zh' 
              ? '为每个角色分配音色'
              : 'Assign voices to characters'}
          </p>

          {extractedCharacters.map((char, index) => (
            <div 
              key={index}
              className="rounded-xl p-4 border border-white/10"
              style={{ background: theme.bgCard }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${theme.primary}20` }}
                >
                  <User size={24} style={{ color: theme.primaryLight }} />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">{char.name}</h4>
                  <p className="text-xs text-white/50">{language === 'zh' ? '选择音色' : 'Voice'}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {availableVoices.length > 0 ? (
                  availableVoices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => assignVoiceToCharacter(index, voice.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        char.assignedVoiceId === voice.id
                          ? 'text-white'
                          : 'text-white/60 border border-white/10 hover:border-white/20'
                      }`}
                      style={char.assignedVoiceId === voice.id ? { background: theme.primary } : {}}
                    >
                      <Volume2 size={14} />
                      {voice.name}
                    </button>
                  ))
                ) : (
                  <div className="w-full text-center py-4">
                    <p className="text-sm text-white/40 mb-3">
                      {language === 'zh' ? '暂无音色' : 'No voices yet'}
                    </p>
                    <button
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/70 border border-white/10 hover:border-white/20 transition-all mx-auto"
                    >
                      <Upload size={14} />
                      {language === 'zh' ? '去音色工作室' : 'Go to Voice Studio'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  // Render Step 4: Generation
  const renderGenerationStep = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        {generationProgress < 100 ? (
          <>
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div 
                className="absolute inset-0 rounded-full border-4 border-white/10"
              />
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
              {language === 'zh' ? '生成完成！' : 'Complete!'}
            </h3>
            <p className="text-white/50 text-sm">
              {language === 'zh' ? '点击下一步保存项目' : 'Click next to save'}
            </p>
          </>
        )}
      </div>

      {/* Preview Cards (placeholder) */}
      {generationProgress === 100 && (
        <div className="grid grid-cols-2 gap-4">
          <div 
            className="rounded-xl p-3 border border-white/10"
            style={{ background: theme.bgCard }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Music size={16} style={{ color: theme.primaryLight }} />
              <span className="text-white text-sm font-medium">{language === 'zh' ? '音频' : 'Audio'}</span>
            </div>
            <div className="h-12 rounded-lg flex items-center justify-center" style={{ background: `${theme.primary}10` }}>
              <Play size={20} className="text-white/40" />
            </div>
          </div>
          {specData.hasVisualContent && (
            <div 
              className="rounded-xl p-3 border border-white/10"
              style={{ background: theme.bgCard }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Image size={16} style={{ color: theme.primaryLight }} />
                <span className="text-white text-sm font-medium">{language === 'zh' ? '视觉' : 'Visual'}</span>
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

  // Render Step 5: Post-processing
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
            <h3 className="text-xl font-serif text-white">{specData.storyTitle}</h3>
            {specData.subtitle && (
              <p className="text-sm text-white/70 italic">{specData.subtitle}</p>
            )}
            <p className="text-sm text-white/50">
              {specData.targetAudience} · {specData.formatAndDuration}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-white/70 line-clamp-1">{specData.toneAndExpression}</p>
          <div className="flex items-center gap-4 text-xs text-white/60">
            <span>{scriptSections.length} {language === 'zh' ? '段' : 'sections'}</span>
            <span>·</span>
            <span>{extractedCharacters.length} {language === 'zh' ? '角色' : 'chars'}</span>
            {specData.addBgm && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Music size={12} /> BGM
                </span>
              </>
            )}
            {specData.addSoundEffects && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Volume2 size={12} /> SFX
                </span>
              </>
            )}
            {specData.hasVisualContent && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: theme.primaryLight }}>
                  <Image size={12} /> {language === 'zh' ? '视觉' : 'Visual'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-white/40 text-xs">
        {language === 'zh' 
          ? '确认信息后点击保存'
          : 'Confirm and save'}
      </p>
    </div>
  );

  // Main render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderSpecStep();
      case 2: return renderScriptStep();
      case 3: return renderCharacterStep();
      case 4: return renderGenerationStep();
      case 5: return renderPostProcessingStep();
      default: return null;
    }
  };

  // Load available voices on mount
  useEffect(() => {
    setAvailableVoices(loadVoiceCharacters());
  }, []);

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
              <h2 className="text-lg font-serif text-white">{t.projectCreator.title}</h2>
              <p className="text-xs text-white/50">
                {t.projectCreator.step} {currentStep} / {STEPS.length} · {STEPS[currentStep - 1]?.title}
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
                className="px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl min-w-[220px]"
                style={{ 
                  background: `${theme.bgDark}f5`,
                  borderColor: `${theme.primary}40`,
                  boxShadow: `0 10px 40px ${theme.primary}20, 0 0 0 1px ${theme.primary}10`
                }}
              >
                {/* Step Info */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: currentStep >= hoveredStep ? theme.primary : 'rgba(255,255,255,0.15)',
                      color: 'white'
                    }}
                  >
                    {currentStep > hoveredStep ? <Check size={14} /> : hoveredStep}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">
                      {STEPS[hoveredStep - 1]?.title}
                    </div>
                  </div>
                  {currentStep === hoveredStep && (
                    <div className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ background: `${theme.primary}30`, color: theme.primaryLight }}>
                      {language === 'zh' ? '当前' : 'Current'}
                    </div>
                  )}
                </div>
                <div className="text-xs text-white/80 mb-3 leading-relaxed">
                  {STEPS[hoveredStep - 1]?.description}
                </div>
                
                {/* Progress info for current or completed steps */}
                {currentStep >= hoveredStep && (
                  <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg" style={{ background: `${theme.primary}15` }}>
                    {currentStep === hoveredStep ? (
                      <>
                        <Loader2 size={12} className="animate-spin" style={{ color: theme.primaryLight }} />
                        <span className="text-white/70">
                          {language === 'zh' ? '进行中' : 'In Progress'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Check size={12} style={{ color: theme.primaryLight }} />
                        <span className="text-white/70">
                          {language === 'zh' ? '已完成' : 'Completed'}
                        </span>
                      </>
                    )}
                  </div>
                )}
                
                {/* Overall progress */}
                {currentStep === hoveredStep && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-[10px] text-white/60 mb-1">
                      <span>{language === 'zh' ? '总体进度' : 'Overall'}</span>
                      <span className="font-medium text-white">{Math.round(getProgressPercentage())}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                      <span>⏱</span>
                      <span>
                        {language === 'zh' ? '预计 ' : 'Est. '}
                        {getEstimatedTime()}
                        {language === 'zh' ? ' 分钟' : ' min'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Tooltip arrow */}
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: `6px solid ${theme.primary}40`
                }}
              />
            </div>
          )}
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
            // Only show Next button when canProceed() is true
            canProceed() && (
              <button
                onClick={handleNext}
                disabled={isProcessingNext}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-all hover:scale-105 ${
                  isProcessingNext ? 'animate-pulse' : ''
                }`}
                style={{ 
                  background: theme.primary,
                  boxShadow: isProcessingNext ? `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}` : 'none'
                }}
              >
                {isProcessingNext ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {language === 'zh' ? '处理中' : 'Processing'}
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
              onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all hover:scale-105"
              style={{ background: theme.accent, color: theme.primaryDark }}
            >
              <Save size={20} />
              {language === 'zh' ? '保存' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Gemini API Key Dialog */}
      <GeminiApiKeyDialog
        isOpen={showApiKeyDialog}
        onClose={() => {
          setShowApiKeyDialog(false);
          setPendingApiAction(null);
        }}
        onSave={handleApiKeySave}
      />
    </div>
  );
}
