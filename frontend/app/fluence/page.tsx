'use client';

import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  FileText,
  LayoutTemplate,
  MessageSquare,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import {useBlogPosts, useWikiPages, useWikiSpaces} from '@/lib/hooks/queries/useFluence';
import {useInfiniteWallPosts} from '@/lib/hooks/queries/useWall';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';

// Single ease curve for every transition on this page.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface ActivityItem {
  id: string;
  title: string;
  meta: string;
  href: string;
  kind: 'wiki' | 'blog' | 'wall';
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FluencePage() {
  const router = useRouter();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.KNOWLEDGE_VIEW,
    Permissions.WIKI_VIEW,
    Permissions.BLOG_VIEW,
  );

  useEffect(() => {
    if (permissionsReady && !hasAccess) router.replace('/me/dashboard');
  }, [permissionsReady, hasAccess, router]);

  const {data: spacesData, isLoading: spacesLoading} = useWikiSpaces(0, 6, hasAccess);
  const {data: pagesData, isLoading: pagesLoading} = useWikiPages(undefined, 0, 5, hasAccess);
  const {data: blogData, isLoading: blogLoading} = useBlogPosts(0, 5, undefined, hasAccess);
  const wallQuery = useInfiniteWallPosts(undefined, 5);

  if (!permissionsReady || !hasAccess) return null;

  const spaces = spacesData?.content ?? [];
  const activeSpaceCount = spaces.length;
  const pagesThisWeek = countSince(pagesData?.content ?? [], 7, (p) => p.updatedAt);
  const blogsThisWeek = countSince(blogData?.content ?? [], 7, (p) => p.publishedAt ?? p.updatedAt);
  const contributions = pagesThisWeek + blogsThisWeek;

  const isLoading = spacesLoading || pagesLoading || blogLoading;

  const activity = buildActivity(
    pagesData?.content ?? [],
    blogData?.content ?? [],
    wallQuery.data?.pages?.[0]?.content ?? [],
  );

  return (
    <AppLayout>
      <PageTransition className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader />

        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <StatsRow
            activeSpaces={activeSpaceCount}
            pagesThisWeek={pagesThisWeek}
            contributions={contributions}
            blogsThisWeek={blogsThisWeek}
          />
        )}

        <BentoNavigation pinnedSpaces={spaces.slice(0, 4)} />

        {activity.length > 0 && <RecentActivity items={activity.slice(0, 6)} />}

        {contributions === 0 && !isLoading && <QuietWeekStrip />}
      </PageTransition>
    </AppLayout>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function countSince<T>(items: T[], days: number, getDate: (item: T) => string | undefined): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.reduce((n, item) => {
    const d = getDate(item);
    if (!d) return n;
    const t = new Date(d).getTime();
    return Number.isFinite(t) && t >= cutoff ? n + 1 : n;
  }, 0);
}

