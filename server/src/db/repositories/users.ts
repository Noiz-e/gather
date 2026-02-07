/**
 * Users Repository
 * Handles user CRUD operations and authentication
 */

import { query, transaction } from '../index.js';
import type pg from 'pg';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export type UserRole = 'user' | 'editor' | 'admin' | 'superadmin';
export type AuthProvider = 'email' | 'google' | 'apple' | 'github';

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  authProvider: AuthProvider;
  providerUserId?: string;
  displayName: string;
  avatarGcsPath?: string;
  bio?: string;
  role: UserRole;
  preferredLanguage: string;
  timezone: string;
  settings: Record<string, unknown>;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
  };
  expiresAt: string;
  lastUsedAt: string;
  revokedAt?: string;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash?: string;
  authProvider?: AuthProvider;
  providerUserId?: string;
  displayName: string;
  avatarGcsPath?: string;
}

export interface UpdateUserInput {
  displayName?: string;
  avatarGcsPath?: string;
  bio?: string;
  preferredLanguage?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
}

// ============================================
// Database Row Types
// ============================================

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  auth_provider: AuthProvider;
  provider_user_id: string | null;
  display_name: string;
  avatar_gcs_path: string | null;
  bio: string | null;
  role: UserRole;
  preferred_language: string;
  timezone: string;
  settings: Record<string, unknown>;
  email_verified: boolean;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_info: Record<string, unknown> | null;
  expires_at: Date;
  last_used_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

// ============================================
// Helper Functions
// ============================================

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash || undefined,
    authProvider: row.auth_provider,
    providerUserId: row.provider_user_id || undefined,
    displayName: row.display_name,
    avatarGcsPath: row.avatar_gcs_path || undefined,
    bio: row.bio || undefined,
    role: row.role,
    preferredLanguage: row.preferred_language,
    timezone: row.timezone,
    settings: row.settings || {},
    emailVerified: row.email_verified,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapSessionRow(row: SessionRow): UserSession {
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    deviceInfo: row.device_info as UserSession['deviceInfo'],
    expiresAt: row.expires_at.toISOString(),
    lastUsedAt: row.last_used_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Hash a password using SHA-256
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================
// User CRUD
// ============================================

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const result = await query<UserRow>(`
    SELECT * FROM users WHERE id = $1 AND is_active = TRUE
  `, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapUserRow(result.rows[0]);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query<UserRow>(`
    SELECT * FROM users WHERE email = $1
  `, [email.toLowerCase()]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapUserRow(result.rows[0]);
}

/**
 * Get user by OAuth provider
 */
export async function getUserByProvider(
  provider: AuthProvider,
  providerUserId: string
): Promise<User | null> {
  const result = await query<UserRow>(`
    SELECT * FROM users 
    WHERE auth_provider = $1 AND provider_user_id = $2
  `, [provider, providerUserId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapUserRow(result.rows[0]);
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const result = await query<UserRow>(`
    INSERT INTO users (
      email, password_hash, auth_provider, provider_user_id, display_name, avatar_gcs_path
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    input.email.toLowerCase(),
    input.passwordHash || null,
    input.authProvider || 'email',
    input.providerUserId || null,
    input.displayName,
    input.avatarGcsPath || null,
  ]);
  
  return mapUserRow(result.rows[0]);
}

/**
 * Update user profile
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
  const updates: string[] = [];
  const values: unknown[] = [id];
  let paramIndex = 2;
  
  if (input.displayName !== undefined) {
    updates.push(`display_name = $${paramIndex++}`);
    values.push(input.displayName);
  }
  if (input.avatarGcsPath !== undefined) {
    updates.push(`avatar_gcs_path = $${paramIndex++}`);
    values.push(input.avatarGcsPath);
  }
  if (input.bio !== undefined) {
    updates.push(`bio = $${paramIndex++}`);
    values.push(input.bio);
  }
  if (input.preferredLanguage !== undefined) {
    updates.push(`preferred_language = $${paramIndex++}`);
    values.push(input.preferredLanguage);
  }
  if (input.timezone !== undefined) {
    updates.push(`timezone = $${paramIndex++}`);
    values.push(input.timezone);
  }
  if (input.settings !== undefined) {
    updates.push(`settings = $${paramIndex++}`);
    values.push(JSON.stringify(input.settings));
  }
  
  if (updates.length === 0) {
    return getUserById(id);
  }
  
  const result = await query<UserRow>(`
    UPDATE users SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapUserRow(result.rows[0]);
}

/**
 * Update user password
 */
export async function updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
  const result = await query(`
    UPDATE users SET password_hash = $2
    WHERE id = $1
  `, [id, passwordHash]);
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Update last login time
 */
export async function updateLastLogin(id: string): Promise<void> {
  await query(`
    UPDATE users SET last_login_at = NOW()
    WHERE id = $1
  `, [id]);
}

/**
 * Verify user email
 */
export async function verifyUserEmail(id: string): Promise<boolean> {
  const result = await query(`
    UPDATE users SET email_verified = TRUE
    WHERE id = $1
  `, [id]);
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(id: string): Promise<boolean> {
  const result = await query(`
    UPDATE users SET is_active = FALSE
    WHERE id = $1
  `, [id]);
  
  return (result.rowCount ?? 0) > 0;
}

// ============================================
// Session Management
// ============================================

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  refreshToken: string,
  deviceInfo?: UserSession['deviceInfo'],
  expiresInDays: number = 30
): Promise<UserSession> {
  const result = await query<SessionRow>(`
    INSERT INTO user_sessions (
      user_id, refresh_token_hash, device_info, expires_at
    )
    VALUES ($1, $2, $3, NOW() + INTERVAL '${expiresInDays} days')
    RETURNING *
  `, [
    userId,
    hashToken(refreshToken),
    deviceInfo ? JSON.stringify(deviceInfo) : null,
  ]);
  
  return mapSessionRow(result.rows[0]);
}

/**
 * Get session by refresh token
 */
export async function getSessionByToken(refreshToken: string): Promise<UserSession | null> {
  const tokenHash = hashToken(refreshToken);
  
  const result = await query<SessionRow>(`
    SELECT * FROM user_sessions 
    WHERE refresh_token_hash = $1 
    AND expires_at > NOW()
    AND revoked_at IS NULL
  `, [tokenHash]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // Update last used time
  await query(`
    UPDATE user_sessions SET last_used_at = NOW()
    WHERE id = $1
  `, [result.rows[0].id]);
  
  return mapSessionRow(result.rows[0]);
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  const result = await query(`
    UPDATE user_sessions SET revoked_at = NOW()
    WHERE id = $1
  `, [sessionId]);
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await query(`
    UPDATE user_sessions SET revoked_at = NOW()
    WHERE user_id = $1 AND revoked_at IS NULL
  `, [userId]);
  
  return result.rowCount ?? 0;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await query(`
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR revoked_at < NOW() - INTERVAL '7 days'
  `);
  
  return result.rowCount ?? 0;
}

// ============================================
// Validation
// ============================================

/**
 * Validate email and password for login
 */
export async function validateCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserByEmail(email);
  
  if (!user || !user.passwordHash || !user.isActive) {
    return null;
  }
  
  const passwordHash = hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    return null;
  }
  
  return user;
}
