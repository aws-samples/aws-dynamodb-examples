import { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ErrorService, SecurityEventType } from '../services/errorService';
import { logger, logSecurityEvent, logError } from '../services/logger';

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error?: Error | undefined;
  isSecurityRelated?: boolean | undefined;
  errorId?: string | undefined;
}

class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isSecurityRelated = ErrorService.isErrorSecurityRelated(error);
    
    return { 
      hasError: true, 
      error, 
      isSecurityRelated,
      errorId
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorId = this.state.errorId || `page_err_${Date.now()}`;
    const isSecurityRelated = this.state.isSecurityRelated;
    const pageName = this.props.pageName || 'page';
    
    const errorContext = {
      errorId,
      pageName,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'PageErrorBoundary',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      isSecurityRelated
    };

    // Use production logger instead of console.error
    if (isSecurityRelated) {
      logSecurityEvent(`Security-related page error in ${pageName}`, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        ...errorContext
      });
      
      ErrorService.handleSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_INPUT,
        message: `Potential security-related error in ${pageName} page`,
        details: errorContext,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    } else {
      logError(`PageErrorBoundary caught an error in ${pageName}`, error, errorContext);
    }
  }

  handleRetry = (): void => {
    logger.info('User retrying after page error', { 
      errorId: this.state.errorId,
      pageName: this.props.pageName,
      wasSecurityRelated: this.state.isSecurityRelated 
    });
    
    this.setState({ 
      hasError: false, 
      error: undefined,
      isSecurityRelated: undefined,
      errorId: undefined
    });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-96 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {this.state.isSecurityRelated ? 'Security Issue Detected' : 'Page Error'}
            </h2>
            <p className="text-gray-600 mb-6">
              {this.state.isSecurityRelated 
                ? 'A security issue was detected while loading this page. Please try again or contact support.'
                : (this.props.pageName 
                    ? `There was an error loading the ${this.props.pageName} page.`
                    : 'There was an error loading this page.'
                  )
              }
            </p>
            
            <div className="space-y-3">
              {!this.state.isSecurityRelated && (
                <button
                  onClick={this.handleRetry}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mr-3"
                >
                  Try Again
                </button>
              )}
              
              <Link
                to="/"
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                onClick={() => {
                  logger.info('User navigating home after page error', { 
                    errorId: this.state.errorId,
                    pageName: this.props.pageName,
                    wasSecurityRelated: this.state.isSecurityRelated 
                  });
                }}
              >
                Go Home
              </Link>
              
              {this.state.isSecurityRelated && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-left">
                  <p className="text-sm text-yellow-800">
                    <strong>Security Notice:</strong> This error may be security-related. 
                    Error ID: {this.state.errorId}
                  </p>
                </div>
              )}
            </div>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;