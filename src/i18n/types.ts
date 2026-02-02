// Supported languages
export type Language = 'en' | 'zh' | 'es';

// Translation structure interface
export interface Translations {
  // App
  appName: string;
  appTagline: string;
  appDescription: string;
  
  // Landing
  landing: {
    badge: string;
    headline1: string;
    headline2: string;
    headline3: string;
    headline4: string;
    body: string;
    selectFormat: string;
    startJourney: string;
    journeyPrompt: string;
    inputPlaceholder: string;
    beginProduction: string;
  };

  // Navigation
  nav: {
    workspace: string;
    projects: string;
    voice: string;
    settings: string;
    switchTheme: string;
  };
  
  // Religion Selector
  religionSelector: {
    title: string;
    subtitle: string;
    selectPrompt: string;
    startUsing: string;
    footer: string;
  };
  
  // Religions
  religions: {
    default: { name: string; description: string };
    christianity: { name: string; description: string };
    catholicism: { name: string; description: string };
    buddhism: { name: string; description: string };
    islam: { name: string; description: string };
    judaism: { name: string; description: string };
    hinduism: { name: string; description: string };
    taoism: { name: string; description: string };
  };
  
  // Dashboard
  dashboard: {
    welcome: string;
    createNew: string;
    viewAll: string;
    podcastProjects: string;
    totalEpisodes: string;
    inProgress: string;
    recentProjects: string;
    noProjects: string;
    episodes: string;
    updatedAt: string;
    newProduction: string;
    inputPlaceholder: string;
    uploadFile: string;
    filesSelected: string;
    orDragDrop: string;
    dropToUpload: string;
    startCreating: string;
  };
  
  // Project Stages
  stages: {
    planning: { name: string; description: string };
    scripting: { name: string; description: string };
    recording: { name: string; description: string };
    editing: { name: string; description: string };
    review: { name: string; description: string };
    published: { name: string; description: string };
  };
  
  // Project List
  projectList: {
    title: string;
    subtitle: string;
    newProject: string;
    searchPlaceholder: string;
    allStages: string;
    viewDetails: string;
    editProject: string;
    deleteProject: string;
    deleteConfirm: string;
    noProjectsFound: string;
    noProjectsYet: string;
    adjustSearch: string;
    createFirst: string;
    createFirstDesc: string;
  };
  
  // Project Creator
  projectCreator: {
    // Basic UI
    title: string;
    step: string;
    of: string;
    confirmInfo: string;
    
    // Steps
    steps: {
      specConfirmation: { title: string; description: string };
      scriptGeneration: { title: string; description: string };
      characterVoices: { title: string; description: string };
      generation: { title: string; description: string };
      postProcessing: { title: string; description: string };
    };
    
    // Spec Step - Content Input & Analysis
    spec: {
      geminiApiKey: string;
      geminiApiKeyPlaceholder: string;
      geminiApiKeyHint: string;
      textInput: string;
      fileUpload: string;
      contentDescription: string;
      contentPlaceholder: string;
      uploadFile: string;
      uploadHint: string;
      analyzeWithAi: string;
      analyzing: string;
      generatedSpec: string;
      editable: string;
      storyTitle: string;
      targetAudience: string;
      formatDuration: string;
      toneExpression: string;
      bgm: string;
      soundEffects: string;
      visual: string;
      useExistingCharacters: string;
    };
    
    // Script Step - Script Generation & Editing
    script: {
      generateScript: string;
      generating: string;
      regenerate: string;
      preview: string;
      coverImageDesc: string;
      timeline: string;
      scriptContent: string;
      soundMusic: string;
      addTimelineItem: string;
    };
    
    // Characters Step - Character Extraction & Voice Assignment
    characters: {
      noCharactersDetected: string;
      noCharactersHint: string;
      extractedCharacters: string;
      selectVoice: string;
      noVoicesAvailable: string;
      uploadVoiceSample: string;
    };
    
    // Generation Step - Audio/Visual Generation Progress
    generation: {
      generationComplete: string;
      audioReady: string;
      audioPreview: string;
      visualPreview: string;
      preparingAudio: string;
      synthesizingVoice: string;
      addingBgm: string;
      processingSoundEffects: string;
      finalProcessing: string;
      complete: string;
    };
    
    // Post-processing Step - Final Review & Save
    postProcessing: {
      style: string;
      scriptSections: string;
      characterCount: string;
      confirmSave: string;
      saveProject: string;
    };
    
    // Error Messages
    errors: {
      uploadFileType: string;
      inputOrUpload: string;
      unknownError: string;
    };
    
    // Action Buttons
    buttons: {
      cancel: string;
      back: string;
      next: string;
      create: string;
    };
    
    // UI Labels & Common Elements
    // File Upload & Input
    files: string;
    clickToExpand: string;
    quickAnalyze: string;
    dropToUpload: string;
    analyzing: string;
    analyze: string;
    
    // Project Spec Fields
    projectSpec: string;
    fieldTitle: string;
    subtitle: string;
    addSubtitle: string;
    addSubtitleOrTagline: string;
    audience: string;
    duration: string;
    style: string;
    sfx: string;
    visual: string;
    existingCharacters: string;
    
    // Script Editing
    generating: string;
    generateScript: string;
    scriptLabel: string;
    regen: string;
    cover: string;
    describeCover: string;
    lines: string;
    speaker: string;
    lineContent: string;
    addLine: string;
    soundMusic: string;
    bgmSoundEffects: string;
    addSegment: string;
    
    // Characters
    noCharactersFound: string;
    useNameFormat: string;
    voice: string;
    noVoicesYet: string;
    goToVoiceStudio: string;
    
    // Generation & Status
    complete: string;
    clickNextToSave: string;
    audio: string;
    sections: string;
    chars: string;
    current: string;
    inProgress: string;
    completed: string;
    overall: string;
    estimated: string;
    minutes: string;
    processing: string;
    save: string;
    
    // Episode
    episode1: string;
  };
  
