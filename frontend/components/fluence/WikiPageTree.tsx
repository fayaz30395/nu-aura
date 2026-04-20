'use client';

import {useState, useCallback} from 'react';
import Link from 'next/link';
import {motion, AnimatePresence} from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  File,
  FolderOpen,
  Pin,
  Eye,
} from 'lucide-react';
import {Tooltip} from '@mantine/core';
import type {WikiPageTreeNode} from '@/lib/types/platform/fluence';
import {typography, iconSize} from '@/lib/design-system';

// ─── Status Badge ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED:
    'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
  DRAFT:
    'bg-[var(--status-info-bg)] text-[var(--status-info-text)]',
  ARCHIVED:
    'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]',
};

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({status}: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${style}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Tree Node ──────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: WikiPageTreeNode;
  spaceSlug: string;
  depth: number;
  maxDepth: number;
}

function TreeNode({node, spaceSlug, depth, maxDepth}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0 && depth < maxDepth;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setExpanded((prev) => !prev);
    },
    []
  );

  const paddingLeft = depth * 24; // pl-6 per level (24px = 6 * 4)

  return (
    <div>
      <Link
        href={`/fluence/wiki/${node.id}`}
        className="group flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
        style={{paddingLeft: `${paddingLeft + 16}px`}}
      >
        {/* Expand / collapse toggle */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]"/>
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]"/>
            )}
          </button>
        ) : (
          <span className="flex-shrink-0 w-5"/>
        )}

        {/* Icon */}
        {hasChildren && expanded ? (
          <FolderOpen className={`${iconSize.button} flex-shrink-0 text-[var(--accent-600)]`}/>
        ) : (
          <File className={`${iconSize.button} flex-shrink-0 text-[var(--text-muted)]`}/>
        )}

        {/* Title */}
        <span className={`${typography.body} truncate flex-1 group-hover:text-[var(--accent-700)] transition-colors`}>
          {node.title}
        </span>

        {/* Pinned indicator */}
        {node.isPinned && (
          <Tooltip label="Pinned" withArrow>
            <Pin className="h-3 w-3 flex-shrink-0 text-[var(--accent-600)] fill-current"/>
          </Tooltip>
        )}

        {/* Status badge */}
        {node.status !== 'PUBLISHED' && (
          <StatusBadge status={node.status}/>
        )}

        {/* View count */}
        <span className="flex items-center gap-1 flex-shrink-0">
          <Eye className="h-3 w-3 text-[var(--text-muted)]"/>
          <span className={typography.caption}>{node.viewCount}</span>
        </span>
      </Link>

      {/* Children */}
      <AnimatePresence initial={false}>
        {hasChildren && expanded && (
          <motion.div
            initial={{opacity: 0, height: 0}}
            animate={{opacity: 1, height: 'auto'}}
            exit={{opacity: 0, height: 0}}
            transition={{duration: 0.2, ease: 'easeInOut'}}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                spaceSlug={spaceSlug}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── WikiPageTree (Exported) ────────────────────────────────────────────────

interface WikiPageTreeProps {
  nodes: WikiPageTreeNode[];
  spaceSlug: string;
  maxDepth?: number;
}

export function WikiPageTree({nodes, spaceSlug, maxDepth = 3}: WikiPageTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="py-8 text-center">
        <File className="h-8 w-8 mx-auto mb-2 text-[var(--text-muted)] opacity-50"/>
        <p className="text-sm text-[var(--text-muted)]">No pages in this space</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          spaceSlug={spaceSlug}
          depth={0}
          maxDepth={maxDepth}
        />
      ))}
    </div>
  );
}
