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
import { preGenerateVoiceSamples } from './services/gemini.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for media file uploads

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
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