  // Project Detail
  projectDetail: {
    episodeList: string;
    addEpisode: string;
    addFirstEpisode: string;
    noEpisodes: string;
    projectInfo: string;
    projectSpec: string;
    audience: string;
    format: string;
    tone: string;
    addShort: string;
    createdAt: string;
    lastUpdated: string;
    episodeCount: string;
    editContent: string;
    changeStatus: string;
    deleteEpisode: string;
  };
  
  // Episode Editor
  episodeEditor: {
    createTitle: string;
    editTitle: string;
    subtitle: string;
    tabs: {
      info: string;
      script: string;
      characters: string;
      notes: string;
    };
    script: {
      noScriptContent: string;
      addSection: string;
      sectionName: string;
      sectionDescription: string;
      coverDescription: string;
      describeCoverImage: string;
      lines: string;
      speaker: string;
      lineContent: string;
      addLine: string;
      soundMusic: string;
      bgmSoundEffects: string;
      addSegment: string;
      defaultSectionName: string;
    };
    characters: {
      noCharacters: string;
      charactersExtracted: string;
      assignVoices: string;
      selectVoice: string;
      noVoicesAvailable: string;
    };
    form: {
      title: string;
      titlePlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      stage: string;
      scriptTips: string;
      scriptTipsList: string[];
      scriptPlaceholder: string;
      wordCount: string;
      estimatedDuration: string;
      minutes: string;
      notesPlaceholder: string;
      notesDesc: string;
    };
    buttons: {
      cancel: string;
      save: string;
      create: string;
    };
    validation: {
      titleRequired: string;
    };
  };
  
  // Voice Studio
  voiceStudio: {
    title: string;
    subtitle: string;
    tabs: {
      record: string;
      characters: string;
    };
    selectProject: string;
    podcastProject: string;
    selectProjectPlaceholder: string;
    episode: string;
    selectEpisodePlaceholder: string;
    status: {
      ready: string;
      recording: string;
      paused: string;
      completed: string;
    };
    tips: {
      title: string;
      list: string[];
    };
    characters: {
      title: string;
      subtitle: string;
      addNew: string;
      noCharacters: string;
      createFirst: string;
      uploadVoiceFirst: string;
      uploadVoiceHint: string;
      dragDropHint: string;
      analyzing: string;
      analyzingHint: string;
      analysisComplete: string;
      reupload: string;
      name: string;
      namePlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      tags: string;
      tagsPlaceholder: string;
      avatar: string;
      uploadAvatar: string;
      audioSample: string;
      changeAudio: string;
      playSample: string;
      voiceProvider: string;
      selectProvider: string;
      voiceId: string;
      voiceIdPlaceholder: string;
      save: string;
      cancel: string;
      edit: string;
      delete: string;
      deleteConfirm: string;
      createdAt: string;
    };
  };
  
  // Settings
  settings: {
    title: string;
    subtitle: string;
    currentTheme: string;
    changeTheme: string;
    allThemes: string;
    currentlyUsing: string;
    dataStats: string;
    totalProjects: string;
    totalEpisodes: string;
    apiConfiguration: string;
    optional: string;
    enterGeminiApiKey: string;
    saved: string;
    save: string;
    apiKeyDescription: string;
    dataManagement: string;
    exportData: string;
    exportDataDesc: string;
    importData: string;
    importDataDesc: string;
    comingSoon: string;
    clearData: string;
    clearDataDesc: string;
    clearConfirm1: string;
    clearConfirm2: string;
    about: string;
    aboutText: string;
    version: string;
  };
  
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    confirm: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    view: string;
    close: string;
    back: string;
    next: string;
    yes: string;
    no: string;
    expand: string;
    collapse: string;
  };
  
  // Gemini API Key Dialog
  geminiApiKey: {
    title: string;
    description: string;
    inputLabel: string;
    inputPlaceholder: string;
    getKeyButton: string;
    saveButton: string;
    skipButton: string;
    hint1: string;
    hint2: string;
  };
}

// Language option for UI
export interface LanguageOption {
  value: Language;
  label: string;
}

// All available language options
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'es', label: 'Español' },
];
