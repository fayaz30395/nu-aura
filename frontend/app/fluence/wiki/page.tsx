'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  Folder,
  Clock,
  Eye,
  Lock,
  Users,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWikiSpaces, useWikiPages } from '@/lib/hooks/queries/useFluence';
import {
  layout,
  typography,
  card,
  motion as dsMotion,
  iconSize,
} from '@/lib/design-system';

export default function WikiPage() {
  const router = useRouter();
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: spacesData, isLoading: spacesLoading } = useWikiSpaces(0, 100);
  const { data: pagesData, isLoading: pagesLoading } = useWikiPages(
    selectedSpaceId,
    0,
    20
  );

  const spaces = spacesData?.content || [];
  const pages = pagesData?.content || [];

  const visibilityIcon: Record<string, typeof Globe> = {
    PUBLIC: Globe,
    ORGANIZATION: Users,
    DEPARTMENT: Users,
    PRIVATE: Lock,
    RESTRICTED: Lock,
  };

  // Extract initials from author name for avatar badge
  const getAuthorInitials = (
    authorName: string | undefined
  ): string => {
    if (!authorName) return '?';
    return authorName
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Type for author info extracted from page
  interface AuthorInfo {
    id: string;
    name: string;
  }

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <motion.div {...dsMotion.pageEnter}>
        <div className={layout.sectionGap}>
          {/* Page Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 p-2">
                  <BookOpen className={`${iconSize.pageHeader} text-white`} />
                </div>
                <h1 className={typography.pageTitle}>Wiki Pages</h1>
              </div>
              <p className={typography.bodySecondary}>
                Create and manage knowledge base documentation
              </p>
            </div>
            <Button
              onClick={() => router.push('/fluence/wiki/new')}
              variant="primary"
              className="gap-2"
            >
              <Plus className={iconSize.button} />
              New Page
            </Button>
          </div>

          {/* Content Grid: Sidebar + Main */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* ─────────────────────────────────────────────────────────
                SIDEBAR: Spaces
                ───────────────────────────────────────────────────────── */}
            <div className="lg:col-span-1">
              <div className={`${card.base} ${card.paddingLarge}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Folder className={iconSize.cardInline} />
                  <h2 className={typography.sectionTitle}>Spaces</h2>
                </div>

                {spacesLoading ? (
                  <div className="h-40 flex items-center justify-center">
                    <RefreshCw className={`${iconSize.cardInline} text-[var(--text-muted)] animate-spin`} />
                  </div>
                ) : spaces.length === 0 ? (
                  <div className="py-8 text-center">
                    <Folder className={`${iconSize.statCard} mx-auto mb-2 opacity-50 text-[var(--text-muted)]`} />
                    <p className={typography.caption}>No spaces yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* All Spaces button */}
                    <motion.button
                      onClick={() => setSelectedSpaceId(undefined)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        selectedSpaceId === undefined
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <p className="text-sm font-medium">All Spaces</p>
                    </motion.button>

                    {/* Individual space buttons */}
                    {spaces.map((space) => (
                      <motion.button
                        key={space.id}
                        onClick={() => setSelectedSpaceId(space.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                          selectedSpaceId === space.id
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                        }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <p className="text-sm font-medium truncate">
                          {space.name}
                        </p>
                        <p className={`${typography.caption} mt-0.5`}>
                          {space.pageCount || 0} pages
                        </p>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────
                MAIN: Pages Grid
                ───────────────────────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${iconSize.cardInline} text-[var(--text-muted)]`} />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-aura w-full pl-10 pr-4 py-2.5"
                />
              </div>

              {/* Pages Grid or Loading/Empty States */}
              {pagesLoading ? (
                <motion.div
                  className={layout.grid2}
                  {...dsMotion.staggerContainer}
                >
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div key={i} {...dsMotion.staggerItem}>
                      <div
                        className={`${card.base} ${card.paddingLarge} h-48 animate-pulse`}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : filteredPages.length === 0 ? (
                <div className={`${card.base} ${card.paddingLarge} border-dashed border-2 border-[var(--border-main)]`}>
                  <div className="py-16 text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--bg-secondary)] mx-auto mb-3">
                      <BookOpen className={`${iconSize.statCard} text-[var(--text-muted)]`} />
                    </div>
                    <h3 className={`${typography.sectionTitle} mb-1`}>
                      {searchQuery ? 'No pages found' : 'No pages yet'}
                    </h3>
                    <p className={`${typography.bodySecondary} mb-6`}>
                      {searchQuery
                        ? 'Try adjusting your search terms'
                        : 'Start by creating your first wiki page'}
                    </p>
                    {!searchQuery && (
                      <Button
                        onClick={() => router.push('/fluence/wiki/new')}
                        variant="primary"
                        className="gap-2"
                      >
                        <Plus className={iconSize.button} />
                        Create Page
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <motion.div
                  className={layout.grid2}
                  {...dsMotion.staggerContainer}
                >
                  {filteredPages.map((page) => {
                    const VisibilityIcon =
                      visibilityIcon[page.visibility] || Globe;
                    const authorInitials = getAuthorInitials(page.authorName);

                    return (
                      <motion.div
                        key={page.id}
                        {...dsMotion.staggerItem}
                      >
                        <motion.div
                          {...dsMotion.cardHover}
                          onClick={() =>
                            router.push(`/fluence/wiki/${page.id}`)
                          }
                          className={`${card.base} ${card.paddingLarge} ${card.interactive} cursor-pointer h-full`}
                        >
                          {/* Card Header: Title + Visibility */}
                          <div className="mb-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <h3 className={`${typography.cardTitle} line-clamp-2 flex-1`}>
                                {page.title}
                              </h3>
                              <VisibilityIcon
                                className={`${iconSize.cardInline} flex-shrink-0 text-[var(--text-muted)]`}
                              />
                            </div>
                          </div>

                          {/* Card Body: Metadata */}
                          <div className="space-y-3 mb-4 flex-1">
                            {/* Updated Date */}
                            <div className="flex items-center gap-2">
                              <Clock
                                className={`${iconSize.meta} text-[var(--text-muted)]`}
                              />
                              <span className={typography.caption}>
                                {new Date(
                                  page.updatedAt
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            {/* View Count */}
                            <div className="flex items-center gap-2">
                              <Eye
                                className={`${iconSize.meta} text-[var(--text-muted)]`}
                              />
                              <span className={typography.caption}>
                                {page.viewCount || 0} views
                              </span>
                            </div>
                          </div>

                          {/* Card Footer: Author Badge */}
                          {page.authorName && (
                            <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-main)]">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xs font-medium">
                                {authorInitials}
                              </div>
                              <span className={`${typography.caption} truncate`}>
                                {page.authorName}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
