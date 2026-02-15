/**
 * Storage API routes
 * 
 * Structured data (projects, voices, media items) is stored in PostgreSQL.
 * GCS only stores static resources (images, audio files), each with a
 * corresponding record in the `files` table.
 */

import { Router, Request, Response } from 'express';
import { isGCSConfigured } from '../services/gcs.js';
import { checkConnection } from '../db/index.js';
import * as projectsRepo from '../db/repositories/projects.js';
import * as voicesRepo from '../db/repositories/voices.js';
import * as mediaRepo from '../db/repositories/media.js';
import * as filesRepo from '../db/repositories/files.js';

export const storageRouter = Router();

// Extend Request to include auth info
interface AuthenticatedRequest extends Request {
  userId?: string;
}

// ============ Health Check ============

storageRouter.get('/status', async (_req: Request, res: Response) => {
  const dbConnected = await checkConnection();
  const gcsConfigured = isGCSConfigured();
  
  res.json({
    configured: dbConnected,
    database: dbConnected ? 'connected' : 'not available',
    gcs: gcsConfigured ? 'configured' : 'not configured',
    storage: dbConnected ? 'postgresql' : 'none',
    gcsNote: 'GCS is used only for static file storage (images, audio)',
    message: dbConnected 
      ? 'PostgreSQL database connected' 
      : 'No storage configured',
  });
});

// ============ Projects API ============

/**
 * GET /api/storage/projects
 * Load all projects for the authenticated user
 */
storageRouter.get('/projects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const projects = await projectsRepo.getProjectsByUserId(req.userId);
    res.json({ projects, count: projects.length, storage: 'postgresql' });
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
 * Save all projects for the authenticated user
 */
storageRouter.post('/projects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { projects } = req.body;
    
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'Projects must be an array' });
    }
    
    await projectsRepo.saveAllProjectsForUser(req.userId, projects);
    res.json({ success: true, count: projects.length, storage: 'postgresql' });
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
 * Load all voice characters for the authenticated user
 */
storageRouter.get('/voices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const voices = await voicesRepo.getVoiceCharactersByUserId(req.userId);
    res.json({ voices, count: voices.length, storage: 'postgresql' });
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
 * Save all voice characters for the authenticated user
 */
storageRouter.post('/voices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { voices } = req.body;
    
    if (!Array.isArray(voices)) {
      return res.status(400).json({ error: 'Voices must be an array' });
    }
    
    await voicesRepo.saveAllVoiceCharactersForUser(req.userId, voices);
    res.json({ success: true, count: voices.length, storage: 'postgresql' });
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
 * Upload a voice sample audio file (stored in GCS with a files record)
 */
storageRouter.post('/voices/:id/sample', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    const { dataUrl } = req.body;
    
    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl is required' });
    }
    
    const voice = await voicesRepo.uploadVoiceSample(id, req.userId, dataUrl);
    if (!voice) {
      return res.status(404).json({ error: 'Voice character not found or not owned by user' });
    }
    
    res.json({ success: true, url: voice.audioSampleUrl });
  } catch (error) {
    console.error('Failed to upload voice sample:', error);
    res.status(500).json({ 
      error: 'Failed to upload voice sample',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/storage/voices/:id
 * Delete a voice character (removes from database and cleans up associated files)
 */
storageRouter.delete('/voices/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    
    // Get the voice character to find associated file IDs before deletion
    const voice = await voicesRepo.getVoiceCharacterById(id, req.userId);
    if (!voice || voice.userId !== req.userId) {
      return res.status(404).json({ error: 'Voice character not found' });
    }
    
    // Delete the voice character record (also deletes project associations via CASCADE or repo logic)
    const deleted = await voicesRepo.deleteVoiceCharacter(id, req.userId);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete voice character' });
    }
    
    // Hard delete associated files from GCS + files table
    const fileIds = [voice.avatarFileId, voice.audioSampleFileId, voice.refAudioFileId].filter(Boolean) as string[];
    for (const fileId of fileIds) {
      try {
        await filesRepo.hardDeleteFile(fileId);
      } catch (e) {
        console.warn(`Failed to delete file ${fileId} for voice ${id}:`, e);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete voice character:', error);
    res.status(500).json({ 
      error: 'Failed to delete voice character',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============ Media Items API ============

/**
 * GET /api/storage/media
 * Load all media items for the authenticated user
 */
storageRouter.get('/media', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const items = await mediaRepo.getMediaItemsByUserId(req.userId);
    res.json({ items, count: items.length, storage: 'postgresql' });
  } catch (error) {
    console.error('Failed to load media items:', error);
    res.status(500).json({ 
      error: 'Failed to load media items',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/storage/media/:id/file
 * Upload a media file (stored in GCS with a files record)
 */
storageRouter.post('/media/:id/file', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { dataUrl, type, name } = req.body;
    
    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl is required' });
    }
    
    if (!type || !['image', 'bgm', 'sfx'].includes(type)) {
      return res.status(400).json({ error: 'type must be one of: image, bgm, sfx' });
    }
    
    const mediaItem = await mediaRepo.uploadMediaItem(req.userId, dataUrl, {
      name: name || `${type}-${Date.now()}`,
      type,
      source: 'uploaded',
    });
    
    res.json({ success: true, url: mediaItem.url, item: mediaItem });
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
 * Delete a media file (removes from both GCS and database)
 */
storageRouter.delete('/media/:id/file', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { id } = req.params;
    
    // Get the media item to find its file ID
    const mediaItem = await mediaRepo.getMediaItemById(id, req.userId);
    if (!mediaItem) {
      return res.status(404).json({ error: 'Media item not found' });
    }
    
    // Delete the media item record
    await mediaRepo.deleteMediaItem(id, req.userId);
    
    // Hard delete the associated file (removes from GCS + files table)
    if (mediaItem.fileId) {
      await filesRepo.hardDeleteFile(mediaItem.fileId);
    }
    if (mediaItem.thumbnailFileId) {
      await filesRepo.hardDeleteFile(mediaItem.thumbnailFileId);
    }
    
    res.json({ success: true });
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
 * Sync all data at once (projects, voices)
 */
storageRouter.post('/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { projects, voices } = req.body;
    
    const results: Record<string, { success: boolean; count?: number; error?: string }> = {};
    
    if (projects !== undefined) {
      try {
        await projectsRepo.saveAllProjectsForUser(req.userId, projects);
        results.projects = { success: true, count: projects.length };
      } catch (e) {
        results.projects = { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }
    
    if (voices !== undefined) {
      try {
        await voicesRepo.saveAllVoiceCharactersForUser(req.userId, voices);
        results.voices = { success: true, count: voices.length };
      } catch (e) {
        results.voices = { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }
    
    res.json({ results, storage: 'postgresql' });
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
storageRouter.get('/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const [projects, voices, mediaItems] = await Promise.all([
      projectsRepo.getProjectsByUserId(req.userId),
      voicesRepo.getVoiceCharactersByUserId(req.userId),
      mediaRepo.getMediaItemsByUserId(req.userId),
    ]);
    
    res.json({
      projects,
      voices,
      mediaItems,
      counts: {
        projects: projects.length,
        voices: voices.length,
        mediaItems: mediaItems.length,
      },
      storage: 'postgresql',
    });
  } catch (error) {
    console.error('Failed to load all data:', error);
    res.status(500).json({ 
      error: 'Failed to load all data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
