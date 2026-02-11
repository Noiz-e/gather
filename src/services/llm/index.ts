// LLM Service - Backend API Integration

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export class LLMError extends Error {
  code: string;
  statusCode?: number;
  raw?: unknown;

  constructor(code: string, message: string, statusCode?: number, raw?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.raw = raw;
    this.name = 'LLMError';
  }

  getUserMessage(lang: string = 'en'): string {
    const messages: Record<string, Record<string, string>> = {
      RATE_LIMITED: {
        zh: '请求过于频繁，请稍后重试',
        en: 'Rate limited, please try again later',
        es: 'Límite de solicitudes alcanzado, intente más tarde'
      },
      NETWORK_ERROR: {
        zh: '网络连接失败，请检查网络后重试',
        en: 'Network error, please check your connection',
        es: 'Error de red, verifique su conexión'
      },
      PARSE_ERROR: {
        zh: 'AI 返回格式异常，请重试',
        en: 'Failed to parse AI response, please retry',
        es: 'Error al analizar la respuesta de IA, intente de nuevo'
      },
      CONTENT_FILTERED: {
        zh: '内容被过滤，请修改后重试',
        en: 'Content was filtered, please modify and retry',
        es: 'Contenido filtrado, modifique e intente de nuevo'
      },
      MODEL_OVERLOADED: {
        zh: '服务繁忙，请稍后重试',
        en: 'Service overloaded, please try again later',
        es: 'Servicio sobrecargado, intente más tarde'
      },
      SERVER_ERROR: {
        zh: '服务器错误，请稍后重试',
        en: 'Server error, please try again later',
        es: 'Error del servidor, intente más tarde'
      },
      UNKNOWN_ERROR: {
        zh: '发生未知错误，请稍后重试',
        en: 'An unknown error occurred, please try again',
        es: 'Ocurrió un error desconocido, intente de nuevo'
      }
    };
    const normalizedLang = lang === 'zh' ? 'zh' : lang === 'es' ? 'es' : 'en';
    return messages[this.code]?.[normalizedLang] || messages.UNKNOWN_ERROR[normalizedLang];
  }
}

interface LLMConfig {
  temperature?: number;
  maxTokens?: number;
}

interface LLMResponse {
  text: string;
  raw: unknown;
}

type StreamCallback = (chunk: string, accumulated: string) => void;

function handleApiError(status: number, errorData: { error?: string; code?: string }): LLMError {
  const code = errorData.code || 'UNKNOWN_ERROR';
  const message = errorData.error || 'Unknown error';
  
  switch (status) {
    case 429:
      return new LLMError('RATE_LIMITED', message, status);
    case 500:
    case 502:
    case 503:
      return new LLMError('SERVER_ERROR', message, status);
    default:
      return new LLMError(code, message, status);
  }
}

// Backend API provider
const backendProvider = {
  name: 'backend',
  
  async request(prompt: string, config?: LLMConfig): Promise<LLMResponse> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/llm/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          temperature: config?.temperature,
          maxTokens: config?.maxTokens
        })
      });
    } catch (error) {
      throw new LLMError('NETWORK_ERROR', 'Failed to connect to server', undefined, error);
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw handleApiError(response.status, errorData);
    }
    
    const data = await response.json();
    return { text: data.text, raw: data };
  },
  
  async requestStream(prompt: string, onChunk: StreamCallback, config?: LLMConfig): Promise<LLMResponse> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/llm/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          temperature: config?.temperature,
          maxTokens: config?.maxTokens
        })
      });
    } catch (error) {
      throw new LLMError('NETWORK_ERROR', 'Failed to connect to server', undefined, error);
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw handleApiError(response.status, errorData);
    }
    
    if (!response.body) {
      throw new LLMError('NETWORK_ERROR', 'No response body for streaming');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.error) {
                  throw new LLMError('SERVER_ERROR', parsed.error);
                }
                accumulated = parsed.accumulated || accumulated;
                onChunk(parsed.text || '', accumulated);
              } catch (e) {
                if (e instanceof LLMError) throw e;
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return { text: accumulated, raw: null };
  }
};

// JSON parsing utilities
function extractJsonFromMarkdown(text: string): string | null {
  // Try complete code block first: ```json ... ```
  const completeMatch = text.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/);
  if (completeMatch) {
    return completeMatch[1]?.trim() || null;
  }
  
  // Handle incomplete code block (no closing ```), common in streaming
  const incompleteMatch = text.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)$/);
  if (incompleteMatch) {
    return incompleteMatch[1]?.trim() || null;
  }
  
  return null;
}

