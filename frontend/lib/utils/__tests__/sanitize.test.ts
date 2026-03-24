import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeEmailHtml,
  sanitizeAnnouncementHtml,
  stripHtml,
} from '../sanitize';

describe('sanitize utilities', () => {
  describe('sanitizeHtml', () => {
    it('returns empty string for null/undefined input', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
      expect(sanitizeHtml('')).toBe('');
    });

    it('allows safe HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('</strong>');
    });

    it('removes dangerous scripts', () => {
      const html = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });

    it('removes onclick handlers', () => {
      const html = '<p onclick="alert(\'xss\')">Click me</p>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onclick');
    });

    it('allows images with safe attributes', () => {
      const html = '<img src="image.jpg" alt="test">';
      const result = sanitizeHtml(html);
      expect(result).toContain('img');
    });

    it('removes iframe tags', () => {
      const html = '<iframe src="http://evil.com"></iframe>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('iframe');
    });

    it('adds target="_blank" to links', () => {
      const html = '<a href="http://example.com">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('preserves headings', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<h1>');
      expect(result).toContain('<h2>');
    });

    it('preserves lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('preserves tables', () => {
      const html = '<table><tr><td>Data</td></tr></table>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<table>');
      expect(result).toContain('<td>');
    });

    it('preserves code blocks', () => {
      const html = '<pre><code>const x = 1;</code></pre>';
      const result = sanitizeHtml(html);
      expect(result).toContain('<pre>');
      expect(result).toContain('<code>');
    });
  });

  describe('sanitizeEmailHtml', () => {
    it('returns empty string for null/undefined', () => {
      expect(sanitizeEmailHtml(null)).toBe('');
      expect(sanitizeEmailHtml(undefined)).toBe('');
    });

    it('allows basic formatting', () => {
      const html = '<p>Hello <b>there</b></p>';
      const result = sanitizeEmailHtml(html);
      expect(result).toContain('<p>');
      expect(result).toContain('<b>');
    });

    it('removes forms and inputs', () => {
      const html = '<form><input type="text"></form>';
      const result = sanitizeEmailHtml(html);
      expect(result).not.toContain('form');
      expect(result).not.toContain('input');
    });

    it('removes iframes', () => {
      const html = '<p>Content</p><iframe></iframe>';
      const result = sanitizeEmailHtml(html);
      expect(result).not.toContain('iframe');
    });

    it('adds target="_blank" to links', () => {
      const html = '<a href="http://example.com">Link</a>';
      const result = sanitizeEmailHtml(html);
      expect(result).toContain('target="_blank"');
    });

    it('preserves tables for email layouts', () => {
      const html = '<table><tr><td>Cell</td></tr></table>';
      const result = sanitizeEmailHtml(html);
      expect(result).toContain('<table>');
    });

    it('removes style attributes for CSS injection prevention (SEC-H03)', () => {
      const html = '<p style="color: red;">Red text</p>';
      const result = sanitizeEmailHtml(html);
      expect(result).not.toContain('style');
    });

    it('removes onclick handlers', () => {
      const html = '<a href="#" onclick="alert()">Click</a>';
      const result = sanitizeEmailHtml(html);
      expect(result).not.toContain('onclick');
    });
  });

  describe('sanitizeAnnouncementHtml', () => {
    it('returns empty string for null/undefined', () => {
      expect(sanitizeAnnouncementHtml(null)).toBe('');
      expect(sanitizeAnnouncementHtml(undefined)).toBe('');
    });

    it('allows rich formatting', () => {
      const html = '<h1>Announcement</h1><p>Details <em>here</em></p>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('<h1>');
      expect(result).toContain('<em>');
    });

    it('removes buttons', () => {
      const html = '<p>Click here</p><button>Submit</button>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).not.toContain('button');
    });

    it('removes forms', () => {
      const html = '<form></form>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).not.toContain('form');
    });

    it('preserves horizontal rules', () => {
      const html = '<h1>Title</h1><hr><p>Content</p>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('<hr>');
    });

    it('allows multiple heading levels', () => {
      const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('<h1>');
      expect(result).toContain('<h6>');
    });

    it('adds target="_blank" to links', () => {
      const html = '<a href="http://internal.example.com">Link</a>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });
  });

  describe('stripHtml', () => {
    it('returns empty string for null/undefined', () => {
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
      expect(stripHtml('')).toBe('');
    });

    it('removes all HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const result = stripHtml(html);
      expect(result).toBe('Hello world');
    });

    it('removes complex HTML', () => {
      const html = '<div><h1>Title</h1><p>Content with <a href="#">link</a></p></div>';
      const result = stripHtml(html);
      expect(result).toContain('Title');
      expect(result).toContain('Content');
      expect(result).toContain('link');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('handles nested tags', () => {
      const html = '<div><ul><li>Item</li></ul></div>';
      const result = stripHtml(html);
      expect(result).toBe('Item');
    });

    it('removes scripts', () => {
      const html = '<p>Hello</p><script>alert("xss")</script>';
      const result = stripHtml(html);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });

    it('preserves text content with line breaks', () => {
      const html = '<p>Line 1</p><p>Line 2</p>';
      const result = stripHtml(html);
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });

    it('removes attributes', () => {
      const html = '<img src="image.jpg" alt="test" onclick="alert()">';
      const result = stripHtml(html);
      expect(result).not.toContain('src');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alt');
    });

    it('handles entity encoding', () => {
      const html = '<p>&lt;script&gt;alert()&lt;/script&gt;</p>';
      const result = stripHtml(html);
      // DOMPurify preserves HTML entities as text (not executable)
      // The entities remain encoded, which is safe
      expect(result).not.toContain('<script>');
    });
  });

  describe('Integration scenarios', () => {
    it('sanitizeHtml handles XSS attempt with event handlers', () => {
      const malicious = '<img src=x onerror="alert(\'xss\')">';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('sanitizeHtml preserves legitimate content structure', () => {
      const content = `
        <h2>Company Announcement</h2>
        <p>We are pleased to announce:</p>
        <ul>
          <li>New feature release</li>
          <li>Performance improvements</li>
        </ul>
        <p>Learn more at <a href="https://company.com">company.com</a></p>
      `;
      const result = sanitizeHtml(content);
      expect(result).toContain('<h2>');
      expect(result).toContain('<ul>');
      expect(result).toContain('company.com');
    });

    it('stripHtml removes markup while preserving readability', () => {
      const html = '<div><h1>Title</h1><p>Content here with <strong>emphasis</strong></p></div>';
      const result = stripHtml(html);
      expect(result).toBe('TitleContent here with emphasis');
    });
  });
});
