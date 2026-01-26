import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProjects } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Mic, Square, Play, Pause, Download, Trash2 } from 'lucide-react';

export function RecordingStudio() {
  const { theme, religion } = useTheme();
  const { getProjectsByReligion } = useProjects();
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const myProjects = religion ? getProjectsByReligion(religion) : [];
  const currentProject = myProjects.find((p) => p.id === selectedProject);
  const episodes = currentProject?.episodes || [];

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

  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-light text-white tracking-wide">{t.voiceStudio.title}</h1>
        <p className="text-white/50 mt-1 text-sm md:text-base">{t.voiceStudio.subtitle}</p>
      </div>

      {/* Project Selection */}
      <div className="rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/10" style={{ background: theme.bgCard }}>
        <h2 className="text-base md:text-lg font-serif text-white mb-3 md:mb-4">{t.voiceStudio.selectProject}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-white/50 mb-1.5 md:mb-2">{t.voiceStudio.podcastProject}</label>
            <select
              value={selectedProject}
              onChange={(e) => { setSelectedProject(e.target.value); setSelectedEpisode(''); }}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 text-sm md:text-base"
            >
              <option value="" className="bg-gray-900">{t.voiceStudio.selectProjectPlaceholder}</option>
              {myProjects.map((project) => (<option key={project.id} value={project.id} className="bg-gray-900">{project.title}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-white/50 mb-1.5 md:mb-2">{t.voiceStudio.episode}</label>
            <select
              value={selectedEpisode}
              onChange={(e) => setSelectedEpisode(e.target.value)}
              disabled={!selectedProject}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/20 disabled:opacity-50 text-sm md:text-base"
            >
              <option value="" className="bg-gray-900">{t.voiceStudio.selectEpisodePlaceholder}</option>
              {episodes.map((episode, index) => (<option key={episode.id} value={episode.id} className="bg-gray-900">#{index + 1}: {episode.title}</option>))}
            </select>
          </div>
        </div>
      </div>

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
          {t.voiceStudio.tips.list.map((tip: string, i: number) => (<li key={i}>• {tip}</li>))}
        </ul>
      </div>
    </div>
  );
}
