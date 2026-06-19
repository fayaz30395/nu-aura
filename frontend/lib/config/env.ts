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

import {z} from 'zod';

/**
 * Environment variable schema with validation rules.
 * All NEXT_PUBLIC_ variables are available client-side.
 */
function isLoopbackApiUrl(value: string): boolean {
  try {
    const {hostname} = new URL(value);
    const normalizedHostname = hostname.toLowerCase();

    return normalizedHostname === 'localhost'
      || normalizedHostname === '::1'
      || normalizedHostname === '[::1]'
      || normalizedHostname === '0.0.0.0'
      || normalizedHostname.startsWith('127.');
  } catch {
    return false;
  }
}

function isPlaceholderApiUrl(value: string): boolean {
  try {
    const {hostname} = new URL(value);
    const normalizedHostname = hostname.toLowerCase();

    return normalizedHostname.endsWith('.example')
      || normalizedHostname.includes('example.com')
      || normalizedHostname.includes('your-domain')
      || normalizedHostname.includes('yourdomain');
  } catch {
    return false;
  }
}

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

  // Optional - Demo mode flag (empty string treated as unset → defaults to 'false')
  NEXT_PUBLIC_DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => (v === '' || v === undefined ? 'false' : v))
    .pipe(z.enum(['true', 'false']))
    .describe('Enable demo mode with sample credentials'),

  // Optional - realtime notifications are enabled by default (empty string → 'true')
  NEXT_PUBLIC_ENABLE_WEBSOCKET: z
    .string()
    .optional()
    .transform((v) => (v === '' || v === undefined ? 'true' : v))
    .pipe(z.enum(['true', 'false']))
    .describe('Enable realtime WebSocket notifications'),

  // Runtime environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node.js environment'),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && isLoopbackApiUrl(env.NEXT_PUBLIC_API_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['NEXT_PUBLIC_API_URL'],
      message: 'NEXT_PUBLIC_API_URL must not point to localhost or loopback when NODE_ENV=production. Set it to the real deployed API URL, for example https://api.company.com/api/v1.',
    });
  }
  if (env.NODE_ENV === 'production' && isPlaceholderApiUrl(env.NEXT_PUBLIC_API_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['NEXT_PUBLIC_API_URL'],
      message: 'NEXT_PUBLIC_API_URL must point to the real deployed API, not an example or placeholder domain.',
    });
  }
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
    NEXT_PUBLIC_ENABLE_WEBSOCKET: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Check for common configuration issues
  if (!rawEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    warnings.push(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Google OAuth login will be disabled.'
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

  // Log errors as warnings in non-production environments and fall back to
  // local defaults. Vitest exercises browser-facing imports under jsdom, so
  // this cannot be server-only.
  if (!validation.success) {
    validation.errors.forEach((error) => {
      console.error(`[env] Error: ${error}`);
    });

    // Return defaults for development
    return {
      NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1',
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: undefined,
      NEXT_PUBLIC_DEMO_MODE: 'false',
      NEXT_PUBLIC_ENABLE_WEBSOCKET: 'true',
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
export const isDemoMode = env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Check if realtime WebSocket notifications are enabled
 */
export const isWebSocketEnabled = env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true';

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
