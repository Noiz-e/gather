import { useState, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { VoiceCharacter } from '../types';
import { 
  X, Play, Pause, User, Loader2, Upload, Volume2, 
  Wand2, Square, Sparkles, Check, FileAudio, Mic
} from 'lucide-react';
import type { Voice } from '../services/api';

interface VoicePickerModalProps {
  /** The character to assign a voice to */
  character: { name: string; description?: string; assignedVoiceId?: string; tags?: string[] };
  /** System voices (e.g. Gemini TTS) */
  systemVoices: Voice[];
  /** Custom voices from Voice Studio */
  customVoices: VoiceCharacter[];
  /** Currently playing voice id */
  playingVoiceId: string | null;
  /** Currently loading voice id */
  loadingVoiceId: string | null;
  /** Whether AI is recommending */
  isRecommending?: boolean;
  /** Called when user assigns a voice */
  onAssign: (voiceId: string) => void;
  /** Called to preview/play a voice */
  onPlayVoice: (voiceId: string) => void;
  /** Called when a voice is created from uploaded file. Returns the new voice so modal can auto-assign. */
  onCreateVoice?: (name: string, description: string, file: File) => void;
  /** Called when modal closes */
  onClose: () => void;
  /** Called to trigger AI recommendation for this character */
  onRecommend?: () => void;
  /** AI recommended voice IDs for this character */
  recommendedVoiceIds?: string[];
}

export function VoicePickerModal({
  character,
  systemVoices,
  customVoices,
  playingVoiceId,
  loadingVoiceId,
  isRecommending,
  onAssign,
  onPlayVoice,
  onCreateVoice,
  onClose,
  recommendedVoiceIds = [],
}: VoicePickerModalProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'suggested' | 'library' | 'upload'>('library');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [voiceDescription, setVoiceDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  // Local audio preview for uploaded file
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setVoiceName(file.name.replace(/\.[^.]+$/, '')); // Default to filename without extension
    setVoiceDescription('');
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleClearFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setSelectedFile(null);
    setVoiceName('');
    setVoiceDescription('');
    setPreviewUrl(null);
    setPreviewPlaying(false);
  }, [previewUrl]);

  const handlePreviewUploadedFile = useCallback(() => {
    if (!previewUrl) return;
    if (previewPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewPlaying(false);
      return;
    }
    const audio = new Audio(previewUrl);
    audio.onended = () => { setPreviewPlaying(false); previewAudioRef.current = null; };
    audio.onerror = () => { setPreviewPlaying(false); previewAudioRef.current = null; };
    audio.play().catch(() => setPreviewPlaying(false));
    previewAudioRef.current = audio;
    setPreviewPlaying(true);
  }, [previewUrl, previewPlaying]);

  const handleCreateVoice = useCallback(async () => {
    if (!selectedFile || !voiceName.trim() || !onCreateVoice) return;
    setIsCreating(true);
    try {
      onCreateVoice(voiceName.trim(), voiceDescription.trim(), selectedFile);
      // Close modal after creation
      onClose();
    } catch {
      setIsCreating(false);
    }
  }, [selectedFile, voiceName, voiceDescription, onCreateVoice, onClose]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|m4a|aac)$/i.test(file.name))) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const allVoices = [
    ...systemVoices.map(v => ({
      id: v.id,
      name: v.name,
      description: language === 'zh' ? (v.descriptionZh || v.description) : v.description,
      type: 'system' as const,
    })),
    ...customVoices.map(v => ({
      id: v.id,
      name: v.name,
      description: v.description,
      type: 'custom' as const,
    })),
  ];

  const suggestedVoices = recommendedVoiceIds.length > 0 
    ? allVoices.filter(v => recommendedVoiceIds.includes(v.id))
    : allVoices.slice(0, 5); // Show first 5 as suggestions if no AI rec

  const isAssigned = (voiceId: string) => character.assignedVoiceId === voiceId;

  const renderVoiceCard = (voice: { id: string; name: string; description: string; type: 'system' | 'custom' }, showAssignHint?: boolean) => {
    const assigned = isAssigned(voice.id);
    const isPlaying = playingVoiceId === voice.id;
    const isLoading = loadingVoiceId === voice.id;
    
    return (
      <div 
        key={voice.id}
        className={`relative rounded-xl border p-4 transition-all ${
          assigned 
            ? 'border-2' 
            : 'border-t-border hover:border-t-border'
        }`}
        style={assigned ? { 
          borderColor: theme.primary,
          background: `${theme.primary}08`,
        } : { 
          background: 'var(--t-bg-card)' 
        }}
      >
        {assigned && (
          <div 
            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: theme.primary }}
          >
            <Check size={12} className="text-white" />
          </div>
        )}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div 
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${theme.primary}20` }}
          >
            {voice.type === 'custom' ? (
              <Volume2 size={18} style={{ color: theme.primaryLight }} />
            ) : (
              <User size={18} style={{ color: theme.primaryLight }} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-t-text1 truncate">{voice.name}</h4>
            <p className="text-xs text-t-text3 truncate mt-0.5">{voice.description}</p>
            {voice.type === 'custom' && (
              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 bg-t-card-hover text-t-text3">
                {language === 'zh' ? '自定义' : 'Custom'}
              </span>
            )}
          </div>

          {/* Play button */}
          <button
            onClick={(e) => { e.stopPropagation(); onPlayVoice(voice.id); }}
            disabled={isLoading}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 ${
              isPlaying ? '' : 'hover:bg-t-card-hover'
            }`}
            style={isPlaying ? { background: theme.primary } : { background: `${theme.primary}15` }}
            title={language === 'zh' ? '试听' : 'Preview'}
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" style={{ color: theme.primaryLight }} />
            ) : isPlaying ? (
              <Square size={12} className="text-white" />
            ) : (
              <Play size={14} className="ml-0.5" style={{ color: theme.primaryLight }} />
            )}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onPlayVoice(voice.id); }}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-t-border text-t-text2 hover:text-t-text1 hover:bg-t-card-hover transition-all"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {language === 'zh' ? '试听' : 'Preview'}
          </button>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              onAssign(voice.id); 
              if (!showAssignHint) onClose();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              assigned 
                ? 'text-white' 
                : 'text-t-text1 hover:opacity-90'
            }`}
            style={{ 
              background: assigned ? theme.primary : `${theme.primary}20`,
              color: assigned ? '#fff' : theme.primaryLight,
            }}
          >
            {assigned ? <Check size={12} /> : <Volume2 size={12} />}
            {assigned 
              ? (language === 'zh' ? '已选择' : 'Selected') 
              : (language === 'zh' ? '选择此音色' : 'Assign to role')
            }
          </button>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'suggested' as const, label: language === 'zh' ? '推荐' : 'Suggested' },
    { id: 'library' as const, label: language === 'zh' ? '音色库' : 'Library' },
    ...(onCreateVoice ? [{ id: 'upload' as const, label: language === 'zh' ? '创建' : 'Create' }] : []),
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div 
        className="rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-slide-up border border-t-border shadow-2xl"
        style={{ background: 'var(--t-bg-base)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-t-border">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: `${theme.primary}20` }}
            >
              <User size={16} style={{ color: theme.primaryLight }} />
            </div>
            <div>
              <h3 className="text-base font-medium text-t-text1">
                {language === 'zh' ? '选择音色' : 'Choose Voice'}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs text-t-text3">{character.name}</p>
                {character.tags && character.tags.length > 0 && (
                  <>
                    <span className="text-t-text3 text-[10px]">·</span>
                    {character.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        className="inline-block text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: `${theme.primary}15`, color: theme.primaryLight }}
                      >
                        {tag}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-t-card-hover transition-colors text-t-text3 hover:text-t-text1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'text-t-text1' 
                  : 'text-t-text3 hover:text-t-text2 hover:bg-t-card-hover'
              }`}
              style={activeTab === tab.id ? { 
                background: `${theme.primary}20`,
                color: theme.primaryLight,
              } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {activeTab === 'suggested' && (
            <div className="space-y-3">
              <p className="text-xs text-t-text3 mb-3">
                {isRecommending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    {language === 'zh' ? 'AI 正在分析最佳匹配...' : 'AI is analyzing best matches...'}
                  </span>
                ) : (
                  <>
                    <Sparkles size={12} className="inline mr-1.5" style={{ color: theme.primaryLight }} />
                    {language === 'zh' 
                      ? `基于角色描述，以下是为「${character.name}」${character.tags?.length ? `（${character.tags.join('、')}）` : ''}推荐的音色` 
                      : `Based on character profile, here are suggested voices for "${character.name}"${character.tags?.length ? ` (${character.tags.join(', ')})` : ''}`
                    }
                  </>
                )}
              </p>
              {suggestedVoices.length > 0 ? (
                suggestedVoices.map(voice => renderVoiceCard(voice, true))
              ) : (
                <div className="text-center py-8 text-t-text3">
                  <Wand2 size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{language === 'zh' ? '暂无推荐' : 'No suggestions available'}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'library' && (
            <div className="space-y-3">
              {/* System voices */}
              {systemVoices.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-t-text3 uppercase tracking-wider">
                      {language === 'zh' ? '系统音色' : 'System Voices'}
                    </span>
                    <div className="flex-1 h-px bg-t-border" />
                    <span className="text-xs text-t-text3">{systemVoices.length}</span>
                  </div>
                  {allVoices.filter(v => v.type === 'system').map(voice => renderVoiceCard(voice))}
                </>
              )}

              {/* Custom voices */}
              {customVoices.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2 mt-4">
                    <span className="text-xs font-medium text-t-text3 uppercase tracking-wider">
                      {language === 'zh' ? '自定义音色' : 'Custom Voices'}
                    </span>
                    <div className="flex-1 h-px bg-t-border" />
                    <span className="text-xs text-t-text3">{customVoices.length}</span>
                  </div>
                  {allVoices.filter(v => v.type === 'custom').map(voice => renderVoiceCard(voice))}
                </>
              )}

              {allVoices.length === 0 && (
                <div className="text-center py-8 text-t-text3">
                  <Volume2 size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">{language === 'zh' ? '暂无可用音色' : 'No voices available'}</p>
                  <p className="text-xs mt-1">{language === 'zh' ? '请在音色工作室创建自定义音色' : 'Create custom voices in Voice Studio'}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aac"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="hidden"
              />

              {!selectedFile ? (
                /* Step 1: Select file */
                <>
                  <p className="text-sm text-t-text3">
                    {language === 'zh' 
                      ? '上传音频文件创建自定义音色' 
                      : 'Upload an audio file to create a custom voice'}
                  </p>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                      dragOver ? '' : 'border-t-border hover:border-t-border'
                    }`}
                    style={dragOver ? { borderColor: theme.primary, background: `${theme.primary}08` } : {}}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <Upload size={32} className="mx-auto mb-3 text-t-text3" />
                    <p className="text-sm text-t-text2 font-medium">
                      {language === 'zh' ? '点击选择或拖拽音频文件' : 'Click to select or drag audio file'}
                    </p>
                    <p className="text-xs text-t-text3 mt-1.5">
                      WAV, MP3, OGG, FLAC, M4A, AAC
                    </p>
                  </div>
                </>
              ) : (
                /* Step 2: Name & configure the voice */
                <>
                  {/* Selected file preview */}
                  <div 
                    className="rounded-xl border border-t-border p-4"
                    style={{ background: 'var(--t-bg-card)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${theme.primary}15` }}
                      >
                        <FileAudio size={18} style={{ color: theme.primaryLight }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-t-text1 font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-t-text3">
                          {(selectedFile.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      {/* Preview play button */}
                      <button
                        onClick={handlePreviewUploadedFile}
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                        style={{ background: previewPlaying ? theme.primary : `${theme.primary}15` }}
                        title={language === 'zh' ? '试听' : 'Preview'}
                      >
                        {previewPlaying ? (
                          <Square size={10} className="text-white" />
                        ) : (
                          <Play size={12} className="ml-0.5" style={{ color: theme.primaryLight }} />
                        )}
                      </button>
                      {/* Change file button */}
                      <button
                        onClick={handleClearFile}
                        className="p-1.5 rounded-lg text-t-text3 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title={language === 'zh' ? '移除' : 'Remove'}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Voice name input */}
                  <div>
                    <label className="block text-sm font-medium text-t-text2 mb-1.5">
                      {language === 'zh' ? '音色名称' : 'Voice Name'} <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mic size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t-text3" />
                      <input
                        type="text"
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value)}
                        placeholder={language === 'zh' ? '输入音色名称...' : 'Enter voice name...'}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-t-border bg-t-card text-sm text-t-text1 placeholder-t-text3 focus:outline-none focus:border-t-border transition-all"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Voice description (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-t-text2 mb-1.5">
                      {language === 'zh' ? '描述（可选）' : 'Description (optional)'}
                    </label>
                    <input
                      type="text"
                      value={voiceDescription}
                      onChange={(e) => setVoiceDescription(e.target.value)}
                      placeholder={language === 'zh' ? '例如：温暖 / 低沉 / 年轻...' : 'e.g. Warm / Deep / Young...'}
                      className="w-full px-4 py-2.5 rounded-xl border border-t-border bg-t-card text-sm text-t-text1 placeholder-t-text3 focus:outline-none focus:border-t-border transition-all"
                    />
                  </div>

                  {/* Create & assign button */}
                  <button
                    onClick={handleCreateVoice}
                    disabled={!voiceName.trim() || isCreating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: theme.primary, color: '#fff' }}
                  >
                    {isCreating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    {language === 'zh' 
                      ? `创建并分配给「${character.name}」` 
                      : `Create & assign to "${character.name}"`
                    }
                  </button>

                  {/* Or just create without assigning */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-center text-xs text-t-text3 hover:text-t-text2 transition-colors py-1"
                  >
                    {language === 'zh' ? '重新选择文件' : 'Choose a different file'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {character.assignedVoiceId && (
          <div className="px-5 py-3 border-t border-t-border flex items-center gap-2">
            <Check size={14} style={{ color: theme.primaryLight }} />
            <span className="text-xs text-t-text3">
              {language === 'zh' ? '当前已选择: ' : 'Currently selected: '}
              <span className="text-t-text2 font-medium">
                {allVoices.find(v => v.id === character.assignedVoiceId)?.name || character.assignedVoiceId}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
