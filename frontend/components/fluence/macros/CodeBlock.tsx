'use client';

import { useState, useCallback, useRef } from 'react';
import { Check, Copy } from 'lucide-react';

interface MacroCodeBlockProps {
  language?: string;
  code: string;
  className?: string;
}

/**
 * Enhanced code block macro component.
 *
 * Renders code with line numbers, a language label badge, copy-to-clipboard
 * button, and monospace font. Uses the sidebar dark background for the code
 * area to provide strong visual contrast.
 */
export function MacroCodeBlock({
  language = 'text',
  code,
  className = '',
}: MacroCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    } catch {
      // Clipboard API may fail in insecure contexts; silently ignore
    }
  }, [code]);

  const lines = code.split('\n');
  const lineNumberWidth = String(lines.length).length;

  return (
    <div
      className={`
        rounded-md overflow-hidden border border-[var(--border-main)]
        ${className}
      `}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--surface-2)] border-b border-[var(--border-main)]">
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--accent-100)] text-[var(--accent-800)]">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="
            flex items-center gap-1 px-2 py-1 rounded text-xs
            text-[var(--text-secondary)] cursor-pointer
            hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]
            transition-colors
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
          "
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--status-success-text)]" />
              <span className="text-[var(--status-success-text)]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code area */}
      <div className="overflow-x-auto bg-[var(--bg-sidebar)]">
        <pre className="p-4 m-0">
          <code className="font-[var(--font-mono)] text-xs leading-relaxed">
            {lines.map((line, index) => (
              <div key={index} className="flex">
                <span
                  className="select-none shrink-0 pr-4 text-right text-[var(--sidebar-text-muted)]"
                  style={{ minWidth: `${lineNumberWidth + 1}ch` }}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="text-[var(--sidebar-text)] flex-1 whitespace-pre">
                  {line || ' '}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
