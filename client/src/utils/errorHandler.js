import { ERROR_MESSAGES } from './constants';

/**
 * Centralized error handling utilities
 */

/**
 * Handle API errors with consistent formatting
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @param {Object} options - Additional options
 * @returns {Object} Formatted error object
 */
export const handleApiError = (error, context = '', options = {}) => {
  console.error(`❌ API Error in ${context}:`, error);

  // Determine error type and message
  let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
  let errorCode = 'UNKNOWN_ERROR';

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
    errorCode = 'NETWORK_ERROR';
  } else if (error.status === 401 || error.status === 403) {
    errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
    errorCode = 'UNAUTHORIZED';
  } else if (error.status === 404) {
    errorMessage = ERROR_MESSAGES.NOT_FOUND;
    errorCode = 'NOT_FOUND';
  } else if (error.status === 422) {
    errorMessage = ERROR_MESSAGES.VALIDATION_ERROR;
    errorCode = 'VALIDATION_ERROR';
  } else if (error.status >= 500) {
    errorMessage = ERROR_MESSAGES.SERVER_ERROR;
    errorCode = 'SERVER_ERROR';
  } else if (error.name === 'AbortError') {
    errorMessage = ERROR_MESSAGES.TIMEOUT;
    errorCode = 'TIMEOUT';
  } else if (error.message) {
    errorMessage = error.message;
    errorCode = 'CUSTOM_ERROR';
  }

  // Log to external service in production
  if (process.env.NODE_ENV === 'production') {
    trackError(error, context, options);
  }

  return {
    message: errorMessage,
    code: errorCode,
    context,
    originalError: error,
    timestamp: new Date().toISOString()
  };
};

/**
 * Handle component errors
 * @param {Error} error - The error object
 * @param {string} componentName - Name of the component
 * @param {Object} errorInfo - Additional error info
 * @returns {Object} Formatted error object
 */
export const handleComponentError = (error, componentName, errorInfo = {}) => {
  console.error(`❌ Component Error in ${componentName}:`, error, errorInfo);

  // Track error in production
  if (process.env.NODE_ENV === 'production') {
    trackError(error, componentName, { errorInfo });
  }

  return {
    message: 'A component error occurred',
    component: componentName,
    error: error.message,
    stack: error.stack,
    errorInfo,
    timestamp: new Date().toISOString()
  };
};

/**
 * Handle validation errors
 * @param {Object} validationErrors - Validation error object
 * @param {string} field - Field name
 * @returns {Object} Formatted validation error
 */
export const handleValidationError = (validationErrors, field = '') => {
  const error = {
    message: ERROR_MESSAGES.VALIDATION_ERROR,
    code: 'VALIDATION_ERROR',
    field,
    errors: validationErrors,
    timestamp: new Date().toISOString()
  };

  console.warn(`⚠️ Validation Error in ${field}:`, validationErrors);

  return error;
};

/**
 * Track error for monitoring
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @param {Object} metadata - Additional metadata
 */
export const trackError = (error, context, metadata = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    context,
    metadata,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: getCurrentUserId()
  };

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external service
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData)
    // }).catch(console.error);

    console.log('Error tracked:', errorData);
  }
};

/**
 * Get current user ID for error tracking
 * @returns {string|null} User ID or null
 */
const getCurrentUserId = () => {
  try {
    // Try to get user ID from various sources
    const user = JSON.parse(localStorage.getItem('fpl_user') || 'null');

    return user?.id || null;
  } catch {
    return null;
  }
};

/**
 * Create a user-friendly error message
 * @param {Object} error - Error object
 * @returns {string} User-friendly message
 */
export const getUserFriendlyMessage = (error) => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.code) {
    return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
};

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} Whether error is retryable
 */
export const isRetryableError = (error) => {
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'];
  const retryableStatuses = [408, 429, 500, 502, 503, 504];

  return retryableCodes.includes(error.code) ||
         retryableStatuses.includes(error.status) ||
         error.name === 'AbortError';
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Promise that resolves with function result
 */
export const retryWithBackoff = async(fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);

      console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Error boundary helper for React components
 * @param {Error} error - Error object
 * @param {Object} errorInfo - Error info from React
 * @returns {Object} Error boundary state
 */
export const createErrorBoundaryState = (error, errorInfo) => {
  return {
    hasError: true,
    error: {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    },
    timestamp: new Date().toISOString()
  };
};
