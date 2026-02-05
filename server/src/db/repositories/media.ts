/**
 * Media Items Repository
 * Handles CRUD operations for media items (images, BGM, SFX) with signed URLs
 */

import { query } from '../index.js';
import { generateUrlsForFileIds, getFileByIdWithUrl, uploadAndCreateFile } from './files.js';

// ============================================
// Types
// ============================================

export type MediaType = 'image' | 'bgm' | 'sfx';
export type MediaSource = 'generated' | 'uploaded';

export interface MediaItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: MediaType;
  url: string;  // Signed URL
  fileId: string;
  thumbnailUrl?: string;
  thumbnailFileId?: string;
  tags: string[];
  projectIds?: string[];
  source: MediaSource;
  prompt?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MediaItemRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  type: MediaType;
  file_id: string;
  thumbnail_file_id: string | null;
  tags: string[];
  source: MediaSource;
  prompt: string | null;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

interface MediaProjectRow {
  media_item_id: string;
  project_id: string;
}

// ============================================
// Helper Functions
// ============================================

function mapMediaRow(row: MediaItemRow): Omit<MediaItem, 'url' | 'thumbnailUrl' | 'projectIds'> {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    type: row.type,
    fileId: row.file_id,
    thumbnailFileId: row.thumbnail_file_id || undefined,
    tags: row.tags || [],
    source: row.source,
    prompt: row.prompt || undefined,
    isPublic: row.is_public,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function buildMediaWithUrls(mediaRows: MediaItemRow[]): Promise<MediaItem[]> {
  if (mediaRows.length === 0) {
    return [];
  }
  
  // Collect all file IDs
  const fileIds: string[] = [];
  mediaRows.forEach(m => {
    fileIds.push(m.file_id);
    if (m.thumbnail_file_id) fileIds.push(m.thumbnail_file_id);
  });
  
  // Generate signed URLs
  const urlMap = await generateUrlsForFileIds(fileIds);
  
  // Get project associations
  const mediaIds = mediaRows.map(m => m.id);
  const projectsResult = await query<MediaProjectRow>(`
    SELECT * FROM media_item_projects WHERE media_item_id = ANY($1)
  `, [mediaIds]);
  
  const projectsByMedia = new Map<string, string[]>();
  for (const row of projectsResult.rows) {
    const projects = projectsByMedia.get(row.media_item_id) || [];
    projects.push(row.project_id);
    projectsByMedia.set(row.media_item_id, projects);
  }
  
  return mediaRows.map(row => ({
    ...mapMediaRow(row),
    url: urlMap.get(row.file_id) || '',
    thumbnailUrl: row.thumbnail_file_id ? urlMap.get(row.thumbnail_file_id) : undefined,
    projectIds: projectsByMedia.get(row.id) || [],
  }));
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Get all media items for a user
 */
export async function getMediaItemsByUserId(userId: string): Promise<MediaItem[]> {
  const result = await query<MediaItemRow>(`
    SELECT * FROM media_items 
    WHERE user_id = $1 
    ORDER BY created_at DESC
  `, [userId]);
  
  return buildMediaWithUrls(result.rows);
}

/**
 * Get media items by type for a user
 */
export async function getMediaItemsByType(userId: string, type: MediaType): Promise<MediaItem[]> {
  const result = await query<MediaItemRow>(`
    SELECT * FROM media_items 
    WHERE user_id = $1 AND type = $2
    ORDER BY created_at DESC
  `, [userId, type]);
  
  return buildMediaWithUrls(result.rows);
}

/**
 * Get public media items
 */
export async function getPublicMediaItems(type?: MediaType, limit: number = 50): Promise<MediaItem[]> {
  let queryStr = 'SELECT * FROM media_items WHERE is_public = TRUE';
  const params: unknown[] = [];
  
  if (type) {
    queryStr += ' AND type = $1';
    params.push(type);
  }
  
  queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result = await query<MediaItemRow>(queryStr, params);
  
  return buildMediaWithUrls(result.rows);
}

/**
 * Get a media item by ID
 */
export async function getMediaItemById(id: string, userId?: string): Promise<MediaItem | null> {
  let queryStr = 'SELECT * FROM media_items WHERE id = $1';
  const params: unknown[] = [id];
  
  if (userId) {
    queryStr += ' AND (user_id = $2 OR is_public = TRUE)';
    params.push(userId);
  }
  
  const result = await query<MediaItemRow>(queryStr, params);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const items = await buildMediaWithUrls(result.rows);
  return items[0] || null;
}

/**
 * Create a media item
 */
export async function createMediaItem(
  userId: string,
  item: Omit<MediaItem, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'url' | 'thumbnailUrl'>
): Promise<MediaItem> {
  const result = await query<MediaItemRow>(`
    INSERT INTO media_items (
      user_id, name, description, type, file_id, thumbnail_file_id,
      tags, source, prompt, is_public
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    userId,
    item.name,
    item.description,
    item.type,
    item.fileId,
    item.thumbnailFileId || null,
    item.tags || [],
    item.source,
    item.prompt || null,
    item.isPublic ?? false,
  ]);
  
  // Add project associations
  if (item.projectIds && item.projectIds.length > 0) {
    for (const projectId of item.projectIds) {
      await query(`
        INSERT INTO media_item_projects (media_item_id, project_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [result.rows[0].id, projectId]);
    }
  }
  
  const items = await buildMediaWithUrls(result.rows);
  return items[0];
}

/**
 * Update a media item
 */
export async function updateMediaItem(
  id: string,
  userId: string,
  updates: Partial<Omit<MediaItem, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'url' | 'thumbnailUrl'>>
): Promise<MediaItem | null> {
  // Verify ownership
  const ownerCheck = await query(`
    SELECT id FROM media_items WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  
  if (ownerCheck.rows.length === 0) {
    return null;
  }
  
  const setClause: string[] = [];
  const values: unknown[] = [id];
  let paramIndex = 2;
  
  if (updates.name !== undefined) {
    setClause.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClause.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.type !== undefined) {
    setClause.push(`type = $${paramIndex++}`);
    values.push(updates.type);
  }
  if (updates.fileId !== undefined) {
    setClause.push(`file_id = $${paramIndex++}`);
    values.push(updates.fileId);
  }
  if (updates.thumbnailFileId !== undefined) {
    setClause.push(`thumbnail_file_id = $${paramIndex++}`);
    values.push(updates.thumbnailFileId);
  }
  if (updates.tags !== undefined) {
    setClause.push(`tags = $${paramIndex++}`);
    values.push(updates.tags);
  }
  if (updates.source !== undefined) {
    setClause.push(`source = $${paramIndex++}`);
    values.push(updates.source);
  }
  if (updates.prompt !== undefined) {
    setClause.push(`prompt = $${paramIndex++}`);
    values.push(updates.prompt);
  }
  if (updates.isPublic !== undefined) {
    setClause.push(`is_public = $${paramIndex++}`);
    values.push(updates.isPublic);
  }
  
  if (setClause.length > 0) {
    await query(`
      UPDATE media_items SET ${setClause.join(', ')}
      WHERE id = $1
    `, values);
  }
  
  // Update project associations
  if (updates.projectIds !== undefined) {
    await query('DELETE FROM media_item_projects WHERE media_item_id = $1', [id]);
    for (const projectId of updates.projectIds) {
      await query(`
        INSERT INTO media_item_projects (media_item_id, project_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [id, projectId]);
    }
  }
  
  return getMediaItemById(id, userId);
}

