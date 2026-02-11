-- Gather Database Schema
-- PostgreSQL for Cloud SQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE religion_type AS ENUM (
  'default',
  'christianity',
  'catholicism',
  'buddhism',
  'islam',
  'judaism',
  'hinduism',
  'taoism'
);

CREATE TYPE project_stage AS ENUM (
  'planning',
  'scripting',
  'recording',
  'editing',
  'review',
  'published'
);

CREATE TYPE media_type AS ENUM (
  'image',
  'bgm',
  'sfx'
);

CREATE TYPE media_source AS ENUM (
  'generated',
  'uploaded'
);

CREATE TYPE user_role AS ENUM (
  'user',
  'admin',
  'superadmin'
);

CREATE TYPE auth_provider AS ENUM (
  'email',
  'google',
  'apple',
  'github'
);

-- ============================================
-- Users Table
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- NULL for OAuth users
  auth_provider auth_provider NOT NULL DEFAULT 'email',
  provider_user_id VARCHAR(255),  -- External provider user ID
  
  -- Profile
  display_name VARCHAR(255) NOT NULL,
  avatar_gcs_path TEXT,  -- GCS path, not full URL
  bio TEXT,
  
  -- Settings
  role user_role NOT NULL DEFAULT 'user',
  preferred_language VARCHAR(10) DEFAULT 'zh',
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
  settings JSONB DEFAULT '{}',
  
  -- Status
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_user_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- User Sessions Table (for refresh tokens)
-- ============================================

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_info JSONB,  -- { userAgent, ip, platform }
  
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- ============================================
-- Files Table (GCS file references)
-- Centralized file management for all uploaded files
-- ============================================

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- GCS reference (NOT full URL - URL is generated on demand)
  gcs_bucket VARCHAR(255) NOT NULL,
  gcs_path VARCHAR(1024) NOT NULL,
  
  -- File metadata
  original_filename VARCHAR(255),
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT,
  
  -- For media files
  width INTEGER,  -- For images
  height INTEGER,  -- For images
  duration_seconds INTEGER,  -- For audio/video
  
  -- Status
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,  -- Soft delete
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_gcs_path ON files(gcs_path);
CREATE INDEX idx_files_mime_type ON files(mime_type);

-- ============================================
-- Projects Table
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT NOT NULL DEFAULT '',
  religion religion_type NOT NULL DEFAULT 'default',
  
  -- Cover image (reference to files table)
  cover_image_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  
  tags TEXT[] DEFAULT '{}',
  
  -- Project Spec (JSON for flexibility)
  spec JSONB,
  
  -- Visibility
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_religion ON projects(religion);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_public ON projects(is_public) WHERE is_public = TRUE;

-- ============================================
-- Episodes Table
-- ============================================

CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT NOT NULL DEFAULT '',
  script TEXT NOT NULL DEFAULT '',  -- Legacy simple script
  
  -- Audio file (reference to files table)
  audio_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  duration INTEGER,  -- Duration in seconds
  
  stage project_stage NOT NULL DEFAULT 'planning',
  notes TEXT NOT NULL DEFAULT '',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_episodes_project_id ON episodes(project_id);
CREATE INDEX idx_episodes_stage ON episodes(stage);

-- ============================================
-- Episode Characters Table
-- ============================================

CREATE TABLE episode_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assigned_voice_id VARCHAR(255),  -- Reference to voice_characters or system voice name
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_episode_characters_episode_id ON episode_characters(episode_id);

-- ============================================
-- Script Sections Table
-- ============================================

CREATE TABLE script_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_image_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_script_sections_episode_id ON script_sections(episode_id);

-- ============================================
-- Script Timeline Items Table
-- ============================================

CREATE TABLE script_timeline_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES script_sections(id) ON DELETE CASCADE,
  
  time_start VARCHAR(20) NOT NULL DEFAULT '00:00',
  time_end VARCHAR(20) NOT NULL DEFAULT '00:00',
  sound_music TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Lines stored as JSONB array: [{"speaker": "...", "line": "..."}]
  lines JSONB NOT NULL DEFAULT '[]',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_script_timeline_items_section_id ON script_timeline_items(section_id);

-- ============================================
-- Voice Characters Table
-- ============================================

CREATE TABLE voice_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  
  -- File references (GCS paths via files table)
  avatar_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  audio_sample_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  ref_audio_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  ref_text TEXT,  -- Reference text for the audio sample
  
  tags TEXT[] DEFAULT '{}',
  
  -- Visibility
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_characters_user_id ON voice_characters(user_id);
CREATE INDEX idx_voice_characters_created_at ON voice_characters(created_at DESC);
CREATE INDEX idx_voice_characters_public ON voice_characters(is_public) WHERE is_public = TRUE;

-- ============================================
-- Voice Character Project Association
-- ============================================

CREATE TABLE voice_character_projects (
  voice_character_id UUID NOT NULL REFERENCES voice_characters(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (voice_character_id, project_id)
);

-- ============================================
-- Media Items Table
-- ============================================

CREATE TABLE media_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type media_type NOT NULL,
  
  -- File reference (GCS path via files table)
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  thumbnail_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  
  tags TEXT[] DEFAULT '{}',
  source media_source NOT NULL DEFAULT 'uploaded',
  prompt TEXT,  -- Generation prompt if AI-generated
  
  -- Visibility
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_items_user_id ON media_items(user_id);
CREATE INDEX idx_media_items_type ON media_items(type);
CREATE INDEX idx_media_items_created_at ON media_items(created_at DESC);
CREATE INDEX idx_media_items_public ON media_items(is_public) WHERE is_public = TRUE;

-- ============================================
-- Media Item Project Association
-- ============================================

CREATE TABLE media_item_projects (
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (media_item_id, project_id)
);

-- ============================================
-- Update Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_characters_updated_at
  BEFORE UPDATE ON voice_characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_items_updated_at
  BEFORE UPDATE ON media_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper Functions
-- ============================================

-- Function to check if a user owns a project
CREATE OR REPLACE FUNCTION user_owns_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a user can access a project (owns or public)
CREATE OR REPLACE FUNCTION user_can_access_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = p_project_id 
    AND (user_id = p_user_id OR is_public = TRUE)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Migrations (safe to re-run)
-- ============================================

-- Allow assigned_voice_id to store system voice names (e.g. "Charon") in addition to UUIDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'episode_characters' 
    AND column_name = 'assigned_voice_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE episode_characters ALTER COLUMN assigned_voice_id TYPE VARCHAR(255);
  END IF;
END $$;
