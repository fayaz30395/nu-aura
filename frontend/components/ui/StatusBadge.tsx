import React from 'react';
import {HelpCircle} from 'lucide-react';
import {cn} from '@/lib/utils';
import {resolveStatus, type StatusMeta, type StatusTone} from '@/lib/status/vocabulary';

/** Props for {@link StatusBadge}. */
export interface StatusBadgeProps {
  /**
   * Either pass a raw status enum value + a domain map (looked up via
   * `resolveStatus`), or pass a pre-resolved `meta` object directly.
   */
  status?: string | null;
  domain?: Record<string, StatusMeta>;
  meta?: StatusMeta;
  /** Override the resolved label (rare — typically the vocabulary is correct). */
  label?: string;
  /** Override the resolved tone (rare). */
  tone?: StatusTone;
  /** Hide the icon. Default false. NOT recommended — color + icon is the canonical pattern. */
  iconHidden?: boolean;
  /** Compact variant: smaller padding for dense tables. Default false. */
  compact?: boolean;
  /**
   * Softly pulse the icon to signal a live/active/in-progress status.
   * Opacity-only (compositor-friendly) and automatically neutralized for
   * users who prefer reduced motion. Default false.
   */
  pulse?: boolean;
  className?: string;
}

const toneClass: Record<StatusTone, string> = {
  success: 'status-success',
  warning: 'status-warning',
  danger: 'status-danger',
  info: 'status-info',
  neutral: 'status-neutral',
};

/**
 * Canonical status badge. Always renders color + icon + label per
 * DESIGN.md "Color + label, never color alone."
 *
 * Three usage patterns:
 *
 * 1. With vocabulary lookup (preferred):
 *    <StatusBadge status={record.status} domain={LEAVE_STATUS} />
 *
 * 2. With pre-resolved meta:
 *    <StatusBadge meta={myCustomMeta} />
 *
 * 3. With manual props (escape hatch):
 *    <StatusBadge label="Custom" tone="info" />
 *
 * Bound classes: `.badge-status` and `.status-*` from `app/globals.css`.
 */
export function StatusBadge({
  status,
  domain,
  meta,
  label: labelOverride,
  tone: toneOverride,
  iconHidden = false,
  compact = false,
  pulse = false,
  className,
}: StatusBadgeProps) {
  const resolved: StatusMeta = meta ?? (domain ? resolveStatus(status, domain) : {label: status ?? 'Unknown', tone: 'neutral', icon: HelpCircle});
  const label = labelOverride ?? resolved.label;
  const tone = toneOverride ?? resolved.tone;
  const Icon = resolved.icon;

  return (
    <span
      className={cn(
        'badge-status',
        toneClass[tone],
        compact ? 'text-2xs px-1.5 py-0.5' : 'text-xs',
        'inline-flex items-center gap-1 motion-rise',
        className
      )}
      role="status"
    >
      {!iconHidden && Icon ? (
        <Icon className={cn('h-3 w-3 flex-shrink-0', pulse && 'animate-pulse')} aria-hidden />
      ) : null}
      <span>{label}</span>
    </span>
  );
}

StatusBadge.displayName = 'StatusBadge';
