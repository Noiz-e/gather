import { parse as parsePartialJson } from 'partial-json';
import type { ScriptSection } from '../types';

/**
 * Strip markdown code block markers from text.
 * Handles various formats:
 * - ```json ... ```
 * - ``` json ... ```
 * - ```JSON ... ```
 * - Leading/trailing whitespace
 * - Incomplete blocks (no closing ```)
 */
export function stripMarkdownCodeBlock(text: string): string {
  let result = text;
  
  // Remove opening code block marker: ```json, ``` json, ```JSON, etc.
  // Also handles just ``` without language specifier
  result = result.replace(/^[\s\S]*?```\s*(?:json|JSON)?\s*\n?/, '');
  
  // If we didn't find an opening marker, check if the text starts with it after some content
  if (result === text) {
    // Try to find ```json anywhere and extract content after it
    const codeBlockMatch = text.match(/```\s*(?:json|JSON)?\s*\n?([\s\S]*?)(?:```|$)/);
    if (codeBlockMatch) {
      result = codeBlockMatch[1];
    }
  }
  
  // Remove closing code block marker if present
  result = result.replace(/\s*```\s*$/, '');
  
  return result.trim();
}

/**
 * Attempts to parse streaming JSON and extract whatever valid ScriptSection objects are available.
 * Uses a loose parser that can handle incomplete JSON.
 */
export function parseStreamingScriptSections(text: string): {
  completeSections: ScriptSection[];
  partialSection: Partial<ScriptSection> | null;
  parseError: boolean;
} {
  if (!text || text.trim().length === 0) {
    return { completeSections: [], partialSection: null, parseError: false };
  }

  try {
    // Try to find and parse the JSON array
    let jsonText = text;
    
    // Preprocess: strip markdown code block markers
    // Handle various formats: ```json, ``` json, ```JSON, etc.
    jsonText = stripMarkdownCodeBlock(jsonText);
    
    // Find the start of the array
    const arrayStart = jsonText.indexOf('[');
    if (arrayStart === -1) {
      return { completeSections: [], partialSection: null, parseError: false };
    }
    
    jsonText = jsonText.slice(arrayStart);
    
    // Use partial-json to parse incomplete JSON
    // It will return whatever valid data it can extract
    const parsed = parsePartialJson(jsonText);
    
    if (!Array.isArray(parsed)) {
      return { completeSections: [], partialSection: null, parseError: false };
    }

    const completeSections: ScriptSection[] = [];
    let partialSection: Partial<ScriptSection> | null = null;

    for (let i = 0; i < parsed.length; i++) {
      const section = parsed[i];
      if (isCompleteSection(section)) {
        completeSections.push(section as ScriptSection);
      } else if (section && typeof section === 'object') {
        // This is the partial section being streamed
        partialSection = section as Partial<ScriptSection>;
      }
    }

    return { completeSections, partialSection, parseError: false };
  } catch {
    // If parsing fails completely, return empty
    return { completeSections: [], partialSection: null, parseError: true };
  }
}

/**
 * Check if a section object has all required fields to be considered complete
 */
function isCompleteSection(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const section = obj as Partial<ScriptSection>;
  
  // Required fields
  if (typeof section.id !== 'string') return false;
  if (typeof section.name !== 'string') return false;
  if (typeof section.description !== 'string') return false;
  if (!Array.isArray(section.timeline)) return false;
  
  // Check if timeline items are complete
  for (const item of section.timeline) {
    if (!isCompleteTimelineItem(item)) return false;
  }
  
  return true;
}

/**
 * Check if a timeline item is complete
 */
function isCompleteTimelineItem(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const item = obj as Record<string, unknown>;
  
  if (typeof item.id !== 'string') return false;
  if (typeof item.timeStart !== 'string') return false;
  if (typeof item.timeEnd !== 'string') return false;
  if (!Array.isArray(item.lines)) return false;
  if (typeof item.soundMusic !== 'string') return false;
  
  return true;
}

/**
 * Get a display-friendly representation of a partial section
 */
export function getPartialSectionDisplay(section: Partial<ScriptSection> | null): {
  name: string;
  description: string;
  timelineCount: number;
  isStreaming: boolean;
} {
  if (!section) {
    return { name: '', description: '', timelineCount: 0, isStreaming: false };
  }
  
  return {
    name: section.name || '',
    description: section.description || '',
    timelineCount: section.timeline?.length || 0,
    isStreaming: true,
  };
}
