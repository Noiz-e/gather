import { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { MediaItem } from '../types';
import {
  X, Play, Loader2, Volume2, Square, Check,
  Music, Sparkles, Library, Star
} from 'lucide-react';

export type MediaPickerMode = 'bgm' | 'sfx';

/** What the user chose for a single media slot */
export interface MediaPickerResult {
  /** 'library' = use existing item, 'generate' = generate new, 'preset' = use preset from GCS */
  source: 'library' | 'generate' | 'preset';
  /** If source === 'library', the selected media item */
  mediaItem?: MediaItem;
  /** The prompt/description for generation (used if source === 'generate') */
  prompt: string;
  /** Desired duration in seconds (for SFX) */
  duration?: number;
  /** If source === 'preset', the GCS URL */
  audioUrl?: string;
  /** If source === 'preset', the preset id */
  presetId?: string;
}

// ============ Preset BGM definitions ============

const PRESET_BGM_BASE_URL = 'https://storage.googleapis.com/gatherin.org/killagent/preset-bgm';

export interface PresetBGMItem {
  id: string;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  filename: string;
  url: string;
}

export const PRESET_BGM_LIST: PresetBGMItem[] = [
  {
    id: 'piano',
    name: { zh: '古典钢琴', en: 'Classic Piano' },
    description: { zh: '古典优雅，舒缓的钢琴曲。适合古典故事主题。', en: 'Elegant, soothing piano. Great for classical story themes.' },
    filename: '01J28W6YE9XDDTMXEXDVPKQY73.wav',
    url: `${PRESET_BGM_BASE_URL}/01J28W6YE9XDDTMXEXDVPKQY73.wav`,
  },
  {
    id: 'tragic',
    name: { zh: '悲壮伤感', en: 'Tragic' },
    description: { zh: '略带悲壮伤感的音乐。适合带着悲凉的古典故事。', en: 'Music with a tragic, sorrowful tone for melancholic stories.' },
    filename: '01HSGT2S6NDX81CB1E6DJADBBT.wav',
    url: `${PRESET_BGM_BASE_URL}/01HSGT2S6NDX81CB1E6DJADBBT.wav`,
  },
  {
    id: 'gentle',
    name: { zh: '优雅温柔', en: 'Gentle' },
    description: { zh: '优雅的，温柔的，具有一定节奏的音乐。', en: 'Elegant, gentle music with a steady rhythm.' },
    filename: '01HSH4ZH5DS9CJJ59FWGBMW7QJ.wav',
    url: `${PRESET_BGM_BASE_URL}/01HSH4ZH5DS9CJJ59FWGBMW7QJ.wav`,
  },
  {
    id: 'calm',
    name: { zh: '舒缓宁静', en: 'Calm' },
    description: { zh: '非常舒缓的音乐，适合放松心情，让人感到宁静。', en: 'Very soothing music for relaxation and tranquility.' },
    filename: '01HSH4ZR0M607FBX2YVN196YVJ.wav',
    url: `${PRESET_BGM_BASE_URL}/01HSH4ZR0M607FBX2YVN196YVJ.wav`,
  },
  {
    id: 'epic',
    name: { zh: '史诗压抑', en: 'Epic' },
    description: { zh: '重大事件的背景音乐，充满故事性，氛围稍显压抑。', en: 'Grand event BGM, story-driven with a slightly somber atmosphere.' },
    filename: '01HW4YZB1T4KNS4XCTF3ZS6X30.wav',
    url: `${PRESET_BGM_BASE_URL}/01HW4YZB1T4KNS4XCTF3ZS6X30.wav`,
  },
  {
    id: 'mystery',
    name: { zh: '神秘激昂', en: 'Mystery' },
    description: { zh: '神秘的，从恬静中逐渐变得激昂的音乐。', en: 'Mysterious, building from calm to intense.' },
    filename: '01HY0QZN73GTHNTCKRG0E7V876.wav',
    url: `${PRESET_BGM_BASE_URL}/01HY0QZN73GTHNTCKRG0E7V876.wav`,
  },
  {
    id: 'cheerful',
    name: { zh: '欢快明亮', en: 'Cheerful' },
    description: { zh: '略显欢快的音乐，适合欢乐主题的背景音乐。', en: 'Upbeat music for cheerful, lighthearted topics.' },
    filename: '01HYWZ31M5GQ472JSHWNMQ9691.wav',
    url: `${PRESET_BGM_BASE_URL}/01HYWZ31M5GQ472JSHWNMQ9691.wav`,
  },
  {
    id: 'thinking',
    name: { zh: '思考鼓点', en: 'Thinking' },
    description: { zh: '轻微鼓点，神秘色彩较重，容易诱发思考。', en: 'Subtle drumbeat, mysterious tone that inspires reflection.' },
    filename: '01J2RNZQR3FW4RCJVXAPKR1ZGX.wav',
    url: `${PRESET_BGM_BASE_URL}/01J2RNZQR3FW4RCJVXAPKR1ZGX.wav`,
  },
];

interface MediaPickerModalProps {
  mode: MediaPickerMode;
  /** The prompt/description for this media need (e.g. "gentle piano background" or "door slam") */
  prompt: string;
  /** Desired duration in seconds (mainly for SFX) */
  desiredDuration?: number;
  /** All media items from the library of the matching type */
  libraryItems: MediaItem[];
  /** Pre-selected media item ID (auto-matched) */
  preSelectedId?: string;
  /** Pre-selected preset BGM ID */
  preSelectedPresetId?: string;
  /** AI-recommended preset BGM ID (shown with "AI" badge) */
  aiRecommendedPresetId?: string;
  /** AI ideal BGM description (prefills the generate prompt) */
  aiIdealDescription?: string;
  /** Called when user confirms selection */
  onConfirm: (result: MediaPickerResult) => void;
  /** Called when modal closes */
  onClose: () => void;
  /** Items already used in this project (shown first) */
  projectItemIds?: string[];
  /** Whether generation is in progress */
  isGenerating?: boolean;
}

/**
 * Simple text similarity score (0-1) based on shared words.
 */
function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }
  return shared / Math.max(wordsA.size, wordsB.size);
}

