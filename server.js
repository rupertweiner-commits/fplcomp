import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { FPLApiService } from './services/fplApiService.js';
import { LiveUpdateService } from './services/liveUpdateService.js';
import fplRoutes from './routes/fplRoutes.js';
import authRoutes from './routes/authRoutes.js';
import draftRoutes from './routes/draftRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import draftQueueRoutes from './routes/draftQueueRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { 
  apiLimiter, 
  authLimiter, 
  passwordResetLimiter, 
  adminLimiter 
} from './middleware/rateLimiter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize services
const fplService = new FPLApiService();
const liveUpdateService = new LiveUpdateService();

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https://fantasy.premierleague.com"]
    }
  }
}));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Apply rate limiting middleware
app.use('/api/', apiLimiter); // General API rate limiting
app.use('/api/auth/login', authLimiter); // Strict auth rate limiting
app.use('/api/auth/forgot-password', passwordResetLimiter); // Password reset rate limiting
app.use('/api/auth/reset-password', passwordResetLimiter); // Password reset rate limiting
app.use('/api/activity/stats', adminLimiter); // Admin endpoints rate limiting
app.use('/api/activity/all', adminLimiter); // Admin endpoints rate limiting
app.use('/api/activity/sessions', adminLimiter); // Admin endpoints rate limiting
app.use('/api/activity/cleanup', adminLimiter); // Admin endpoints rate limiting

// API Routes
app.use('/api/fpl', fplRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/draft', draftRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/draft-queue', draftQueueRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  // Check if we have any cached data to determine service health
  const hasCachedData = fplService.getFromCache(fplService.getCacheKey('bootstrap-static'));
  
  res.status(200).json({ 
    status: hasCachedData ? 'healthy' : 'degraded',
    services: {
      fpl: hasCachedData ? 'operational' : 'limited',
      liveUpdates: 'operational',
      websocket: 'operational'
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    note: hasCachedData ? 'Service running with full functionality' : 'Service running with limited functionality due to API connectivity issues'
  });
});

// Development vs Production static file serving
if (process.env.NODE_ENV === 'production') {
  // Serve React app from build folder in production
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
  });
} else {
  // In development, redirect to React dev server for root
  app.get('/', (req, res) => {
    res.redirect('http://localhost:3001');
  });
  
  // Handle non-API routes
  app.get('*', (req, res) => {
    // Don't interfere with API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.json({
      message: 'FPL Live Tracker API Server',
      environment: 'development',
      frontend: 'http://localhost:3001',
      api: `http://localhost:${PORT}/api/fpl`,
      health: `http://localhost:${PORT}/health`,
      timestamp: new Date().toISOString()
    });
  });
}

// WebSocket setup for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📡 New WebSocket connection established');
  
  // Send initial data
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to FPL Live Tracker'
  }));

  // Subscribe to live updates
  liveUpdateService.subscribe(ws);

  ws.on('close', () => {
    console.log('📡 WebSocket connection closed');
    liveUpdateService.unsubscribe(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Scheduled tasks for data updates
cron.schedule('*/2 * * * *', async () => {
  try {
    console.log('🔄 Running scheduled data update...');
    await liveUpdateService.updateLiveData();
  } catch (error) {
    console.error('❌ Scheduled update failed:', error);
  }
});

// Gameweek-specific updates (more frequent during match days)
cron.schedule('*/30 * * * * *', async () => {
  try {
    const eventStatus = await fplService.getEventStatus();
    if (eventStatus && eventStatus.status.some(s => s.bonus_added === false)) {
      await liveUpdateService.updateGameweekLiveData();
    }
  } catch (error) {
    console.error('❌ Live gameweek update failed:', error);
  }
});

// Initialize services
async function initializeServices() {
  try {
    const fplInitialized = await fplService.initialize();
    
    if (fplInitialized) {
      await liveUpdateService.initialize(fplService, wss);
      console.log('✅ All services initialized successfully');
    } else {
      console.log('⚠️  FPL service initialized with limited functionality');
      // Try to initialize live update service with limited functionality
      try {
        await liveUpdateService.initialize(fplService, wss);
        console.log('✅ Live update service initialized with limited functionality');
      } catch (liveError) {
        console.log('⚠️  Live update service failed to initialize:', liveError.message);
      }
    }
  } catch (error) {
    console.error('❌ Critical service initialization failed:', error);
    console.log('⚠️  Server will continue with basic functionality');
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📊 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('🔒 Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 FPL Live Tracker running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/fpl`);
  console.log(`⚡ WebSocket: ws://localhost:${PORT}`);
  
  await initializeServices();
});

export { app, server, wss };
