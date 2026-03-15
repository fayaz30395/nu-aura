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
import { WikiSpace } from '@/lib/types/fluence';
import type { WikiPage as WikiPageType } from '@/lib/types/fluence';

export default function WikiPage() {
  const router = useRouter();
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: spacesData, isLoading: spacesLoading } = useWikiSpaces(0, 100);
  const { data: pagesData, isLoading: pagesLoading } = useWikiPages(selectedSpaceId, 0, 20);

  const spaces = spacesData?.content || [];
  const pages = pagesData?.content || [];

  const visibilityIcon: Record<string, typeof Globe> = {
    PUBLIC: Globe,
    ORGANIZATION: Users,
    TEAM: Users,
    PRIVATE: Lock,
    RESTRICTED: Lock,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              Wiki Pages
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Create and manage knowledge base documentation
            </p>
          </div>
          <Button
            onClick={() => router.push('/fluence/wiki/new')}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" />
            New Page
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Spaces */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Spaces
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {spacesLoading ? (
                  <div className="h-40 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
                  </div>
                ) : spaces.length === 0 ? (
                  <div className="py-8 text-center text-[var(--text-muted)]">
                    <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No spaces yet</p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedSpaceId(undefined)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedSpaceId === undefined
                          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                          : 'hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <p className="font-medium text-sm">All Spaces</p>
                    </button>
                    {spaces.map((space) => (
                      <button
                        key={space.id}
                        onClick={() => setSelectedSpaceId(space.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedSpaceId === space.id
                            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                            : 'hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        <p className="font-medium text-sm truncate">{space.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {space.pageCount || 0} pages
                        </p>
                      </button>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content: Pages */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Pages Grid */}
            {pagesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-32" />
                  </Card>
                ))}
              </div>
            ) : pages.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] dark:text-[var(--text-secondary)]" />
                  <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-1">
                    No pages yet
                  </h3>
                  <p className="text-[var(--text-muted)] mb-4">
                    Start by creating your first wiki page
                  </p>
                  <Button
                    onClick={() => router.push('/fluence/wiki/new')}
                    className="gap-2 bg-violet-600 hover:bg-violet-700"
                  >
                    <Plus className="w-4 h-4" />
                    Create Page
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pages.map((page, index) => {
                  const VisibilityIcon =
                    visibilityIcon[page.visibility] || Globe;
                  return (
                    <motion.div
                      key={page.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() =>
                          router.push(`/fluence/wiki/${page.id}`)
                        }
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base line-clamp-2">
                              {page.title}
                            </CardTitle>
                            <VisibilityIcon className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                            <Clock className="w-4 h-4" />
                            {new Date(page.updatedAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                            <Eye className="w-4 h-4" />
                            {page.viewCount || 0} views
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
