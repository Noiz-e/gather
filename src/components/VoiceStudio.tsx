import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useProjects } from '../contexts/ProjectContext';
import { VoiceCharacter } from '../types';
import { Mic, Square, Play, Pause, Download, Trash2, Plus, User, Volume2, Edit2, X, Upload, AudioWaveform, FolderOpen, Link2 } from 'lucide-react';

// Storage key for voice characters
const VOICE_CHARACTERS_KEY = 'gather-voice-characters';

// Helper functions for voice characters storage
const loadVoiceCharacters = (): VoiceCharacter[] => {
  try {
    const data = localStorage.getItem(VOICE_CHARACTERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveVoiceCharacters = (characters: VoiceCharacter[]) => {
  localStorage.setItem(VOICE_CHARACTERS_KEY, JSON.stringify(characters));
};

export function VoiceStudio() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { projects } = useProjects();
  
  // Characters states - load first to determine default tab
  const [characters, setCharacters] = useState<VoiceCharacter[]>(() => loadVoiceCharacters());
  
  // Tab state - default to 'characters' if there are any characters, otherwise 'record'
  const [activeTab, setActiveTab] = useState<'record' | 'characters'>(() => 
    loadVoiceCharacters().length > 0 ? 'characters' : 'record'
  );
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  
  // Characters editor states
  const [showCharacterEditor, setShowCharacterEditor] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<VoiceCharacter | null>(null);
  const [characterForm, setCharacterForm] = useState({
    name: '',
    description: '',
    tags: '',
    audioSampleUrl: '',
    projectIds: [] as string[],
  });
  
  // Project filter
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [playingCharacterId, setPlayingCharacterId] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const characterAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration((prev) => prev + 1), 1000);
    } catch {
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = window.setInterval(() => setDuration((prev) => prev + 1), 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsPaused(!isPaused);
  };

  const clearRecording = () => { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); setDuration(0); };

  const downloadRecording = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `recording-${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
  };

  const getStatusText = () => {
    if (isRecording) return isPaused ? t.voiceStudio.status.paused : t.voiceStudio.status.recording;
    if (audioUrl) return t.voiceStudio.status.completed;
    return t.voiceStudio.status.ready;
  };

  // Character functions
  const openCharacterEditor = (character?: VoiceCharacter) => {
    if (character) {
      // Editing existing character - show form directly
      setEditingCharacter(character);
      setCharacterForm({
        name: character.name,
        description: character.description,
        tags: character.tags.join(', '),
        audioSampleUrl: character.audioSampleUrl || '',
        projectIds: character.projectIds || [],
      });
      setAudioUploaded(true); // Already has audio
    } else {
      // New character - start with upload flow
      setEditingCharacter(null);
      setCharacterForm({
        name: '',
        description: '',
        tags: '',
        audioSampleUrl: '',
        projectIds: [],
      });
      setAudioUploaded(false);
    }
    setIsAnalyzing(false);
    setShowCharacterEditor(true);
  };

  const handleAudioUpload = async (file: File) => {
    // Create URL for the uploaded audio
    const audioUrl = URL.createObjectURL(file);
    setCharacterForm(prev => ({ ...prev, audioSampleUrl: audioUrl }));
    setIsAnalyzing(true);

    // Simulate AI analysis (in real app, this would call an API)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Extract filename as suggested name (remove extension)
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    // Generate suggested values based on "analysis"
    const suggestedName = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    setCharacterForm(prev => ({
      ...prev,
      name: suggestedName || 'Voice Character',
      description: `Voice character created from ${file.name}`,
      tags: 'custom, uploaded',
    }));
    
    setIsAnalyzing(false);
    setAudioUploaded(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      handleAudioUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      handleAudioUpload(file);
    }
  };

  const resetAudioUpload = () => {
    if (characterForm.audioSampleUrl && !editingCharacter?.audioSampleUrl) {
      URL.revokeObjectURL(characterForm.audioSampleUrl);
    }
    setCharacterForm(prev => ({
      ...prev,
      audioSampleUrl: '',
      name: '',
      description: '',
      tags: '',
    }));
    setAudioUploaded(false);
  };

  const togglePreviewAudio = () => {
    if (previewAudioRef.current) {
      if (isPlayingPreview) {
        previewAudioRef.current.pause();
        setIsPlayingPreview(false);
      } else {
        previewAudioRef.current.src = characterForm.audioSampleUrl;
        previewAudioRef.current.play();
        setIsPlayingPreview(true);
      }
    }
  };

  const saveCharacter = () => {
    const now = new Date().toISOString();
    const tagsArray = characterForm.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    
    if (editingCharacter) {
      // Update existing character
      const updated = characters.map(c => 
        c.id === editingCharacter.id 
          ? { 
              ...c, 
              name: characterForm.name,
              description: characterForm.description,
              tags: tagsArray,
              audioSampleUrl: characterForm.audioSampleUrl || undefined,
              projectIds: characterForm.projectIds,
              updatedAt: now,
            }
          : c
      );
      setCharacters(updated);
      saveVoiceCharacters(updated);
    } else {
      // Create new character
      const newCharacter: VoiceCharacter = {
        id: `char-${Date.now()}`,
        name: characterForm.name,
        description: characterForm.description,
        tags: tagsArray,
        audioSampleUrl: characterForm.audioSampleUrl || undefined,
        projectIds: characterForm.projectIds,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [...characters, newCharacter];
      setCharacters(updated);
      saveVoiceCharacters(updated);
    }
    
    setShowCharacterEditor(false);
    setAudioUploaded(false);
  };
  
  // Filter characters by project
  const filteredCharacters = filterProjectId 
    ? characters.filter(c => c.projectIds?.includes(filterProjectId))
    : characters;

  const deleteCharacter = (id: string) => {
    if (confirm(t.voiceStudio.characters.deleteConfirm)) {
      const updated = characters.filter(c => c.id !== id);
      setCharacters(updated);
      saveVoiceCharacters(updated);
    }
  };

  const playCharacterSample = (character: VoiceCharacter) => {
    if (character.audioSampleUrl) {
      if (playingCharacterId === character.id) {
        characterAudioRef.current?.pause();
        setPlayingCharacterId(null);
      } else {
        if (characterAudioRef.current) {
          characterAudioRef.current.src = character.audioSampleUrl;
          characterAudioRef.current.play();
          setPlayingCharacterId(character.id);
        }
      }
    }
  };


  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-white tracking-wide">{t.voiceStudio.title}</h1>
        <p className="text-white/50 mt-1 text-sm md:text-base">{t.voiceStudio.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/5 w-fit">
        <button
          onClick={() => setActiveTab('record')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'record' 
              ? 'text-white' 
              : 'text-white/50 hover:text-white/80'
          }`}
          style={activeTab === 'record' ? { background: theme.bgCard, boxShadow: `0 0 20px ${theme.glow}` } : {}}
        >
          <Mic size={16} />
          {t.voiceStudio.tabs.record}
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'characters' 
              ? 'text-white' 
              : 'text-white/50 hover:text-white/80'
          }`}
          style={activeTab === 'characters' ? { background: theme.bgCard, boxShadow: `0 0 20px ${theme.glow}` } : {}}
        >
          <AudioWaveform size={16} />
          {t.voiceStudio.tabs.characters}
        </button>
      </div>

      {/* Record Tab */}
      {activeTab === 'record' && (
        <>
          {/* Recording Interface */}
          <div className="rounded-xl md:rounded-2xl p-4 sm:p-6 lg:p-12 border border-white/10 relative overflow-hidden" style={{ background: theme.bgCard }}>
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[400px] h-[200px] md:h-[400px] rounded-full blur-[60px] md:blur-[100px] opacity-20" style={{ background: isRecording ? theme.primary : 'transparent' }} />
            </div>

            {/* Timer Display */}
            <div className="text-center mb-6 md:mb-12 relative">
              <div className="text-4xl sm:text-5xl md:text-7xl font-mono font-light tracking-wider" style={{ color: theme.textOnDark }}>
                {formatTime(duration)}
              </div>
              <p className="text-white/40 mt-2 md:mt-4 text-xs md:text-sm tracking-widest uppercase">{getStatusText()}</p>
            </div>

            {/* Waveform */}
            <div className="h-14 md:h-20 rounded-xl md:rounded-2xl mb-6 md:mb-12 flex items-center justify-center overflow-hidden" style={{ background: `${theme.primary}10` }}>
              {isRecording && !isPaused ? (
                <div className="flex items-end gap-0.5 md:gap-1 h-10 md:h-12">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 md:w-1 rounded-full animate-pulse"
                      style={{ backgroundColor: theme.primaryLight, height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 30}ms` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-0.5 md:gap-1 h-10 md:h-12">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="w-1 md:w-1 rounded-full" style={{ backgroundColor: theme.primary, opacity: 0.2, height: '20%' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 md:gap-6 relative">
              {!isRecording && !audioUrl && (
                <button
                  onClick={startRecording}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95"
                  style={{ background: theme.primary, boxShadow: `0 0 40px ${theme.glow}` }}
                >
                  <Mic size={28} className="md:hidden" />
                  <Mic size={36} className="hidden md:block" />
                </button>
              )}

              {isRecording && (
                <>
                  <button onClick={togglePause} className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95" style={{ background: `${theme.primary}80` }}>
                    {isPaused ? <Play size={20} className="md:hidden" /> : <Pause size={20} className="md:hidden" />}
                    {isPaused ? <Play size={24} className="hidden md:block" /> : <Pause size={24} className="hidden md:block" />}
                  </button>
                  <button onClick={stopRecording} className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white bg-red-500 transition-all hover:scale-110 active:scale-95" style={{ boxShadow: '0 0 40px rgba(239, 68, 68, 0.4)' }}>
                    <Square size={28} className="md:hidden" />
                    <Square size={36} className="hidden md:block" />
                  </button>
                </>
              )}

              {audioUrl && !isRecording && (
                <>
                  <button onClick={clearRecording} className="w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-all hover:scale-110 active:scale-95">
                    <Trash2 size={18} className="md:hidden" />
                    <Trash2 size={20} className="hidden md:block" />
                  </button>
                  <button
                    onClick={() => { if (audioRef.current) audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause(); }}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
                    style={{ background: theme.primary, boxShadow: `0 0 40px ${theme.glow}` }}
                  >
                    <Play size={28} className="md:hidden" />
                    <Play size={36} className="hidden md:block" />
                  </button>
                  <button onClick={downloadRecording} className="w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={{ background: theme.accent, color: theme.primaryDark }}>
                    <Download size={18} className="md:hidden" />
                    <Download size={20} className="hidden md:block" />
                  </button>
                </>
              )}
            </div>

            {audioUrl && (
              <div className="mt-6 md:mt-8">
                <audio ref={audioRef} src={audioUrl} controls className="w-full opacity-70" />
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: `${theme.primary}10` }}>
            <h3 className="font-serif text-white mb-2 md:mb-3 text-sm md:text-base">💡 {t.voiceStudio.tips.title}</h3>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-white/60">
              {t.voiceStudio.tips.list.map((tip, i) => (<li key={i}>• {tip}</li>))}
            </ul>
          </div>
        </>
      )}

      {/* Characters Tab */}
      {activeTab === 'characters' && (
        <>
          {/* Characters Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-serif text-white">{t.voiceStudio.characters.title}</h2>
              <p className="text-white/50 text-sm">{t.voiceStudio.characters.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Project filter */}
              <div className="relative">
                <FolderOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <select
                  value={filterProjectId}
                  onChange={(e) => setFilterProjectId(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-gray-900">{t.voiceStudio?.allProjects || 'All Projects'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id} className="bg-gray-900">{p.title}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => openCharacterEditor()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-300 hover:scale-105"
                style={{ background: theme.primary, boxShadow: `0 0 20px ${theme.glow}` }}
              >
                <Plus size={16} />
                {t.voiceStudio.characters.addNew}
              </button>
            </div>
          </div>

          {/* Characters Grid */}
          {filteredCharacters.length === 0 ? (
            <div className="rounded-xl md:rounded-2xl p-8 md:p-12 border border-white/10 text-center" style={{ background: theme.bgCard }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: `${theme.primary}20` }}>
                <User size={32} className="text-white/40" />
              </div>
              <h3 className="text-white font-serif mb-2">{t.voiceStudio.characters.noCharacters}</h3>
              <p className="text-white/50 text-sm mb-6">{t.voiceStudio.characters.createFirst}</p>
              <button
                onClick={() => openCharacterEditor()}
                className="px-6 py-3 rounded-xl text-white text-sm font-medium transition-all duration-300 hover:scale-105"
                style={{ background: theme.primary }}
              >
                <Plus size={16} className="inline mr-2" />
                {t.voiceStudio.characters.addNew}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCharacters.map((character) => (
                <div
                  key={character.id}
                  className="rounded-xl p-4 border border-white/10 transition-all duration-300 hover:border-white/20"
                  style={{ background: theme.bgCard }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${theme.primary}20` }}
                    >
                      {character.avatarUrl ? (
                        <img src={character.avatarUrl} alt={character.name} className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        <User size={24} style={{ color: theme.primaryLight }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{character.name}</h3>
                      <p className="text-white/50 text-sm line-clamp-2">{character.description}</p>
                    </div>
                  </div>
                  
                  {character.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {character.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ background: `${theme.primary}20`, color: theme.primaryLight }}>
                          {tag}
                        </span>
                      ))}
                      {character.tags.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full text-xs text-white/40">+{character.tags.length - 3}</span>
                      )}
                    </div>
                  )}


                  {/* Linked projects */}
                  {character.projectIds && character.projectIds.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-white/40">
                      <Link2 size={12} />
                      {character.projectIds.slice(0, 2).map((pid, i) => {
                        const proj = projects.find(p => p.id === pid);
                        return proj ? (
                          <span key={pid}>
                            {i > 0 && ', '}
                            <span className="truncate max-w-[80px] inline-block align-bottom">{proj.title}</span>
                          </span>
                        ) : null;
                      })}
                      {character.projectIds.length > 2 && <span>+{character.projectIds.length - 2}</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                    {character.audioSampleUrl && (
                      <button
                        onClick={() => playCharacterSample(character)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{ background: `${theme.primary}20`, color: theme.primaryLight }}
                      >
                        {playingCharacterId === character.id ? <Pause size={12} /> : <Volume2 size={12} />}
                        {t.voiceStudio.characters.playSample}
                      </button>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => openCharacterEditor(character)}
                      className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteCharacter(character.id)}
                      className="p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hidden audio element for character samples */}
          <audio 
            ref={characterAudioRef} 
            onEnded={() => setPlayingCharacterId(null)}
            className="hidden"
          />
        </>
      )}

      {/* Character Editor Modal */}
      {showCharacterEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-lg rounded-2xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto"
            style={{ background: theme.bgDark }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-white">
                {editingCharacter ? t.voiceStudio.characters.edit : t.voiceStudio.characters.addNew}
              </h2>
              <button
                onClick={() => { setShowCharacterEditor(false); setAudioUploaded(false); }}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Upload Audio (for new characters only) */}
            {!editingCharacter && !audioUploaded && !isAnalyzing && (
              <div className="text-center">
                <div 
                  className="rounded-2xl border-2 border-dashed border-white/20 p-8 cursor-pointer hover:border-white/40 transition-all"
                  onClick={() => audioInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div 
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: `${theme.primary}20` }}
                  >
                    <Upload size={28} style={{ color: theme.primaryLight }} />
                  </div>
                  <h3 className="text-white font-medium mb-2">{t.voiceStudio.characters.uploadVoiceFirst}</h3>
                  <p className="text-white/50 text-sm mb-4">{t.voiceStudio.characters.uploadVoiceHint}</p>
                  <p className="text-white/30 text-xs">{t.voiceStudio.characters.dragDropHint}</p>
                </div>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => { setShowCharacterEditor(false); }}
                  className="mt-6 px-6 py-2 text-white/50 hover:text-white/80 transition-all text-sm"
                >
                  {t.voiceStudio.characters.cancel}
                </button>
              </div>
            )}

            {/* Analyzing State */}
            {isAnalyzing && (
              <div className="text-center py-8">
                <div 
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center animate-pulse"
                  style={{ background: `${theme.primary}30` }}
                >
                  <AudioWaveform size={28} style={{ color: theme.primaryLight }} />
                </div>
                <h3 className="text-white font-medium mb-2">{t.voiceStudio.characters.analyzing}</h3>
                <p className="text-white/50 text-sm">{t.voiceStudio.characters.analyzingHint}</p>
              </div>
            )}

            {/* Step 2: Form (after upload or when editing) */}
            {(audioUploaded || editingCharacter) && !isAnalyzing && (
              <>
                <div className="space-y-4">
                  {/* Audio Sample Preview */}
                  {characterForm.audioSampleUrl && (
                    <div 
                      className="rounded-xl p-4 border border-white/10"
                      style={{ background: `${theme.primary}10` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={togglePreviewAudio}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                            style={{ background: theme.primary }}
                          >
                            {isPlayingPreview ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
                          </button>
                          <div>
                            <p className="text-white text-sm font-medium">{t.voiceStudio.characters.audioSample}</p>
                            <p className="text-white/50 text-xs">{t.voiceStudio.characters.analysisComplete}</p>
                          </div>
                        </div>
                        {!editingCharacter && (
                          <button
                            onClick={resetAudioUpload}
                            className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all"
                          >
                            {t.voiceStudio.characters.reupload}
                          </button>
                        )}
                      </div>
                      <audio 
                        ref={previewAudioRef} 
                        onEnded={() => setIsPlayingPreview(false)}
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/50 mb-2">{t.voiceStudio.characters.name}</label>
                    <input
                      type="text"
                      value={characterForm.name}
                      onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
                      placeholder={t.voiceStudio.characters.namePlaceholder}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white/50 mb-2">{t.voiceStudio.characters.description}</label>
                    <textarea
                      value={characterForm.description}
                      onChange={(e) => setCharacterForm({ ...characterForm, description: e.target.value })}
                      placeholder={t.voiceStudio.characters.descriptionPlaceholder}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-white/50 mb-2">{t.voiceStudio.characters.tags}</label>
                    <input
                      type="text"
                      value={characterForm.tags}
                      onChange={(e) => setCharacterForm({ ...characterForm, tags: e.target.value })}
                      placeholder={t.voiceStudio.characters.tagsPlaceholder}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20"
                    />
                  </div>

                  {/* Avatar Upload */}
                  <div>
                    <label className="block text-sm font-medium text-white/50 mb-2">{t.voiceStudio.characters.avatar}</label>
                    <button
                      className="w-full px-4 py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:border-white/40 hover:text-white/70 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload size={16} />
                      {t.voiceStudio.characters.uploadAvatar}
                    </button>
                  </div>

                  {/* Linked Projects */}
                  <div>
                    <label className="block text-sm font-medium text-white/50 mb-2">
                      <Link2 size={14} className="inline mr-1" />
                      {t.voiceStudio?.characters?.linkedProjects || 'Linked Projects'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {projects.map(p => {
                        const isLinked = characterForm.projectIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setCharacterForm(prev => ({
                                ...prev,
                                projectIds: isLinked 
                                  ? prev.projectIds.filter(id => id !== p.id)
                                  : [...prev.projectIds, p.id]
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isLinked 
                                ? 'text-white' 
                                : 'text-white/50 hover:text-white/70 border border-white/10 hover:border-white/20'
                            }`}
                            style={isLinked ? { background: theme.primary } : {}}
                          >
                            <FolderOpen size={12} className="inline mr-1" />
                            {p.title}
                          </button>
                        );
                      })}
                      {projects.length === 0 && (
                        <span className="text-white/30 text-sm">{t.voiceStudio?.noProjects || 'No projects'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => { setShowCharacterEditor(false); setAudioUploaded(false); }}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all"
                  >
                    {t.voiceStudio.characters.cancel}
                  </button>
                  <button
                    onClick={saveCharacter}
                    disabled={!characterForm.name.trim()}
                    className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: theme.primary }}
                  >
                    {t.voiceStudio.characters.save}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
