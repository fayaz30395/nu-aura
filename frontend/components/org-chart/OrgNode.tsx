'use client';

import React, {useCallback, useState} from 'react';
import Image from 'next/image';
import {AnimatePresence, motion} from 'framer-motion';
import {ChevronDown, ChevronRight, ExternalLink, Mail, Phone, Users,} from 'lucide-react';
import Link from 'next/link';
import {Employee} from '@/lib/types/hrms/employee';
import {OrgChartNode} from '@/lib/services/hrms/orgChart.service';
import {cn} from '@/lib/utils';

// ── Level-based styling ─────────────────────────────────────────────────────

const LEVEL_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  CXO: {
    bg: "bg-accent-subtle",
    border: "border-[var(--accent-primary)]",
    badge: "bg-accent-subtle text-accent"
  },
  SVP: {
    bg: "bg-[var(--accent-50)]/80",
    border: "border-[var(--accent-primary)]",
    badge: "bg-accent-subtle text-accent"
  },
  VP: {
    bg: "bg-accent-subtle",
    border: "border-[var(--accent-primary)]",
    badge: "bg-accent-subtle text-accent"
  },
  DIRECTOR: {
    bg: "bg-[var(--accent-50)]/80",
    border: "border-[var(--accent-primary)]",
    badge: "bg-accent-subtle text-accent"
  },
  SENIOR_MANAGER: {
    bg: "bg-status-success-bg",
    border: "border-status-success-border",
    badge: "bg-status-success-bg text-status-success-text"
  },
  MANAGER: {
    bg: "bg-[var(--success-50)]/80",
    border: "border-status-success-border",
    badge: "bg-status-success-bg text-status-success-text"
  },
  LEAD: {
    bg: "bg-status-warning-bg",
    border: "border-status-warning-border",
    badge: "bg-status-warning-bg text-status-warning-text"
  },
  SENIOR: {
    bg: "bg-base",
    border: "border-subtle",
    badge: "bg-surface text-secondary"
  },
  MID: {
    bg: "bg-[var(--surface-50)]/60",
    border: "border-subtle",
    badge: "bg-surface text-secondary"
  },
  ENTRY: {
    bg: "bg-[var(--surface-50)]/40",
    border: "border-subtle",
    badge: "bg-surface text-secondary"
  },
};

const DEFAULT_STYLE = LEVEL_STYLES.ENTRY;

function getLevelStyle(level?: string) {
  return level ? (LEVEL_STYLES[level] ?? DEFAULT_STYLE) : DEFAULT_STYLE;
}

function getInitials(emp: Employee): string {
  return `${emp.firstName.charAt(0)}${emp.lastName?.charAt(0) ?? ''}`.toUpperCase();
}

// ── Profile Popover ─────────────────────────────────────────────────────────

interface ProfilePopoverProps {
  employee: Employee;
  directReportsCount: number;
}

