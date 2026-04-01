import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this when rendering HTML from backend/user input with dangerouslySetInnerHTML
 *
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string safe to render
 *
 * @example
 * // Basic usage
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';

  const sanitized = String(DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
    ],
    // SEC-H03 FIX: Removed 'style' attribute to prevent CSS injection attacks
    // (data exfiltration via background-image:url(...), clickjacking via position:fixed).
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class',
      'target', 'rel', 'width', 'height',
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
  }));

  // Add rel="noopener noreferrer" to all links for security
  return sanitized.replace(
    /<a([^>]*?)>/gi,
    '<a$1 target="_blank" rel="noopener noreferrer">'
  );
}

/**
 * Sanitize HTML for email content - more restrictive
 * Allows typical email formatting but blocks scripts, iframes, forms
 */
export function sanitizeEmailHtml(html: string | null | undefined): string {
  if (!html) return '';

  const sanitized = String(DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'u',
      'h1', 'h2', 'h3', 'h4',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
    ],
    // SEC-H03 FIX: Removed 'style' attribute to prevent CSS injection attacks.
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title',
      'width', 'height', 'border', 'cellpadding', 'cellspacing',
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover'],
  }));

  return sanitized.replace(
    /<a([^>]*?)>/gi,
    '<a$1 target="_blank" rel="noopener noreferrer">'
  );
}

/**
 * Sanitize HTML for announcement content
 * Allows rich formatting typical in company announcements
 */
export function sanitizeAnnouncementHtml(html: string | null | undefined): string {
  if (!html) return '';

  const sanitized = String(DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'hr',
    ],
    // SEC-H03 FIX: Removed 'style' attribute to prevent CSS injection attacks.
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class',
      'target', 'rel', 'width', 'height',
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  }));

  return sanitized.replace(
    /<a([^>]*?)>/gi,
    '<a$1 target="_blank" rel="noopener noreferrer">'
  );
}

/**
 * Strip all HTML tags, returning plain text only
 * Useful for displaying text previews
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return String(DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }));
}
