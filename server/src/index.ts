import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { llmRouter } from './routes/llm.js';
import { voiceRouter } from './routes/voice.js';
import { audioRouter } from './routes/audio.js';
import { imageRouter } from './routes/image.js';
import { musicRouter } from './routes/music.js';
import { storageRouter } from './routes/storage.js';
import { mixRouter } from './routes/mix.js';
import { authRouter } from './routes/auth.js';
import { preGenerateVoiceSamples } from './services/gemini.js';
import { checkConnection, initializeSchema } from './db/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
app.use('/api/llm', llmRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/audio', audioRouter);
app.use('/api/image', imageRouter);
app.use('/api/music', musicRouter);
app.use('/api/storage', storageRouter);
app.use('/api/mix', mixRouter);

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
    
    // Pre-generate voice samples in background (don't block server startup)
    console.log('📢 Pre-generating voice samples...');
    preGenerateVoiceSamples('en')
      .then(() => preGenerateVoiceSamples('zh'))
      .then(() => console.log('✅ All voice samples pre-generated'))
      .catch(err => console.error('❌ Voice sample pre-generation failed:', err.message));
  });
}

startServer();