/**
 * Delete a media item
 */
export async function deleteMediaItem(id: string, userId: string): Promise<boolean> {
  const result = await query(`
    DELETE FROM media_items WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Upload and create a media item
 */
export async function uploadMediaItem(
  userId: string,
  dataUrl: string,
  options: {
    name: string;
    description?: string;
    type: MediaType;
    source: MediaSource;
    prompt?: string;
    isPublic?: boolean;
    projectIds?: string[];
  }
): Promise<MediaItem> {
  // Determine file extension
  let ext = 'bin';
  if (dataUrl.startsWith('data:image/png')) ext = 'png';
  else if (dataUrl.startsWith('data:image/jpeg')) ext = 'jpg';
  else if (dataUrl.startsWith('data:image/gif')) ext = 'gif';
  else if (dataUrl.startsWith('data:image/webp')) ext = 'webp';
  else if (dataUrl.startsWith('data:audio/wav')) ext = 'wav';
  else if (dataUrl.startsWith('data:audio/mp3') || dataUrl.startsWith('data:audio/mpeg')) ext = 'mp3';
  else if (dataUrl.startsWith('data:audio/ogg')) ext = 'ogg';
  
  const mediaId = crypto.randomUUID();
  const gcsPath = `killagent/media/${options.type}/${mediaId}.${ext}`;
  
  // Upload file and create record
  const file = await uploadAndCreateFile(userId, dataUrl, gcsPath, {
    originalFilename: `${options.name}.${ext}`,
    isPublic: options.isPublic,
  });
  
  // Create media item
  return createMediaItem(userId, {
    name: options.name,
    description: options.description || '',
    type: options.type,
    fileId: file.id,
    tags: [],
    source: options.source,
    prompt: options.prompt,
    isPublic: options.isPublic ?? false,
    projectIds: options.projectIds,
  });
}

// ============================================
// Legacy Support
// ============================================

/**
 * Save all media items for a user (replaces existing data)
 */
export async function saveAllMediaItemsForUser(
  userId: string,
  items: Array<{
    id: string;
    name: string;
    description: string;
    type: MediaType;
    tags?: string[];
    source: MediaSource;
    prompt?: string;
    isPublic?: boolean;
    projectIds?: string[];
    createdAt: string;
    updatedAt: string;
  }>
): Promise<void> {
  // Note: This legacy function doesn't handle file storage
  // It's kept for backward compatibility with existing data
  
  // For now, we just skip items without file_id since we can't store them properly
  console.warn('saveAllMediaItemsForUser: Legacy function called, media files need to be uploaded separately');
}
