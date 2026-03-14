/**
 * Global Error Handler
 *
 * Provides centralized error handling for:
 * - Unhandled promise rejections
 * - Uncaught JavaScript errors
 * - React error boundaries
 * - API errors
 *
 * In production, errors are sanitized before display and can be
 * sent to an error tracking service (Sentry, Rollbar, etc.).
 */

import { isProduction, isDevelopment } from '@/lib/config';
import { logger } from './logger';

/**
 * Error severity levels for categorization
 */
export enum ErrorSeverity {
  /** Low severity - logged but may not need immediate attention */
  LOW = 'low',
  /** Medium severity - should be investigated */
  MEDIUM = 'medium',
  /** High severity - needs prompt attention */
  HIGH = 'high',
  /** Critical severity - immediate action required */
  CRITICAL = 'critical',
}

/**
 * Categorized error types for better handling
 */
export enum ErrorCategory {
  /** Network-related errors (API, fetch, WebSocket) */
  NETWORK = 'network',
  /** Authentication errors (401, token expired) */
  AUTH = 'auth',
  /** Authorization errors (403, forbidden) */
  PERMISSION = 'permission',
  /** Validation errors (form, input) */
  VALIDATION = 'validation',
  /** Not found errors (404) */
  NOT_FOUND = 'not_found',
  /** Server errors (500+) */
  SERVER = 'server',
  /** Client-side JavaScript errors */
  CLIENT = 'client',
  /** Unknown/uncategorized errors */
  UNKNOWN = 'unknown',
}

/**
 * Structured error info for logging and tracking
 */
export interface ErrorInfo {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
  url?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Error tracking service interface
 */
export interface ErrorTrackingService {
  captureError(error: Error, info: ErrorInfo): void;
  captureMessage(message: string, severity: ErrorSeverity): void;
  setUser(userId: string | null): void;
}

/**
 * Default no-op error tracking service
 */
const noopTracker: ErrorTrackingService = {
  captureError: () => {},
  captureMessage: () => {},
  setUser: () => {},
};

// Global error tracking service (can be replaced with Sentry, etc.)
let errorTracker: ErrorTrackingService = noopTracker;

/**
 * Set the error tracking service (e.g., Sentry, Rollbar)
 */
export function setErrorTracker(tracker: ErrorTrackingService): void {
  errorTracker = tracker;
}

/**
 * Generate a unique session ID for error correlation
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Session ID for correlating errors in the same session
const sessionId = typeof window !== 'undefined' ? generateSessionId() : 'server';

/**
 * Determine error category from error object
 */
export function categorizeError(error: Error | unknown): ErrorCategory {
  if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'))) {
    return ErrorCategory.NETWORK;
  }

  // Check for axios/fetch errors with response
  const axiosError = error as { response?: { status?: number } };
  if (axiosError?.response?.status) {
    const status = axiosError.response.status;
    if (status === 401) return ErrorCategory.AUTH;
    if (status === 403) return ErrorCategory.PERMISSION;
    if (status === 404) return ErrorCategory.NOT_FOUND;
    if (status >= 400 && status < 500) return ErrorCategory.VALIDATION;
    if (status >= 500) return ErrorCategory.SERVER;
  }

  // Check for network errors
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
      return ErrorCategory.NETWORK;
    }
    if (msg.includes('unauthorized') || msg.includes('token')) {
      return ErrorCategory.AUTH;
    }
    if (msg.includes('forbidden') || msg.includes('permission')) {
      return ErrorCategory.PERMISSION;
    }
  }

  return ErrorCategory.CLIENT;
}

/**
 * Determine severity based on error category
 */