function extractJsonBrackets(text: string): string | null {
  const findBracketPair = (str: string, open: string, close: string): string | null => {
    const start = str.indexOf(open);
    if (start === -1) return null;
    
    let depth = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = start; i < str.length; i++) {
      const char = str[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === open) depth++;
        if (char === close) depth--;
        if (depth === 0) return str.slice(start, i + 1);
      }
    }
    return null;
  };
  
  return findBracketPair(text, '{', '}') || findBracketPair(text, '[', ']');
}

function repairJson(json: string): string {
  let result = json;
  result = result.replace(/,\s*([}\]])/g, '$1');
  result = result.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
  result = result.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');
  result = result.replace(/[\x00-\x1F\x7F]/g, (char) => 
    char === '\n' || char === '\r' || char === '\t' ? char : ''
  );
  return result;
}

function parseJson<T>(text: string, options: { repair?: boolean } = {}): T | null {
  const { repair = true } = options;
  
  let jsonStr = extractJsonFromMarkdown(text);
  if (!jsonStr) {
    jsonStr = extractJsonBrackets(text);
  }
  if (!jsonStr) return null;
  
  try {
    return JSON.parse(jsonStr);
  } catch {
    if (repair) {
      const repaired = repairJson(jsonStr);
      try {
        return JSON.parse(repaired);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function hasRequiredFields(obj: unknown, fields: string[]): boolean {
  if (!obj || typeof obj !== 'object') return false;
  for (const field of fields) {
    if (!(field in obj)) return false;
  }
  return true;
}

// LLM Service class
class LLMService {
  private provider = backendProvider;
  private defaultConfig: LLMConfig = {};
  
  get providerName(): string {
    return this.provider.name;
  }
  
  configure(config: LLMConfig): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
  
  async generate(prompt: string, config?: LLMConfig): Promise<LLMResponse> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return this.provider.request(prompt, mergedConfig);
  }
  
  async generateStream(prompt: string, onChunk: StreamCallback, config?: LLMConfig): Promise<LLMResponse> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return this.provider.requestStream(prompt, onChunk, mergedConfig);
  }
  
  async generateJson<T>(prompt: string, config?: LLMConfig): Promise<T> {
    const response = await this.generate(prompt, config);
    const parsed = parseJson<T>(response.text);
    if (parsed === null) {
      throw new LLMError('PARSE_ERROR', 'Failed to parse JSON from response', undefined, response.text);
    }
    return parsed;
  }
  
  async generateValidatedJson<T>(prompt: string, requiredFields: string[], config?: LLMConfig): Promise<T> {
    const result = await this.generateJson<T>(prompt, config);
    if (!hasRequiredFields(result, requiredFields)) {
      throw new LLMError('PARSE_ERROR', `Response missing required fields: ${requiredFields.join(', ')}`, undefined, result);
    }
    return result;
  }
  
  async generateJsonSafe<T>(prompt: string, config?: LLMConfig): Promise<T | null> {
    try {
      return await this.generateJson<T>(prompt, config);
    } catch (error) {
      if (error instanceof LLMError && error.code === 'PARSE_ERROR') {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Generate JSON with streaming - shows raw text progressively, parses JSON when complete
   */
  async generateJsonStream<T>(
    prompt: string, 
    onChunk: StreamCallback, 
    config?: LLMConfig
  ): Promise<T> {
    const response = await this.generateStream(prompt, onChunk, config);
    const parsed = parseJson<T>(response.text);
    if (parsed === null) {
      throw new LLMError('PARSE_ERROR', 'Failed to parse JSON from response', undefined, response.text);
    }
    return parsed;
  }
}

export const llm = new LLMService();

/**
 * Analyze script characters and extract descriptive tags (gender, age, voice style, etc.)
 * Returns a map of character name → tags array.
 */
export async function analyzeScriptCharacters(
  scriptJson: string,
  characterNames: string[],
  language: 'en' | 'zh' = 'en'
): Promise<Record<string, string[]>> {
  const { buildCharacterAnalysisPrompt } = await import('./prompts');
  const prompt = buildCharacterAnalysisPrompt(scriptJson, characterNames, language);

  try {
    const result = await llm.generateJson<Record<string, string[]>>(prompt, {
      temperature: 0.3,
      maxTokens: 2048,
    });

    // Validate that all values are string arrays
    const validated: Record<string, string[]> = {};
    for (const name of characterNames) {
      const tags = result[name];
      if (Array.isArray(tags)) {
        validated[name] = tags.filter((t): t is string => typeof t === 'string');
      } else {
        validated[name] = [];
      }
    }
    return validated;
  } catch (error) {
    console.error('Failed to analyze characters:', error);
    // Return empty tags on failure - non-blocking
    return Object.fromEntries(characterNames.map(n => [n, []]));
  }
}
