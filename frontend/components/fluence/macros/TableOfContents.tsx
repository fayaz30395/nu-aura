'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { List, ChevronDown, ChevronUp } from 'lucide-react';
import type { TiptapNode, TableOfContentsEntry } from '@/lib/types/platform/macro';

interface MacroTableOfContentsProps {
  /** Full Tiptap document content to extract headings from */
  content: TiptapNode[];
  /** Whether the TOC should use sticky positioning */
  sticky?: boolean;
  className?: string;
}

/**
 * Recursively extracts text from a Tiptap node and its children.
 */
function extractText(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(extractText).join('');
}

/**
 * Generates a URL-safe slug from heading text for use as an anchor ID.
 */
function slugify(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return base ? `${base}-${index}` : `heading-${index}`;
}

/**
 * Walks the Tiptap JSON tree and collects all heading nodes (h1-h3).
 */
function extractHeadings(nodes: TiptapNode[]): TableOfContentsEntry[] {
  const headings: TableOfContentsEntry[] = [];

  for (const node of nodes) {
    if (node.type === 'heading') {
      const level = (node.attrs?.level as number) ?? 1;
      if (level >= 1 && level <= 3) {
        const text = extractText(node);
        if (text.trim()) {
          headings.push({
            id: slugify(text, headings.length),
            level,
            text: text.trim(),
          });
        }
      }
    }
    if (node.content) {
      headings.push(...extractHeadings(node.content));
    }
  }

  return headings;
}

/**
 * Table of Contents macro component.
 *
 * Parses heading nodes (h1-h3) from Tiptap JSON content and renders
 * a clickable, collapsible navigation list with smooth scroll-to behavior.
 */
export function MacroTableOfContents({
  content,
  sticky = false,
  className = '',
}: MacroTableOfContentsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeId, setActiveId] = useState<string>('');

  const headings = useMemo(() => extractHeadings(content), [content]);

  const handleClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  }, []);

  if (headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <div
      className={`
        rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4
        ${sticky ? 'sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full mb-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
        aria-expanded={isExpanded}
        aria-label="Toggle table of contents"
      >
        <span className="flex items-center gap-2">
          <List className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-700)] transition-colors">
            Table of Contents
          </span>
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {/* Headings list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.nav
            className="space-y-0.5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            aria-label="Page headings"
          >
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => handleClick(heading.id)}
                className={`
                  block w-full text-left px-4 py-1.5 rounded-md text-xs transition-all
                  line-clamp-2 cursor-pointer
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
                  ${
                    activeId === heading.id
                      ? 'bg-[var(--accent-100)] text-[var(--accent-800)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                  }
                `}
                style={{ marginLeft: `${(heading.level - minLevel) * 12}px` }}
                aria-label={`Jump to ${heading.text}`}
              >
                {heading.text}
              </button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
