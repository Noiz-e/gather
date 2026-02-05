/**
 * Projects Repository
 * Handles CRUD operations for projects and episodes
 */

import { query, transaction } from '../index.js';
import { generateUrlsForFileIds, getFileByIdWithUrl, type FileWithUrl } from './files.js';
import type pg from 'pg';

// ============================================
// Types
// ============================================

export interface ProjectSpec {
  targetAudience: string;
  formatAndDuration: string;
  toneAndExpression: string;
  addBgm: boolean;
  addSoundEffects: boolean;
  hasVisualContent: boolean;
}

export interface ScriptLine {
  speaker: string;
  line: string;
}

export interface ScriptTimelineItem {
  id: string;
  timeStart: string;
  timeEnd: string;
  lines: ScriptLine[];
  soundMusic: string;
}

export interface ScriptSection {
  id: string;
  name: string;
  description: string;
  coverImageDescription?: string;
  timeline: ScriptTimelineItem[];
}

export interface EpisodeCharacter {
  name: string;
  description: string;
  assignedVoiceId?: string;
}

export interface Episode {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  script: string;
  scriptSections?: ScriptSection[];
  characters?: EpisodeCharacter[];
  audioUrl?: string;  // Signed URL (generated on demand)
  audioFileId?: string;
  duration?: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  subtitle?: string;
  description: string;
  religion: string;
  coverImage?: string;  // Signed URL (generated on demand)
  coverImageFileId?: string;
  spec?: ProjectSpec;
  episodes: Episode[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPublic: boolean;
}

// ============================================
// Database Row Types
// ============================================

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  description: string;
  religion: string;
  cover_image_file_id: string | null;
  spec: ProjectSpec | null;
  tags: string[];
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

interface EpisodeRow {
  id: string;
  project_id: string;
  title: string;
  subtitle: string | null;
  description: string;
  script: string;
  audio_file_id: string | null;
  duration: number | null;
  stage: string;
  notes: string;
  created_at: Date;
  updated_at: Date;
}

interface EpisodeCharacterRow {
  id: string;
  episode_id: string;
  name: string;
  description: string;
  assigned_voice_id: string | null;
}

interface ScriptSectionRow {
  id: string;
  episode_id: string;
  name: string;
  description: string;
  cover_image_description: string | null;
  sort_order: number;
}

interface ScriptTimelineItemRow {
  id: string;
  section_id: string;
  time_start: string;
  time_end: string;
  sound_music: string;
  sort_order: number;
  lines: ScriptLine[];
}

// ============================================
// Helper Functions
// ============================================

function mapProjectRow(row: ProjectRow): Omit<Project, 'episodes' | 'coverImage'> {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    subtitle: row.subtitle || undefined,
    description: row.description,
    religion: row.religion,
    coverImageFileId: row.cover_image_file_id || undefined,
    spec: row.spec || undefined,
    tags: row.tags || [],
    isPublic: row.is_public,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapEpisodeRow(row: EpisodeRow): Omit<Episode, 'scriptSections' | 'characters' | 'audioUrl'> {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || undefined,
    description: row.description,
    script: row.script,
    audioFileId: row.audio_file_id || undefined,
    duration: row.duration || undefined,
    stage: row.stage,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ============================================
// Projects CRUD
// ============================================

/**
 * Get all projects for a user (with signed URLs)
 */
export async function getProjectsByUserId(userId: string): Promise<Project[]> {
  // Get all projects for user
  const projectsResult = await query<ProjectRow>(`
    SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC
  `, [userId]);
  
  if (projectsResult.rows.length === 0) {
    return [];
  }
  
  return buildProjectsWithUrls(projectsResult.rows);
}

/**
 * Get all public projects
 */
export async function getPublicProjects(limit: number = 50): Promise<Project[]> {
  const projectsResult = await query<ProjectRow>(`
    SELECT * FROM projects WHERE is_public = TRUE ORDER BY created_at DESC LIMIT $1
  `, [limit]);
  
  if (projectsResult.rows.length === 0) {
    return [];
  }
  
  return buildProjectsWithUrls(projectsResult.rows);
}

/**
 * Build projects with episodes and signed URLs
 */
async function buildProjectsWithUrls(projectRows: ProjectRow[]): Promise<Project[]> {
  const projectIds = projectRows.map(p => p.id);
  
  // Get all episodes for these projects
  const episodesResult = await query<EpisodeRow>(`
    SELECT * FROM episodes 
    WHERE project_id = ANY($1)
    ORDER BY created_at ASC
  `, [projectIds]);
  
  // Get episode IDs
  const episodeIds = episodesResult.rows.map(e => e.id);
  
  // Get characters and script sections
  const [charactersResult, sectionsResult] = await Promise.all([
    episodeIds.length > 0
      ? query<EpisodeCharacterRow>(`
          SELECT * FROM episode_characters WHERE episode_id = ANY($1)
        `, [episodeIds])
      : { rows: [] },
    episodeIds.length > 0
      ? query<ScriptSectionRow>(`
          SELECT * FROM script_sections 
          WHERE episode_id = ANY($1)
          ORDER BY sort_order ASC
        `, [episodeIds])
      : { rows: [] },
  ]);
  
  // Get timeline items for sections
  const sectionIds = sectionsResult.rows.map(s => s.id);
  const timelineResult = sectionIds.length > 0
    ? await query<ScriptTimelineItemRow>(`
        SELECT * FROM script_timeline_items 
        WHERE section_id = ANY($1)
        ORDER BY sort_order ASC
      `, [sectionIds])
    : { rows: [] };
  
  // Collect all file IDs for URL generation
  const fileIds: string[] = [];
  projectRows.forEach(p => {
    if (p.cover_image_file_id) fileIds.push(p.cover_image_file_id);
  });
  episodesResult.rows.forEach(e => {
    if (e.audio_file_id) fileIds.push(e.audio_file_id);
  });
  
  // Generate signed URLs for all files
  const urlMap = fileIds.length > 0 
    ? await generateUrlsForFileIds(fileIds)
    : new Map<string, string>();
  
  // Build timeline map
  const timelineBySection = new Map<string, ScriptTimelineItem[]>();
  for (const item of timelineResult.rows) {
    const items = timelineBySection.get(item.section_id) || [];
    items.push({
      id: item.id,
      timeStart: item.time_start,
      timeEnd: item.time_end,
      soundMusic: item.sound_music,
      lines: item.lines || [],
    });
    timelineBySection.set(item.section_id, items);
  }
  
  // Build sections map
  const sectionsByEpisode = new Map<string, ScriptSection[]>();
  for (const section of sectionsResult.rows) {
    const sections = sectionsByEpisode.get(section.episode_id) || [];
    sections.push({
      id: section.id,
      name: section.name,
      description: section.description,
      coverImageDescription: section.cover_image_description || undefined,
      timeline: timelineBySection.get(section.id) || [],
    });
    sectionsByEpisode.set(section.episode_id, sections);
  }
  
  // Build characters map
  const charactersByEpisode = new Map<string, EpisodeCharacter[]>();
  for (const char of charactersResult.rows) {
    const chars = charactersByEpisode.get(char.episode_id) || [];
    chars.push({
      name: char.name,
      description: char.description,
      assignedVoiceId: char.assigned_voice_id || undefined,
    });
    charactersByEpisode.set(char.episode_id, chars);
  }
  
  // Build episodes map
  const episodesByProject = new Map<string, Episode[]>();
  for (const row of episodesResult.rows) {
    const episodes = episodesByProject.get(row.project_id) || [];
    const episode = mapEpisodeRow(row);
    episodes.push({
      ...episode,
      audioUrl: row.audio_file_id ? urlMap.get(row.audio_file_id) : undefined,
      scriptSections: sectionsByEpisode.get(row.id),
      characters: charactersByEpisode.get(row.id),
    });
    episodesByProject.set(row.project_id, episodes);
  }
  
  // Assemble projects with URLs
  return projectRows.map(row => ({
    ...mapProjectRow(row),
    coverImage: row.cover_image_file_id ? urlMap.get(row.cover_image_file_id) : undefined,
    episodes: episodesByProject.get(row.id) || [],
  }));
}

/**
 * Get a single project by ID
 */
export async function getProjectById(id: string, userId?: string): Promise<Project | null> {
  let queryStr = 'SELECT * FROM projects WHERE id = $1';
  const params: unknown[] = [id];
  
  if (userId) {
    queryStr += ' AND (user_id = $2 OR is_public = TRUE)';
    params.push(userId);
  }
  
  const result = await query<ProjectRow>(queryStr, params);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const projects = await buildProjectsWithUrls(result.rows);
  return projects[0] || null;
}

/**
 * Create a new project
 */
export async function createProject(
  userId: string,
  project: Omit<Project, 'id' | 'userId' | 'episodes' | 'createdAt' | 'updatedAt' | 'coverImage'>
): Promise<Project> {
  const result = await query<ProjectRow>(`
    INSERT INTO projects (
      user_id, title, subtitle, description, religion, 
      cover_image_file_id, spec, tags, is_public
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    userId,
    project.title,
    project.subtitle || null,
    project.description,
    project.religion,
    project.coverImageFileId || null,
    project.spec ? JSON.stringify(project.spec) : null,
    project.tags || [],
    project.isPublic ?? false,
  ]);
  
  const row = result.rows[0];
  
  // Get cover image URL if exists
  let coverImage: string | undefined;
  if (row.cover_image_file_id) {
    const file = await getFileByIdWithUrl(row.cover_image_file_id);
    coverImage = file?.url;
  }
  
  return {
    ...mapProjectRow(row),
    coverImage,
    episodes: [],
  };
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  userId: string,
  updates: Partial<Omit<Project, 'id' | 'userId' | 'episodes' | 'createdAt' | 'updatedAt' | 'coverImage'>>
): Promise<Project | null> {
  const setClause: string[] = [];
  const values: unknown[] = [id, userId];
  let paramIndex = 3;
  
  if (updates.title !== undefined) {
    setClause.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.subtitle !== undefined) {
    setClause.push(`subtitle = $${paramIndex++}`);
    values.push(updates.subtitle);
  }
  if (updates.description !== undefined) {
    setClause.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.religion !== undefined) {
    setClause.push(`religion = $${paramIndex++}`);
    values.push(updates.religion);
  }
  if (updates.coverImageFileId !== undefined) {
    setClause.push(`cover_image_file_id = $${paramIndex++}`);
    values.push(updates.coverImageFileId);
  }
  if (updates.spec !== undefined) {
    setClause.push(`spec = $${paramIndex++}`);
    values.push(JSON.stringify(updates.spec));
  }
  if (updates.tags !== undefined) {
    setClause.push(`tags = $${paramIndex++}`);
    values.push(updates.tags);
  }
  if (updates.isPublic !== undefined) {
    setClause.push(`is_public = $${paramIndex++}`);
    values.push(updates.isPublic);
  }
  
  if (setClause.length === 0) {
    return getProjectById(id, userId);
  }
  
  await query(`
    UPDATE projects SET ${setClause.join(', ')}
    WHERE id = $1 AND user_id = $2
  `, values);
  
  return getProjectById(id, userId);
}

/**
 * Delete a project
 */
export async function deleteProject(id: string, userId: string): Promise<boolean> {
  const result = await query(`
    DELETE FROM projects WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  
  return (result.rowCount ?? 0) > 0;
}

// ============================================
// Episodes CRUD
// ============================================

/**
 * Create an episode
 */
export async function createEpisode(
  projectId: string,
  userId: string,
  episode: Omit<Episode, 'id' | 'createdAt' | 'updatedAt' | 'audioUrl' | 'scriptSections' | 'characters'>
): Promise<Episode | null> {
  // Verify project ownership
  const projectCheck = await query(`
    SELECT id FROM projects WHERE id = $1 AND user_id = $2
  `, [projectId, userId]);
  
  if (projectCheck.rows.length === 0) {
    return null;
  }
  
  const result = await query<EpisodeRow>(`
    INSERT INTO episodes (
      project_id, title, subtitle, description, script,
      audio_file_id, duration, stage, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    projectId,
    episode.title,
    episode.subtitle || null,
    episode.description,
    episode.script,
    episode.audioFileId || null,
    episode.duration || null,
    episode.stage,
    episode.notes,
  ]);
  
  const row = result.rows[0];
  
  // Get audio URL if exists
  let audioUrl: string | undefined;
  if (row.audio_file_id) {
    const file = await getFileByIdWithUrl(row.audio_file_id);
    audioUrl = file?.url;
  }
  
  return {
    ...mapEpisodeRow(row),
    audioUrl,
  };
}

/**
 * Update an episode
 */
export async function updateEpisode(
  id: string,
  userId: string,
  updates: Partial<Omit<Episode, 'id' | 'createdAt' | 'updatedAt' | 'audioUrl' | 'scriptSections' | 'characters'>>
): Promise<Episode | null> {
  // Verify ownership through project
  const ownerCheck = await query(`
    SELECT e.id FROM episodes e
    JOIN projects p ON e.project_id = p.id
    WHERE e.id = $1 AND p.user_id = $2
  `, [id, userId]);
  
  if (ownerCheck.rows.length === 0) {
    return null;
  }
  
  const setClause: string[] = [];
  const values: unknown[] = [id];
  let paramIndex = 2;
  
  if (updates.title !== undefined) {
    setClause.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.subtitle !== undefined) {
    setClause.push(`subtitle = $${paramIndex++}`);
    values.push(updates.subtitle);
  }
  if (updates.description !== undefined) {
    setClause.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.script !== undefined) {
    setClause.push(`script = $${paramIndex++}`);
    values.push(updates.script);
  }
  if (updates.audioFileId !== undefined) {
    setClause.push(`audio_file_id = $${paramIndex++}`);
    values.push(updates.audioFileId);
  }
  if (updates.duration !== undefined) {
    setClause.push(`duration = $${paramIndex++}`);
    values.push(updates.duration);
  }
  if (updates.stage !== undefined) {
    setClause.push(`stage = $${paramIndex++}`);
    values.push(updates.stage);
  }
  if (updates.notes !== undefined) {
    setClause.push(`notes = $${paramIndex++}`);
    values.push(updates.notes);
  }
  
  if (setClause.length === 0) {
    const result = await query<EpisodeRow>(`SELECT * FROM episodes WHERE id = $1`, [id]);
    if (result.rows.length === 0) return null;
    return mapEpisodeRow(result.rows[0]) as Episode;
  }
  
  const result = await query<EpisodeRow>(`
    UPDATE episodes SET ${setClause.join(', ')}
    WHERE id = $1
    RETURNING *
  `, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  
  // Get audio URL if exists
  let audioUrl: string | undefined;
  if (row.audio_file_id) {
    const file = await getFileByIdWithUrl(row.audio_file_id);
    audioUrl = file?.url;
  }
  
  return {
    ...mapEpisodeRow(row),
    audioUrl,
  };
}

/**
 * Delete an episode
 */
export async function deleteEpisode(id: string, userId: string): Promise<boolean> {
  const result = await query(`
    DELETE FROM episodes e
    USING projects p
    WHERE e.id = $1 AND e.project_id = p.id AND p.user_id = $2
  `, [id, userId]);
  
  return (result.rowCount ?? 0) > 0;
}

// ============================================
// Legacy Support: Save All Projects
// (For backward compatibility with existing API)
// ============================================

/**
 * Save all projects for a user (replaces existing data)
 * This is for backward compatibility with the existing frontend
 */
export async function saveAllProjectsForUser(
  userId: string, 
  projects: Array<Omit<Project, 'userId' | 'coverImage'> & { coverImage?: string }>
): Promise<void> {
  await transaction(async (client: pg.PoolClient) => {
    // Delete existing projects for user
    await client.query('DELETE FROM projects WHERE user_id = $1', [userId]);
    
    for (const project of projects) {
      // Insert project
      await client.query(`
        INSERT INTO projects (id, user_id, title, subtitle, description, religion, spec, tags, is_public, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        project.id,
        userId,
        project.title,
        project.subtitle || null,
        project.description,
        project.religion,
        project.spec ? JSON.stringify(project.spec) : null,
        project.tags || [],
        project.isPublic ?? false,
        project.createdAt,
        project.updatedAt,
      ]);
      
      // Insert episodes
      for (const episode of project.episodes || []) {
        await client.query(`
          INSERT INTO episodes (id, project_id, title, subtitle, description, script, duration, stage, notes, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          episode.id,
          project.id,
          episode.title,
          episode.subtitle || null,
          episode.description,
          episode.script,
          episode.duration || null,
          episode.stage,
          episode.notes,
          episode.createdAt,
          episode.updatedAt,
        ]);
        
        // Insert characters
        for (const char of episode.characters || []) {
          await client.query(`
            INSERT INTO episode_characters (episode_id, name, description, assigned_voice_id)
            VALUES ($1, $2, $3, $4)
          `, [
            episode.id,
            char.name,
            char.description,
            char.assignedVoiceId || null,
          ]);
        }
        
        // Insert script sections
        let sectionOrder = 0;
        for (const section of episode.scriptSections || []) {
          await client.query(`
            INSERT INTO script_sections (id, episode_id, name, description, cover_image_description, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            section.id,
            episode.id,
            section.name,
            section.description,
            section.coverImageDescription || null,
            sectionOrder++,
          ]);
          
          // Insert timeline items
          let timelineOrder = 0;
          for (const item of section.timeline || []) {
            await client.query(`
              INSERT INTO script_timeline_items (id, section_id, time_start, time_end, sound_music, sort_order, lines)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              item.id,
              section.id,
              item.timeStart,
              item.timeEnd,
              item.soundMusic,
              timelineOrder++,
              JSON.stringify(item.lines || []),
            ]);
          }
        }
      }
    }
  });
}
