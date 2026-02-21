/**
 * Shared Script Editor step component.
 * Used by both ProjectCreator (Step 4) and EpisodeCreator (Step 2).
 */
import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { ScriptSection, ScriptTimelineItem } from '../../../types';
import {
  ChevronRight, Plus, Trash2, X, Sparkles, Loader2, RefreshCw, Pause, Scissors,
} from 'lucide-react';
import type { ScriptEditorActions } from './useScriptEditor';

interface ScriptEditorStepProps {
  scriptSections: ScriptSection[];
  editingSection: string | null;
  onEditingSectionChange: (sectionId: string | null) => void;
  isGeneratingScript: boolean;
  streamingText: string;
  onGenerateScript: () => void;
  actions: ScriptEditorActions;
  knownSpeakers: string[];
  totalLineCount: number;
  maxScriptLines: number;
  /** Whether spec has visual content (show cover image field) */
  hasVisualContent?: boolean;
  /** Whether spec has BGM or SFX (show sound/music field) */
  hasAudio?: boolean;
  /** Optional: streaming parsed sections for progressive rendering */
  streamingParsed?: {
    completeSections: ScriptSection[];
    partialSection: Partial<ScriptSection> | null;
  };
  /** i18n translations */
  t: Record<string, any>;
  /** Hide the AI generate button (for edit-only mode) */
  hideGenerateButton?: boolean;
}

