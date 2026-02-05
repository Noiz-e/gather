export type Language = 'en' | 'zh' | 'es';

export interface Translations {
  // App
  appName: string;
  appTagline: string;
  appDescription: string;
  
  // Navigation
  nav: {
    home: string;
    projects: string;
    voice: string;
    media: string;
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
    title: string;
    step: string;
    of: string;
    steps: {
      specConfirmation: { title: string; description: string };
      scriptGeneration: { title: string; description: string };
      characterVoices: { title: string; description: string };
      generation: { title: string; description: string };
      postProcessing: { title: string; description: string };
    };
    spec: {
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
    characters: {
      noCharactersDetected: string;
      noCharactersHint: string;
      extractedCharacters: string;
      selectVoice: string;
      noVoicesAvailable: string;
      uploadVoiceSample: string;
    };
    generation: {
      generationComplete: string;
      audioReady: string;
      audioPreview: string;
      visualPreview: string;
    };
    postProcessing: {
      style: string;
      scriptSections: string;
      characterCount: string;
      confirmSave: string;
      saveProject: string;
    };
    buttons: {
      cancel: string;
      back: string;
      next: string;
      approve: string;
      create: string;
    };
    confirmInfo: string;
  };
  
  // Project Detail
  projectDetail: {
    episodeList: string;
    addEpisode: string;
    addFirstEpisode: string;
    noEpisodes: string;
    projectInfo: string;
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
      notes: string;
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
    // Recording section
    selectProject: string;
    podcastProject: string;
    selectProjectPlaceholder: string;
    episode: string;
    selectEpisodePlaceholder: string;
    allProjects: string;
    noProjects: string;
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
    // Characters section
    characters: {
      title: string;
      subtitle: string;
      addNew: string;
      noCharacters: string;
      createFirst: string;
      // Upload first flow
      uploadVoiceFirst: string;
      uploadVoiceHint: string;
      dragDropHint: string;
      analyzing: string;
      analyzingHint: string;
      analysisComplete: string;
      reupload: string;
      // Form fields
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
      linkedProjects: string;
      save: string;
      cancel: string;
      edit: string;
      delete: string;
      deleteConfirm: string;
      createdAt: string;
    };
  };
  
  // Media Library
  mediaLibrary: {
    title: string;
    subtitle: string;
    upload: string;
    generate: string;
    generating: string;
    allProjects: string;
    noProjects: string;
    searchPlaceholder: string;
    deleteConfirm: string;
    tabs: {
      images: string;
      bgm: string;
      sfx: string;
    };
    empty: {
      title: string;
      description: string;
    };
    errors: {
      generationFailed: string;
    };
    form: {
      name: string;
      type: string;
      description: string;
      tags: string;
      tagsPlaceholder: string;
      linkedProjects: string;
    };
    uploadModal: {
      title: string;
    };
    generateModal: {
      title: string;
      prompt: string;
      duration: string;
      imagePlaceholder: string;
      bgmPlaceholder: string;
      sfxPlaceholder: string;
    };
    editModal: {
      title: string;
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
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Gather',
    appTagline: 'Podcast Platform for Religious Communities',
    appDescription: 'Create and share faith-based podcasts',
    
    nav: {
      home: 'Home',
      projects: 'Projects',
      voice: 'Voice',
      media: 'Media',
      settings: 'Settings',
      switchTheme: 'Switch Theme',
    },
    
    religionSelector: {
      title: 'Gather',
      subtitle: 'Podcast platform for religious communities',
      selectPrompt: 'Select your faith to begin your journey',
      startUsing: 'Get Started',
      footer: 'Local Storage · Privacy Protected · Completely Free',
    },
    
    religions: {
      default: { 
        name: 'Default', 
        description: 'Create podcasts and audio content for all communities' 
      },
      christianity: { 
        name: 'Christianity', 
        description: 'Generate Christian-themed podcasts, sermons, and testimonies' 
      },
      catholicism: { 
        name: 'Catholicism', 
        description: 'Create Catholic podcasts, homilies, and faith-based content' 
      },
      buddhism: { 
        name: 'Buddhism', 
        description: 'Produce Buddhist teachings, meditation guides, and dharma talks' 
      },
      islam: { 
        name: 'Islam', 
        description: 'Generate Islamic podcasts, Quran recitations, and spiritual content' 
      },
      judaism: { 
        name: 'Judaism', 
        description: 'Create Jewish podcasts, Torah studies, and faith discussions' 
      },
      hinduism: { 
        name: 'Hinduism', 
        description: 'Produce Hindu podcasts, Vedic teachings, and spiritual guides' 
      },
      taoism: { 
        name: 'Taoism', 
        description: 'Generate Taoist podcasts, philosophy talks, and cultivation guides' 
      },
    },
    
    dashboard: {
      welcome: 'Welcome Back',
      createNew: 'Create New Project',
      viewAll: 'View All Projects',
      podcastProjects: 'Podcast Projects',
      totalEpisodes: 'Total Episodes',
      inProgress: 'In Progress',
      recentProjects: 'Recent Projects',
      noProjects: 'No projects yet. Create your first podcast!',
      episodes: 'episodes',
      updatedAt: 'Updated on',
    },
    
    stages: {
      planning: { name: 'Planning', description: 'Define topics, audience, and format' },
      scripting: { name: 'Script', description: 'Write scripts and outlines' },
      recording: { name: 'Recording', description: 'Record audio content' },
      editing: { name: 'Editing', description: 'Edit and optimize audio' },
      review: { name: 'Review', description: 'Final check and quality review' },
      published: { name: 'Published', description: 'Episode published' },
    },
    
    projectList: {
      title: 'My Projects',
      subtitle: 'Manage all your podcast projects',
      newProject: 'New Project',
      searchPlaceholder: 'Search projects...',
      allStages: 'All Stages',
      viewDetails: 'View Details',
      editProject: 'Edit Project',
      deleteProject: 'Delete Project',
      deleteConfirm: 'Are you sure you want to delete this project? This action cannot be undone.',
      noProjectsFound: 'No matching projects found',
      noProjectsYet: 'No projects yet',
      adjustSearch: 'Try adjusting your search criteria',
      createFirst: 'Create Your First Project',
      createFirstDesc: 'Start spreading the voice of faith by creating your first podcast project',
    },
    
    projectCreator: {
      title: 'Create New Project',
      step: 'Step',
      of: 'of',
      steps: {
        specConfirmation: { title: 'Spec Confirmation', description: 'Input or upload your content description' },
        scriptGeneration: { title: 'Script Generation', description: 'Generate timeline scripts' },
        characterVoices: { title: 'Characters & Voices', description: 'Extract and assign character voices' },
        generation: { title: 'Generation', description: 'Generate audio content' },
        postProcessing: { title: 'Post-processing', description: 'Save project' },
      },
      spec: {
        textInput: 'Text Input',
        fileUpload: 'File Upload',
        contentDescription: 'Content Description',
        contentPlaceholder: 'Enter description of the podcast content you want to create...\n\nExample: I want to create a 5-minute guided meditation audio for beginners, with a calm and soothing style...',
        uploadFile: 'Upload File',
        uploadHint: 'Click to upload TXT, PDF or Word file',
        analyzeWithAi: 'Analyze with AI',
        analyzing: 'Analyzing...',
        generatedSpec: 'Generated Spec',
        editable: 'Editable',
        storyTitle: 'Story Title',
        targetAudience: 'Who is this for?',
        formatDuration: 'Format and Duration',
        toneExpression: 'Tone and Expression',
        bgm: 'BGM',
        soundEffects: 'Sound Effects',
        visual: 'Visual',
        useExistingCharacters: 'Use Existing Characters',
      },
      script: {
        generateScript: 'Generate Timeline Script',
        generating: 'Generating script...',
        regenerate: 'Regenerate',
        preview: 'Script Preview',
        coverImageDesc: 'Cover Image Description',
        timeline: 'Timeline',
        scriptContent: 'Script',
        soundMusic: 'Sound/Music',
        addTimelineItem: 'Add Timeline Item',
      },
      characters: {
        noCharactersDetected: 'No characters detected',
        noCharactersHint: 'Use "CharacterName:" format in scripts.',
        extractedCharacters: 'The following characters were extracted from the script. Assign a voice to each.',
        selectVoice: 'Select Voice',
        noVoicesAvailable: 'No voices available. Create characters in Voice Studio first.',
        uploadVoiceSample: 'Upload Voice Sample',
      },
      generation: {
        generationComplete: 'Generation Complete!',
        audioReady: 'Audio is ready. Click next to save your project.',
        audioPreview: 'Audio Preview',
        visualPreview: 'Visual Preview',
      },
      postProcessing: {
        style: 'Style',
        scriptSections: 'Script Sections',
        characterCount: 'Characters',
        confirmSave: 'Confirm the information above and click below to save the project',
        saveProject: 'Save Project',
      },
      buttons: {
        cancel: 'Cancel',
        back: 'Back',
        next: 'Next',
        approve: 'Approve',
        create: 'Create Project',
      },
      confirmInfo: 'Please confirm the information above before creating your project',
    },
    
    projectDetail: {
      episodeList: 'Episode List',
      addEpisode: 'Add Episode',
      addFirstEpisode: 'Add First Episode',
      noEpisodes: 'No episodes yet. Add your first episode to get started',
      projectInfo: 'Project Info',
      createdAt: 'Created',
      lastUpdated: 'Last Updated',
      episodeCount: 'Episode Count',
      editContent: 'Edit Content',
      changeStatus: 'Change Status',
      deleteEpisode: 'Delete Episode',
    },
    
    episodeEditor: {
      createTitle: 'Create New Episode',
      editTitle: 'Edit Episode',
      subtitle: 'Fill in episode details',
      tabs: {
        info: 'Basic Info',
        script: 'Script',
        notes: 'Notes',
      },
      form: {
        title: 'Episode Title',
        titlePlaceholder: 'Enter episode title...',
        description: 'Episode Description',
        descriptionPlaceholder: 'Briefly describe this episode...',
        stage: 'Current Stage',
        scriptTips: 'Script Writing Tips',
        scriptTipsList: [
          'Start with an attention-grabbing hook',
          'Keep content structured and organized',
          'Add pause markers where appropriate',
          'End with a thought or call to action',
        ],
        scriptPlaceholder: `Write your episode script here...

[Opening]
Welcome to...

[Main Content]
Today we'll be sharing...

[Closing]
Thank you for listening...`,
        wordCount: 'Word count',
        estimatedDuration: 'Estimated duration',
        minutes: 'min',
        notesPlaceholder: `Add notes...

Examples:
- Watch speaking pace during recording
- Scripture reference: xxx
- Music suggestion: xxx`,
        notesDesc: 'Record key points, references, or other notes',
      },
      buttons: {
        cancel: 'Cancel',
        save: 'Save Changes',
        create: 'Create Episode',
      },
      validation: {
        titleRequired: 'Please enter an episode title',
      },
    },
    
    voiceStudio: {
      title: 'Voice Studio',
      subtitle: 'Record your voice and manage characters',
      tabs: {
        record: 'Record',
        characters: 'My Characters',
      },
      selectProject: 'Select Project',
      podcastProject: 'Podcast Project',
      selectProjectPlaceholder: 'Select a project...',
      episode: 'Episode',
      selectEpisodePlaceholder: 'Select an episode...',
      allProjects: 'All Projects',
      noProjects: 'No projects',
      status: {
        ready: 'Ready',
        recording: 'Recording...',
        paused: 'Paused',
        completed: 'Recording Complete',
      },
      tips: {
        title: 'Recording Tips',
        list: [
          'Choose a quiet environment to minimize background noise',
          'Keep proper distance from microphone (15-20cm)',
          'Take a deep breath before speaking, maintain steady pace',
          'Do a test recording first to check audio quality',
          'Prepare your script to avoid filler words',
        ],
      },
      characters: {
        title: 'My Voice Characters',
        subtitle: 'Manage your uploaded voice characters',
        addNew: 'Add Character',
        noCharacters: 'No voice characters yet',
        createFirst: 'Create your first voice character',
        // Upload first flow
        uploadVoiceFirst: 'Upload Voice Sample',
        uploadVoiceHint: 'Upload a voice sample to create a character',
        dragDropHint: 'Click or drag audio file here (MP3, WAV, M4A)',
        analyzing: 'Analyzing voice...',
        analyzingHint: 'Detecting voice characteristics',
        analysisComplete: 'Analysis complete',
        reupload: 'Upload different audio',
        // Form fields
        name: 'Character Name',
        namePlaceholder: 'e.g., Narrator, Host, Guest...',
        description: 'Description',
        descriptionPlaceholder: 'Describe this voice character...',
        tags: 'Tags',
        tagsPlaceholder: 'Separate with commas',
        avatar: 'Avatar',
        uploadAvatar: 'Upload Avatar',
        audioSample: 'Voice Sample',
        changeAudio: 'Change Audio',
        playSample: 'Play',
        voiceProvider: 'Voice Provider',
        selectProvider: 'Select provider...',
        voiceId: 'Voice ID',
        voiceIdPlaceholder: 'Enter voice ID from provider',
        linkedProjects: 'Linked Projects',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        deleteConfirm: 'Are you sure you want to delete this character?',
        createdAt: 'Created',
      },
    },
    
    mediaLibrary: {
      title: 'Media Library',
      subtitle: 'Manage your images, music, and sound effects',
      upload: 'Upload',
      generate: 'Generate',
      generating: 'Generating...',
      allProjects: 'All Projects',
      noProjects: 'No projects',
      searchPlaceholder: 'Search...',
      deleteConfirm: 'Delete this media item?',
      tabs: {
        images: 'Images',
        bgm: 'BGM',
        sfx: 'Sound Effects',
      },
      empty: {
        title: 'No media yet',
        description: 'Upload or generate your first media',
      },
      errors: {
        generationFailed: 'Generation failed: ',
      },
      form: {
        name: 'Name',
        type: 'Type',
        description: 'Description',
        tags: 'Tags',
        tagsPlaceholder: 'Separate with commas',
        linkedProjects: 'Linked Projects',
      },
      uploadModal: {
        title: 'Upload Media',
      },
      generateModal: {
        title: 'Generate with AI',
        prompt: 'Describe what you want',
        duration: 'Duration (seconds)',
        imagePlaceholder: 'A serene mountain landscape at sunset...',
        bgmPlaceholder: 'Calm meditation music with soft piano...',
        sfxPlaceholder: 'Gentle bell chime sound...',
      },
      editModal: {
        title: 'Edit Media',
      },
    },
    
    settings: {
      title: 'Settings',
      subtitle: 'Manage your app settings and data',
      currentTheme: 'Current Theme',
      changeTheme: 'Change Theme',
      allThemes: 'All Theme Previews',
      currentlyUsing: 'Current',
      dataStats: 'Data Statistics',
      totalProjects: 'Total Projects',
      totalEpisodes: 'Total Episodes',
      dataManagement: 'Data Management',
      exportData: 'Export Data',
      exportDataDesc: 'Download a backup of all your project data',
      importData: 'Import Data',
      importDataDesc: 'Restore data from a backup file',
      comingSoon: 'Coming Soon',
      clearData: 'Clear All Data',
      clearDataDesc: 'Delete all locally stored data',
      clearConfirm1: 'Are you sure you want to clear all data? This action cannot be undone!',
      clearConfirm2: 'Final confirmation: This will delete ALL projects and episode data!',
      about: 'About',
      aboutText: 'A podcast creation platform for religious communities. All data is stored locally to protect your privacy.',
      version: 'v1.0.0',
    },
    
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      yes: 'Yes',
      no: 'No',
    },
  },
  
  zh: {
    appName: 'Gather',
    appTagline: '为宗教社区打造的播客创作平台',
    appDescription: '创建和分享信仰播客',
    
    nav: {
      home: '首页',
      projects: '项目',
      voice: '音色',
      media: '素材库',
      settings: '设置',
      switchTheme: '切换宗教主题',
    },
    
    religionSelector: {
      title: 'Gather',
      subtitle: '为宗教社区打造的播客创作平台',
      selectPrompt: '选择您的信仰，开始创作之旅',
      startUsing: '开始使用',
      footer: '本地存储 · 隐私保护 · 完全免费',
    },
    
    religions: {
      default: { 
        name: '默认', 
        description: '为所有社区生成播客和音频内容' 
      },
      christianity: { 
        name: '基督教', 
        description: '生成基督教主题播客、讲道和见证音频' 
      },
      catholicism: { 
        name: '天主教', 
        description: '创作天主教播客、弥撒讲道和信仰内容' 
      },
      buddhism: { 
        name: '佛教', 
        description: '制作佛教教义、冥想引导和佛法开示音频' 
      },
      islam: { 
        name: '伊斯兰教', 
        description: '生成伊斯兰播客、古兰经诵读和灵修内容' 
      },
      judaism: { 
        name: '犹太教', 
        description: '创作犹太播客、托拉研习和信仰讨论音频' 
      },
      hinduism: { 
        name: '印度教', 
        description: '制作印度教播客、吠陀教义和灵修引导' 
      },
      taoism: { 
        name: '道教', 
        description: '生成道教播客、哲学讲解和修炼指南音频' 
      },
    },
    
    dashboard: {
      welcome: '欢迎回来',
      createNew: '创建新项目',
      viewAll: '查看所有项目',
      podcastProjects: '播客项目',
      totalEpisodes: '总集数',
      inProgress: '进行中',
      recentProjects: '最近项目',
      noProjects: '还没有项目，开始创建您的第一个播客吧！',
      episodes: '集',
      updatedAt: '更新于',
    },
    
    stages: {
      planning: { name: '规划', description: '确定主题、目标受众和节目形式' },
      scripting: { name: '脚本', description: '撰写节目脚本和内容大纲' },
      recording: { name: '录制', description: '录制音频内容' },
      editing: { name: '剪辑', description: '编辑和优化音频' },
      review: { name: '审核', description: '最终检查和质量审核' },
      published: { name: '发布', description: '节目已发布' },
    },
    
    projectList: {
      title: '我的项目',
      subtitle: '管理您的所有播客项目',
      newProject: '新建项目',
      searchPlaceholder: '搜索项目...',
      allStages: '所有阶段',
      viewDetails: '查看详情',
      editProject: '编辑项目',
      deleteProject: '删除项目',
      deleteConfirm: '确定要删除这个项目吗？此操作无法撤销。',
      noProjectsFound: '没有找到匹配的项目',
      noProjectsYet: '还没有项目',
      adjustSearch: '尝试调整搜索条件',
      createFirst: '创建第一个项目',
      createFirstDesc: '创建您的第一个播客项目，开始传播信仰的声音',
    },
    
    projectCreator: {
      title: '创建新项目',
      step: '第',
      of: '步，共',
      steps: {
        specConfirmation: { title: '需求确认', description: '输入或上传您的内容描述' },
        scriptGeneration: { title: '脚本生成', description: '生成时间轴脚本' },
        characterVoices: { title: '角色与音色', description: '提取并分配角色音色' },
        generation: { title: '开始生成', description: '生成音频内容' },
        postProcessing: { title: '后处理', description: '保存项目' },
      },
      spec: {
        textInput: '文本输入',
        fileUpload: '文件上传',
        contentDescription: '内容描述',
        contentPlaceholder: '输入您想要创建的播客内容描述...\n\n例如：我想要创建一个关于冥想和正念的5分钟引导音频，针对初学者，风格轻柔舒缓...',
        uploadFile: '上传文件',
        uploadHint: '点击上传 TXT、PDF 或 Word 文件',
        analyzeWithAi: '使用 AI 分析',
        analyzing: '分析中...',
        generatedSpec: '生成规格',
        editable: '可编辑',
        storyTitle: '故事标题',
        targetAudience: '目标受众',
        formatDuration: '格式和时长',
        toneExpression: '风格和表达',
        bgm: '背景音乐',
        soundEffects: '音效',
        visual: '视觉',
        useExistingCharacters: '使用已有角色',
      },
      script: {
        generateScript: '生成时间轴脚本',
        generating: '生成脚本中...',
        regenerate: '重新生成',
        preview: '脚本预览',
        coverImageDesc: '封面图描述',
        timeline: '时间轴',
        scriptContent: '脚本',
        soundMusic: '音乐/音效',
        addTimelineItem: '添加时间段',
      },
      characters: {
        noCharactersDetected: '未检测到角色',
        noCharactersHint: '请在脚本中使用 "角色名:" 格式',
        extractedCharacters: '从脚本中提取了以下角色，请为每个角色分配音色',
        selectVoice: '选择音色',
        noVoicesAvailable: '没有可用的音色，请先在音色工作室创建角色',
        uploadVoiceSample: '上传音色样本',
      },
      generation: {
        generationComplete: '生成完成！',
        audioReady: '音频已准备就绪，点击下一步保存项目',
        audioPreview: '音频预览',
        visualPreview: '视觉预览',
      },
      postProcessing: {
        style: '风格',
        scriptSections: '脚本段落',
        characterCount: '角色数量',
        confirmSave: '确认以上信息无误后，点击下方按钮保存项目',
        saveProject: '保存项目',
      },
      buttons: {
        cancel: '取消',
          back: '上一步',
          next: '下一步',
          approve: '确认',
        create: '创建项目',
      },
      confirmInfo: '确认以上信息无误后，点击下方按钮创建项目',
    },
    
    projectDetail: {
      episodeList: '节目列表',
      addEpisode: '添加节目',
      addFirstEpisode: '添加第一集',
      noEpisodes: '还没有节目，开始添加您的第一集吧',
      projectInfo: '项目信息',
      createdAt: '创建时间',
      lastUpdated: '最后更新',
      episodeCount: '节目数量',
      editContent: '编辑内容',
      changeStatus: '更改状态',
      deleteEpisode: '删除节目',
    },
    
    episodeEditor: {
      createTitle: '创建新节目',
      editTitle: '编辑节目',
      subtitle: '填写节目详细信息',
      tabs: {
        info: '基本信息',
        script: '脚本内容',
        notes: '备注',
      },
      form: {
        title: '节目标题',
        titlePlaceholder: '输入节目标题...',
        description: '节目描述',
        descriptionPlaceholder: '简要描述这一集的内容...',
        stage: '当前阶段',
        scriptTips: '脚本撰写提示',
        scriptTipsList: [
          '开头吸引听众注意力',
          '内容结构清晰，层次分明',
          '适当加入停顿标记',
          '结尾留下思考或行动呼吁',
        ],
        scriptPlaceholder: `在这里撰写您的节目脚本...

[开场白]
欢迎收听...

[主要内容]
今天我们要分享的是...

[结束语]
感谢您的收听...`,
        wordCount: '字数',
        estimatedDuration: '预估时长',
        minutes: '分钟',
        notesPlaceholder: `添加备注...

例如：
- 录制时注意语速
- 参考经文：xxx
- 配乐建议：xxx`,
        notesDesc: '记录录制要点、参考资料或其他备注信息',
      },
      buttons: {
        cancel: '取消',
        save: '保存更改',
        create: '创建节目',
      },
      validation: {
        titleRequired: '请输入节目标题',
      },
    },
    
    voiceStudio: {
      title: '音色工作室',
      subtitle: '录制您的声音，管理角色音色',
      tabs: {
        record: '录制',
        characters: '我的角色',
      },
      selectProject: '选择项目',
      podcastProject: '播客项目',
      selectProjectPlaceholder: '选择项目...',
      episode: '节目集数',
      selectEpisodePlaceholder: '选择节目...',
      allProjects: '全部项目',
      noProjects: '暂无项目',
      status: {
        ready: '准备就绪',
        recording: '录制中...',
        paused: '已暂停',
        completed: '录制完成',
      },
      tips: {
        title: '录音小贴士',
        list: [
          '选择安静的环境，减少背景噪音',
          '保持与麦克风适当距离（约15-20厘米）',
          '说话前深呼吸，保持稳定的语速',
          '录制前先试录一小段检查音质',
          '准备好脚本或大纲，避免过多的"嗯""啊"',
        ],
      },
      characters: {
        title: '我的角色音色',
        subtitle: '管理您上传的角色音色',
        addNew: '添加角色',
        noCharacters: '还没有角色音色',
        createFirst: '创建您的第一个角色音色',
        // Upload first flow
        uploadVoiceFirst: '上传音色样本',
        uploadVoiceHint: '上传音色样本以创建角色',
        dragDropHint: '点击或拖拽音频文件到此处 (MP3, WAV, M4A)',
        analyzing: '正在分析音色...',
        analyzingHint: '检测音色特征中',
        analysisComplete: '分析完成',
        reupload: '重新上传音频',
        // Form fields
        name: '角色名称',
        namePlaceholder: '例如：旁白、主持人、嘉宾...',
        description: '描述',
        descriptionPlaceholder: '描述这个角色音色...',
        tags: '标签',
        tagsPlaceholder: '用逗号分隔',
        avatar: '头像',
        uploadAvatar: '上传头像',
        audioSample: '音色样本',
        changeAudio: '更换音频',
        playSample: '播放',
        voiceProvider: '语音服务',
        selectProvider: '选择服务商...',
        voiceId: '音色 ID',
        voiceIdPlaceholder: '输入服务商的音色 ID',
        linkedProjects: '关联项目',
        save: '保存',
        cancel: '取消',
        edit: '编辑',
        delete: '删除',
        deleteConfirm: '确定要删除这个角色吗？',
        createdAt: '创建于',
      },
    },
    
    mediaLibrary: {
      title: '素材库',
      subtitle: '管理您的图片、音乐和音效素材',
      upload: '上传',
      generate: '生成',
      generating: '生成中...',
      allProjects: '全部项目',
      noProjects: '暂无项目',
      searchPlaceholder: '搜索...',
      deleteConfirm: '确定删除此素材吗？',
      tabs: {
        images: '图片',
        bgm: '背景音乐',
        sfx: '音效',
      },
      empty: {
        title: '暂无素材',
        description: '上传或生成您的第一个素材',
      },
      errors: {
        generationFailed: '生成失败：',
      },
      form: {
        name: '名称',
        type: '类型',
        description: '描述',
        tags: '标签',
        tagsPlaceholder: '用逗号分隔',
        linkedProjects: '关联项目',
      },
      uploadModal: {
        title: '上传素材',
      },
      generateModal: {
        title: 'AI 生成',
        prompt: '描述您想要的内容',
        duration: '时长（秒）',
        imagePlaceholder: '日落时分宁静的山景...',
        bgmPlaceholder: '带有柔和钢琴的冥想音乐...',
        sfxPlaceholder: '轻柔的铃声...',
      },
      editModal: {
        title: '编辑素材',
      },
    },
    
    settings: {
      title: '设置',
      subtitle: '管理您的应用设置和数据',
      currentTheme: '当前主题',
      changeTheme: '更换主题',
      allThemes: '所有主题预览',
      currentlyUsing: '当前使用',
      dataStats: '数据统计',
      totalProjects: '总项目数',
      totalEpisodes: '总节目数',
      dataManagement: '数据管理',
      exportData: '导出数据',
      exportDataDesc: '下载所有项目数据的备份文件',
      importData: '导入数据',
      importDataDesc: '从备份文件恢复数据',
      comingSoon: '即将推出',
      clearData: '清除所有数据',
      clearDataDesc: '删除所有本地存储的数据',
      clearConfirm1: '确定要清除所有数据吗？此操作无法撤销！',
      clearConfirm2: '再次确认：这将删除所有项目和节目数据！',
      about: '关于',
      aboutText: '为宗教社区打造的播客创作平台。所有数据均存储在本地，保护您的隐私。',
      version: 'v1.0.0',
    },
    
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      confirm: '确认',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      view: '查看',
      close: '关闭',
      back: '返回',
      next: '下一步',
      yes: '是',
      no: '否',
    },
  },

