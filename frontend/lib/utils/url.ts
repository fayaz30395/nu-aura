/**
 * URL Validation & Safe Navigation Utilities
 *
 * Prevents XSS attacks via javascript: URLs and other dangerous protocols
 * in window.open() and similar navigation calls.
 *
 * @example
 * import { safeWindowOpen, isValidHttpUrl } from '@/lib/utils/url';
 * safeWindowOpen(url, '_blank');
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validate that a URL string uses a safe protocol (http or https).
 * Returns false for javascript:, data:, vbscript:, and other dangerous protocols.
 *
 * @param url - The URL string to validate
 * @returns true if the URL uses http: or https: protocol
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Safe wrapper around window.open() that validates the URL protocol
 * before opening. Blocks javascript:, data:, and other XSS vectors.
 *
 * For relative URLs (e.g. /learning/certificates/123/print), the URL
 * is resolved against window.location.origin and is always allowed.
 *
 * @param url - The URL to open
 * @param target - The window target (e.g. '_blank')
 * @param features - Optional window features string
 * @returns The opened window reference, or null if the URL was blocked
 */
export function safeWindowOpen(
  url: string | undefined | null,
  target?: string,
  features?: string
): Window | null {
  if (!url) {
    return null;
  }

  if (!isValidHttpUrl(url)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[safeWindowOpen] Blocked unsafe URL:', url);
    }
    return null;
  }

  return window.open(url, target, features);
}
