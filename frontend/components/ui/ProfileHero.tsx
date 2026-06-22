'use client';

import React from 'react';
import {ArrowLeft} from 'lucide-react';
import {Avatar, type AvatarSize} from './Avatar';

/** Visual density of the hero. `default` = full page header; `compact` = drawer/card/modal. */
export type ProfileHeroVariant = 'default' | 'compact';
/** Heading element for the name. Use `h1` only for a screen's primary header; `h2`/`h3` inside drawers/cards/modals. */
export type ProfileHeroHeadingLevel = 'h1' | 'h2' | 'h3';

export interface ProfileHeroProps {
  /** Display name — drives the heading and the avatar fallback. */
  name: string;
  /** Photo URL; falls back to name-hashed initials when absent or broken. */
  photoUrl?: string | null;
  /** Role / designation line under the name. */
  subtitle?: React.ReactNode;
  /** Secondary meta row (department · code · email …). Rendered muted. */
  meta?: React.ReactNode;
  /** Status pill slot — pass the page's own badge so styling/permissions stay intact. */
  status?: React.ReactNode;
  /** Right-aligned action cluster. Pass PermissionGate-wrapped buttons unchanged. */
  actions?: React.ReactNode;
  /** Optional metrics row/grid rendered below the identity block. */
  metrics?: React.ReactNode;
  /** Optional full-bleed cover/gradient band rendered above the identity (e.g. name-tinted header). */
  topBand?: React.ReactNode;
  /** Back affordance. */
  onBack?: () => void;
  backLabel?: string;
  /** Density. `compact` shrinks padding + avatar + heading for drawers/cards/modals. */
  variant?: ProfileHeroVariant;
  /** Heading element — `h1` (default) for a primary page header, `h2`/`h3` for embedded contexts. */
  headingLevel?: ProfileHeroHeadingLevel;
  /** Identity alignment. `center` stacks the avatar above the name (directory cards/modals). */
  align?: 'start' | 'center';
  /** Avatar size tier. Defaults to `xl` (default variant) / `lg` (compact). */
  avatarSize?: AvatarSize;
  className?: string;
}

/**
 * Unified employee identity hero. Single source for the avatar + name + status +
 * role/meta + action cluster previously hand-rolled across the profile view, edit,
 * compensation, directory, drawer, and self-profile screens. Pure layout — all
 * permission gating lives in the slots the caller passes in. Warm under
 * `[data-altitude="elevated"]`, neutral otherwise (every --elv-* read has a
 * Studio Slate fallback).
 *
 * Variants: `default` (page header, h1) and `compact` (drawer/card/modal). Use
 * `headingLevel` to keep a single h1 per screen, and `align="center"` for the
 * gradient-cover directory card/modal layout (pair with `topBand`).
 */
export function ProfileHero({
  name,
  photoUrl,
  subtitle,
  meta,
  status,
  actions,
  metrics,
  topBand,
  onBack,
  backLabel = 'Back',
  variant = 'default',
  headingLevel = 'h1',
  align = 'start',
  avatarSize,
  className,
}: ProfileHeroProps) {
  const isCompact = variant === 'compact';
  const isCentered = align === 'center';
  const resolvedAvatarSize: AvatarSize = avatarSize ?? (isCompact ? 'lg' : 'xl');
  const Heading = headingLevel;

  const headingClass = [
    'truncate font-bold tracking-tight text-[var(--text-primary)]',
    isCompact ? 'text-xl' : 'text-2xl',
  ].join(' ');

  return (
    <section
      className={[
        'overflow-hidden rounded-[var(--elv-r-xl,1rem)] border border-[var(--border-subtle)]',
        'bg-[var(--elv-surface-highlight,var(--bg-card))]',
        'shadow-[var(--elv-shadow-medium,var(--shadow-card))]',
        isCompact ? 'p-4 sm:p-5' : 'p-5 sm:p-6 md:p-[var(--elv-space-hero,1.5rem)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {topBand && (
        <div className={['-mx-4 -mt-4 mb-4 sm:-mx-5 sm:-mt-5', isCompact ? '' : 'md:-mx-6 md:-mt-6'].join(' ')}>
          {topBand}
        </div>
      )}

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-caption text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </button>
      )}

      <div
        className={[
          'flex flex-col gap-5',
          isCentered ? '' : 'sm:flex-row sm:items-start sm:justify-between',
        ].join(' ')}
      >
        <div
          className={[
            'flex min-w-0 gap-4',
            isCentered
              ? 'flex-col items-center text-center'
              : 'flex-col items-start sm:flex-row sm:items-center sm:gap-5',
          ].join(' ')}
        >
          <Avatar name={name} src={photoUrl} size={resolvedAvatarSize} ring />
          <div className="min-w-0">
            <div className={['flex flex-wrap items-center gap-3', isCentered ? 'justify-center' : ''].join(' ')}>
              <Heading className={headingClass}>{name}</Heading>
              {status}
            </div>
            {subtitle && (
              <p className="mt-1 text-body-secondary text-[var(--text-secondary)]">{subtitle}</p>
            )}
            {meta && (
              <div
                className={[
                  'mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-[var(--text-muted)]',
                  isCentered ? 'justify-center' : '',
                ].join(' ')}
              >
                {meta}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div
            className={['flex flex-wrap items-center gap-3', isCentered ? 'justify-center' : ''].join(' ')}
          >
            {actions}
          </div>
        )}
      </div>

      {metrics && (
        <div className="mt-[var(--elv-space-card,1.25rem)] border-t border-[var(--border-subtle)] pt-4">
          {metrics}
        </div>
      )}
    </section>
  );
}

ProfileHero.displayName = 'ProfileHero';

export interface ProfileIdentityProps {
  /** Display name — drives the label and avatar fallback. */
  name: string;
  /** Photo URL; falls back to name-hashed initials. */
  photoUrl?: string | null;
  /** Secondary line (employee code, email, designation). Rendered muted. */
  secondary?: React.ReactNode;
  /** Avatar size tier. Defaults to `sm` for dense rows. */
  size?: AvatarSize;
  className?: string;
}

/**
 * Inline identity cell — avatar + name + optional secondary line — for dense table
 * rows and list items where a full {@link ProfileHero} would be too heavy. Replaces
 * the bespoke avatar+name snippets re-rolled in directory/table views.
 */
export function ProfileIdentity({
  name,
  photoUrl,
  secondary,
  size = 'sm',
  className,
}: ProfileIdentityProps) {
  return (
    <div className={['flex min-w-0 items-center gap-3', className].filter(Boolean).join(' ')}>
      <Avatar name={name} src={photoUrl} size={size} />
      <div className="min-w-0">
        <div className="truncate font-medium text-[var(--text-primary)]">{name}</div>
        {secondary && (
          <div className="truncate text-caption text-[var(--text-muted)]">{secondary}</div>
        )}
      </div>
    </div>
  );
}

ProfileIdentity.displayName = 'ProfileIdentity';
