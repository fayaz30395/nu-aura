'use client';

import * as React from 'react';
import {Button} from '@/components/ui/Button';
import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/Card';
import {EmptyStateV2} from '@/components/ui/v2/EmptyStateV2';
import {SkeletonV2} from '@/components/ui/v2/SkeletonV2';
import {ThemeVersionToggle} from '@/components/ui/ThemeVersionToggle';
import {useThemeVersion} from '@/lib/theme/ThemeVersionProvider';

const TOKEN_GROUPS: {label: string; vars: string[]}[] = [
  {
    label: 'Brand',
    vars: ['--accent-primary', '--accent-primary-hover', '--accent-primary-subtle'],
  },
  {
    label: 'Surface',
    vars: ['--bg-surface', '--bg-card', '--bg-card-hover', '--surface-2'],
  },
  {
    label: 'Text',
    vars: ['--text-primary', '--text-heading', '--text-secondary', '--text-muted'],
  },
  {
    label: 'Border',
    vars: ['--border-main', '--border-subtle', '--border-strong'],
  },
  {
    label: 'Status',
    vars: ['--accent-500', '--accent-600', '--accent-700'],
  },
];

function Swatch({name}: {name: string}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-8 w-8 rounded-md border border-[var(--border-main)]"
        style={{background: `var(${name})`}}
      />
      <code className="text-xs text-[var(--text-muted)]">{name}</code>
    </div>
  );
}

export default function V2PreviewPage() {
  const version = useThemeVersion();

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-6 lg:p-10 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-heading)]">Design System Preview</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Active version: <strong className="text-[var(--text-primary)]">{version.toUpperCase()}</strong> — toggle
            to flip every surface on the platform.
          </p>
        </div>
        <ThemeVersionToggle/>
      </header>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-[var(--text-muted)] mb-3">Tokens</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOKEN_GROUPS.map((group) => (
            <Card key={group.label}>
              <CardHeader>
                <CardTitle className="text-sm">{group.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {group.vars.map((v) => (
                  <Swatch key={v} name={v}/>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-[var(--text-muted)] mb-3">Buttons</h2>
        <Card>
          <CardContent className="p-6 flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="link">Link</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="cta">CTA</Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-[var(--text-muted)] mb-3">Cards & density</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card hover>
            <CardContent className="p-4">
              <p className="text-sm font-medium">Hoverable</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Lifts on hover.</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Elevated</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Elevated shadow.</p>
            </CardContent>
          </Card>
          <Card variant="outline">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Outline</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Flat with border.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-[var(--text-muted)] mb-3">Skeletons</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonV2.DashboardHero/>
          <SkeletonV2.DataTable rows={5} columns={4}/>
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-[var(--text-muted)] mb-3">Empty states</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <EmptyStateV2 icon="inbox" title="Inbox zero" description="No notifications right now."/>
          </Card>
          <Card>
            <EmptyStateV2 icon="chart" title="No data yet" description="Metrics will appear once data arrives."/>
          </Card>
          <Card>
            <EmptyStateV2 icon="search" title="Nothing found" description="Try adjusting your filters."/>
          </Card>
        </div>
      </section>
    </div>
  );
}
