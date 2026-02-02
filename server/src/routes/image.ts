import { Router, Request, Response } from 'express';
import { generateImage, ImageGenerateOptions } from '../services/media.js';

export const imageRouter = Router();

interface ImageRequest {
  prompt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  numberOfImages?: number;
  apiKey?: string;
}

/**
 * POST /api/image/generate
 * Generate images using Imagen 3
 */
imageRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, numberOfImages, apiKey } = req.body as ImageRequest;
    
    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    
    if (prompt.length > 2000) {
      res.status(400).json({ error: 'Prompt too long, max 2000 characters' });
      return;
    }
    
    const options: ImageGenerateOptions = { 
      aspectRatio, 
      numberOfImages: Math.min(numberOfImages || 1, 4),
      apiKey 
    };
    
    const images = await generateImage(prompt, options);
    
    res.json({
      images: images.map((img, index) => ({
        index,
        imageData: img.imageData,
        mimeType: img.mimeType
      }))
    });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('API_KEY') || message.includes('API key')) {
      res.status(401).json({ error: 'Invalid or missing API key', code: 'API_KEY_INVALID' });
      return;
    }
    
    if (message.includes('safety') || message.includes('blocked')) {
      res.status(400).json({ error: 'Content blocked by safety filters', code: 'CONTENT_FILTERED' });
      return;
    }
    
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/image/cover
 * Generate a podcast cover image with optimized settings
 */
imageRouter.post('/cover', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, apiKey } = req.body as ImageRequest;
    
    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    
    // Enhance prompt for podcast cover style
    const enhancedPrompt = `Professional podcast cover art: ${prompt}. 
Style: Modern, clean design suitable for podcast artwork. High quality, visually striking.`;
    
    const options: ImageGenerateOptions = { 
      aspectRatio: aspectRatio || '1:1',  // Square is standard for podcast covers
      numberOfImages: 1,
      apiKey 
    };
    
    const images = await generateImage(enhancedPrompt, options);
    
    res.json({
      imageData: images[0].imageData,
      mimeType: images[0].mimeType
    });
  } catch (error) {
    console.error('Cover generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
