import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'white' | 'gray';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'blue',
  text,
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    white: 'border-white',
    gray: 'border-gray-600'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  const spinner = (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          border-2 border-t-transparent 
          ${colorClasses[color]} 
          rounded-full 
          animate-spin
        `}
      />
    </div>
  );

  const content = (
    <div className="flex flex-col items-center justify-center space-y-2">
      {spinner}
      {text && (
        <p className={`${textSizeClasses[size]} ${color === 'white' ? 'text-white' : 'text-gray-600'}`}>
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

// Skeleton loading component for content placeholders
export const SkeletonLoader: React.FC<{ 
  lines?: number; 
  className?: string;
  height?: string;
}> = ({ 
  lines = 3, 
  className = '',
  height = 'h-4'
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded ${height} mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

// Button loading state
export const LoadingButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({
  loading,
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button'
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`
        relative flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-opacity duration-200
        ${className}
      `}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="small" color="white" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
};

export default LoadingSpinner;