export function determineSeverity(category: ErrorCategory): ErrorSeverity {
  switch (category) {
    case ErrorCategory.AUTH:
    case ErrorCategory.PERMISSION:
      return ErrorSeverity.MEDIUM;
    case ErrorCategory.NETWORK:
    case ErrorCategory.NOT_FOUND:
      return ErrorSeverity.LOW;
    case ErrorCategory.SERVER:
      return ErrorSeverity.HIGH;
    case ErrorCategory.VALIDATION:
      return ErrorSeverity.LOW;
    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(category: ErrorCategory, originalMessage?: string): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    case ErrorCategory.AUTH:
      return 'Your session has expired. Please log in again.';
    case ErrorCategory.PERMISSION:
      return 'You do not have permission to perform this action.';
    case ErrorCategory.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorCategory.SERVER:
      return 'A server error occurred. Our team has been notified.';
    case ErrorCategory.VALIDATION:
      return originalMessage || 'Please check your input and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Handle and log an error
 */
export function handleError(
  error: Error | unknown,
  context?: Record<string, unknown>
): ErrorInfo {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const category = categorizeError(error);
  const severity = determineSeverity(category);

  const errorInfo: ErrorInfo = {
    message: errorObj.message,
    category,
    severity,
    stack: errorObj.stack,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    sessionId,
  };

  // Log based on severity
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      logger.error('[ErrorHandler]', errorInfo);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn('[ErrorHandler]', errorInfo);
      break;
    default:
      logger.info('[ErrorHandler]', errorInfo);
  }

  // Send to error tracking service
  errorTracker.captureError(errorObj, errorInfo);

  return errorInfo;
}

/**
 * Initialize global error handlers
 * Call this once at app startup
 */
export function initGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    handleError(error, {
      type: 'unhandledrejection',
      promise: 'rejected',
    });

    // Prevent default browser logging in production
    if (isProduction) {
      event.preventDefault();
    }
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    // Ignore ResizeObserver errors (common false positive)
    if (event.message?.includes('ResizeObserver')) {
      return;
    }

    handleError(event.error || new Error(event.message), {
      type: 'uncaughtError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    // Prevent default browser logging in production
    if (isProduction) {
      event.preventDefault();
    }
  });

  logger.info('[ErrorHandler] Global error handlers initialized');
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  // Check for Axios error with response data
  const axiosError = error as { response?: { data?: { message?: string } } };
  if (axiosError?.response?.data?.message) {
    return axiosError.response.data.message;
  }

  // Check for standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred';
}

/**
 * Create an error handler for React Query that shows toast notifications
 * This is applied globally via MutationCache so mutations don't need individual onError handlers
 */
export function createQueryErrorHandler() {
  return (error: Error) => {
    handleError(error, { source: 'react-query' });

    // Show Mantine notification to user
    // Dynamic import to avoid circular dependencies and SSR issues
    try {
      const { notifications } = require('@mantine/notifications');
      const category = categorizeError(error);
      const message = getErrorMessage(error);
      const userMessage = getUserMessage(category, message);

      notifications.show({
        title: 'Error',
        message: userMessage,
        color: 'red',
        icon: null,
        autoClose: 5000,
      });
    } catch (e) {
      // Silently fail if Mantine notifications is not available (e.g., during SSR)
      // The error is still logged via handleError() above
    }
  };
}

/**
 * Create an error handler for async operations with toast notifications
 */
export function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    context?: Record<string, unknown>;
    onError?: (info: ErrorInfo) => void;
    rethrow?: boolean;
  }
): Promise<T> {
  return operation().catch((error) => {
    const info = handleError(error, options?.context);
    options?.onError?.(info);
    if (options?.rethrow !== false) {
      throw error;
    }
    return undefined as T;
  });
}

/**
 * Check if error is a specific category
 */
export function isErrorCategory(error: unknown, category: ErrorCategory): boolean {
  return categorizeError(error) === category;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return isErrorCategory(error, ErrorCategory.NETWORK);
}

/**
 * Check if error is an auth error
 */
export function isAuthError(error: unknown): boolean {
  return isErrorCategory(error, ErrorCategory.AUTH);
}

export default {
  handleError,
  initGlobalErrorHandlers,
  setErrorTracker,
  categorizeError,
  determineSeverity,
  getUserMessage,
  isNetworkError,
  isAuthError,
  ErrorSeverity,
  ErrorCategory,
};