  es: {
    appName: 'Gather',
    appTagline: 'Plataforma de Podcast para Comunidades Religiosas',
    appDescription: 'Crea y comparte podcasts de fe',
    
    nav: {
      home: 'Inicio',
      projects: 'Proyectos',
      voice: 'Voz',
      media: 'Medios',
      settings: 'Configuración',
      switchTheme: 'Cambiar Tema',
    },
    
    religionSelector: {
      title: 'Gather',
      subtitle: 'Plataforma de podcast para comunidades religiosas',
      selectPrompt: 'Selecciona tu fe para comenzar tu viaje',
      startUsing: 'Comenzar',
      footer: 'Almacenamiento Local · Privacidad Protegida · Completamente Gratis',
    },
    
    religions: {
      default: { 
        name: 'Predeterminado', 
        description: 'Genera podcasts y contenido de audio para todas las comunidades' 
      },
      christianity: { 
        name: 'Cristianismo', 
        description: 'Genera podcasts cristianos, sermones y testimonios de audio' 
      },
      catholicism: { 
        name: 'Catolicismo', 
        description: 'Crea podcasts católicos, homilías y contenido de fe' 
      },
      buddhism: { 
        name: 'Budismo', 
        description: 'Produce enseñanzas budistas, guías de meditación y charlas del dharma' 
      },
      islam: { 
        name: 'Islam', 
        description: 'Genera podcasts islámicos, recitaciones del Corán y contenido espiritual' 
      },
      judaism: { 
        name: 'Judaísmo', 
        description: 'Crea podcasts judíos, estudios de la Torá y discusiones de fe' 
      },
      hinduism: { 
        name: 'Hinduismo', 
        description: 'Produce podcasts hindúes, enseñanzas védicas y guías espirituales' 
      },
      taoism: { 
        name: 'Taoísmo', 
        description: 'Genera podcasts taoístas, charlas filosóficas y guías de cultivo' 
      },
    },
    
    dashboard: {
      welcome: 'Bienvenido de Nuevo',
      createNew: 'Crear Nuevo Proyecto',
      viewAll: 'Ver Todos los Proyectos',
      podcastProjects: 'Proyectos de Podcast',
      totalEpisodes: 'Total de Episodios',
      inProgress: 'En Progreso',
      recentProjects: 'Proyectos Recientes',
      noProjects: 'Aún no hay proyectos. ¡Crea tu primer podcast!',
      episodes: 'episodios',
      updatedAt: 'Actualizado el',
    },
    
    stages: {
      planning: { name: 'Planificación', description: 'Define temas, audiencia y formato' },
      scripting: { name: 'Guión', description: 'Escribe guiones y esquemas' },
      recording: { name: 'Grabación', description: 'Graba contenido de audio' },
      editing: { name: 'Edición', description: 'Edita y optimiza el audio' },
      review: { name: 'Revisión', description: 'Revisión final y control de calidad' },
      published: { name: 'Publicado', description: 'Episodio publicado' },
    },
    
    projectList: {
      title: 'Mis Proyectos',
      subtitle: 'Gestiona todos tus proyectos de podcast',
      newProject: 'Nuevo Proyecto',
      searchPlaceholder: 'Buscar proyectos...',
      allStages: 'Todas las Etapas',
      viewDetails: 'Ver Detalles',
      editProject: 'Editar Proyecto',
      deleteProject: 'Eliminar Proyecto',
      deleteConfirm: '¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.',
      noProjectsFound: 'No se encontraron proyectos coincidentes',
      noProjectsYet: 'Aún no hay proyectos',
      adjustSearch: 'Intenta ajustar tus criterios de búsqueda',
      createFirst: 'Crea Tu Primer Proyecto',
      createFirstDesc: 'Comienza a difundir la voz de la fe creando tu primer proyecto de podcast',
    },
    
    projectCreator: {
      title: 'Crear Nuevo Proyecto',
      step: 'Paso',
      of: 'de',
      steps: {
        specConfirmation: { title: 'Confirmación de Especificaciones', description: 'Ingresa o sube la descripción de tu contenido' },
        scriptGeneration: { title: 'Generación de Guión', description: 'Genera guiones con línea de tiempo' },
        characterVoices: { title: 'Personajes y Voces', description: 'Extrae y asigna voces a los personajes' },
        generation: { title: 'Generación', description: 'Genera contenido de audio' },
        postProcessing: { title: 'Post-procesamiento', description: 'Guarda el proyecto' },
      },
      spec: {
        textInput: 'Entrada de Texto',
        fileUpload: 'Subir Archivo',
        contentDescription: 'Descripción del Contenido',
        contentPlaceholder: 'Ingresa la descripción del contenido de podcast que deseas crear...\n\nEjemplo: Quiero crear un audio de meditación guiada de 5 minutos para principiantes, con un estilo tranquilo y relajante...',
        uploadFile: 'Subir Archivo',
        uploadHint: 'Haz clic para subir archivo TXT, PDF o Word',
        analyzeWithAi: 'Analizar con IA',
        analyzing: 'Analizando...',
        generatedSpec: 'Especificación Generada',
        editable: 'Editable',
        storyTitle: 'Título de la Historia',
        targetAudience: '¿Para quién es esto?',
        formatDuration: 'Formato y Duración',
        toneExpression: 'Tono y Expresión',
        bgm: 'Música de Fondo',
        soundEffects: 'Efectos de Sonido',
        visual: 'Visual',
        useExistingCharacters: 'Usar Personajes Existentes',
      },
      script: {
        generateScript: 'Generar Guión con Línea de Tiempo',
        generating: 'Generando guión...',
        regenerate: 'Regenerar',
        preview: 'Vista Previa del Guión',
        coverImageDesc: 'Descripción de la Imagen de Portada',
        timeline: 'Línea de Tiempo',
        scriptContent: 'Guión',
        soundMusic: 'Sonido/Música',
        addTimelineItem: 'Agregar Elemento a la Línea de Tiempo',
      },
      characters: {
        noCharactersDetected: 'No se detectaron personajes',
        noCharactersHint: 'Usa el formato "NombrePersonaje:" en los guiones.',
        extractedCharacters: 'Se extrajeron los siguientes personajes del guión. Asigna una voz a cada uno.',
        selectVoice: 'Seleccionar Voz',
        noVoicesAvailable: 'No hay voces disponibles. Crea personajes en el Estudio de Voz primero.',
        uploadVoiceSample: 'Subir Muestra de Voz',
      },
      generation: {
        generationComplete: '¡Generación Completa!',
        audioReady: 'El audio está listo. Haz clic en siguiente para guardar tu proyecto.',
        audioPreview: 'Vista Previa de Audio',
        visualPreview: 'Vista Previa Visual',
      },
      postProcessing: {
        style: 'Estilo',
        scriptSections: 'Secciones del Guión',
        characterCount: 'Personajes',
        confirmSave: 'Confirma la información anterior y haz clic abajo para guardar el proyecto',
        saveProject: 'Guardar Proyecto',
      },
      buttons: {
        cancel: 'Cancelar',
        back: 'Atrás',
        next: 'Siguiente',
        approve: 'Aprobar',
        create: 'Crear Proyecto',
      },
      confirmInfo: 'Por favor confirma la información anterior antes de crear tu proyecto',
    },
    
    projectDetail: {
      episodeList: 'Lista de Episodios',
      addEpisode: 'Agregar Episodio',
      addFirstEpisode: 'Agregar Primer Episodio',
      noEpisodes: 'Aún no hay episodios. Agrega tu primer episodio para comenzar',
      projectInfo: 'Información del Proyecto',
      createdAt: 'Creado',
      lastUpdated: 'Última Actualización',
      episodeCount: 'Cantidad de Episodios',
      editContent: 'Editar Contenido',
      changeStatus: 'Cambiar Estado',
      deleteEpisode: 'Eliminar Episodio',
    },
    
    episodeEditor: {
      createTitle: 'Crear Nuevo Episodio',
      editTitle: 'Editar Episodio',
      subtitle: 'Completa los detalles del episodio',
      tabs: {
        info: 'Información Básica',
        script: 'Guión',
        notes: 'Notas',
      },
      form: {
        title: 'Título del Episodio',
        titlePlaceholder: 'Ingresa el título del episodio...',
        description: 'Descripción del Episodio',
        descriptionPlaceholder: 'Describe brevemente este episodio...',
        stage: 'Etapa Actual',
        scriptTips: 'Consejos para Escribir el Guión',
        scriptTipsList: [
          'Comienza con un gancho que llame la atención',
          'Mantén el contenido estructurado y organizado',
          'Agrega marcadores de pausa donde sea apropiado',
          'Termina con una reflexión o llamada a la acción',
        ],
        scriptPlaceholder: `Escribe el guión de tu episodio aquí...

[Apertura]
Bienvenidos a...

[Contenido Principal]
Hoy compartiremos...

[Cierre]
Gracias por escuchar...`,
        wordCount: 'Conteo de palabras',
        estimatedDuration: 'Duración estimada',
        minutes: 'min',
        notesPlaceholder: `Agregar notas...

Ejemplos:
- Cuidar el ritmo al grabar
- Referencia de escritura: xxx
- Sugerencia de música: xxx`,
        notesDesc: 'Registra puntos clave, referencias u otras notas',
      },
      buttons: {
        cancel: 'Cancelar',
        save: 'Guardar Cambios',
        create: 'Crear Episodio',
      },
      validation: {
        titleRequired: 'Por favor ingresa un título para el episodio',
      },
    },
    
    voiceStudio: {
      title: 'Estudio de Voz',
      subtitle: 'Graba tu voz y gestiona personajes',
      tabs: {
        record: 'Grabar',
        characters: 'Mis Personajes',
      },
      selectProject: 'Seleccionar Proyecto',
      podcastProject: 'Proyecto de Podcast',
      selectProjectPlaceholder: 'Selecciona un proyecto...',
      episode: 'Episodio',
      selectEpisodePlaceholder: 'Selecciona un episodio...',
      allProjects: 'Todos los Proyectos',
      noProjects: 'Sin proyectos',
      status: {
        ready: 'Listo',
        recording: 'Grabando...',
        paused: 'Pausado',
        completed: 'Grabación Completa',
      },
      tips: {
        title: 'Consejos de Grabación',
        list: [
          'Elige un ambiente tranquilo para minimizar el ruido de fondo',
          'Mantén la distancia adecuada del micrófono (15-20cm)',
          'Respira profundo antes de hablar, mantén un ritmo constante',
          'Haz una grabación de prueba primero para verificar la calidad del audio',
          'Prepara tu guión para evitar muletillas',
        ],
      },
      characters: {
        title: 'Mis Personajes de Voz',
        subtitle: 'Gestiona tus personajes de voz subidos',
        addNew: 'Agregar Personaje',
        noCharacters: 'Aún no hay personajes de voz',
        createFirst: 'Crea tu primer personaje de voz',
        // Upload first flow
        uploadVoiceFirst: 'Subir Muestra de Voz',
        uploadVoiceHint: 'Sube una muestra de voz para crear un personaje',
        dragDropHint: 'Haz clic o arrastra un archivo de audio aquí (MP3, WAV, M4A)',
        analyzing: 'Analizando voz...',
        analyzingHint: 'Detectando características de la voz',
        analysisComplete: 'Análisis completo',
        reupload: 'Subir audio diferente',
        // Form fields
        name: 'Nombre del Personaje',
        namePlaceholder: 'ej., Narrador, Presentador, Invitado...',
        description: 'Descripción',
        descriptionPlaceholder: 'Describe este personaje de voz...',
        tags: 'Etiquetas',
        tagsPlaceholder: 'Separar con comas',
        avatar: 'Avatar',
        uploadAvatar: 'Subir Avatar',
        audioSample: 'Muestra de Voz',
        changeAudio: 'Cambiar Audio',
        playSample: 'Reproducir',
        voiceProvider: 'Proveedor de Voz',
        selectProvider: 'Seleccionar proveedor...',
        voiceId: 'ID de Voz',
        voiceIdPlaceholder: 'Ingresa el ID de voz del proveedor',
        linkedProjects: 'Proyectos Vinculados',
        save: 'Guardar',
        cancel: 'Cancelar',
        edit: 'Editar',
        delete: 'Eliminar',
        deleteConfirm: '¿Estás seguro de que deseas eliminar este personaje?',
        createdAt: 'Creado',
      },
    },
    
    mediaLibrary: {
      title: 'Biblioteca de Medios',
      subtitle: 'Gestiona tus imágenes, música y efectos de sonido',
      upload: 'Subir',
      generate: 'Generar',
      generating: 'Generando...',
      allProjects: 'Todos los Proyectos',
      noProjects: 'Sin proyectos',
      searchPlaceholder: 'Buscar...',
      deleteConfirm: '¿Eliminar este elemento multimedia?',
      tabs: {
        images: 'Imágenes',
        bgm: 'BGM',
        sfx: 'Efectos de Sonido',
      },
      empty: {
        title: 'Sin medios aún',
        description: 'Sube o genera tu primer medio',
      },
      errors: {
        generationFailed: 'Generación fallida: ',
      },
      form: {
        name: 'Nombre',
        type: 'Tipo',
        description: 'Descripción',
        tags: 'Etiquetas',
        tagsPlaceholder: 'Separar con comas',
        linkedProjects: 'Proyectos Vinculados',
      },
      uploadModal: {
        title: 'Subir Medios',
      },
      generateModal: {
        title: 'Generar con IA',
        prompt: 'Describe lo que quieres',
        duration: 'Duración (segundos)',
        imagePlaceholder: 'Un sereno paisaje de montaña al atardecer...',
        bgmPlaceholder: 'Música de meditación tranquila con piano suave...',
        sfxPlaceholder: 'Sonido suave de campana...',
      },
      editModal: {
        title: 'Editar Medios',
      },
    },
    
    settings: {
      title: 'Configuración',
      subtitle: 'Gestiona la configuración de tu aplicación y datos',
      currentTheme: 'Tema Actual',
      changeTheme: 'Cambiar Tema',
      allThemes: 'Vista Previa de Todos los Temas',
      currentlyUsing: 'Actual',
      dataStats: 'Estadísticas de Datos',
      totalProjects: 'Total de Proyectos',
      totalEpisodes: 'Total de Episodios',
      dataManagement: 'Gestión de Datos',
      exportData: 'Exportar Datos',
      exportDataDesc: 'Descarga una copia de seguridad de todos los datos de tus proyectos',
      importData: 'Importar Datos',
      importDataDesc: 'Restaurar datos desde un archivo de respaldo',
      comingSoon: 'Próximamente',
      clearData: 'Borrar Todos los Datos',
      clearDataDesc: 'Eliminar todos los datos almacenados localmente',
      clearConfirm1: '¿Estás seguro de que deseas borrar todos los datos? ¡Esta acción no se puede deshacer!',
      clearConfirm2: 'Confirmación final: ¡Esto eliminará TODOS los proyectos y datos de episodios!',
      about: 'Acerca de',
      aboutText: 'Una plataforma de creación de podcasts para comunidades religiosas. Todos los datos se almacenan localmente para proteger tu privacidad.',
      version: 'v1.0.0',
    },
    
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      view: 'Ver',
      close: 'Cerrar',
      back: 'Atrás',
      next: 'Siguiente',
      yes: 'Sí',
      no: 'No',
    },
  },
};
