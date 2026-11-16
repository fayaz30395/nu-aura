'use client';

import React from 'react';
import Link from 'next/link';
import {ArrowRight, CalendarDays, FileText, ShieldCheck, Wallet} from 'lucide-react';

interface Tile {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  show: boolean;
}

/** Navigation tiles to the leave sub-pages the user can reach. */
export function LeaveQuickLinks({canApprove, pendingCount}: {canApprove: boolean; pendingCount: number}) {
  const tiles: Tile[] = [
    {
      title: 'My leaves',
      description: 'Filter your request history by status.',
      icon: FileText,
      href: '/leave/my-leaves',
      show: true,
    },
    {
      title: 'Leave calendar',
      description: 'See who is away when and avoid clashes.',
      icon: CalendarDays,
      href: '/leave/calendar',
      show: true,
    },
    {
      title: 'Approvals',
      description: 'Decide on pending requests from your reports.',
      icon: ShieldCheck,
      href: '/leave/approvals',
      badge: pendingCount > 0 ? pendingCount : undefined,
      show: canApprove,
    },
    {
      title: 'Encashment',
      description: 'Convert eligible balance into payable days.',
      icon: Wallet,
      href: '/leave/encashment',
      show: true,
    },
  ];

  return (
    <section aria-labelledby="leave-explore-title" className="flex flex-col gap-4">
      <h2 id="leave-explore-title" className="text-base font-semibold text-text-1">Explore leave</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.filter((t) => t.show).map(({title, description, icon: Icon, href, badge}) => (
          <Link
            key={href}
            href={href}
            className="group flex h-full items-start gap-2 rounded-lg border border-border bg-card p-4 transition-colors duration-[var(--motion-fast)] hover:border-border-strong"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-aura-sunken text-text-2">
              <Icon className="h-4 w-4" aria-hidden="true"/>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text-1">{title}</span>
                {badge !== undefined && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-warn-bg px-2 text-2xs font-semibold tabular-nums text-status-warn-fg">
                    {badge}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs text-text-2">{description}</span>
            </span>
            <ArrowRight className="h-4 w-4 self-center text-text-3" aria-hidden="true"/>
          </Link>
        ))}
      </div>
    </section>
  );
}
