/**
 * Utility functions for safe function execution and error handling
 */

/**
 * Safely executes a function with error handling
 * @param {Function} fn - Function to execute
 * @param {string} context - Context description for error logging
 * @param {*} defaultValue - Default value to return on error
 * @returns {*} Function result or default value
 */
export const safeExecute = (fn, context = 'Unknown', defaultValue = null) => {
  try {
    return fn();
  } catch (error) {
    console.error(`Error in ${context}:`, error);
    return defaultValue;
  }
};

/**
 * Safely executes an async function with error handling
 * @param {Function} fn - Async function to execute
 * @param {string} context - Context description for error logging
 * @param {*} defaultValue - Default value to return on error
 * @returns {Promise<*>} Promise that resolves to function result or default value
 */
export const safeExecuteAsync = async (fn, context = 'Unknown', defaultValue = null) => {
  try {
    return await fn();
  } catch (error) {
    console.error(`Error in ${context}:`, error);
    return defaultValue;
  }
};

/**
 * Safely parses JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value to return on parse error
 * @returns {*} Parsed object or default value
 */
export const safeJsonParse = (jsonString, defaultValue = null) => {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue;
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
};

/**
 * Safely formats a date with error handling
 * @param {string|Date} date - Date to format
 * @param {string} defaultValue - Default value to return on format error
 * @returns {string} Formatted date or default value
 */
export const safeDateFormat = (date, defaultValue = 'Invalid date') => {
  if (!date) return defaultValue;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return defaultValue;
    }
    return dateObj.toLocaleString();
  } catch (error) {
    console.error('Date format error:', error);
    return defaultValue;
  }
};

/**
 * Safely accesses nested object properties
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-separated path to property
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} Property value or default value
 */
export const safeGet = (obj, path, defaultValue = null) => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  
  try {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  } catch (error) {
    console.error('Safe get error:', error);
    return defaultValue;
  }
};

/**
 * Safely calls a function if it exists
 * @param {Function} fn - Function to call
 * @param {Array} args - Arguments to pass to function
 * @param {*} defaultValue - Default value to return if function doesn't exist
 * @returns {*} Function result or default value
 */
export const safeCall = (fn, args = [], defaultValue = null) => {
  if (typeof fn === 'function') {
    try {
      return fn(...args);
    } catch (error) {
      console.error('Function call error:', error);
      return defaultValue;
    }
  }
  return defaultValue;
};

/**
 * Creates a safe event handler that prevents default behavior and stops propagation
 * @param {Function} handler - Event handler function
 * @param {string} context - Context description for error logging
 * @returns {Function} Safe event handler
 */
export const createSafeEventHandler = (handler, context = 'Unknown') => {
  return (event) => {
    try {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
      
      if (typeof handler === 'function') {
        return handler(event);
      }
    } catch (error) {
      console.error(`Event handler error in ${context}:`, error);
    }
  };
};

/**
 * Safely updates state with error handling
 * @param {Function} setState - React setState function
 * @param {*} newState - New state value
 * @param {string} context - Context description for error logging
 */
export const safeSetState = (setState, newState, context = 'Unknown') => {
  try {
    setState(newState);
  } catch (error) {
    console.error(`setState error in ${context}:`, error);
  }
};

/**
 * Validates required props and throws error if missing
 * @param {Object} props - Props object to validate
 * @param {Array} requiredProps - Array of required prop names
 * @param {string} componentName - Name of component for error message
 */
export const validateRequiredProps = (props, requiredProps, componentName) => {
  const missingProps = requiredProps.filter(prop => props[prop] === undefined);
  
  if (missingProps.length > 0) {
    throw new Error(
      `${componentName} is missing required props: ${missingProps.join(', ')}`
    );
  }
};

/**
 * Debounces function calls to prevent excessive execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttles function calls to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
