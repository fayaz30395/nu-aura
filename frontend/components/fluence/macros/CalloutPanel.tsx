'use client';

import {Info, AlertTriangle, Lightbulb} from 'lucide-react';
import type {CalloutVariant, TiptapNode} from '@/lib/types/platform/macro';

// ── Variant Configuration ────────────────────────────────────────────────────

interface VariantConfig {
  icon: React.ComponentType<{ className?: string }>;
  borderClass: string;
  bgClass: string;
  iconColorClass: string;
  titleColorClass: string;
  label: string;
}

const VARIANT_CONFIG: Record<CalloutVariant, VariantConfig> = {
  info: {
    icon: Info,
    borderClass: 'border-[var(--status-info-text)]',
    bgClass: 'bg-[var(--status-info-bg)]',
    iconColorClass: 'text-[var(--status-info-text)]',
    titleColorClass: 'text-[var(--status-info-text)]',
    label: 'Information',
  },
  warning: {
    icon: AlertTriangle,
    borderClass: 'border-[var(--status-warning-text)]',
    bgClass: 'bg-[var(--status-warning-bg)]',
    iconColorClass: 'text-[var(--status-warning-text)]',
    titleColorClass: 'text-[var(--status-warning-text)]',
    label: 'Warning',
  },
  note: {
    icon: Lightbulb,
    borderClass: 'border-[var(--status-success-text)]',
    bgClass: 'bg-[var(--status-success-bg)]',
    iconColorClass: 'text-[var(--status-success-text)]',
    titleColorClass: 'text-[var(--status-success-text)]',
    label: 'Note',
  },
};

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

interface CalloutPanelProps {
  variant: CalloutVariant;
  title?: string;
  content?: TiptapNode[];
  className?: string;
}

/**
 * Callout panel macro component.
 *
 * Renders as a colored callout box with left border accent, icon, optional
 * title, and content body. Supports three variants: info, warning, and note.
 */
export function CalloutPanel({
                               variant,
                               title,
                               content,
                               className = '',
                             }: CalloutPanelProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const bodyText = content ? extractContentText(content) : '';

  return (
    <div
      className={`
        border-l-4 ${config.borderClass} ${config.bgClass}
        rounded-md p-4 ${className}
      `}
      role="note"
      aria-label={title ?? config.label}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColorClass}`}/>
        <div className="min-w-0 flex-1">
          {title && (
            <p className={`text-sm font-semibold ${config.titleColorClass} mb-1`}>
              {title}
            </p>
          )}
          {bodyText && (
            <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
              {bodyText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
