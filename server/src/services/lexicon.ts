/**
 * TTS Lexicon Service
 *
 * Loads a lexicon JSON file and applies text replacements before TTS synthesis.
 * This fixes common mispronunciations of abbreviations, acronyms, and symbols.
 *
 * The lexicon JSON supports:
 * - Simple word-boundary matching (default): "AI" → "A I"
 * - Case-sensitive matching (default true): "AI" won't match "ai"
 * - Custom regex via `from_pattern` field for advanced patterns
 *
 * Usage:
 *   import { applyLexicon } from '../services/lexicon.js';
 *   const spokenText = applyLexicon(rawText);
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LexiconRule {
  from: string;
  to: string;
  /** If true, use `from_pattern` as a raw regex instead of `from`. */
  regex?: boolean;
  /** Raw regex string (used when `regex` is true). */
  from_pattern?: string;
  /** Default true – match whole words only. */
  wordBoundary?: boolean;
  /** Default true – case-sensitive matching. */
  caseSensitive?: boolean;
  /** Human-readable note (ignored at runtime). */
  description?: string;
}

interface LexiconData {
  rules: LexiconRule[];
}

interface CompiledRule {
  pattern: RegExp;
  replacement: string;
}

// ─── Module state ────────────────────────────────────────────────────────────

let compiledRules: CompiledRule[] | null = null;
let loadError: string | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Escape special regex characters in a literal string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a word-boundary pattern that works for mixed scripts (Latin + CJK).
 *
 * Standard `\b` only works at ASCII word boundaries, so for patterns that may
 * appear inside CJK text (e.g. "AI" in "…用AI技术…") we also treat the
 * boundary between a CJK character and a non-CJK character as a word boundary.
 *
 * The pattern uses lookbehind/lookahead so it doesn't consume characters.
 */
function wrapWordBoundary(pattern: string): string {
  // CJK Unified Ideographs + common CJK ranges
  const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff';
  // Match at a standard \b OR at a CJK↔non-CJK transition
  const left = `(?:(?<=^)|(?<=\\s)|(?<=[${CJK}])|\\b)`;
  const right = `(?=\\s|[${CJK}]|$|\\b)`;
  return `${left}${pattern}${right}`;
}

/**
 * Compile a single lexicon rule into a RegExp + replacement pair.
 */
function compileRule(rule: LexiconRule): CompiledRule {
  const useWordBoundary = rule.wordBoundary !== false; // default true
  const caseSensitive = rule.caseSensitive !== false;   // default true
  const flags = `g${caseSensitive ? '' : 'i'}`;

  let patternStr: string;

  if (rule.regex && rule.from_pattern) {
    // Raw regex supplied by user
    patternStr = useWordBoundary
      ? wrapWordBoundary(rule.from_pattern)
      : rule.from_pattern;
  } else {
    // Literal match
    const escaped = escapeRegex(rule.from);
    patternStr = useWordBoundary ? wrapWordBoundary(escaped) : escaped;
  }

  return {
    pattern: new RegExp(patternStr, flags),
    replacement: rule.to,
  };
}

// ─── Load & compile ──────────────────────────────────────────────────────────

function loadLexicon(): CompiledRule[] {
  if (compiledRules) return compiledRules;

  try {
    // Resolve path relative to this file → ../data/lexicon.json
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const lexiconPath = path.resolve(__dirname, '..', 'data', 'lexicon.json');

    // Also check CWD-relative path as fallback (for compiled output)
    const fallbackPath = path.resolve(process.cwd(), 'src', 'data', 'lexicon.json');
    const resolvedPath = fs.existsSync(lexiconPath) ? lexiconPath : fallbackPath;

    if (!fs.existsSync(resolvedPath)) {
      console.warn(`[lexicon] Lexicon file not found at ${lexiconPath} or ${fallbackPath}`);
      compiledRules = [];
      return compiledRules;
    }

    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    const data: LexiconData = JSON.parse(raw);

    if (!Array.isArray(data.rules)) {
      throw new Error('lexicon.json: "rules" must be an array');
    }

    compiledRules = data.rules
      .filter((r) => r.from && r.to !== undefined)
      .map(compileRule);

    // Sort by pattern length descending so longer matches take priority
    // e.g. "HTTPS" before "HTTP", "APIs" before "API"
    compiledRules.sort((a, b) => b.pattern.source.length - a.pattern.source.length);

    console.log(`[lexicon] Loaded ${compiledRules.length} rules`);
    return compiledRules;
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
    console.error(`[lexicon] Failed to load lexicon: ${loadError}`);
    compiledRules = [];
    return compiledRules;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Apply all lexicon rules to the input text.
 * Returns the text with abbreviations replaced by their spoken forms.
 *
 * Safe to call even if the lexicon file is missing (returns text unchanged).
 */
export function applyLexicon(text: string): string {
  if (!text) return text;

  const rules = loadLexicon();
  if (rules.length === 0) return text;

  let result = text;
  for (const rule of rules) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}

/**
 * Force-reload the lexicon from disk.
 * Useful after editing lexicon.json at runtime.
 */
export function reloadLexicon(): { ruleCount: number; error?: string } {
  compiledRules = null;
  loadError = null;
  const rules = loadLexicon();
  return { ruleCount: rules.length, error: loadError ?? undefined };
}

/**
 * Get current lexicon stats (for diagnostics / admin endpoints).
 */
export function getLexiconStats(): { ruleCount: number; loaded: boolean; error?: string } {
  return {
    ruleCount: compiledRules?.length ?? 0,
    loaded: compiledRules !== null,
    error: loadError ?? undefined,
  };
}