function buildActivity(
  pages: Array<{id: string; title: string; slug: string; spaceId: string; spaceName?: string; updatedAt: string; authorName?: string}>,
  blogs: Array<{id: string; title: string; slug: string; updatedAt: string; authorName?: string}>,
  wallPosts: Array<{id: string; content?: string; authorName?: string; createdAt: string}>,
): ActivityItem[] {
  const items: Array<ActivityItem & {ts: number}> = [];

  for (const p of pages) {
    items.push({
      id: `wiki-${p.id}`,
      title: p.title,
      meta: `${p.spaceName ?? 'Wiki'} · updated by ${p.authorName ?? 'someone'} · ${relativeTime(p.updatedAt)}`,
      href: `/fluence/wiki/${p.spaceId}/${p.slug}`,
      kind: 'wiki',
      ts: new Date(p.updatedAt).getTime(),
    });
  }
  for (const b of blogs) {
    items.push({
      id: `blog-${b.id}`,
      title: b.title,
      meta: `Blog · ${b.authorName ?? 'someone'} · ${relativeTime(b.updatedAt)}`,
      href: `/fluence/blogs/${b.slug}`,
      kind: 'blog',
      ts: new Date(b.updatedAt).getTime(),
    });
  }
  for (const w of wallPosts) {
    const snippet = (w.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Untitled post';
    items.push({
      id: `wall-${w.id}`,
      title: snippet,
      meta: `Wall · ${w.authorName ?? 'someone'} · ${relativeTime(w.createdAt)}`,
      href: '/fluence/wall',
      kind: 'wall',
      ts: new Date(w.createdAt).getTime(),
    });
  }

  return items.sort((a, b) => b.ts - a.ts);
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader() {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          NU-Fluence
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          The handbook the whole company actually opens.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Wikis, blogs, templates, and the wall — structured, searchable, never a blank page.
        </p>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-end">
        <Link href="/fluence/search">
          <Button variant="outline">
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            Search
          </Button>
        </Link>
        <Link href="/fluence/wiki">
          <Button variant="primary">
            Open Wiki
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </motion.header>
  );
}

// ── Stats row ────────────────────────────────────────────────────────────────
function StatsRow({activeSpaces, pagesThisWeek, contributions, blogsThisWeek}: {
  activeSpaces: number;
  pagesThisWeek: number;
  contributions: number;
  blogsThisWeek: number;
}) {
  const items = [
    {label: 'Active spaces', value: activeSpaces},
    {label: 'Pages this week', value: pagesThisWeek},
    {label: 'Blogs this week', value: blogsThisWeek},
    {label: 'Contributions', value: contributions},
  ];

  return (
    <section aria-label="Fluence at a glance">
      <Stagger
        delayChildren={0.08}
        className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]"
      >
        {items.map((item) => (
          <StaggerItem
            key={item.label}
            className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
          >
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <span className="text-2xs font-medium uppercase tracking-wider">{item.label}</span>
            </div>
            <p className="mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight text-[var(--text-heading)]">
              {item.value}
            </p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
      {Array.from({length: 4}).map((_, i) => (
        <div key={i} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="mt-3 h-9 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Bento navigation ─────────────────────────────────────────────────────────
function BentoNavigation({pinnedSpaces}: {
  pinnedSpaces: Array<{id: string; name: string; pageCount?: number; description?: string}>;
}) {
  const tiles = [
    {
      title: 'Wiki',
      description: 'Spaces, pages, and the source of truth for how we work.',
      icon: BookOpen,
      href: '/fluence/wiki',
    },
    {
      title: 'Blogs',
      description: 'Long-form writing, announcements, and team thinking out loud.',
      icon: FileText,
      href: '/fluence/blogs',
    },
    {
      title: 'Templates',
      description: 'Pre-built page structures so no one starts from blank.',
      icon: LayoutTemplate,
      href: '/fluence/templates',
    },
    {
      title: 'Wall',
      description: 'Praise, shout-outs, and what the team is celebrating.',
      icon: Users,
      href: '/fluence/wall',
    },
    {
      title: 'AI Chat',
      description: 'Ask Fluence — answers grounded in your wikis and blogs.',
      icon: Sparkles,
      href: '/fluence/chat',
    },
  ];

  return (
    <section aria-label="Explore Fluence">
      <Stagger
        stagger={0.07}
        delayChildren={0.18}
        className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      >
        <PinnedSpacesHero spaces={pinnedSpaces} />
        {tiles.map((tile) => (
          <BentoTile key={tile.href} {...tile} />
        ))}
      </Stagger>
    </section>
  );
}

function PinnedSpacesHero({spaces}: {
  spaces: Array<{id: string; name: string; pageCount?: number; description?: string}>;
}) {
  const empty = spaces.length === 0;
  return (
    <StaggerItem className="lg:col-span-7 lg:row-span-2">
      <Link
        href="/fluence/wiki"
        className="group block h-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9 transition-all hover:border-[var(--border-main)] hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
          Pinned spaces
        </h2>
        <p className="mt-3 text-body-secondary max-w-[48ch]">
          The wikis the team comes back to. Start here, or hop to any space from the Wiki home.
        </p>

        {empty ? (
          <p className="mt-10 text-sm text-[var(--text-muted)]">
            No spaces yet. Create your first wiki space to anchor the handbook.
          </p>
        ) : (
          <ul className="mt-10 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            {spaces.map((s) => (
              <li key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-heading)] truncate">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">{s.description}</p>
                  )}
                </div>
                <p className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                  {s.pageCount ?? 0} pages
                </p>
              </li>
            ))}
          </ul>
        )}
      </Link>
    </StaggerItem>
  );
}

function BentoTile({title, description, icon: Icon, href}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <StaggerItem className="lg:col-span-5">
      <Link
        href={href}
        className="group flex h-full items-start gap-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.07)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </StaggerItem>
  );
}

// ── Recent activity (divide-y list, no nested cards) ─────────────────────────
function RecentActivity({items}: {items: ActivityItem[]}) {
  return (
    <Reveal inView delay={0.1} className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Recent activity
        </h2>
        <Link
          href="/fluence/search"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
        >
          Search everything
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {items.map((item) => {
          const Icon = item.kind === 'wiki' ? BookOpen : item.kind === 'blog' ? FileText : MessageSquare;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 sm:gap-6 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-heading)] truncate">{item.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{item.meta}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}

// ── Quiet-week alert (single line, no card box) ──────────────────────────────
function QuietWeekStrip() {
  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.42}}
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4"
    >
      <div className="flex items-center gap-4 text-sm">
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
        <p className="text-[var(--text-primary)]">
          Quiet week so far. A short post or a fresh wiki page keeps the team in sync.
        </p>
      </div>
      <Link href="/fluence/wiki">
        <Button variant="outline" size="sm">
          Start a page
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </motion.aside>
  );
}
