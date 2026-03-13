/**
 * Service-Level Error Handling
 *
 * Provides structured error handling for API service methods with:
 * - Consistent error transformation
 * - User-friendly error messages
 * - Error categorization for UI handling
 * - Integration with global error handler
 */

import { AxiosError } from 'axios';
import { handleError, ErrorCategory, ErrorSeverity, getUserMessage } from './error-handler';
import { logger } from './logger';

/**
 * API error response structure from backend
 */
export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
  path?: string;
  timestamp?: string;
  details?: Record<string, string>;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Structured service error with user-friendly message
 */
export class ServiceError extends Error {
  public readonly category: ErrorCategory;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly details?: Record<string, string>;
  public readonly validationErrors?: Array<{ field: string; message: string }>;
  public readonly originalError?: Error;

  constructor(options: {
    message: string;
    category: ErrorCategory;
    statusCode?: number;
    userMessage?: string;
    details?: Record<string, string>;
    validationErrors?: Array<{ field: string; message: string }>;
    originalError?: Error;
  }) {
    super(options.message);
    this.name = 'ServiceError';
    this.category = options.category;
    this.statusCode = options.statusCode || 500;
    this.userMessage = options.userMessage || getUserMessage(options.category, options.message);
    this.details = options.details;
    this.validationErrors = options.validationErrors;
    this.originalError = options.originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.category === ErrorCategory.VALIDATION;
  }

  /**
   * Check if this is an auth error (requires re-login)
   */
  isAuthError(): boolean {
    return this.category === ErrorCategory.AUTH;
  }

  /**
   * Check if this is a permission error
   */
  isPermissionError(): boolean {
    return this.category === ErrorCategory.PERMISSION;
  }

  /**
   * Check if this is a network error (retry may help)
   */
  isNetworkError(): boolean {
    return this.category === ErrorCategory.NETWORK;
  }

  /**
   * Get validation errors as a map of field -> message
   */
  getValidationErrorsMap(): Record<string, string> {
    if (!this.validationErrors) return {};
    return this.validationErrors.reduce(
      (acc, { field, message }) => ({ ...acc, [field]: message }),
      {} as Record<string, string>
    );
  }
}

/**
 * Transform an axios error into a structured ServiceError
 */
export function transformAxiosError(error: AxiosError<ApiErrorResponse>): ServiceError {
  const response = error.response;
  const data = response?.data;
  const status = response?.status || 0;

  // Determine category based on status code
  let category: ErrorCategory;
  if (!response) {
    category = ErrorCategory.NETWORK;
  } else if (status === 401) {
    category = ErrorCategory.AUTH;
  } else if (status === 403) {
    category = ErrorCategory.PERMISSION;
  } else if (status === 404) {
    category = ErrorCategory.NOT_FOUND;
  } else if (status >= 400 && status < 500) {
    category = ErrorCategory.VALIDATION;
  } else {
    category = ErrorCategory.SERVER;
  }

  // Extract message
  const message = data?.message || data?.error || error.message || 'An error occurred';

  return new ServiceError({
    message,
    category,
    statusCode: status,
    userMessage: getUserMessage(category, message),
    details: data?.details,
    validationErrors: data?.validationErrors,
    originalError: error,
  });
}

/**
 * Wrap an async service operation with error handling
 *
 * @example
 * const getEmployee = (id: string) =>
 *   wrapServiceCall('EmployeeService.getEmployee', async () => {
 *     const response = await apiClient.get<Employee>(`/employees/${id}`);
 *     return response.data;
 *   });
 */
export async function wrapServiceCall<T>(
  operationName: string,
  operation: () => Promise<T>,
  options?: {
    rethrow?: boolean;
    context?: Record<string, unknown>;
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const serviceError = transformError(error);

    // Log the error with context
    logger.error(`[${operationName}]`, {
      error: serviceError.message,
      category: serviceError.category,
      status: serviceError.statusCode,
      ...options?.context,
    });

    // Report to global error handler
    handleError(serviceError, {
      operation: operationName,
      ...options?.context,
    });

    // Rethrow by default
    if (options?.rethrow !== false) {
      throw serviceError;
    }

    throw serviceError;
  }
}

/**
 * Transform any error into a ServiceError
 */
export function transformError(error: unknown): ServiceError {
  // Already a ServiceError
  if (error instanceof ServiceError) {
    return error;
  }

  // Axios error
  if (isAxiosError(error)) {
    return transformAxiosError(error);
  }

  // Generic Error
  if (error instanceof Error) {
    return new ServiceError({
      message: error.message,
      category: ErrorCategory.CLIENT,
      originalError: error,
    });
  }

  // Unknown error type
  return new ServiceError({
    message: String(error),
    category: ErrorCategory.UNKNOWN,
  });
}

/**
 * Type guard for AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Create a service method with automatic error handling
 *
 * @example
 * class EmployeeService {
 *   getById = createServiceMethod('EmployeeService.getById', async (id: string) => {
 *     const response = await apiClient.get<Employee>(`/employees/${id}`);
 *     return response.data;
 *   });
 * }
 */
export function createServiceMethod<TArgs extends unknown[], TResult>(
  operationName: string,
  method: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    return wrapServiceCall(operationName, () => method(...args));
  };
}

/**
 * Higher-order function to add error handling to all methods of a service class
 *
 * @example
 * const employeeService = withErrorHandling('EmployeeService', {
 *   getById: async (id: string) => { ... },
 *   create: async (data: CreateEmployeeDto) => { ... },
 * });
 */
export function withServiceErrorHandling<T extends Record<string, (...args: unknown[]) => Promise<unknown>>>(
  serviceName: string,
  methods: T
): T {
  const wrapped = {} as T;

  for (const [name, method] of Object.entries(methods)) {
    (wrapped as Record<string, unknown>)[name] = createServiceMethod(
      `${serviceName}.${name}`,
      method as (...args: unknown[]) => Promise<unknown>
    );
  }

  return wrapped;
}

/**
 * Extract a user-facing error message from an unknown caught value.
 *
 * Usage in catch blocks (replaces `err: any` anti-pattern):
 *
 *   } catch (err: unknown) {
 *     setError(getApiErrorMessage(err, 'Failed to load data'));
 *   }
 */
export function getApiErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (err instanceof ServiceError) {
    return err.userMessage || err.message || fallback;
  }
  if (isAxiosError(err)) {
    return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message || fallback;
  }
  return fallback;
}

export default {
  ServiceError,
  transformAxiosError,
  transformError,
  wrapServiceCall,
  createServiceMethod,
  withServiceErrorHandling,
};
