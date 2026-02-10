/**
 * Configuration Module
 *
 * Centralized configuration management for the frontend application.
 * Provides type-safe access to environment variables and app settings.
 */

export {
  env,
  validateEnv,
  isDevelopment,
  isProduction,
  isTest,
  isDemoMode,
  isGoogleAuthEnabled,
  apiConfig,
  type Env,
  type EnvValidationResult,
} from './env';
