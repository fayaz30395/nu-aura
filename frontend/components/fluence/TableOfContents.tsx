'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Heading {
  id: string;
  level: number;
  text: string;
}

interface TableOfContentsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

/**
 * Table of Contents component that auto-generates headings from content.
 * Scans contentRef for h1-h4 elements and creates a navigable TOC.
 */
export function TableOfContents({ contentRef, className = '' }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Extract headings from content
    if (!contentRef.current) return;

    const headingElements = contentRef.current.querySelectorAll('h1, h2, h3, h4');
    const extractedHeadings: Heading[] = [];

    headingElements.forEach((element, index) => {
      const level = parseInt(element.tagName[1], 10);
      const text = element.textContent || '';
      const id = element.id || `heading-${index}`;

      // Auto-set ID if not present
      if (!element.id) {
        element.id = id;
      }

      if (text.trim()) {
        extractedHeadings.push({ id, level, text });
      }
    });

    setHeadings(extractedHeadings);
  }, [contentRef]);

  // Scroll to heading when clicked
  const handleHeadingClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeadingId(id);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <motion.div
      className={`sticky top-24 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 max-h-[calc(100vh-120px)] overflow-y-auto ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-4 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
      >
        <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-700)] transition-colors">
          Contents
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {/* Headings list */}
      {isExpanded && (
        <motion.nav
          className="space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {headings.map((heading) => (
            <motion.button
              key={heading.id}
              onClick={() => handleHeadingClick(heading.id)}
              className={`block w-full text-left px-4 py-1.5 rounded-md text-xs transition-all line-clamp-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                activeHeadingId === heading.id
                  ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-950)]/30 text-[var(--accent-800)] dark:text-[var(--accent-300)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={{ marginLeft: `${(heading.level - minLevel) * 12}px` }}
              whileHover={{ x: 2 }}
              aria-label={`Jump to ${heading.text}`}
            >
              {heading.text}
            </motion.button>
          ))}
        </motion.nav>
      )}
    </motion.div>
  );
}
