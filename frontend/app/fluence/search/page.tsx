'use client';

import { useState, useMemo } from 'react';
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
import { Card, CardContent } from '@/components/ui/Card';
import {
  layout,
  typography,
  card as dsCard,
  motion as dsMotion,
  iconSize,
  input as dsInput,
} from '@/lib/design-system';
import { useFluenceSearch } from '@/lib/hooks/queries/useFluence';

type ContentType = 'WIKI' | 'BLOG' | 'TEMPLATE' | undefined;

interface SearchResult {
  id: string;
  type: string;
  title: string;
  excerpt?: string;
  author?: string;
  updatedAt: string;
  url?: string;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('q') || ''
  );
  const [selectedType, setSelectedType] = useState<ContentType>();

  const { data: searchResults, isLoading } = useFluenceSearch(
    searchQuery,
    selectedType,
    0,
    50,
    searchQuery.length > 0
  );

  const results: SearchResult[] = useMemo(
    () => searchResults?.results || [],
    [searchResults?.results]
  );

  const iconMap: Record<string, typeof BookOpen> = {
    wiki: BookOpen,
    blog: Pen,
    template: FileText,
  };

  const typeColorMap: Record<string, string> = {
    wiki: 'bg-[var(--sky-100)] dark:bg-[var(--sky-950)]/30 text-[var(--sky-800)] dark:text-[var(--sky-300)]',
    blog: 'bg-[var(--sky-100)] dark:bg-[var(--sky-950)]/30 text-[var(--sky-800)] dark:text-[var(--sky-300)]',
    template: 'bg-[var(--sky-100)] dark:bg-[var(--sky-950)]/30 text-[var(--sky-800)] dark:text-[var(--sky-300)]',
  };

  const typeDisplayMap: Record<string, string> = {
    wiki: 'Wiki Page',
    blog: 'Blog Post',
    template: 'Template',
  };

  const handleTypeChange = (type: ContentType) => {
    setSelectedType(type);
  };

  const resultCount = results.length;

  return (
    <AppLayout>
      <motion.div
        className={layout.sectionGap}
        {...dsMotion.pageEnter}
      >
        {/* Header */}
        <div>
          <h1 className={`${typography.pageTitle} skeuo-emboss flex items-center gap-4`}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--sky-500)] to-[var(--sky-800)] flex items-center justify-center flex-shrink-0">
              <Search className={`${iconSize.pageHeader} text-white`} />
            </div>
            Search NU-Fluence
          </h1>
          <p className={`${typography.bodySecondary} mt-2`}>
            Find wiki pages, blog posts, and templates
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${iconSize.cardInline} text-[var(--text-muted)]`} />
          <input
            type="text"
            placeholder="Search wiki pages, blog posts, templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${dsInput.base} w-full pl-12 pr-4 py-3 text-base`}
          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { type: undefined as ContentType, label: 'All' },
            { type: 'WIKI' as ContentType, label: 'Wiki Pages' },
            { type: 'BLOG' as ContentType, label: 'Blog Posts' },
            { type: 'TEMPLATE' as ContentType, label: 'Templates' },
          ].map(({ type, label }) => (
            <motion.button
              key={label}
              onClick={() => handleTypeChange(type)}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${
                selectedType === type
                  ? 'bg-[var(--sky-700)] text-white shadow-md'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* Results Section */}
        {isLoading && searchQuery.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <RefreshCw className={`${iconSize.statCard} text-[var(--text-muted)] animate-spin`} />
            <div className="text-center">
              <p className={typography.bodySecondary}>Searching...</p>
            </div>
          </div>
        ) : searchQuery.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Card className={`${dsCard.base} border-dashed border-2`}>
              <CardContent className="py-16 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <Zap className={`${iconSize.statCard} mx-auto mb-4 text-[var(--text-muted)]`} />
                  <h3 className={`${typography.sectionTitle} mb-2`}>
                    Start searching
                  </h3>
                  <p className={typography.bodySecondary}>
                    Type a query to search across all NU-Fluence content
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : resultCount === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Card className={`${dsCard.base} border-dashed border-2`}>
              <CardContent className="py-16 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <Search className={`${iconSize.statCard} mx-auto mb-4 text-[var(--text-muted)]`} />
                  <h3 className={`${typography.sectionTitle} mb-2`}>
                    No results found
                  </h3>
                  <p className={typography.bodySecondary}>
                    Try adjusting your search query
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-4"
            {...dsMotion.staggerContainer}
          >
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              <p className={`${typography.caption} font-medium`}>
                Found{' '}
                <motion.span
                  key={resultCount}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="font-semibold text-[var(--text-primary)]"
                >
                  {resultCount}
                </motion.span>{' '}
                result{resultCount !== 1 ? 's' : ''}
              </p>
            </motion.div>

            {results.map((result, _index) => {
              const Icon = iconMap[result.type] || FileText;
              const colorClass = typeColorMap[result.type] || typeColorMap.wiki;
              const typeLabel = typeDisplayMap[result.type] || result.type;

              return (
                <motion.div
                  key={result.id}
                  variants={dsMotion.staggerItem.variants}
                  {...dsMotion.cardHover}
                >
                  <Card
                    className={`${dsCard.interactive} cursor-pointer group`}
                    onClick={() => {
                      if (result.url) {
                        router.push(result.url);
                      } else {
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
                    <CardContent className="py-4 px-4 flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={iconSize.cardInline} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className={`${typography.cardTitle} line-clamp-1 flex-1`}>
                            {result.title}
                          </h3>
                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap flex-shrink-0 ${colorClass}`}>
                            {typeLabel}
                          </span>
                        </div>

                        {result.excerpt && (
                          <p className={`${typography.bodySecondary} line-clamp-2 mb-3`}>
                            {result.excerpt}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          {result.author && (
                            <span>By {result.author}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className={iconSize.meta} />
                            {new Date(result.updatedAt).toLocaleDateString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </span>
                        </div>
                      </div>

                      <ArrowRight className={`${iconSize.cardInline} text-[var(--text-muted)] flex-shrink-0 group-hover:text-[var(--sky-700)] transition-colors duration-150`} />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  );
}
