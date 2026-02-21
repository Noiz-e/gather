/**
 * Shared hook for script editing operations.
 * Used by both ProjectCreator and EpisodeCreator.
 */
import { useCallback } from 'react';
import { ScriptSection } from '../../../types';

export type ScriptSetter = React.Dispatch<React.SetStateAction<ScriptSection[]>>;

/**
 * A generic dispatch interface that both the reducer-based (ProjectCreator)
 * and setState-based (EpisodeCreator) approaches can satisfy.
 */
export interface ScriptEditorActions {
  updateSectionInfo: (sectionId: string, field: 'name' | 'description' | 'coverImageDescription', value: string) => void;
  updateTimelineItem: (sectionId: string, itemId: string, field: 'timeStart' | 'timeEnd' | 'soundMusic', value: string) => void;
  updateScriptLine: (sectionId: string, itemId: string, lineIndex: number, field: 'speaker' | 'line', value: string) => void;
  setLinePause: (sectionId: string, itemId: string, lineIndex: number, pauseAfterMs: number | undefined) => void;
  addScriptLine: (sectionId: string, itemId: string) => void;
  removeScriptLine: (sectionId: string, itemId: string, lineIndex: number) => void;
  splitScriptLine: (sectionId: string, itemId: string, lineIndex: number, cursorPos: number) => void;
  addTimelineItem: (sectionId: string) => void;
  removeTimelineItem: (sectionId: string, itemId: string) => void;
}

/**
 * Creates script editor actions from a setState-based setter.
 * Used by EpisodeCreator which manages scriptSections via useState.
 */
export function useScriptEditorWithState(
  setScriptSections: ScriptSetter,
  maxScriptLines: number
): ScriptEditorActions {
  const updateSectionInfo = useCallback(
    (sectionId: string, field: 'name' | 'description' | 'coverImageDescription', value: string) => {
      setScriptSections(sections =>
        sections.map(section =>
          section.id === sectionId ? { ...section, [field]: value } : section
        )
      );
    },
    [setScriptSections]
  );

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
    [setScriptSections]
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
    [setScriptSections]
  );

  const setLinePause = useCallback(
    (sectionId: string, itemId: string, lineIndex: number, pauseAfterMs: number | undefined) => {
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
                          idx === lineIndex ? { ...line, pauseAfterMs } : line
                        )
                      }
                    : item
                )
              }
            : section
        )
      );
    },
    [setScriptSections]
  );

  const addScriptLine = useCallback(
    (sectionId: string, itemId: string) => {
      setScriptSections(sections => {
        const currentTotal = sections.reduce((total, section) => {
          return total + section.timeline.reduce((sectionTotal, item) => {
            return sectionTotal + (item.lines?.length || 0);
          }, 0);
        }, 0);
        if (currentTotal >= maxScriptLines) return sections;

        let lastSpeaker = '';
        for (const section of sections) {
          if (section.id === sectionId) {
            for (const item of section.timeline) {
              if (item.id === itemId && item.lines && item.lines.length > 0) {
                lastSpeaker = item.lines[item.lines.length - 1].speaker || '';
              }
            }
          }
        }
        return sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                timeline: section.timeline.map(item =>
                  item.id === itemId
                    ? { ...item, lines: [...(item.lines || []), { speaker: lastSpeaker, line: '' }] }
                    : item
                )
              }
            : section
        );
      });
    },
    [setScriptSections, maxScriptLines]
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
    [setScriptSections]
  );

  const splitScriptLine = useCallback(
    (sectionId: string, itemId: string, lineIndex: number, cursorPos: number) => {
      setScriptSections(sections =>
        sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                timeline: section.timeline.map(item => {
                  if (item.id !== itemId || !item.lines?.[lineIndex]) return item;
                  const line = item.lines[lineIndex];
                  const textBefore = line.line.slice(0, cursorPos);
                  const textAfter = line.line.slice(cursorPos);
                  const newLines = [...item.lines];
                  newLines[lineIndex] = { ...line, line: textBefore };
                  newLines.splice(lineIndex + 1, 0, { speaker: line.speaker, line: textAfter });
                  return { ...item, lines: newLines };
                })
              }
            : section
        )
      );
    },
    [setScriptSections]
  );

  const addTimelineItem = useCallback(
    (sectionId: string) => {
      setScriptSections(sections => {
        let lastSpeaker = '';
        for (const section of sections) {
          if (section.id === sectionId) {
            for (const item of section.timeline) {
              if (item.lines && item.lines.length > 0) {
                const last = item.lines[item.lines.length - 1].speaker;
                if (last) lastSpeaker = last;
              }
            }
          }
        }
        return sections.map(section =>
          section.id === sectionId
            ? {
                ...section,
                timeline: [
                  ...section.timeline,
                  { id: crypto.randomUUID(), timeStart: '', timeEnd: '', lines: [{ speaker: lastSpeaker, line: '' }], soundMusic: '' }
                ]
              }
            : section
        );
      });
    },
    [setScriptSections]
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
    [setScriptSections]
  );

  return {
    updateSectionInfo,
    updateTimelineItem,
    updateScriptLine,
    setLinePause,
    addScriptLine,
    removeScriptLine,
    splitScriptLine,
    addTimelineItem,
    removeTimelineItem,
  };
}
