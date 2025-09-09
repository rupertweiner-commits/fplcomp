import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({
  size = 'medium',
  text = '',
  className = '',
  fullScreen = false
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xl: 'text-xl'
  };

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {text && (
        <p className={`mt-2 text-gray-600 ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

LoadingSpinner.propTypes = {
  className: PropTypes.string,
  fullScreen: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xl']),
  text: PropTypes.string
};

export default LoadingSpinner;
