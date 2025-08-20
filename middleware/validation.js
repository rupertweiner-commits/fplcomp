import { body, param, query, validationResult } from 'express-validator';
import { sanitize } from 'express-validator';

// Generic validation result handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Sanitize input to prevent XSS
export const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]).escape();
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitize(req.query[key]).escape();
      }
    });
  }
  
  next();
};

// User authentication validation
export const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Password reset validation
export const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required')
    .isLength({ max: 255 })
    .withMessage('Email is too long'),
  
  handleValidationErrors
];

export const validateResetPassword = [
  body('token')
    .trim()
    .isLength({ min: 32, max: 64 })
    .withMessage('Invalid reset token')
    .matches(/^[a-f0-9]+$/)
    .withMessage('Invalid reset token format'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

// User profile validation
export const validateProfileUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required')
    .isLength({ max: 255 })
    .withMessage('Email is too long'),
  
  handleValidationErrors
];

export const validatePasswordChange = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

// Draft operations validation
export const validateDraftPlayer = [
  body('playerId')
    .isInt({ min: 1 })
    .withMessage('Valid player ID is required'),
  
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  handleValidationErrors
];

export const validateTransfer = [
  body('playerInId')
    .isInt({ min: 1 })
    .withMessage('Valid incoming player ID is required'),
  
  body('playerOutId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid outgoing player ID is required'),
  
  body('gameweek')
    .optional()
    .isInt({ min: 1, max: 38 })
    .withMessage('Gameweek must be between 1 and 38'),
  
  handleValidationErrors
];

export const validateChipUsage = [
  body('chipType')
    .isIn(['wildcard', 'free_hit', 'bench_boost', 'triple_captain'])
    .withMessage('Valid chip type is required'),
  
  body('gameweek')
    .isInt({ min: 1, max: 38 })
    .withMessage('Valid gameweek is required'),
  
  handleValidationErrors
];

// Simulation validation
export const validateSimulationAction = [
  body('action')
    .isIn(['randomize', 'simulate', 'reset', 'advance'])
    .withMessage('Valid simulation action is required'),
  
  body('gameweek')
    .optional()
    .isInt({ min: 1, max: 38 })
    .withMessage('Gameweek must be between 1 and 38'),
  
  handleValidationErrors
];

// Admin operations validation
export const validateAdminAction = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  body('action')
    .isIn(['promote', 'demote', 'suspend', 'activate'])
    .withMessage('Valid admin action is required'),
  
  handleValidationErrors
];

// File upload validation
export const validateFileUpload = [
  body('file')
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error('File is required');
      }
      
      // Check file size (5MB limit)
      if (req.file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error('Only JPG, PNG, and GIF files are allowed');
      }
      
      return true;
    }),
  
  handleValidationErrors
];

// Query parameter validation
export const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a positive number'),
  
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  
  handleValidationErrors
];

// URL parameter validation
export const validateUserId = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  handleValidationErrors
];

export const validatePlayerId = [
  param('playerId')
    .isInt({ min: 1 })
    .withMessage('Valid player ID is required'),
  
  handleValidationErrors
];

export const validateGameweek = [
  param('gameweek')
    .isInt({ min: 1, max: 38 })
    .withMessage('Gameweek must be between 1 and 38'),
  
  handleValidationErrors
];

// Rate limiting validation
export const validateRateLimit = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  
  handleValidationErrors
];

// WebSocket message validation
export const validateWebSocketMessage = (message) => {
  const errors = [];
  
  if (!message.type) {
    errors.push('Message type is required');
  }
  
  if (!['subscribe', 'unsubscribe', 'update', 'ping', 'pong'].includes(message.type)) {
    errors.push('Invalid message type');
  }
  
  if (message.data && typeof message.data !== 'object') {
    errors.push('Message data must be an object');
  }
  
  return errors;
};

// SQL injection prevention
export const preventSQLInjection = (req, res, next) => {
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'UNION', 'EXEC', 'EXECUTE', 'SCRIPT', 'EVAL', 'FUNCTION'
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      const upperValue = value.toUpperCase();
      for (const keyword of sqlKeywords) {
        if (upperValue.includes(keyword)) {
          return false;
        }
      }
    }
    return true;
  };
  
  // Check body
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (!checkValue(value)) {
        return res.status(400).json({
          error: 'Invalid input detected',
          field: key
        });
      }
    }
  }
  
  // Check query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (!checkValue(value)) {
        return res.status(400).json({
          error: 'Invalid input detected',
          field: key
        });
      }
    }
  }
  
  next();
};

// XSS prevention
export const preventXSS = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          return false;
        }
      }
    }
    return true;
  };
  
  // Check body
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (!checkValue(value)) {
        return res.status(400).json({
          error: 'Potentially malicious input detected',
          field: key
        });
      }
    }
  }
  
  next();
};

// Content type validation
export const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        error: 'Unsupported content type',
        allowed: allowedTypes,
        received: contentType
      });
    }
    
    next();
  };
};

// Request size validation
export const validateRequestSize = (maxSize = '1mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeBytes = parseInt(maxSize) * 1024 * 1024; // Convert MB to bytes
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: 'Request too large',
        maxSize: maxSize,
        received: `${(contentLength / 1024 / 1024).toFixed(2)}MB`
      });
    }
    
    next();
  };
};

// Export all validation middleware
export const validationMiddleware = {
  handleValidationErrors,
  sanitizeInput,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateProfileUpdate,
  validatePasswordChange,
  validateDraftPlayer,
  validateTransfer,
  validateChipUsage,
  validateSimulationAction,
  validateAdminAction,
  validateFileUpload,
  validatePagination,
  validateUserId,
  validatePlayerId,
  validateGameweek,
  validateRateLimit,
  validateWebSocketMessage,
  preventSQLInjection,
  preventXSS,
  validateContentType,
  validateRequestSize
};

