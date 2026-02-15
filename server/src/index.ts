import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { llmRouter } from './routes/llm.js';
import { voiceRouter } from './routes/voice.js';
import { audioRouter } from './routes/audio.js';
import { imageRouter } from './routes/image.js';
import { musicRouter } from './routes/music.js';
import { storageRouter } from './routes/storage.js';
import { mixRouter } from './routes/mix.js';
import { authRouter, authMiddleware } from './routes/auth.js';
import { feedbackRouter } from './routes/feedback.js';
import { preGenerateVoiceSamples } from './services/gemini.js';
import { checkConnection, initializeSchema } from './db/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',  // Alternative dev port
  'https://gatherin.org',   // Production frontend
  'https://www.gatherin.org', // Production frontend (www)
  'https://api.gatherin.org', // API subdomain (same-site)
  process.env.FRONTEND_URL, // Production frontend URL from env
].filter(Boolean) as string[];

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' })); // Increased for media file uploads

// Health check
app.get('/api/health', async (_req, res) => {
  const dbConnected = await checkConnection();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'not available'
  });
});

// Routes
app.use('/api/auth', authRouter);

// Protected routes - require authentication
app.use('/api/llm', authMiddleware, llmRouter);
app.use('/api/voice', authMiddleware, voiceRouter);
app.use('/api/audio', authMiddleware, audioRouter);
app.use('/api/image', authMiddleware, imageRouter);
app.use('/api/music', authMiddleware, musicRouter);
app.use('/api/storage', authMiddleware, storageRouter);
app.use('/api/mix', authMiddleware, mixRouter);
app.use('/api/feedback', authMiddleware, feedbackRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Initialize database and start server
async function startServer() {
  // Try to initialize database schema
  try {
    const dbConnected = await checkConnection();
    if (dbConnected) {
      console.log('✅ Database connection established');
      await initializeSchema();
    } else {
      console.log('⚠️ Database not available, using GCS fallback');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.log('⚠️ Continuing without database, using GCS fallback');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    
    // Load pre-generated voice samples (or generate missing ones in background)
    preGenerateVoiceSamples('en')
      .then(() => preGenerateVoiceSamples('zh'))
      .then(() => console.log('✅ Voice samples ready'))
      .catch(err => console.error('❌ Voice sample loading failed:', err.message));
  });
}

startServer();