/**
 * Find the best matching media item from library for a given prompt.
 * Returns the item and its similarity score.
 */
export function findBestMatch(
  items: MediaItem[],
  prompt: string,
  type: 'bgm' | 'sfx'
): { item: MediaItem; score: number } | null {
  if (!items.length || !prompt) return null;

  const candidates = items.filter(i => i.type === type);
  if (candidates.length === 0) return null;

  let best: { item: MediaItem; score: number } | null = null;

  for (const item of candidates) {
    // Compare against item's prompt, name, and description
    const scores = [
      textSimilarity(prompt, item.prompt || ''),
      textSimilarity(prompt, item.name),
      textSimilarity(prompt, item.description),
    ];
    const maxScore = Math.max(...scores);
    if (!best || maxScore > best.score) {
      best = { item, score: maxScore };
    }
  }

  // Only return if similarity is above a threshold
  return best && best.score >= 0.3 ? best : null;
}

export function MediaPickerModal({
  mode,
  prompt,
  desiredDuration,
  libraryItems,
  preSelectedId,
  preSelectedPresetId,
  aiRecommendedPresetId,
  aiIdealDescription,
  onConfirm,
  onClose,
  projectItemIds = [],
  isGenerating = false,
}: MediaPickerModalProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isBgmMode = mode === 'bgm';

  // Determine initial tab
  const getInitialTab = (): 'preset' | 'library' | 'generate' => {
    if (preSelectedPresetId && isBgmMode) return 'preset';
    if (preSelectedId) return 'library';
    if (isBgmMode) return 'preset'; // default to preset for BGM
    return libraryItems.length > 0 ? 'library' : 'generate';
  };

  const [activeTab, setActiveTab] = useState<'preset' | 'library' | 'generate'>(getInitialTab());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(preSelectedId || null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(preSelectedPresetId || null);
  // Prefill generate prompt with AI ideal description if available, otherwise use the generic prompt
  const [generatePrompt, setGeneratePrompt] = useState(aiIdealDescription || prompt);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayItem = useCallback((item: MediaItem) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingItemId === item.id) {
      setPlayingItemId(null);
      return;
    }
    const audio = new Audio(item.dataUrl);
    audio.onended = () => { setPlayingItemId(null); audioRef.current = null; };
    audio.onerror = () => { setPlayingItemId(null); audioRef.current = null; };
    audio.play().catch(() => setPlayingItemId(null));
    audioRef.current = audio;
    setPlayingItemId(item.id);
  }, [playingItemId]);

  const handleConfirmLibrary = useCallback(() => {
    const item = libraryItems.find(i => i.id === selectedItemId);
    if (item) {
      onConfirm({
        source: 'library',
        mediaItem: item,
        prompt: item.prompt || item.description,
        duration: item.duration,
      });
    }
  }, [selectedItemId, libraryItems, onConfirm]);

  const handlePlayPreset = useCallback((preset: PresetBGMItem) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingItemId === preset.id) {
      setPlayingItemId(null);
      return;
    }
    const audio = new Audio(preset.url);
    audio.onended = () => { setPlayingItemId(null); audioRef.current = null; };
    audio.onerror = () => { setPlayingItemId(null); audioRef.current = null; };
    audio.play().catch(() => setPlayingItemId(null));
    audioRef.current = audio;
    setPlayingItemId(preset.id);
  }, [playingItemId]);

  const handleConfirmPreset = useCallback(() => {
    const preset = PRESET_BGM_LIST.find(p => p.id === selectedPresetId);
    if (preset) {
      onConfirm({
        source: 'preset',
        prompt: language === 'zh' ? preset.description.zh : preset.description.en,
        audioUrl: preset.url,
        presetId: preset.id,
      });
    }
  }, [selectedPresetId, onConfirm, language]);

  const handleConfirmGenerate = useCallback(() => {
    onConfirm({
      source: 'generate',
      prompt: generatePrompt.trim(),
      duration: desiredDuration,
    });
  }, [generatePrompt, desiredDuration, onConfirm]);

  const isBgm = mode === 'bgm';
  const typeLabel = isBgm
    ? (language === 'zh' ? '背景音乐' : 'BGM')
    : (language === 'zh' ? '音效' : 'Sound Effect');

  // Group items: project items first, then others
  const projectItemSet = new Set(projectItemIds);
  const projectItems = libraryItems.filter(i => projectItemSet.has(i.id));
  const otherItems = libraryItems.filter(i => !projectItemSet.has(i.id));

  const renderItemCard = (item: MediaItem) => {
    const isSelected = selectedItemId === item.id;
    const isPlaying = playingItemId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => setSelectedItemId(item.id)}
        className={`relative rounded-xl border p-3 transition-all cursor-pointer group ${
          isSelected ? 'border-2' : 'border-t-border hover:border-t-border'
        }`}
        style={isSelected ? {
          borderColor: theme.primary,
          background: `${theme.primary}08`,
        } : {
          background: 'var(--t-bg-card)',
        }}
      >
        {isSelected && (
          <div
            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: theme.primary }}
          >
            <Check size={12} className="text-white" />
          </div>
        )}
        <div className="flex items-center gap-3">
          {/* Play button */}
          <div
            className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${theme.primary}20` }}
            onClick={(e) => { e.stopPropagation(); handlePlayItem(item); }}
          >
            <span className={`transition-opacity duration-150 ${isPlaying ? 'opacity-0' : 'group-hover:opacity-0'}`}>
              {isBgm ? (
                <Music size={16} style={{ color: theme.primaryLight }} />
              ) : (
                <Volume2 size={16} style={{ color: theme.primaryLight }} />
              )}
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center rounded-full transition-all duration-150 ${
                isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
              }`}
              style={{ background: isPlaying ? theme.primary : `${theme.primary}40` }}
            >
              {isPlaying ? <Square size={10} className="text-white" /> : <Play size={14} className="ml-0.5 text-white" />}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-t-text1 truncate">{item.name}</h4>
            <p className="text-xs text-t-text3 truncate mt-0.5">
              {item.prompt || item.description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {item.duration && (
                <span className="text-[10px] text-t-text3">
                  {item.duration >= 60
                    ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}`
                    : `${item.duration.toFixed(1)}s`}
                </span>
              )}
              {item.source === 'generated' && (
                <span
                  className="inline-block text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: `${theme.primary}15`, color: theme.primaryLight }}
                >
                  AI
                </span>
              )}
              {item.tags?.map((tag, idx) => (
                <span key={idx} className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-t-card-hover text-t-text3">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPresetCard = (preset: PresetBGMItem) => {
    const isSelected = selectedPresetId === preset.id;
    const isPlaying = playingItemId === preset.id;

    return (
      <div
        key={preset.id}
        onClick={() => setSelectedPresetId(preset.id)}
        className={`relative rounded-xl border p-3 transition-all cursor-pointer group ${
          isSelected ? 'border-2' : 'border-t-border hover:border-t-border'
        }`}
        style={isSelected ? {
          borderColor: theme.primary,
          background: `${theme.primary}08`,
        } : {
          background: 'var(--t-bg-card)',
        }}
      >
        {isSelected && (
          <div
            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: theme.primary }}
          >
            <Check size={12} className="text-white" />
          </div>
        )}
        <div className="flex items-center gap-3">
          {/* Play button */}
          <div
            className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${theme.primary}20` }}
            onClick={(e) => { e.stopPropagation(); handlePlayPreset(preset); }}
          >
            <span className={`transition-opacity duration-150 ${isPlaying ? 'opacity-0' : 'group-hover:opacity-0'}`}>
              <Music size={16} style={{ color: theme.primaryLight }} />
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center rounded-full transition-all duration-150 ${
                isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
              }`}
              style={{ background: isPlaying ? theme.primary : `${theme.primary}40` }}
            >
              {isPlaying ? <Square size={10} className="text-white" /> : <Play size={14} className="ml-0.5 text-white" />}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-t-text1 truncate">
              {language === 'zh' ? preset.name.zh : preset.name.en}
              {aiRecommendedPresetId === preset.id && (
                <span
                  className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{ background: `${theme.primary}15`, color: theme.primaryLight }}
                >
                  AI
                </span>
              )}
            </h4>
            <p className="text-xs text-t-text3 truncate mt-0.5">
              {language === 'zh' ? preset.description.zh : preset.description.en}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    ...(isBgmMode ? [{ id: 'preset' as const, label: language === 'zh' ? '默认' : 'Preset', icon: Star }] : []),
    { id: 'library' as const, label: language === 'zh' ? '媒体库' : 'Library', icon: Library },
    { id: 'generate' as const, label: language === 'zh' ? '生成新的' : 'Generate New', icon: Sparkles },
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
              {isBgm ? (
                <Music size={16} style={{ color: theme.primaryLight }} />
              ) : (
                <Volume2 size={16} style={{ color: theme.primaryLight }} />
              )}
            </div>
            <div>
              <h3 className="text-base font-medium text-t-text1">
                {language === 'zh' ? `选择${typeLabel}` : `Choose ${typeLabel}`}
              </h3>
              <p className="text-xs text-t-text3 truncate max-w-[250px]">{prompt}</p>
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
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-t-text1'
                  : 'text-t-text3 hover:text-t-text2 hover:bg-t-card-hover'
              }`}
              style={activeTab === tab.id ? {
                background: `${theme.primary}20`,
                color: theme.primaryLight,
              } : {}}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {activeTab === 'preset' && isBgmMode && (
            <div className="space-y-3">
              {aiRecommendedPresetId && (
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={12} style={{ color: theme.primaryLight }} />
                  <span className="text-xs font-medium text-t-text3">
                    {language === 'zh' ? 'AI 推荐' : 'AI Recommended'}
                  </span>
                  <div className="flex-1 h-px bg-t-border" />
                </div>
              )}
              {/* Show AI-recommended preset first */}
              {aiRecommendedPresetId && (() => {
                const aiPreset = PRESET_BGM_LIST.find(p => p.id === aiRecommendedPresetId);
                return aiPreset ? renderPresetCard(aiPreset) : null;
              })()}
              {aiRecommendedPresetId && (
                <div className="flex items-center gap-2 mb-1 mt-4">
                  <span className="text-xs font-medium text-t-text3">
                    {language === 'zh' ? '全部' : 'All'}
                  </span>
                  <div className="flex-1 h-px bg-t-border" />
                </div>
              )}
              {PRESET_BGM_LIST
                .filter(p => !aiRecommendedPresetId || p.id !== aiRecommendedPresetId)
                .map(preset => renderPresetCard(preset))}
            </div>
          )}

          {activeTab === 'library' && (
            <div className="space-y-3">
              {/* Project items */}
              {projectItems.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-t-text3 uppercase tracking-wider">
                      {language === 'zh' ? '项目已有' : 'In Project'}
                    </span>
                    <div className="flex-1 h-px bg-t-border" />
                    <span className="text-xs text-t-text3">{projectItems.length}</span>
                  </div>
                  {projectItems.map(item => renderItemCard(item))}
                </>
              )}

              {/* Other items */}
              {otherItems.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2 mt-4">
                    <span className="text-xs font-medium text-t-text3 uppercase tracking-wider">
                      {language === 'zh' ? '全部' : 'All'}
                    </span>
                    <div className="flex-1 h-px bg-t-border" />
                    <span className="text-xs text-t-text3">{otherItems.length}</span>
                  </div>
                  {otherItems.map(item => renderItemCard(item))}
                </>
              )}

              {libraryItems.length === 0 && (
                <div className="text-center py-8 text-t-text3">
                  {isBgm ? (
                    <Music size={32} className="mx-auto mb-3 opacity-40" />
                  ) : (
                    <Volume2 size={32} className="mx-auto mb-3 opacity-40" />
                  )}
                  <p className="text-sm">
                    {language === 'zh' ? `暂无${typeLabel}` : `No ${typeLabel} available`}
                  </p>
                  <p className="text-xs mt-1">
                    {language === 'zh' ? '切换到"生成新的"标签页创建' : 'Switch to "Generate New" tab to create one'}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div
                className="rounded-xl border border-t-border p-4 space-y-3"
                style={{ background: 'var(--t-bg-card)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} style={{ color: theme.primaryLight }} />
                  <span className="text-xs font-medium text-t-text2 uppercase tracking-wider">
                    {language === 'zh' ? 'AI 生成' : 'AI Generate'}
                  </span>
                </div>
                <textarea
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder={isBgm
                    ? (language === 'zh'
                      ? '描述你想要的背景音乐...\n例如：温暖的钢琴曲，节奏舒缓'
                      : 'Describe the BGM you want...\ne.g. Warm piano melody, gentle tempo')
                    : (language === 'zh'
                      ? '描述你想要的音效...\n例如：关门声、雨声'
                      : 'Describe the sound effect...\ne.g. Door closing, rain sounds')
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-t-border bg-t-bg-base text-sm text-t-text1 placeholder-t-text3 focus:outline-none focus:border-t-border transition-all resize-none"
                  rows={3}
                />
                {desiredDuration && !isBgm && (
                  <p className="text-xs text-t-text3">
                    {language === 'zh'
                      ? `建议时长: ~${desiredDuration}s`
                      : `Suggested duration: ~${desiredDuration}s`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-t-border flex items-center justify-between">
          {/* Current selection hint */}
          <div className="text-xs text-t-text3 flex-1 min-w-0 truncate">
            {activeTab === 'preset' && selectedPresetId && (
              <span className="flex items-center gap-1">
                <Check size={12} style={{ color: theme.primaryLight }} />
                {language === 'zh' ? '已选择: ' : 'Selected: '}
                <span className="text-t-text2 font-medium">
                  {language === 'zh'
                    ? PRESET_BGM_LIST.find(p => p.id === selectedPresetId)?.name.zh
                    : PRESET_BGM_LIST.find(p => p.id === selectedPresetId)?.name.en}
                </span>
              </span>
            )}
            {activeTab === 'library' && selectedItemId && (
              <span className="flex items-center gap-1">
                <Check size={12} style={{ color: theme.primaryLight }} />
                {language === 'zh' ? '已选择: ' : 'Selected: '}
                <span className="text-t-text2 font-medium">
                  {libraryItems.find(i => i.id === selectedItemId)?.name || ''}
                </span>
              </span>
            )}
          </div>

          {/* Action button */}
          {activeTab === 'preset' ? (
            <button
              onClick={handleConfirmPreset}
              disabled={!selectedPresetId}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: theme.primary, color: '#fff' }}
            >
              <Check size={14} />
              {language === 'zh' ? '使用选中' : 'Use Selected'}
            </button>
          ) : activeTab === 'library' ? (
            <button
              onClick={handleConfirmLibrary}
              disabled={!selectedItemId}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: theme.primary, color: '#fff' }}
            >
              <Check size={14} />
              {language === 'zh' ? '使用选中' : 'Use Selected'}
            </button>
          ) : (
            <button
              onClick={handleConfirmGenerate}
              disabled={!generatePrompt.trim() || isGenerating}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: theme.primary, color: '#fff' }}
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {isGenerating
                ? (language === 'zh' ? '生成中...' : 'Generating...')
                : (language === 'zh' ? '生成新的' : 'Generate New')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
