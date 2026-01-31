// LLM Service - Gemini API Integration

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
      API_KEY_MISSING: {
        zh: '请先设置 API Key',
        en: 'Please set your API Key first',
        es: 'Por favor, configure su API Key primero'
      },
      API_KEY_INVALID: {
        zh: 'API Key 无效，请检查后重试',
        en: 'Invalid API Key, please check and try again',
        es: 'API Key inválida, por favor verifique e intente de nuevo'
      },
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

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const API_KEY_STORAGE_KEY = 'gemini-api-key';

interface LLMConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface LLMResponse {
  text: string;
  raw: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

type StreamCallback = (chunk: string, accumulated: string) => void;

function getApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

function hasApiKey(): boolean {
  return !!getApiKey();
}

function handleApiError(status: number, body: string): LLMError {
  switch (status) {
    case 400:
      if (body.includes('API_KEY_INVALID') || body.includes('API key not valid')) {
        return new LLMError('API_KEY_INVALID', 'Invalid API key', status, body);
      }
      return new LLMError('UNKNOWN_ERROR', `Bad request: ${body}`, status, body);
    case 401:
    case 403:
      return new LLMError('API_KEY_INVALID', 'Authentication failed', status, body);
    case 429:
      return new LLMError('RATE_LIMITED', 'Rate limit exceeded', status, body);
    case 500:
    case 502:
    case 503:
      return new LLMError('MODEL_OVERLOADED', 'Service temporarily unavailable', status, body);
    default:
      return new LLMError('UNKNOWN_ERROR', `Request failed with status ${status}`, status, body);
  }
}

const geminiProvider = {
  name: 'gemini',
  
  async request(prompt: string, config?: LLMConfig): Promise<LLMResponse> {
    const apiKey = config?.apiKey || getApiKey();
    const model = config?.model || DEFAULT_MODEL;
    
    if (!apiKey) {
      throw new LLMError('API_KEY_MISSING', 'Gemini API key not configured');
    }
    
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
    
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: config?.temperature,
            maxOutputTokens: config?.maxTokens
          }
        })
      });
    } catch (error) {
      throw new LLMError('NETWORK_ERROR', 'Failed to connect to Gemini API', undefined, error);
    }
    
    if (!response.ok) {
      throw handleApiError(response.status, await response.text());
    }
    
    const data = await response.json();
    
    if (data.promptFeedback?.blockReason) {
      throw new LLMError('CONTENT_FILTERED', `Content blocked: ${data.promptFeedback.blockReason}`, undefined, data);
    }
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text && data.candidates?.[0]?.finishReason === 'SAFETY') {
      throw new LLMError('CONTENT_FILTERED', 'Response filtered for safety', undefined, data);
    }
    
    return {
      text,
      raw: data,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
        totalTokens: data.usageMetadata?.totalTokenCount
      }
    };
  },
  
  async requestStream(prompt: string, onChunk: StreamCallback, config?: LLMConfig): Promise<LLMResponse> {
    const apiKey = config?.apiKey || getApiKey();
    const model = config?.model || DEFAULT_MODEL;
    
    if (!apiKey) {
      throw new LLMError('API_KEY_MISSING', 'Gemini API key not configured');
    }
    
    const url = `${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: config?.temperature,
            maxOutputTokens: config?.maxTokens
          }
        })
      });
    } catch (error) {
      throw new LLMError('NETWORK_ERROR', 'Failed to connect to Gemini API', undefined, error);
    }
    
    if (!response.ok) {
      throw handleApiError(response.status, await response.text());
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
                const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (chunk) {
                  accumulated += chunk;
                  onChunk(chunk, accumulated);
                }
              } catch {
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
  const match = text.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/);
  return match?.[1]?.trim() || null;
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
  private provider = geminiProvider;
  private defaultConfig: LLMConfig = {};
  
  get providerName(): string {
    return this.provider.name;
  }
  
  configure(config: LLMConfig): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
  
  hasApiKey(): boolean {
    return hasApiKey();
  }
  
  getApiKey(): string | null {
    return getApiKey();
  }
  
  setApiKey(key: string): void {
    setApiKey(key);
  }
  
  clearApiKey(): void {
    clearApiKey();
  }
  
  async generate(prompt: string, config?: LLMConfig): Promise<LLMResponse> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return this.provider.request(prompt, mergedConfig);
  }
  
  async generateStream(prompt: string, onChunk: StreamCallback, config?: LLMConfig): Promise<LLMResponse> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    if (this.provider.requestStream) {
      return this.provider.requestStream(prompt, onChunk, mergedConfig);
    }
    const response = await this.provider.request(prompt, mergedConfig);
    onChunk(response.text, response.text);
    return response;
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
   * @param prompt The prompt to send
   * @param onChunk Callback for each text chunk (chunk, accumulated)
   * @param config Optional configuration
   * @returns Parsed JSON result
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
