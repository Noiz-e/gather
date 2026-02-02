import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { llmRouter } from './routes/llm.js';
import { voiceRouter } from './routes/voice.js';
import { audioRouter } from './routes/audio.js';
import { imageRouter } from './routes/image.js';
import { musicRouter } from './routes/music.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
});
