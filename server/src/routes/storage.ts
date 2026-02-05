/**
 * Storage API routes for persistent data
 * Handles projects, voice characters, and media items
 */

import { Router, Request, Response } from 'express';
import * as gcs from '../services/gcs.js';

export const storageRouter = Router();

// ============ Health Check ============

storageRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: gcs.isGCSConfigured(),
    message: gcs.isGCSConfigured() 
      ? 'GCS storage is configured and ready' 
      : 'GCS storage is not configured - data will not be persisted'
  });
});

// ============ Projects API ============

/**
 * GET /api/storage/projects
 * Load all projects from GCS
 */
storageRouter.get('/projects', async (_req: Request, res: Response) => {
  try {
    const projects = await gcs.loadProjects();
    res.json({ projects, count: projects.length });
  } catch (error) {
    console.error('Failed to load projects:', error);
    res.status(500).json({ 
      error: 'Failed to load projects',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/storage/projects
 * Save all projects to GCS
 */
storageRouter.post('/projects', async (req: Request, res: Response) => {
  try {
    const { projects } = req.body;
    
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'Projects must be an array' });
    }
    
    await gcs.saveProjects(projects);
    res.json({ success: true, count: projects.length });
  } catch (error) {
    console.error('Failed to save projects:', error);
    res.status(500).json({ 
      error: 'Failed to save projects',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============ Voice Characters API ============

/**
 * GET /api/storage/voices
 * Load all voice characters from GCS
 */
storageRouter.get('/voices', async (_req: Request, res: Response) => {
  try {
    const voices = await gcs.loadVoiceCharacters();
    res.json({ voices, count: voices.length });
  } catch (error) {
    console.error('Failed to load voice characters:', error);
    res.status(500).json({ 
      error: 'Failed to load voice characters',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/storage/voices
 * Save all voice characters to GCS
 */
storageRouter.post('/voices', async (req: Request, res: Response) => {
  try {
    const { voices } = req.body;
    
    if (!Array.isArray(voices)) {
      return res.status(400).json({ error: 'Voices must be an array' });
    }
    
    await gcs.saveVoiceCharacters(voices);
    res.json({ success: true, count: voices.length });
  } catch (error) {
    console.error('Failed to save voice characters:', error);
    res.status(500).json({ 
      error: 'Failed to save voice characters',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/storage/voices/:id/sample
 * Upload a voice sample audio file
 */
storageRouter.post('/voices/:id/sample', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dataUrl } = req.body;
    
    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl is required' });
    }
    
    const url = await gcs.uploadVoiceSample(id, dataUrl);
    res.json({ success: true, url });
  } catch (error) {
    console.error('Failed to upload voice sample:', error);
    res.status(500).json({ 
      error: 'Failed to upload voice sample',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============ Media Items API ============

/**
 * GET /api/storage/media
 * Load all media items from GCS
 */
storageRouter.get('/media', async (_req: Request, res: Response) => {
  try {
    const items = await gcs.loadMediaItems();
    res.json({ items, count: items.length });
  } catch (error) {
    console.error('Failed to load media items:', error);
    res.status(500).json({ 
      error: 'Failed to load media items',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/storage/media
 * Save all media items to GCS
 */
storageRouter.post('/media', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }
    
    await gcs.saveMediaItems(items);
    res.json({ success: true, count: items.length });
  } catch (error) {
    console.error('Failed to save media items:', error);
    res.status(500).json({ 
      error: 'Failed to save media items',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/storage/media/:id/file
 * Upload a media file (image, bgm, sfx)
 */
storageRouter.post('/media/:id/file', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dataUrl, type } = req.body;
    
    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl is required' });
    }
    
    if (!type || !['image', 'bgm', 'sfx'].includes(type)) {
      return res.status(400).json({ error: 'type must be one of: image, bgm, sfx' });
    }
    
    const url = await gcs.uploadMediaFile(id, dataUrl, type);
    res.json({ success: true, url });
  } catch (error) {
    console.error('Failed to upload media file:', error);
    res.status(500).json({ 
      error: 'Failed to upload media file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/storage/media/:id/file
 * Delete a media file from GCS
 */
storageRouter.delete('/media/:id/file', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, fileUrl } = req.body;
    
    if (!type || !['image', 'bgm', 'sfx'].includes(type)) {
      return res.status(400).json({ error: 'type must be one of: image, bgm, sfx' });
    }
    
    const deleted = await gcs.deleteMediaFile(id, type, fileUrl || '');
    res.json({ success: deleted });
  } catch (error) {
    console.error('Failed to delete media file:', error);
    res.status(500).json({ 
      error: 'Failed to delete media file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============ Bulk Operations ============

/**
 * POST /api/storage/sync
 * Sync all data at once (projects, voices, media items)
 * Useful for initial load or full backup
 */
storageRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const { projects, voices, mediaItems } = req.body;
    
    const results: Record<string, { success: boolean; count?: number; error?: string }> = {};
    
    if (projects !== undefined) {
      try {
        await gcs.saveProjects(projects);
        results.projects = { success: true, count: projects.length };
      } catch (e) {
        results.projects = { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }
    
    if (voices !== undefined) {
      try {
        await gcs.saveVoiceCharacters(voices);
        results.voices = { success: true, count: voices.length };
      } catch (e) {
        results.voices = { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }
    
    if (mediaItems !== undefined) {
      try {
        await gcs.saveMediaItems(mediaItems);
        results.mediaItems = { success: true, count: mediaItems.length };
      } catch (e) {
        results.mediaItems = { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Failed to sync data:', error);
    res.status(500).json({ 
      error: 'Failed to sync data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/storage/sync
 * Load all data at once (projects, voices, media items)
 */
storageRouter.get('/sync', async (_req: Request, res: Response) => {
  try {
    const [projects, voices, mediaItems] = await Promise.all([
      gcs.loadProjects(),
      gcs.loadVoiceCharacters(),
      gcs.loadMediaItems(),
    ]);
    
    res.json({
      projects,
      voices,
      mediaItems,
      counts: {
        projects: projects.length,
        voices: voices.length,
        mediaItems: mediaItems.length,
      }
    });
  } catch (error) {
    console.error('Failed to load all data:', error);
    res.status(500).json({ 
      error: 'Failed to load all data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
