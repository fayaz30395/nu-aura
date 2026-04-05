'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { TiptapNode } from '@/lib/types/platform/macro';

// ── Text Extraction ──────────────────────────────────────────────────────────

function extractText(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(extractText).join('');
}

function extractContentText(nodes: TiptapNode[]): string {
  return nodes.map(extractText).join('\n');
}

// ── Component ────────────────────────────────────────────────────────────────

interface ExpandCollapseProps {
  title: string;
  defaultExpanded?: boolean;
  content?: TiptapNode[];
  className?: string;
}

/**
 * Expand/Collapse macro component.
 *
 * A collapsible section with animated expand/collapse transition using
 * framer-motion. Clicking the header toggles content visibility.
 */
export function ExpandCollapse({
  title,
  defaultExpanded = false,
  content,
  className = '',
}: ExpandCollapseProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const bodyText = content ? extractContentText(content) : '';

  return (
    <div
      className={`
        rounded-md border border-[var(--border-main)] bg-[var(--bg-card)]
        overflow-hidden ${className}
      `}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className={`
          flex items-center gap-2 w-full px-4 py-2 text-left
          cursor-pointer transition-colors
          hover:bg-[var(--surface-2)]
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-[var(--ring-primary)] focus-visible:ring-inset
        `}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
      >
        <motion.span
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
          className="shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        </motion.span>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {title}
        </span>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)]">
              {bodyText ? (
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                  {bodyText}
                </p>
              ) : (
                <p className="text-sm text-[var(--text-muted)] italic">
                  No content
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
