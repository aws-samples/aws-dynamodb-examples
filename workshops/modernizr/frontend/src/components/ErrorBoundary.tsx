import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorService, SecurityEventType } from '../services/errorService';
import { logger, logSecurityEvent, logError } from '../services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error | undefined;
  errorInfo?: ErrorInfo | undefined;
  isSecurityRelated?: boolean | undefined;
  errorId?: string | undefined;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if error might be security-related
    const isSecurityRelated = ErrorService.isErrorSecurityRelated(error);
    
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error, 
      isSecurityRelated,
      errorId
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorId = this.state.errorId || `err_${Date.now()}`;
    const isSecurityRelated = this.state.isSecurityRelated;
    
    // Enhanced error logging with security awareness
    const errorContext = {
      errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      isSecurityRelated
    };

    // Use production logger instead of console.error
    if (isSecurityRelated) {
      // Log as security event if potentially security-related
      logSecurityEvent('Security-related error caught by ErrorBoundary', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        ...errorContext
      });
      
      // Also handle as security event
      ErrorService.handleSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_INPUT,
        message: 'Potential security-related error in React component',
        details: errorContext,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    } else {
      // Log as regular error
      logError('ErrorBoundary caught an error', error, errorContext);
    }
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  handleRetry = (): void => {
    // Log retry attempt
    logger.info('User attempting to retry after error', { 
      errorId: this.state.errorId,
      wasSecurityRelated: this.state.isSecurityRelated 
    });
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      isSecurityRelated: undefined,
      errorId: undefined
    });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                {this.state.isSecurityRelated ? 'Security Issue Detected' : 'Something went wrong'}
              </h1>
              <p className="text-gray-600 mb-6">
                {this.state.isSecurityRelated 
                  ? 'A security issue was detected. Please refresh the page or contact support if this continues.'
                  : 'We\'re sorry, but something unexpected happened. Please try refreshing the page.'
                }
              </p>
              
              <div className="space-y-3">
                {!this.state.isSecurityRelated && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                )}
                
                <button
                  onClick={() => {
                    logger.info('User refreshing page after error', { 
                      errorId: this.state.errorId,
                      wasSecurityRelated: this.state.isSecurityRelated 
                    });
                    window.location.reload();
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Refresh Page
                </button>
                
                {this.state.isSecurityRelated && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Security Notice:</strong> This error may be related to a security issue. 
                      If you continue to see this message, please contact support with error ID: {this.state.errorId}
                    </p>
                  </div>
                )}
              </div>

              {/* Show error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
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