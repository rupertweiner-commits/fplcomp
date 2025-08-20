import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false,
  overlay = false 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {text && (
        <p className="text-sm text-gray-600 text-center">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  );
};

// Button loading state
export const ButtonSpinner = ({ size = 'sm' }) => (
  <Loader2 className={`${sizeClasses[size]} animate-spin`} />
);

// Inline loading
export const InlineSpinner = ({ size = 'sm' }) => (
  <Loader2 className={`${sizeClasses[size]} animate-spin text-gray-400`} />
);

// Page loading
export const PageSpinner = ({ text = 'Loading page...' }) => (
  <LoadingSpinner size="xl" text={text} fullScreen />
);

// Overlay loading
export const OverlaySpinner = ({ text = 'Processing...' }) => (
  <LoadingSpinner size="lg" text={text} overlay />
);

export default LoadingSpinner;

