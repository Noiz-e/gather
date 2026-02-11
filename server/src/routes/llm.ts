import { Router, Request, Response } from 'express';
import { generateText, generateTextStream, GenerateOptions, FileAttachment } from '../services/gemini.js';

export const llmRouter = Router();

interface GenerateRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  attachments?: FileAttachment[];
}

/**
 * POST /api/llm/generate
 * Generate text using Gemini
 */
llmRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, temperature, maxTokens, apiKey, attachments } = req.body as GenerateRequest;
    
    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    
    const options: GenerateOptions = { temperature, maxTokens, apiKey, attachments };
    const text = await generateText(prompt, options);
    
    res.json({ text });
  } catch (error) {
    console.error('LLM generate error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('API_KEY')) {
      res.status(401).json({ error: 'Invalid or missing API key', code: 'API_KEY_INVALID' });
      return;
    }
    
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/llm/stream
 * Generate text with streaming using SSE
 */
llmRouter.post('/stream', async (req: Request, res: Response) => {
  try {
    const { prompt, temperature, maxTokens, apiKey, attachments } = req.body as GenerateRequest;
    
    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const options: GenerateOptions = { temperature, maxTokens, apiKey, attachments };
    
    for await (const chunk of generateTextStream(prompt, options)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('LLM stream error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // If headers already sent, send error as SSE event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
});