export function ScriptEditorStep({
  scriptSections,
  editingSection,
  onEditingSectionChange,
  isGeneratingScript,
  streamingText,
  onGenerateScript,
  actions,
  knownSpeakers,
  totalLineCount,
  maxScriptLines,
  hasVisualContent,
  hasAudio,
  t,
  hideGenerateButton,
}: ScriptEditorStepProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const [splitCursor, setSplitCursor] = useState<{ sectionId: string; itemId: string; lineIndex: number; cursorPos: number } | null>(null);

  return (
    <div className="space-y-6">
      {/* Generate Script Button - shown when no sections and not generating */}
      {scriptSections.length === 0 && !isGeneratingScript && !hideGenerateButton && (
        <button
          onClick={onGenerateScript}
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
                  : 'AI is writing the script...'}
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
            onClick={onGenerateScript}
            disabled={isGeneratingScript}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-base text-t-text2 hover:text-t-text1 transition-all"
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
          className="rounded-xl border border-t-border overflow-hidden"
          style={{ background: 'var(--t-bg-card)' }}
        >
          <div
            className="px-5 py-4 border-b border-t-border cursor-pointer flex items-center justify-between"
            onClick={() => onEditingSectionChange(editingSection === section.id ? null : section.id)}
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
              {hasVisualContent && (
                <div>
                  <label className="block text-sm text-t-text3 mb-2">{t.projectCreator.cover}</label>
                  <input
                    type="text"
                    value={section.coverImageDescription || ''}
                    onChange={(e) => actions.updateSectionInfo(section.id, 'coverImageDescription', e.target.value)}
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
                          onChange={(e) => actions.updateTimelineItem(section.id, item.id, 'timeStart', e.target.value)}
                          placeholder="00:00"
                          className="w-16 px-3 py-2 rounded border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none"
                        />
                        <span className="text-t-text3 text-sm">-</span>
                        <input
                          type="text"
                          value={item.timeEnd}
                          onChange={(e) => actions.updateTimelineItem(section.id, item.id, 'timeEnd', e.target.value)}
                          placeholder="00:15"
                          className="w-16 px-3 py-2 rounded border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => actions.removeTimelineItem(section.id, item.id)}
                        className="p-2 rounded hover:bg-red-500/20 text-t-text3 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Lines (Speaker + Line pairs) */}
                    <div className="space-y-0">
                      <label className="block text-xs text-t-text3 mb-3">{t.projectCreator.lines}</label>
                      {(item.lines || []).map((scriptLine, lineIndex) => (
                        <div key={lineIndex}>
                          <div className="flex items-start gap-3">
                            {knownSpeakers.length > 0 ? (
                              <select
                                value={scriptLine.speaker}
                                onChange={(e) => actions.updateScriptLine(section.id, item.id, lineIndex, 'speaker', e.target.value)}
                                className="w-28 px-2 py-2 rounded border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none flex-shrink-0 appearance-none cursor-pointer"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                              >
                                {!scriptLine.speaker && <option value="">{t.projectCreator.speaker}</option>}
                                {knownSpeakers.map(name => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={scriptLine.speaker}
                                onChange={(e) => actions.updateScriptLine(section.id, item.id, lineIndex, 'speaker', e.target.value)}
                                placeholder={t.projectCreator.speaker}
                                className="w-28 px-3 py-2 rounded border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 relative group/split">
                              <textarea
                                value={scriptLine.line}
                                onChange={(e) => actions.updateScriptLine(section.id, item.id, lineIndex, 'line', e.target.value)}
                                placeholder={t.projectCreator.lineContent}
                                rows={2}
                                className="w-full px-3 py-2 pr-8 rounded border border-t-border bg-t-card text-t-text1 text-sm focus:outline-none resize-none"
                                onSelect={(e) => {
                                  const ta = e.target as HTMLTextAreaElement;
                                  const pos = ta.selectionStart;
                                  if (pos > 0 && pos < scriptLine.line.length) {
                                    setSplitCursor({ sectionId: section.id, itemId: item.id, lineIndex, cursorPos: pos });
                                  } else {
                                    setSplitCursor(null);
                                  }
                                }}
                                onBlur={() => {
                                  setTimeout(() => setSplitCursor(prev =>
                                    prev?.sectionId === section.id && prev?.itemId === item.id && prev?.lineIndex === lineIndex ? null : prev
                                  ), 150);
                                }}
                              />
                              {splitCursor?.sectionId === section.id && splitCursor?.itemId === item.id && splitCursor?.lineIndex === lineIndex && (
                                <button
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    actions.splitScriptLine(section.id, item.id, lineIndex, splitCursor.cursorPos);
                                    setSplitCursor(null);
                                  }}
                                  className="absolute right-1.5 top-1.5 p-1 rounded bg-t-bg2/90 border border-t-border text-t-text3 hover:text-t-text1 hover:bg-t-bg2 transition-all shadow-sm"
                                  title={language === 'zh' ? '从光标处拆分' : 'Split at cursor'}
                                >
                                  <Scissors size={12} />
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => actions.removeScriptLine(section.id, item.id, lineIndex)}
                              className="p-2 rounded hover:bg-red-500/20 text-t-text3 hover:text-red-400 flex-shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          {/* Pause insertion zone between lines */}
                          {lineIndex < (item.lines || []).length - 1 && (
                            <div className="group/pause relative my-1 min-h-[16px] flex items-center">
                              {scriptLine.pauseAfterMs == null ? (
                                <div className="w-full opacity-0 group-hover/pause:opacity-100 transition-opacity duration-150 flex items-center gap-2">
                                  <div className="flex-1 border-t border-dashed border-t-border" />
                                  <button
                                    onClick={() => actions.setLinePause(section.id, item.id, lineIndex, 500)}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-t-text3 hover:text-t-text1 hover:bg-t-bg2 transition-all"
                                  >
                                    <Pause size={9} />{t.projectCreator.addPause}
                                  </button>
                                  <div className="flex-1 border-t border-dashed border-t-border" />
                                </div>
                              ) : (
                                <div className="w-full flex items-center gap-2">
                                  <div className="flex-1 border-t border-dashed border-amber-500/40" />
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 rounded-full">
                                    <Pause size={9} className="text-amber-500" />
                                    <input
                                      type="number"
                                      value={scriptLine.pauseAfterMs}
                                      onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        if (v > 0) actions.setLinePause(section.id, item.id, lineIndex, v);
                                      }}
                                      className="w-14 bg-transparent text-amber-600 dark:text-amber-400 text-[11px] text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      min={50}
                                      step={100}
                                    />
                                    <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">{t.projectCreator.pauseMs}</span>
                                    <button
                                      onClick={() => actions.setLinePause(section.id, item.id, lineIndex, undefined)}
                                      className="ml-0.5 p-0.5 rounded-full hover:bg-amber-500/20 text-amber-500/60 hover:text-amber-500 transition-all"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                  <div className="flex-1 border-t border-dashed border-amber-500/40" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => actions.addScriptLine(section.id, item.id)}
                        className={`flex items-center gap-1.5 text-xs mt-3 ${totalLineCount >= maxScriptLines ? 'text-t-text3/40 cursor-not-allowed' : 'text-t-text3 hover:text-t-text2'}`}
                        disabled={totalLineCount >= maxScriptLines}
                      >
                        <Plus size={12} />{t.projectCreator.addLine}
                      </button>
                    </div>

                    {/* Sound/Music */}
                    {hasAudio && (
                      <div>
                        <label className="block text-xs text-t-text3 mb-2">{t.projectCreator.soundMusic}</label>
                        <input
                          type="text"
                          value={item.soundMusic}
                          onChange={(e) => actions.updateTimelineItem(section.id, item.id, 'soundMusic', e.target.value)}
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
                onClick={() => actions.addTimelineItem(section.id)}
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
}
