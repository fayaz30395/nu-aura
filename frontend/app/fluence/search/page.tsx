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
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            Search NU-Fluence
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Find wiki pages, blog posts, and templates
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            placeholder="Search wiki pages, blog posts, templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-rose-500 text-lg"
          />
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType(undefined)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === undefined
                ? 'bg-rose-600 text-white'
                : 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedType('WIKI')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'WIKI'
                ? 'bg-violet-600 text-white'
                : 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600'
            }`}
          >
            Wiki Pages
          </button>
          <button
            onClick={() => setSelectedType('BLOG')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'BLOG'
                ? 'bg-amber-600 text-white'
                : 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600'
            }`}
          >
            Blog Posts
          </button>
          <button
            onClick={() => setSelectedType('TEMPLATE')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'TEMPLATE'
                ? 'bg-indigo-600 text-white'
                : 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600'
            }`}
          >
            Templates
          </button>
        </div>

        {/* Results */}
        {isLoading && searchQuery.length > 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-surface-400 animate-spin" />
            <span className="ml-2 text-surface-600 dark:text-surface-400">
              Searching...
            </span>
          </div>
        ) : searchQuery.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <Zap className="w-12 h-12 mx-auto mb-3 text-surface-300 dark:text-surface-700" />
              <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-1">
                Start searching
              </h3>
              <p className="text-surface-500 dark:text-surface-400">
                Type a query to search across all NU-Fluence content
              </p>
            </CardContent>
          </Card>
        ) : results.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-surface-300 dark:text-surface-700" />
              <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-1">
                No results found
              </h3>
              <p className="text-surface-500 dark:text-surface-400">
                Try adjusting your search query
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result, index) => {
              const Icon = iconMap[result.type] || FileText;
              const colorClass = typeColorMap[result.type] || 'bg-surface-100';
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
                      }
                    }}
                  >
                    <CardContent className="py-4 flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-surface-900 dark:text-surface-100 line-clamp-1">
                            {result.title}
                          </h3>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap flex-shrink-0 ${colorClass}`}>
                            {typeLabel}
                          </span>
                        </div>
                        {result.excerpt && (
                          <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2 mb-2">
                            {result.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-surface-500 dark:text-surface-500">
                          {result.author && (
                            <span>By {result.author}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(result.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-surface-400 flex-shrink-0" />
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
