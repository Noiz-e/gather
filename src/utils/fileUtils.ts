// File utility functions

import type { FileAttachment } from '../services/api/index';

const VALID_EXTENSIONS = ['.txt', '.pdf', '.doc', '.docx'];
const VALID_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * MIME types that Gemini can natively understand via inlineData.
 * These files are uploaded as base64 rather than being parsed as text.
 */
const GEMINI_NATIVE_MIMES = [
  'application/pdf',
  'text/plain',
  'text/html',
  'text/csv',
];

function isGeminiNative(file: File): boolean {
  if (GEMINI_NATIVE_MIMES.includes(file.type)) return true;
  // Fallback by extension for files with empty/wrong MIME
  const ext = file.name.toLowerCase();
  if (ext.endsWith('.pdf')) return true;
  if (ext.endsWith('.txt')) return true;
  if (ext.endsWith('.csv')) return true;
  if (ext.endsWith('.html') || ext.endsWith('.htm')) return true;
  return false;
}

function getMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.toLowerCase();
  if (ext.endsWith('.pdf')) return 'application/pdf';
  if (ext.endsWith('.txt')) return 'text/plain';
  if (ext.endsWith('.csv')) return 'text/csv';
  if (ext.endsWith('.html') || ext.endsWith('.htm')) return 'text/html';
  return 'application/octet-stream';
}

export function filterValidFiles(files: FileList | File[]): File[] {
  const validFiles: File[] = [];
  const fileArray = Array.from(files);
  
  for (const file of fileArray) {
    const isValidMime = VALID_MIME_TYPES.includes(file.type);
    const isValidExt = VALID_EXTENSIONS.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (isValidMime || isValidExt) {
      validFiles.push(file);
    }
  }
  
  return validFiles;
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string || '');
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string || '';
      // Strip the "data:...;base64," prefix to get raw base64
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export interface CollectOptions {
  includeLabels?: boolean;
}

export interface CollectResult {
  text: string;
  attachments: FileAttachment[];
}

/**
 * Collect content from text input and uploaded files.
 *
 * For Gemini-native file types (PDF, TXT, CSV, HTML), files are returned as
 * base64 attachments so they can be sent directly to Gemini via inlineData
 * instead of being parsed on the client side.
 *
 * For other file types (DOC, DOCX), files are still read as text and inlined
 * into the prompt string.
 */
export async function collectAnalysisContent(
  textContent: string,
  files: File[],
  options: CollectOptions = {}
): Promise<string>;
export async function collectAnalysisContent(
  textContent: string,
  files: File[],
  options: CollectOptions & { returnAttachments: true }
): Promise<CollectResult>;
export async function collectAnalysisContent(
  textContent: string,
  files: File[],
  options: CollectOptions & { returnAttachments?: boolean } = {}
): Promise<string | CollectResult> {
  const { includeLabels = true, returnAttachments = false } = options;
  const parts: string[] = [];
  const attachments: FileAttachment[] = [];
  
  // Add text content
  if (textContent.trim()) {
    if (includeLabels) {
      parts.push(`[User Input]\n${textContent.trim()}`);
    } else {
      parts.push(textContent.trim());
    }
  }
  
  // Process files
  for (const file of files) {
    try {
      if (returnAttachments && isGeminiNative(file)) {
        // Upload as base64 attachment for Gemini's native multimodal parsing
        const base64 = await readFileAsBase64(file);
        if (base64) {
          attachments.push({
            data: base64,
            mimeType: getMimeType(file),
            name: file.name,
          });
          // Add a note in the text so the prompt references the file
          if (includeLabels) {
            parts.push(`[Attached File: ${file.name}]`);
          }
        }
      } else {
        // Fallback: read as text (for DOC/DOCX or when attachments not requested)
        const content = await readFileAsText(file);
        if (content.trim()) {
          if (includeLabels) {
            parts.push(`[File: ${file.name}]\n${content.trim()}`);
          } else {
            parts.push(content.trim());
          }
        }
      }
    } catch (error) {
      console.error(`Failed to read file ${file.name}:`, error);
    }
  }
  
  const text = parts.join('\n\n');

  if (returnAttachments) {
    return { text, attachments };
  }
  return text;
}
