/**
 * URL validation utilities — blocks dangerous schemes (javascript:, data:, vbscript:, etc.)
 * at href/src sinks. Always prefer this over passing raw user-supplied URLs to <a>/<iframe>/<Link>.
 *
 * Allowed schemes: http, https, mailto, tel — plus same-origin relative paths starting with `/`.
 * Anything else (including protocol-relative `//evil.com`) returns the fallback.
 */

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

export function safeUrl(u: string | null | undefined, fallback = '#'): string {
  if (!u || typeof u !== 'string') return fallback;
  const trimmed = u.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed; // same-origin relative
  try {
    const parsed = new URL(
      trimmed,
      typeof window !== 'undefined' ? window.location.origin : 'https://placeholder'
    );
    return SAFE_SCHEMES.includes(parsed.protocol) ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function isSafeUrl(u: string | null | undefined): boolean {
  return safeUrl(u, '__BLOCKED__') !== '__BLOCKED__';
}