function ProfilePopover({employee, directReportsCount}: ProfilePopoverProps) {
  return (
    <motion.div
      initial={{opacity: 0, y: -8, scale: 0.96}}
      animate={{opacity: 1, y: 0, scale: 1}}
      exit={{opacity: 0, y: -8, scale: 0.96}}
      transition={{duration: 0.15}}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-72 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)] p-4"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        {employee.profilePhotoUrl ? (
          <Image
            src={employee.profilePhotoUrl}
            alt={employee.fullName}
            width={48}
            height={48}
            unoptimized
            className='h-12 w-12 rounded-full object-cover border-2 border-[var(--accent-primary)]'
          />
        ) : (
          <div
            className='h-12 w-12 rounded-full bg-accent-subtle flex items-center justify-center border-2 border-[var(--accent-primary)]'>
            <span className='text-sm font-semibold text-accent'>
              {getInitials(employee)}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{employee.fullName}</p>
          <p className="text-xs text-[var(--text-secondary)] truncate">{employee.designation ?? 'No designation'}</p>
          {employee.departmentName && (
            <p className="text-xs text-[var(--text-tertiary)] truncate">{employee.departmentName}</p>
          )}
        </div>
      </div>
      {/* Details */}
      <div className="space-y-2 text-xs border-t border-[var(--border-subtle)] pt-2">
        {employee.workEmail && (
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Mail className='h-3.5 w-3.5 text-accent flex-shrink-0'/>
            <span className="truncate">{employee.workEmail}</span>
          </div>
        )}
        {employee.phoneNumber && (
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Phone className='h-3.5 w-3.5 text-accent flex-shrink-0'/>
            <span>{employee.phoneNumber}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Users className='h-3.5 w-3.5 text-accent flex-shrink-0'/>
          <span>{directReportsCount} direct report{directReportsCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      {/* Link to full profile */}
      <Link
        href={`/employees/${employee.id}`}
        className='mt-2 flex items-center justify-center gap-1.5 w-full rounded-lg bg-accent hover:bg-accent-hover text-inverse text-xs font-medium py-2 transition-colors'
      >
        View Full Profile
        <ExternalLink className="h-3 w-3"/>
      </Link>
    </motion.div>
  );
}

// ── OrgNode (Tree View) ─────────────────────────────────────────────────────

interface OrgNodeProps {
  node: OrgChartNode;
  isHighlighted: boolean;
  highlightedId: string | null;
  defaultExpanded?: boolean;
}

export function OrgNode({node, isHighlighted, highlightedId, defaultExpanded = true}: OrgNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showPopover, setShowPopover] = useState(false);

  const {employee, children} = node;
  const hasChildren = children.length > 0;
  const style = getLevelStyle(employee.level);

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
  }, []);

  const togglePopover = useCallback(() => {
    setShowPopover(prev => !prev);
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* ── Card ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          'relative rounded-xl border-2 shadow-[var(--shadow-card)] transition-all duration-200 cursor-pointer select-none',
          'min-w-[220px] max-w-[220px] p-4',
          style.bg,
          style.border,
          isHighlighted && 'ring-2 ring-accent-500 ring-offset-2 shadow-[var(--shadow-dropdown)] scale-105',
          !isHighlighted && 'hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5',
        )}
        onClick={togglePopover}
        role="button"
        tabIndex={0}
        aria-expanded={hasChildren ? expanded : undefined}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePopover();
          }
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          {employee.profilePhotoUrl ? (
            <Image
              src={employee.profilePhotoUrl}
              alt={employee.fullName}
              width={36}
              height={36}
              unoptimized
              className='h-9 w-9 rounded-full object-cover border border-[var(--border-subtle)] flex-shrink-0'
            />
          ) : (
            <div
              className='h-9 w-9 rounded-full bg-[var(--bg-card)] flex items-center justify-center border border-[var(--border-subtle)] flex-shrink-0'>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {getInitials(employee)}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
              {employee.fullName}
            </p>
            <p className="text-2xs text-[var(--text-secondary)] truncate leading-tight mt-0.5">
              {employee.designation ?? 'No designation'}
            </p>
            {employee.departmentName && (
              <p className="text-2xs text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                {employee.departmentName}
              </p>
            )}
          </div>
        </div>

        {/* Level badge */}
        {employee.level && (
          <span className={cn('mt-2 inline-block text-2xs font-semibold px-1.5 py-0.5 rounded', style.badge)}>
            {employee.level.replace('_', ' ')}
          </span>
        )}

        {/* Expand/Collapse toggle */}
        {hasChildren && (
          <button
            onClick={toggleExpand}
            className='absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-main)] shadow-[var(--shadow-card)] flex items-center justify-center hover:bg-accent-subtle transition-colors z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]"/>
            ) : (
              <span className='text-2xs font-semibold text-accent'>
                {children.length}
              </span>
            )}
          </button>
        )}

        {/* Popover */}
        <AnimatePresence>
          {showPopover && (
            <ProfilePopover employee={employee} directReportsCount={children.length}/>
          )}
        </AnimatePresence>
      </div>
      {/* ── Children ─────────────────────────────────────────────── */}
      {hasChildren && expanded && (
        <div className="relative mt-8">
          {/* Vertical connector from parent */}
          <div className='absolute left-1/2 -top-5 w-px h-5 bg-card -translate-x-1/2'/>

          {/* Horizontal connector spanning children */}
          {children.length > 1 && (
            <div className='absolute top-0 h-px bg-card' style={{
              left: `calc(50% - ${(children.length - 1) * 130}px)`,
              width: `${(children.length - 1) * 260}px`,
            }}/>
          )}

          <div className="flex gap-6 justify-center">
            {children.map(child => (
              <div key={child.employee.id} className="relative flex flex-col items-center">
                {/* Vertical connector to child */}
                <div
                  className='absolute left-1/2 -top-0 w-px h-5 bg-card -translate-x-1/2'/>
                <div className="pt-6">
                  <OrgNode
                    node={child}
                    isHighlighted={child.employee.id === highlightedId}
                    highlightedId={highlightedId}
                    defaultExpanded={child.depth < 2}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── OrgNode (List View) ─────────────────────────────────────────────────────

interface OrgListNodeProps {
  node: OrgChartNode;
  isHighlighted: boolean;
  highlightedId: string | null;
}

export function OrgListNode({node, isHighlighted, highlightedId}: OrgListNodeProps) {
  const [expanded, setExpanded] = useState(node.depth < 2);
  const {employee, children} = node;
  const hasChildren = children.length > 0;
  const style = getLevelStyle(employee.level);

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-4 py-2 px-4 rounded-lg transition-colors cursor-pointer',
          isHighlighted
            ? 'bg-accent-subtle ring-1 ring-accent-400'
            : 'hover:bg-base',
        )}
        style={{paddingLeft: `${node.depth * 24 + 12}px`}}
        onClick={() => hasChildren && setExpanded(p => !p)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && hasChildren) {
            e.preventDefault();
            setExpanded(p => !p);
          }
        }}
      >
        {/* Expand icon */}
        <div className="w-5 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]"/>
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]"/>
            )
          ) : (
            <div className='h-1.5 w-1.5 rounded-full bg-card'/>
          )}
        </div>

        {/* Avatar */}
        {employee.profilePhotoUrl ? (
          <Image
            src={employee.profilePhotoUrl}
            alt={employee.fullName}
            width={32}
            height={32}
            unoptimized
            className='h-8 w-8 rounded-full object-cover border border-subtle flex-shrink-0'
          />
        ) : (
          <div
            className='h-8 w-8 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0'>
            <span className='text-xs font-semibold text-accent'>
              {getInitials(employee)}
            </span>
          </div>
        )}

        {/* Name & info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {employee.fullName}
            </span>
            {employee.level && (
              <span className={cn('text-2xs font-semibold px-1.5 py-0.5 rounded', style.badge)}>
                {employee.level.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] truncate">
            {employee.designation ?? 'No designation'}
            {employee.departmentName ? ` - ${employee.departmentName}` : ''}
          </p>
        </div>

        {/* Reports count */}
        {hasChildren && (
          <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
            {children.length} report{children.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Profile link */}
        <Link
          href={`/employees/${employee.id}`}
          onClick={e => e.stopPropagation()}
          className='text-accent hover:text-accent flex-shrink-0'
          aria-label={`View ${employee.fullName}'s profile`}
        >
          <ExternalLink className="h-3.5 w-3.5"/>
        </Link>
      </div>
      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {children.map(child => (
            <OrgListNode
              key={child.employee.id}
              node={child}
              isHighlighted={child.employee.id === highlightedId}
              highlightedId={highlightedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
