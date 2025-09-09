/**
 * Performance monitoring utilities
 */

// Performance metrics storage
let performanceMetrics = {
  pageLoad: 0,
  apiCalls: [],
  componentRenders: [],
  errors: []
};

/**
 * Measure page load time
 */
export const measurePageLoad = () => {
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = window.performance.getEntriesByType('navigation')[0];

    if (navigation) {
      performanceMetrics.pageLoad = navigation.loadEventEnd - navigation.loadEventStart;
      console.log(`📊 Page load time: ${performanceMetrics.pageLoad}ms`);
    }
  }
};

/**
 * Measure API call performance
 * @param {string} endpoint - API endpoint
 * @param {Function} apiCall - API call function
 * @returns {Promise} API call result
 */
export const measureApiCall = async(endpoint, apiCall) => {
  const startTime = performance.now();

  try {
    const result = await apiCall();
    const endTime = performance.now();
    const duration = endTime - startTime;

    performanceMetrics.apiCalls.push({
      endpoint,
      duration,
      success: true,
      timestamp: new Date().toISOString()
    });

    console.log(`📊 API call ${endpoint}: ${duration.toFixed(2)}ms`);

    // Log slow API calls
    if (duration > 5000) {
      console.warn(`⚠️ Slow API call detected: ${endpoint} took ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    performanceMetrics.apiCalls.push({
      endpoint,
      duration,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    console.error(`❌ API call failed ${endpoint}: ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};

/**
 * Measure component render performance
 * @param {string} componentName - Component name
 * @param {Function} renderFunction - Render function
 * @returns {*} Render result
 */
export const measureComponentRender = (componentName, renderFunction) => {
  const startTime = performance.now();

  try {
    const result = renderFunction();
    const endTime = performance.now();
    const duration = endTime - startTime;

    performanceMetrics.componentRenders.push({
      component: componentName,
      duration,
      timestamp: new Date().toISOString()
    });

    // Log slow renders
    if (duration > 100) {
      console.warn(`⚠️ Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    performanceMetrics.componentRenders.push({
      component: componentName,
      duration,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    console.error(`❌ Component render failed ${componentName}: ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};

/**
 * Track error performance impact
 * @param {Error} error - Error object
 * @param {string} context - Error context
 */
export const trackErrorPerformance = (error, context) => {
  performanceMetrics.errors.push({
    message: error.message,
    context,
    timestamp: new Date().toISOString(),
    stack: error.stack
  });

  console.error(`❌ Error in ${context}:`, error);
};

/**
 * Get performance summary
 * @returns {Object} Performance summary
 */
export const getPerformanceSummary = () => {
  const apiCalls = performanceMetrics.apiCalls;
  const componentRenders = performanceMetrics.componentRenders;
  const errors = performanceMetrics.errors;

  const summary = {
    pageLoad: performanceMetrics.pageLoad,
    apiCalls: {
      total: apiCalls.length,
      successful: apiCalls.filter(call => call.success).length,
      failed: apiCalls.filter(call => !call.success).length,
      averageDuration: apiCalls.length > 0 ?
        apiCalls.reduce((sum, call) => sum + call.duration, 0) / apiCalls.length :
        0,
      slowCalls: apiCalls.filter(call => call.duration > 5000).length
    },
    componentRenders: {
      total: componentRenders.length,
      averageDuration: componentRenders.length > 0 ?
        componentRenders.reduce((sum, render) => sum + render.duration, 0) / componentRenders.length :
        0,
      slowRenders: componentRenders.filter(render => render.duration > 100).length
    },
    errors: {
      total: errors.length,
      recent: errors.filter(error =>
        new Date(error.timestamp) > new Date(Date.now() - 60000) // Last minute
      ).length
    }
  };

  return summary;
};

/**
 * Log performance summary
 */
export const logPerformanceSummary = () => {
  const summary = getPerformanceSummary();

  console.log('📊 Performance Summary:', {
    'Page Load': `${summary.pageLoad}ms`,
    'API Calls': `${summary.apiCalls.total} (${summary.apiCalls.successful} successful, ${summary.apiCalls.failed} failed)`,
    'Avg API Duration': `${summary.apiCalls.averageDuration.toFixed(2)}ms`,
    'Slow API Calls': summary.apiCalls.slowCalls,
    'Component Renders': summary.componentRenders.total,
    'Avg Render Duration': `${summary.componentRenders.averageDuration.toFixed(2)}ms`,
    'Slow Renders': summary.componentRenders.slowRenders,
    Errors: `${summary.errors.total} (${summary.errors.recent} recent)`
  });
};

/**
 * Clear performance metrics
 */
export const clearPerformanceMetrics = () => {
  performanceMetrics = {
    pageLoad: 0,
    apiCalls: [],
    componentRenders: [],
    errors: []
  };
};

/**
 * Send performance data to analytics (in production)
 */
export const sendPerformanceData = () => {
  if (process.env.NODE_ENV === 'production') {
    const summary = getPerformanceSummary();

    // Send to analytics service
    // Example: Google Analytics, Mixpanel, etc.
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metrics', {
        event_category: 'Performance',
        event_label: 'App Performance',
        value: Math.round(summary.apiCalls.averageDuration),
        custom_map: {
          page_load_time: summary.pageLoad,
          api_calls_total: summary.apiCalls.total,
          slow_api_calls: summary.apiCalls.slowCalls,
          component_renders: summary.componentRenders.total,
          slow_renders: summary.componentRenders.slowRenders,
          errors_total: summary.errors.total
        }
      });
    }
  }
};

/**
 * Performance monitoring hook for React components
 * @param {string} componentName - Component name
 * @returns {Object} Performance monitoring utilities
 */
export const usePerformanceMonitoring = (componentName) => {
  const measureRender = (renderFunction) => {
    return measureComponentRender(componentName, renderFunction);
  };

  const trackError = (error, context = '') => {
    trackErrorPerformance(error, `${componentName}${context ? ` - ${context}` : ''}`);
  };

  return {
    measureRender,
    trackError
  };
};

/**
 * Initialize performance monitoring
 */
export const initializePerformanceMonitoring = () => {
  // Measure page load time
  if (document.readyState === 'complete') {
    measurePageLoad();
  } else {
    window.addEventListener('load', measurePageLoad);
  }

  // Log performance summary every 5 minutes
  setInterval(() => {
    logPerformanceSummary();
    sendPerformanceData();
  }, 5 * 60 * 1000);

  // Clear metrics every hour
  setInterval(clearPerformanceMetrics, 60 * 60 * 1000);

  console.log('📊 Performance monitoring initialized');
};
