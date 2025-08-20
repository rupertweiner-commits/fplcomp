export const productionConfig = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    environment: 'production',
    frontendUrl: process.env.FRONTEND_URL || 'https://yourdomain.com',
    cors: {
      origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
      credentials: true
    }
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secure-32-character-secret-key-here',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    sessionSecret: process.env.SESSION_SECRET || 'another-super-secure-session-secret-key',
    bcryptRounds: 12,
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
    }
  },

  // Database Configuration
  database: {
    type: process.env.DATABASE_TYPE || 'sqlite', // 'sqlite' or 'postgresql'
    sqlite: {
      path: process.env.SQLITE_PATH || './data/production.db'
    },
    postgresql: {
      url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/fpl_tracker',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  },

  // FPL API Configuration
  fplApi: {
    timeout: parseInt(process.env.FPL_API_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.FPL_API_RETRY_ATTEMPTS) || 3,
    cacheTTL: parseInt(process.env.FPL_API_CACHE_TTL) || 300000, // 5 minutes
    userAgent: 'FPL-Live-Tracker-Production/1.0.0'
  },

  // Push Notifications
  pushNotifications: {
    vapid: {
      publicKey: process.env.VAPID_PUBLIC_KEY || 'your-vapid-public-key-here',
      privateKey: process.env.VAPID_PRIVATE_KEY || 'your-vapid-private-key-here'
    }
  },

  // SSL/TLS Configuration
  ssl: {
    enabled: process.env.SSL_ENABLED === 'true',
    keyPath: process.env.SSL_KEY_PATH || '/path/to/ssl/private.key',
    certPath: process.env.SSL_CERT_PATH || '/path/to/ssl/certificate.crt',
    caPath: process.env.SSL_CA_PATH || '/path/to/ssl/ca_bundle.crt'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
    maxSize: '20m',
    maxFiles: '14d'
  },

  // Monitoring & Analytics
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN || 'your-sentry-dsn-here',
      environment: 'production'
    },
    newRelic: {
      licenseKey: process.env.NEW_RELIC_LICENSE_KEY || 'your-new-relic-key-here'
    }
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    }
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || 'your-redis-password',
    ttl: 86400 // 24 hours
  },

  // Backup Configuration
  backup: {
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    path: process.env.BACKUP_PATH || './backups'
  },

  // Performance Configuration
  performance: {
    compression: {
      level: parseInt(process.env.COMPRESSION_LEVEL) || 6
    },
    cache: {
      ttl: parseInt(process.env.CACHE_TTL) || 3600000 // 1 hour
    },
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
    }
  }
};
