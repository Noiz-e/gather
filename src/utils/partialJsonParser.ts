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
  // Try to extract content between ```json ... ``` (or ``` ... ```)
  // Use a single regex that captures content between opening and closing markers.
  // The closing ``` is optional (during streaming it hasn't arrived yet).
  const codeBlockMatch = text.match(
    /```\s*(?:json|JSON|js|JS)?\s*\n?([\s\S]*?)(?:\n\s*```(?:\s*\n?[\s\S]*)?$|$)/
  );
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // No code block markers found — return as-is
  return text.trim();
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
      if (!section || typeof section !== 'object') continue;

      if (i < parsed.length - 1) {
        // Not the last element — treat as complete even if some fields are missing,
        // because the stream has already moved past this section.
        completeSections.push(section as ScriptSection);
      } else {
        // Last element — could still be streaming
        if (isCompleteSection(section)) {
          completeSections.push(section as ScriptSection);
        } else {
          partialSection = section as Partial<ScriptSection>;
        }
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
 * Check if a timeline item is complete.
 * soundMusic is optional — the prompt only requests it when BGM/SFX are enabled.
 */
function isCompleteTimelineItem(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const item = obj as Record<string, unknown>;
  
  if (typeof item.id !== 'string') return false;
  if (typeof item.timeStart !== 'string') return false;
  if (typeof item.timeEnd !== 'string') return false;
  if (!Array.isArray(item.lines)) return false;
  // soundMusic is optional — don't require it for completeness
  
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
