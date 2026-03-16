'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  BookOpen,
  Pen,
  FileText,
  ArrowRight,
  Clock,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useFluenceSearch } from '@/lib/hooks/queries/useFluence';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('q') || ''
  );
  const [selectedType, setSelectedType] = useState<'WIKI' | 'BLOG' | 'TEMPLATE' | undefined>();

  const { data: searchResults, isLoading } = useFluenceSearch(
    searchQuery,
    selectedType,
    0,
    50,
    searchQuery.length > 0
  );

  const results = searchResults?.results || [];

  const iconMap: Record<string, typeof BookOpen> = {
    wiki: BookOpen,
    blog: Pen,
    template: FileText,
  };

  const typeColorMap: Record<string, string> = {
    wiki: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    blog: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    template: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  };

  const typeDisplayMap: Record<string, string> = {
    wiki: 'Wiki Page',
    blog: 'Blog Post',
    template: 'Template',
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            Search NU-Fluence
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Find wiki pages, blog posts, and templates
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search wiki pages, blog posts, templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-rose-500 text-lg"
          />
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType(undefined)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === undefined
                ? 'bg-rose-600 text-white'
                : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedType('WIKI')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'WIKI'
                ? 'bg-violet-600 text-white'
                : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
            }`}
          >
            Wiki Pages
          </button>
          <button
            onClick={() => setSelectedType('BLOG')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'BLOG'
                ? 'bg-amber-600 text-white'
                : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
            }`}
          >
            Blog Posts
          </button>
          <button
            onClick={() => setSelectedType('TEMPLATE')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'TEMPLATE'
                ? 'bg-indigo-600 text-white'
                : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
            }`}
          >
            Templates
          </button>
        </div>

        {/* Results */}
        {isLoading && searchQuery.length > 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
            <span className="ml-2 text-[var(--text-secondary)]">
              Searching...
            </span>
          </div>
        ) : searchQuery.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <Zap className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] dark:text-[var(--text-secondary)]" />
              <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-1">
                Start searching
              </h3>
              <p className="text-[var(--text-muted)]">
                Type a query to search across all NU-Fluence content
              </p>
            </CardContent>
          </Card>
        ) : results.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] dark:text-[var(--text-secondary)]" />
              <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-1">
                No results found
              </h3>
              <p className="text-[var(--text-muted)]">
                Try adjusting your search query
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result, index) => {
              const Icon = iconMap[result.type] || FileText;
              const colorClass = typeColorMap[result.type] || 'bg-[var(--bg-secondary)]';
              const typeLabel = typeDisplayMap[result.type] || result.type;

              return (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      if (result.url) {
                        router.push(result.url);
                      } else {
                        // Construct URL from type and ID when url is not provided
                        const typeRoutes: Record<string, string> = {
                          wiki: '/fluence/wiki/',
                          blog: '/fluence/blogs/',
                          template: '/fluence/templates/',
                        };
                        const basePath = typeRoutes[result.type];
                        if (basePath) {
                          router.push(`${basePath}${result.id}`);
                        }
                      }
                    }}
                  >
                    <CardContent className="py-4 flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1">
                            {result.title}
                          </h3>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap flex-shrink-0 ${colorClass}`}>
                            {typeLabel}
                          </span>
                        </div>
                        {result.excerpt && (
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-2">
                            {result.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          {result.author && (
                            <span>By {result.author}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(result.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
