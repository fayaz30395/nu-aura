/**
 * Environment Configuration & Validation
 *
 * This module provides type-safe access to environment variables with
 * runtime validation to catch configuration errors early.
 *
 * @example
 * import { env } from '@/lib/config/env';
 * const apiUrl = env.NEXT_PUBLIC_API_URL;
 */

import { z } from 'zod';

/**
 * Environment variable schema with validation rules.
 * All NEXT_PUBLIC_ variables are available client-side.
 */
const envSchema = z.object({
  // Required in all environments
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a valid URL')
    .describe('Backend API base URL'),

  // Optional - Google OAuth (required for social login)
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z
    .string()
    .optional()
    .describe('Google OAuth client ID for social login'),

  // Optional - Demo mode flag
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .describe('Enable demo mode with sample credentials'),

  // Runtime environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node.js environment'),
});

/**
 * Inferred type from the schema
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validation result type
 */
export interface EnvValidationResult {
  success: boolean;
  env: Env | null;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables against the schema.
 *
 * @returns Validation result with parsed env or errors
 */
export function validateEnv(): EnvValidationResult {
  const warnings: string[] = [];

  // Collect raw environment values
  const rawEnv = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Check for common configuration issues
  if (!rawEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    warnings.push(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Google OAuth login will be disabled.'
    );
  }

  // In production, warn about localhost URLs
  if (
    rawEnv.NODE_ENV === 'production' &&
    rawEnv.NEXT_PUBLIC_API_URL?.includes('localhost')
  ) {
    warnings.push(
      'NEXT_PUBLIC_API_URL contains localhost in production environment.'
    );
  }

  // Parse and validate
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return `${path}: ${issue.message}`;
    });

    return {
      success: false,
      env: null,
      errors,
      warnings,
    };
  }

  return {
    success: true,
    env: result.data,
    errors: [],
    warnings,
  };
}

/**
 * Get validated environment variables.
 * Throws an error if validation fails in production.
 * Logs warnings and uses defaults in development.
 */
function getEnv(): Env {
  const validation = validateEnv();

  // In production, fail fast on configuration errors
  if (!validation.success && process.env.NODE_ENV === 'production') {
    const errorMessage = [
      'Environment validation failed:',
      ...validation.errors.map((e) => `  - ${e}`),
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings in development
  if (validation.warnings.length > 0 && typeof window === 'undefined') {
    validation.warnings.forEach((warning) => {
      console.warn(`[env] Warning: ${warning}`);
    });
  }

  // Log errors as warnings in development (don't crash)
  if (!validation.success && typeof window === 'undefined') {
    validation.errors.forEach((error) => {
      console.error(`[env] Error: ${error}`);
    });

    // Return defaults for development
    return {
      NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1',
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: undefined,
      NEXT_PUBLIC_DEMO_MODE: 'false',
      NODE_ENV: 'development',
    };
  }

  return validation.env!;
}

/**
 * Validated environment variables.
 * Access this instead of process.env directly for type safety.
 */
export const env = getEnv();

/**
 * Check if running in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in test mode
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Check if demo mode is enabled
 */
export const isDemoMode = isDevelopment || env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Check if Google OAuth is configured
 */
export const isGoogleAuthEnabled = Boolean(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

/**
 * API configuration derived from environment
 */
export const apiConfig = {
  baseUrl: env.NEXT_PUBLIC_API_URL,
  wsUrl: env.NEXT_PUBLIC_API_URL.replace('/api/v1', '').replace('http', 'ws'),
} as const;

export default env;
