/**
 * Authentication API routes
 * Handles user registration, login, token refresh, etc.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as usersRepo from '../db/repositories/users.js';
import { checkConnection } from '../db/index.js';
import crypto from 'crypto';

export const authRouter = Router();

// ============================================
// Types
// ============================================

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: usersRepo.User;
}

// JWT-like token structure (simplified)
interface TokenPayload {
  userId: string;
  exp: number;
  iat: number;
}

// ============================================
// Token Utilities
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'gather-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

function createToken(payload: Omit<TokenPayload, 'iat'>): string {
  const fullPayload: TokenPayload = {
    ...payload,
    iat: Date.now(),
  };
  
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64url');
  
  return `${data}.${signature}`;
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const [data, signature] = token.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(data)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as TokenPayload;
    
    // Check expiration
    if (payload.exp < Date.now()) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

function generateAccessToken(userId: string): string {
  return createToken({
    userId,
    exp: Date.now() + ACCESS_TOKEN_EXPIRES_MS,
  });
}

// ============================================
// Middleware
// ============================================

/**
 * Authentication middleware
 * Extracts and verifies the access token from Authorization header
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
  
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  
  // Get user from database
  const user = await usersRepo.getUserById(payload.userId);
  
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'User not found or inactive' });
    return;
  }
  
  req.userId = user.id;
  req.user = user;
  
  next();
}

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't require it
 */
export async function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    
    if (payload) {
      const user = await usersRepo.getUserById(payload.userId);
      if (user && user.isActive) {
        req.userId = user.id;
        req.user = user;
      }
    }
  }
  
  next();
}

// ============================================
// Routes
// ============================================

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password || !displayName) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, displayName' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }
    
    // Check if database is available
    const dbAvailable = await checkConnection();
    if (!dbAvailable) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Check if user already exists
    const existingUser = await usersRepo.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Create user
    const passwordHash = usersRepo.hashPassword(password);
    const user = await usersRepo.createUser({
      email,
      passwordHash,
      displayName,
      authProvider: 'email',
    });
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = usersRepo.generateToken();
    
    // Create session
    await usersRepo.createSession(user.id, refreshToken, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }, REFRESH_TOKEN_EXPIRES_DAYS);
    
    // Update last login
    await usersRepo.updateLastLogin(user.id);
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_MS / 1000,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password' 
      });
    }
    
    // Check if database is available
    const dbAvailable = await checkConnection();
    if (!dbAvailable) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Validate credentials
    const user = await usersRepo.validateCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = usersRepo.generateToken();
    
    // Create session
    await usersRepo.createSession(user.id, refreshToken, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }, REFRESH_TOKEN_EXPIRES_DAYS);
    
    // Update last login
    await usersRepo.updateLastLogin(user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_MS / 1000,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }
    
    // Check if database is available
    const dbAvailable = await checkConnection();
    if (!dbAvailable) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Validate refresh token
    const session = await usersRepo.getSessionByToken(refreshToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    // Get user
    const user = await usersRepo.getUserById(session.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(user.id);
    
    res.json({
      accessToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_MS / 1000,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout and revoke refresh token
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      const session = await usersRepo.getSessionByToken(refreshToken);
      if (session) {
        await usersRepo.revokeSession(session.id);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        displayName: req.user.displayName,
        avatarGcsPath: req.user.avatarGcsPath,
        bio: req.user.bio,
        role: req.user.role,
        preferredLanguage: req.user.preferredLanguage,
        timezone: req.user.timezone,
        settings: req.user.settings,
        emailVerified: req.user.emailVerified,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/auth/me
 * Update current user profile
 */
authRouter.patch('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { displayName, bio, preferredLanguage, timezone, settings } = req.body;
    
    const user = await usersRepo.updateUser(req.userId, {
      displayName,
      bio,
      preferredLanguage,
      timezone,
      settings,
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        preferredLanguage: user.preferredLanguage,
        timezone: user.timezone,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
authRouter.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Missing required fields: currentPassword, newPassword' 
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'New password must be at least 8 characters' 
      });
    }
    
    // Verify current password
    const currentHash = usersRepo.hashPassword(currentPassword);
    if (currentHash !== req.user.passwordHash) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    const newHash = usersRepo.hashPassword(newPassword);
    await usersRepo.updateUserPassword(req.userId, newHash);
    
    // Revoke all sessions except current
    await usersRepo.revokeAllUserSessions(req.userId);
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Failed to change password',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { AuthenticatedRequest };
