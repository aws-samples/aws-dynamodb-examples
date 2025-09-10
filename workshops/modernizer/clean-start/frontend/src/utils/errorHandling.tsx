/**
 * Standardized error handling utilities for consistent error management across components
 */

import React from 'react';
import { logger } from '../services/logger';
import { ErrorService } from '../services/errorService';

export interface ComponentError {
  message: string;
  canRetry: boolean;
  actionRequired?: string | undefined;
  isSecurityRelated?: boolean | undefined;
}

export interface ErrorHandlingOptions {
  component: string;
  action: string;
  showToast?: boolean;
  logLevel?: 'error' | 'warn' | 'info';
}

/**
 * Standardized error handler for React components
 */
export class ComponentErrorHandler {
  /**
   * Handle errors consistently across components
   */
  static handleError(
    error: any,
    options: ErrorHandlingOptions
  ): ComponentError {
    const { component, action, logLevel = 'error' } = options;

    // Parse the error using the error service
    const appError = ErrorService.parseApiError(error);
    const userFriendlyError = ErrorService.sanitizeErrorForUser(appError);

    // Log the error with context
    const logContext = {
      component,
      action,
      errorType: appError.type,
      originalError: error?.message || 'Unknown error'
    };

    switch (logLevel) {
      case 'error':
        logger.error(`Error in ${component} during ${action}`, error, logContext);
        break;
      case 'warn':
        logger.warn(`Warning in ${component} during ${action}`, logContext);
        break;
      case 'info':
        logger.info(`Info in ${component} during ${action}`, logContext);
        break;
    }

    // Return standardized error for component use
    return {
      message: userFriendlyError.message,
      canRetry: userFriendlyError.canRetry,
      actionRequired: userFriendlyError.actionRequired,
      isSecurityRelated: ErrorService.isErrorSecurityRelated(new Error(appError.message))
    };
  }

  /**
   * Handle async operation errors with loading state management
   */
  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    options: ErrorHandlingOptions & {
      setLoading?: (loading: boolean) => void;
      setError?: (error: string) => void;
    }
  ): Promise<T | null> {
    const { setLoading, setError, ...errorOptions } = options;

    try {
      if (setLoading) setLoading(true);
      if (setError) setError('');

      const result = await operation();
      return result;
    } catch (error) {
      const componentError = this.handleError(error, errorOptions);
      
      if (setError) {
        setError(componentError.message);
      }

      return null;
    } finally {
      if (setLoading) setLoading(false);
    }
  }

  /**
   * Create a standardized error state setter
   */
  static createErrorStateSetter(
    setError: (error: string) => void,
    component: string
  ) {
    return (error: any, action: string) => {
      const componentError = this.handleError(error, { component, action });
      setError(componentError.message);
    };
  }

  /**
   * Handle form validation errors consistently
   */
  static handleFormValidationError(
    error: any,
    setFieldErrors: (errors: Record<string, string>) => void,
    setGeneralError: (error: string) => void,
    component: string
  ): void {
    const componentError = this.handleError(error, {
      component,
      action: 'form_validation'
    });

    // Check if it's a validation error with field-specific messages
    if (error?.response?.data?.errors && typeof error.response.data.errors === 'object') {
      const fieldErrors: Record<string, string> = {};
      
      Object.entries(error.response.data.errors).forEach(([field, message]) => {
        fieldErrors[field] = Array.isArray(message) ? message[0] : String(message);
      });

      setFieldErrors(fieldErrors);
      setGeneralError('');
    } else {
      // General error
      setFieldErrors({});
      setGeneralError(componentError.message);
    }
  }

  /**
   * Handle network errors with retry logic
   */
  static handleNetworkError(
    error: any,
    retryFunction: () => void,
    component: string,
    action: string
  ): ComponentError & { retry: () => void } {
    const componentError = this.handleError(error, { component, action });

    return {
      ...componentError,
      retry: retryFunction
    };
  }
}

/**
 * React hook for consistent error handling
 */
export function useErrorHandler(component: string) {
  const handleError = (error: any, action: string): ComponentError => {
    return ComponentErrorHandler.handleError(error, { component, action });
  };

  const handleAsyncOperation = async function<T>(
    operation: () => Promise<T>,
    action: string,
    options?: {
      setLoading?: (loading: boolean) => void;
      setError?: (error: string) => void;
    }
  ): Promise<T | null> {
    return ComponentErrorHandler.handleAsyncOperation(operation, {
      component,
      action,
      ...options
    });
  };

  return {
    handleError,
    handleAsyncOperation
  };
}

/**
 * Higher-order component for error boundary integration
 */
export function withErrorHandling<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function WithErrorHandlingComponent(props: P) {
    const { handleError } = useErrorHandler(componentName);

    // Add error handling props to the wrapped component
    const enhancedProps = {
      ...props,
      onError: (error: any, action: string) => handleError(error, action)
    } as P;

    return <WrappedComponent {...enhancedProps} />;
  };
}