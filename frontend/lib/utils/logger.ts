/**
 * Production-safe logger utility
 *
 * Gates console output based on NODE_ENV to prevent information leakage in production.
 * Use this instead of console.log/error/warn throughout the application.
 *
 * @example
 * import { logger, createLogger } from '@/lib/utils/logger';
 *
 * // Using the default logger
 * logger.info('Something happened');
 *
 * // Creating a namespaced logger
 * const log = createLogger('MyComponent');
 * log.info('Component mounted'); // [MyComponent] Component mounted
 */

// Import from config to avoid circular dependencies during app initialization
const isDevelopment = process.env.NODE_ENV === 'development';
const _isTest = process.env.NODE_ENV === 'test';

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
  table: (data: unknown) => void;
}

/**
 * Creates a namespaced logger for better log organization
 * @param namespace - The namespace prefix for log messages
 */
export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  return {
    log: (...args: unknown[]) => {
      if (isDevelopment) {
        console.log(prefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (isDevelopment) {
        console.info(prefix, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (isDevelopment) {
        console.warn(prefix, ...args);
      }
    },
    error: (...args: unknown[]) => {
      // Errors are always logged but sanitized in production
      if (isDevelopment) {
        console.error(prefix, ...args);
      } else {
        // In production, log a sanitized message without sensitive details
        const sanitizedArgs = args.map((arg) => {
          if (arg instanceof Error) {
            return {message: arg.message, name: arg.name};
          }
          return typeof arg === 'object' ? '[Object]' : arg;
        });
        console.error(prefix, ...sanitizedArgs);
      }
    },
    debug: (...args: unknown[]) => {
      if (isDevelopment) {
        console.debug(prefix, ...args);
      }
    },
    group: (label: string) => {
      if (isDevelopment) {
        console.group(`${prefix} ${label}`);
      }
    },
    groupEnd: () => {
      if (isDevelopment) {
        console.groupEnd();
      }
    },
    table: (data: unknown) => {
      if (isDevelopment) {
        console.table(data);
      }
    },
  };
}

/**
 * Default logger instance for general use
 */
export const logger: Logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, log sanitized errors
      const sanitizedArgs = args.map((arg) => {
        if (arg instanceof Error) {
          return {message: arg.message, name: arg.name};
        }
        return typeof arg === 'object' ? '[Object]' : arg;
      });
      console.error(...sanitizedArgs);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data);
    }
  },
};

export default logger;
