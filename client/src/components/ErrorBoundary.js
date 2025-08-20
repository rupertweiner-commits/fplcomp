import React from 'react';
import { RefreshCw, Home, AlertTriangle, Bug } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState(prevState => ({
      error: error,
      errorInfo: errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // You can send error to logging service here
      console.error('Production error logged:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRefresh = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>
            </div>

            {this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Error Details:</h3>
                <p className="text-sm text-red-700 font-mono break-words">
                  {this.state.error.message || 'Unknown error occurred'}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleRefresh}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </button>

              {this.state.errorCount > 1 && (
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Reset Error State
                </button>
              )}
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>Error ID: {this.state.errorCount}</p>
              <p>Time: {new Date().toLocaleString()}</p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-blue-600">Development Mode - Check console for details</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

