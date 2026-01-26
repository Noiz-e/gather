// File utility functions

const VALID_EXTENSIONS = ['.txt', '.pdf', '.doc', '.docx'];
const VALID_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

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

export interface CollectOptions {
  includeLabels?: boolean;
}

export async function collectAnalysisContent(
  textContent: string,
  files: File[],
  options: CollectOptions = {}
): Promise<string> {
  const { includeLabels = true } = options;
  const parts: string[] = [];
  
  // Add text content
  if (textContent.trim()) {
    if (includeLabels) {
      parts.push(`[User Input]\n${textContent.trim()}`);
    } else {
      parts.push(textContent.trim());
    }
  }
  
  // Read and add file contents
  for (const file of files) {
    try {
      const content = await readFileAsText(file);
      if (content.trim()) {
        if (includeLabels) {
          parts.push(`[File: ${file.name}]\n${content.trim()}`);
        } else {
          parts.push(content.trim());
        }
      }
    } catch (error) {
      console.error(`Failed to read file ${file.name}:`, error);
    }
  }
  
  return parts.join('\n\n');
}
