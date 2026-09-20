'use client';

import {useState} from 'react';
import {NodeViewContent, NodeViewWrapper, type NodeViewProps} from '@tiptap/react';
import {motion} from 'framer-motion';
import {ChevronRight} from 'lucide-react';

/** NodeView for `expandCollapse` — mirrors ExpandCollapse.tsx's visuals, body is real editable/rendered Tiptap content. */
export function ExpandCollapseNodeView({node}: NodeViewProps) {
  const title = (node.attrs.title as string) || 'Details';
  const [isExpanded, setIsExpanded] = useState(Boolean(node.attrs.defaultExpanded));

  return (
    <NodeViewWrapper className="rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden my-2">
      <button
        type="button"
        contentEditable={false}
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-2 w-full px-4 py-2 text-left cursor-pointer transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-inset"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
      >
        <motion.span
          animate={{rotate: isExpanded ? 90 : 0}}
          transition={{duration: 0.15, ease: 'easeInOut'}}
          className="shrink-0"
        >
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]"/>
        </motion.span>
        <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
      </button>

      {/* NodeViewContent stays mounted so ProseMirror keeps a stable contentDOM; collapse toggles visibility only. */}
      <motion.div
        animate={{height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0}}
        transition={{duration: 0.2, ease: 'easeInOut'}}
        className="overflow-hidden"
      >
        <NodeViewContent className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)] text-sm text-[var(--text-primary)]"/>
      </motion.div>
    </NodeViewWrapper>
  );
}
