import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { errorHandler } from './middleware/errorHandler';
import { uploadRouter } from './routes/upload';
import { jobsRouter } from './routes/jobs';
import { downloadRouter } from './routes/download';
import { WebSocketServer } from './websocket/server';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSocket server
const wsServer = new WebSocketServer(httpServer);

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'KarokeMaker v2 API', version: '1.0.0' });
});

// Test route for debugging existing files
app.get('/api/test/:jobId/:type', (req, res) => {
  const { jobId, type } = req.params;
  const path = require('path');
  const fs = require('fs');
  
  const processedDir = path.resolve('./processed');
  let fileName: string;
  
  switch (type) {
    case 'instrumental':
      fileName = `instrumental_${jobId}.mp3`;
      break;
    case 'karaoke':
      fileName = `karaoke_${jobId}.mp3`;
      break;
    case 'lyrics':
      fileName = `lyrics_${jobId}.txt`;
      break;
    default:
      return res.status(400).json({ error: 'Invalid type' });
  }
  
  const filePath = path.join(processedDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found', path: filePath });
  }
  
  if (type === 'lyrics') {
    res.setHeader('Content-Type', 'text/plain');
  } else {
    res.setHeader('Content-Type', 'audio/mp3');
  }
  
  res.setHeader('Cache-Control', 'public, max-age=3600');
  fs.createReadStream(filePath).pipe(res);
});

app.use('/api', uploadRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/jobs', downloadRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🎤 KarokeMaker v2 API running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
  console.log(`🔗 Backend accessible at: http://localhost:${PORT}`);
});

// Export for use in workers
export { wsServer };