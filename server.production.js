import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import winston from 'winston';
import Sentry from '@sentry/node';

// Import production configuration
import { productionConfig } from './config/production.js';

// Import services
import { FPLApiService } from './services/fplApiService.js';
import { LiveUpdateService } from './services/liveUpdateService.js';
import { activityLogger } from './services/activityLoggerService.js';

// Import routes
import fplRoutes from './routes/fplRoutes.js';
import authRoutes from './routes/authRoutes.js';
import draftRoutes from './routes/draftRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Winston logger
const logger = winston.createLogger({
  level: productionConfig.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'fpl-live-tracker' },
  transports: [
    new winston.transports.File({ 
      filename: productionConfig.logging.filePath,
      maxsize: productionConfig.logging.maxSize,
      maxFiles: productionConfig.logging.maxFiles
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Initialize Sentry for error tracking
if (productionConfig.monitoring.sentry.dsn) {
  Sentry.init({
    dsn: productionConfig.monitoring.sentry.dsn,
    environment: productionConfig.monitoring.sentry.environment,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: express() })
    ],
    tracesSampleRate: 1.0,
  });
}

const app = express();
const PORT = productionConfig.server.port;

// Initialize services
const fplService = new FPLApiService();
const liveUpdateService = new LiveUpdateService();

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https://fantasy.premierleague.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: productionConfig.security.rateLimit.windowMs,
  max: productionConfig.security.rateLimit.max,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(productionConfig.security.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Compression middleware
app.use(compression({ level: productionConfig.performance.compression.level }));

// CORS configuration
app.use(cors(productionConfig.server.cors));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Sentry request handler
if (productionConfig.monitoring.sentry.dsn) {
  app.use(Sentry.Handlers.requestHandler());
}

// API Routes
app.use('/api/fpl', fplRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/draft', draftRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/users', userRoutes);

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: productionConfig.server.environment,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        fpl: 'operational',
        liveUpdates: 'operational',
        websocket: 'operational',
        database: 'operational'
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Check database connectivity
    try {
      await activityLogger.getActivityStats(1);
      healthCheck.services.database = 'operational';
    } catch (error) {
      healthCheck.services.database = 'degraded';
      healthCheck.status = 'degraded';
    }

    res.status(200).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Production static file serving
if (productionConfig.server.environment === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  if (productionConfig.monitoring.sentry.dsn) {
    Sentry.captureException(err);
  }

  res.status(500).json({
    error: productionConfig.server.environment === 'production' 
      ? 'Internal server error' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});

// Sentry error handler
if (productionConfig.monitoring.sentry.dsn) {
  app.use(Sentry.Handlers.errorHandler());
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Create server based on SSL configuration
let server;
if (productionConfig.ssl.enabled) {
  try {
    const privateKey = fs.readFileSync(productionConfig.ssl.keyPath, 'utf8');
    const certificate = fs.readFileSync(productionConfig.ssl.certPath, 'utf8');
    const ca = fs.readFileSync(productionConfig.ssl.caPath, 'utf8');

    const credentials = {
      key: privateKey,
      cert: certificate,
      ca: ca
    };

    server = createHttpsServer(credentials, app);
    logger.info('HTTPS server created with SSL certificates');
  } catch (error) {
    logger.error('Failed to load SSL certificates:', error);
    server = createServer(app);
    logger.warn('Falling back to HTTP server');
  }
} else {
  server = createServer(app);
}

// Initialize services and start server
async function initializeServices() {
  try {
    logger.info('Initializing services...');
    
    // Initialize FPL service
    const fplInitialized = await fplService.initialize();
    if (fplInitialized) {
      logger.info('✅ FPL API Service initialized successfully');
    } else {
      logger.warn('⚠️ FPL API Service initialized with limited functionality');
    }

    // Initialize live update service
    await liveUpdateService.initialize();
    logger.info('✅ Live Update Service initialized successfully');

    // Initialize activity logger
    await activityLogger.initPromise;
    logger.info('✅ Activity Logger Service initialized successfully');

    logger.info('✅ All services initialized successfully');
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 FPL Live Tracker running on port ${PORT}`);
      logger.info(`📱 Frontend: ${productionConfig.server.frontendUrl}`);
      logger.info(`🔗 API: ${productionConfig.server.frontendUrl}/api`);
      logger.info(`⚡ WebSocket: wss://${productionConfig.server.frontendUrl.replace('https://', '')}`);
      logger.info(`🌍 Environment: ${productionConfig.server.environment}`);
    });

  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start the application
initializeServices().catch(error => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export default app;
