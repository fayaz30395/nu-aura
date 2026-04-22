'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {AnimatePresence, motion} from 'framer-motion';
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileText,
  Globe,
  Lock,
  Pen,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {card as dsCard, iconSize, input as dsInput, layout, motion as dsMotion, typography,} from '@/lib/design-system';
import {useFluenceSearch} from '@/lib/hooks/queries/useFluence';
import type {SavedSearch} from '@/lib/types/platform/fluence';
import {sanitizeHtml} from '@/lib/utils/sanitize';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContentType = 'WIKI' | 'BLOG' | 'TEMPLATE' | undefined;
type VisibilityFilter = 'PUBLIC' | 'ORGANIZATION' | 'DEPARTMENT' | 'PRIVATE' | 'RESTRICTED' | undefined;

interface SearchResult {
  id: string;
  type: string;
  title: string;
  excerpt?: string;
  highlightedContent?: string;
  author?: string;
  updatedAt: string;
  url?: string;
}

// ─── Saved search helpers (localStorage) ──────────────────────────────────────

const SAVED_SEARCHES_KEY = 'nu-fluence-saved-searches';
const MAX_SAVED = 10;

function loadSavedSearches(): SavedSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

function persistSavedSearches(searches: SavedSearch[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
}

// ─── Visibility option config ─────────────────────────────────────────────────

const VISIBILITY_OPTIONS: {
  value: VisibilityFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {value: undefined, label: 'Any visibility', icon: Globe},
  {value: 'PUBLIC', label: 'Public', icon: Globe},
  {value: 'ORGANIZATION', label: 'Organization', icon: Users},
  {value: 'DEPARTMENT', label: 'Department', icon: Users},
  {value: 'PRIVATE', label: 'Private', icon: Lock},
  {value: 'RESTRICTED', label: 'Restricted', icon: Eye},
];

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {hasAnyPermission, isReady} = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.KNOWLEDGE_VIEW,
    Permissions.WIKI_VIEW,
    Permissions.BLOG_VIEW,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  // ─── Search state ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [selectedType, setSelectedType] = useState<ContentType>();
  const [selectedVisibility, setSelectedVisibility] = useState<VisibilityFilter>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hydrate saved searches from localStorage on mount
  useEffect(() => {
    setSavedSearches(loadSavedSearches());
  }, []);

  // Debounce the search query — fire after 350ms pause
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // ─── React Query ────────────────────────────────────────────────────────────
  const {data: searchResults, isLoading, isFetching} = useFluenceSearch(
    debouncedQuery,
    selectedType,
    0,
    50,
    debouncedQuery.length > 1
  );

  const results: SearchResult[] = useMemo(
    () => (searchResults?.results || []) as SearchResult[],
    [searchResults]
  );

  // ─── Saved search actions ───────────────────────────────────────────────────

  const isCurrentSearchSaved = savedSearches.some(
    (s) => s.query === debouncedQuery && s.contentType === selectedType && s.visibility === selectedVisibility
  );

  const saveCurrentSearch = useCallback(() => {
    if (!debouncedQuery.trim()) return;
    const newEntry: SavedSearch = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      query: debouncedQuery,
      contentType: selectedType,
      visibility: selectedVisibility,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...savedSearches.filter((s) => s.id !== newEntry.id)].slice(0, MAX_SAVED);
    setSavedSearches(updated);
    persistSavedSearches(updated);
  }, [debouncedQuery, selectedType, selectedVisibility, savedSearches]);

  const removeSavedSearch = useCallback((id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    persistSavedSearches(updated);
  }, [savedSearches]);

  const applySavedSearch = useCallback((saved: SavedSearch) => {
    setSearchQuery(saved.query);
    setDebouncedQuery(saved.query);
    setSelectedType(saved.contentType);
    setSelectedVisibility(saved.visibility as VisibilityFilter);
    setShowSaved(false);
    inputRef.current?.focus();
  }, []);

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedType(undefined);
    setSelectedVisibility(undefined);
    inputRef.current?.focus();
  }, []);

  if (!isReady) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <div
              className='w-12 h-12 border-4 border-[var(--accent-primary)] border-t-accent-500 rounded-full animate-spin'/>
            <p className="text-[var(--text-muted)] font-medium">Loading search...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess) return null;

  const iconMap: Record<string, typeof BookOpen> = {
    wiki: BookOpen,
    blog: Pen,
    template: FileText,
  };

  const typeColorMap: Record<string, string> = {
    wiki: 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-800)] dark:text-[var(--accent-300)]',
    blog: 'bg-[var(--success-100)] dark:bg-[var(--success-900)]/30 text-[var(--success-800)] dark:text-[var(--success-300)]',
    template: 'bg-[var(--warning-100)] dark:bg-[var(--warning-900)]/30 text-[var(--warning-800)] dark:text-[var(--warning-300)]',
  };

  const typeDisplayMap: Record<string, string> = {
    wiki: 'Wiki Page',
    blog: 'Blog Post',
    template: 'Template',
  };

  const hasActiveFilters = selectedType !== undefined || selectedVisibility !== undefined;
  const isSearching = isLoading || isFetching;
  const resultCount = results.length;

  const visibilityOption = VISIBILITY_OPTIONS.find((v) => v.value === selectedVisibility);

  return (
    <AppLayout>
      <motion.div className={layout.sectionGap} {...dsMotion.pageEnter}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div>
          <h1 className={`${typography.pageTitle} skeuo-emboss flex items-center gap-4`}>
            <div
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-800)] flex items-center justify-center flex-shrink-0">
              <Search className={`${iconSize.pageHeader} text-inverse`}/>
            </div>
            Search NU-Fluence
          </h1>
          <p className={`${typography.bodySecondary} mt-2`}>
            Find wiki pages, blog posts, and templates with full-text search
          </p>
        </div>

        {/* ── Search input ────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="relative">
            <Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 ${iconSize.cardInline} text-[var(--text-muted)]`}/>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search wiki pages, blog posts, templates..."
              aria-label="Search NU-Fluence"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => savedSearches.length > 0 && !searchQuery && setShowSaved(true)}
              onBlur={() => setTimeout(() => setShowSaved(false), 200)}
              className={`${dsInput.base} w-full pl-12 pr-12 py-4 text-base`}
            />
            {searchQuery && (
              <button
                onClick={clearAll}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                <X className={iconSize.cardInline}/>
              </button>
            )}
          </div>

          {/* Saved searches dropdown */}
          <AnimatePresence>
            {showSaved && savedSearches.length > 0 && !searchQuery && (
              <motion.div
                initial={{opacity: 0, y: -8}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -8}}
                transition={{duration: 0.15}}
                className={`${dsCard.base} p-2 shadow-[var(--shadow-dropdown)]`}
              >
                <p className={`${typography.microLabel} px-2 pb-2`}>Recent searches</p>
                {savedSearches.slice(0, 6).map((saved) => (
                  <button
                    key={saved.id}
                    onClick={() => applySavedSearch(saved)}
                    className="w-full row-between gap-2 px-2 py-2 rounded-md hover:bg-[var(--bg-secondary)] text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className={`${iconSize.meta} text-[var(--text-muted)] flex-shrink-0`}/>
                      <span className={`${typography.body} truncate`}>{saved.query}</span>
                      {saved.contentType && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                          {saved.contentType}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedSearch(saved.id);
                      }}
                      aria-label="Remove saved search"
                      className="opacity-0 group-hover:opacity-100 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity"
                    >
                      <X className={iconSize.meta}/>
                    </button>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          {/* Type pills + filter toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Content type pills */}
            {(
              [
                {type: undefined as ContentType, label: 'All'},
                {type: 'WIKI' as ContentType, label: 'Wiki Pages'},
                {type: 'BLOG' as ContentType, label: 'Blog Posts'},
                {type: 'TEMPLATE' as ContentType, label: 'Templates'},
              ] as const
            ).map(({type, label}) => (
              <motion.button
                key={label}
                onClick={() => setSelectedType(type as ContentType)}
                whileTap={{scale: 0.95}}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)] ${
                  selectedType === type
                    ? 'bg-[var(--accent-700)] text-white shadow-[var(--shadow-elevated)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                {label}
              </motion.button>
            ))}

            {/* Spacer */}
            <div className="flex-1"/>

            {/* Advanced filters toggle */}
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)] ${
                filtersOpen || hasActiveFilters
                  ? 'bg-[var(--accent-100)] text-[var(--accent-700)] dark:bg-[var(--accent-900)]/30 dark:text-[var(--accent-300)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <SlidersHorizontal className={iconSize.button}/>
              Filters
              {hasActiveFilters && (
                <span
                  className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-700)] text-inverse text-xs font-bold'>
                  {[selectedType, selectedVisibility].filter(Boolean).length}
                </span>
              )}
              {filtersOpen ? <ChevronUp className={iconSize.button}/> : <ChevronDown className={iconSize.button}/>}
            </button>

            {/* Save search */}
            {debouncedQuery.length > 1 && (
              <button
                onClick={saveCurrentSearch}
                aria-label={isCurrentSearchSaved ? 'Search already saved' : 'Save this search'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)] ${
                  isCurrentSearchSaved
                    ? 'bg-[var(--success-100)] text-[var(--success-700)] dark:bg-[var(--success-900)]/30 dark:text-[var(--success-300)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                {isCurrentSearchSaved ? (
                  <BookmarkCheck className={iconSize.button}/>
                ) : (
                  <Bookmark className={iconSize.button}/>
                )}
                {isCurrentSearchSaved ? 'Saved' : 'Save'}
              </button>
            )}
          </div>

          {/* Advanced filters panel */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{opacity: 0, height: 0}}
                animate={{opacity: 1, height: 'auto'}}
                exit={{opacity: 0, height: 0}}
                transition={{duration: 0.2}}
                className="overflow-hidden"
              >
                <div className={`${dsCard.base} p-4 space-y-4`}>
                  {/* Visibility filter */}
                  <div>
                    <label className={dsInput.label}>Visibility</label>
                    <div className="flex flex-wrap gap-2">
                      {VISIBILITY_OPTIONS.map(({value, label, icon: Icon}) => (
                        <button
                          key={label}
                          onClick={() => setSelectedVisibility(value)}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                            selectedVisibility === value
                              ? 'bg-[var(--accent-700)] text-white'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                          }`}
                        >
                          <Icon className={iconSize.meta}/>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active filter summary */}
                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-main)]">
                      <p className={typography.caption}>Active filters:</p>
                      {selectedType && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--accent-100)] text-[var(--accent-700)] text-xs">
                          {typeDisplayMap[selectedType.toLowerCase()] || selectedType}
                          <button onClick={() => setSelectedType(undefined)}
                                  className="cursor-pointer hover:opacity-70">
                            <X className="h-3 w-3"/>
                          </button>
                        </span>
                      )}
                      {selectedVisibility && visibilityOption && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--accent-100)] text-[var(--accent-700)] text-xs">
                          {visibilityOption.label}
                          <button onClick={() => setSelectedVisibility(undefined)}
                                  className="cursor-pointer hover:opacity-70">
                            <X className="h-3 w-3"/>
                          </button>
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setSelectedType(undefined);
                          setSelectedVisibility(undefined);
                        }}
                        className="ml-auto text-caption hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Saved searches list ──────────────────────────────────────────────── */}
        {savedSearches.length > 0 && !searchQuery && (
          <div>
            <button
              onClick={() => setShowSaved((v) => !v)}
              className="flex items-center gap-2 text-body-secondary hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Clock className={iconSize.button}/>
              <span>{savedSearches.length} saved {savedSearches.length === 1 ? 'search' : 'searches'}</span>
              {showSaved ? <ChevronUp className={iconSize.button}/> : <ChevronDown className={iconSize.button}/>}
            </button>
            <AnimatePresence>
              {showSaved && (
                <motion.div
                  initial={{opacity: 0, height: 0}}
                  animate={{opacity: 1, height: 'auto'}}
                  exit={{opacity: 0, height: 0}}
                  transition={{duration: 0.2}}
                  className="overflow-hidden mt-2"
                >
                  <div className="flex flex-wrap gap-2">
                    {savedSearches.map((saved) => (
                      <div
                        key={saved.id}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-[var(--bg-secondary)] text-sm cursor-pointer group hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        <button
                          onClick={() => applySavedSearch(saved)}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <BookmarkCheck className={`${iconSize.meta} text-[var(--accent-600)]`}/>
                          <span className="text-[var(--text-secondary)]">{saved.query}</span>
                          {saved.contentType && (
                            <span className="text-caption">· {saved.contentType}</span>
                          )}
                        </button>
                        <button
                          onClick={() => removeSavedSearch(saved.id)}
                          aria-label="Remove saved search"
                          className="opacity-0 group-hover:opacity-100 ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-opacity"
                        >
                          <X className="h-3 w-3"/>
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Results section ──────────────────────────────────────────────────── */}
        {isSearching && debouncedQuery.length > 1 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <RefreshCw className={`${iconSize.statCard} text-[var(--text-muted)] animate-spin`}/>
            <p className={typography.bodySecondary}>Searching...</p>
          </div>
        ) : debouncedQuery.length <= 1 ? (
          <motion.div
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.3}}
          >
            <Card className={`${dsCard.base} border-dashed border-2`}>
              <CardContent className="py-16 text-center">
                <motion.div
                  initial={{opacity: 0, y: 8}}
                  animate={{opacity: 1, y: 0}}
                  transition={{delay: 0.1, duration: 0.3}}
                >
                  <Zap className={`${iconSize.statCard} mx-auto mb-4 text-[var(--text-muted)]`}/>
                  <h3 className={`${typography.sectionTitle} mb-2`}>Start searching</h3>
                  <p className={typography.bodySecondary}>
                    Type at least 2 characters to search wiki pages, blog posts, and templates
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : resultCount === 0 ? (
          <motion.div
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.3}}
          >
            <Card className={`${dsCard.base} border-dashed border-2`}>
              <CardContent className="py-16 text-center">
                <Search className={`${iconSize.statCard} mx-auto mb-4 text-[var(--text-muted)]`}/>
                <h3 className={`${typography.sectionTitle} mb-2`}>No results found</h3>
                <p className={typography.bodySecondary}>
                  Try different keywords or remove filters
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSelectedType(undefined);
                      setSelectedVisibility(undefined);
                    }}
                    className="mt-4 text-sm text-[var(--accent-700)] hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div className="space-y-4" {...dsMotion.staggerContainer}>
            {/* Result count + search time */}
            <motion.div
              initial={{opacity: 0, x: -4}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.25}}
              className="row-between"
            >
              <p className={typography.caption}>
                Found{' '}
                <motion.span
                  key={resultCount}
                  initial={{opacity: 0}}
                  animate={{opacity: 1}}
                  className="font-semibold text-[var(--text-primary)]"
                >
                  {resultCount}
                </motion.span>
                {' '}
                result{resultCount !== 1 ? 's' : ''}
                {searchResults?.executionTimeMs && (
                  <span className="ml-2">· {searchResults.executionTimeMs}ms</span>
                )}
              </p>
            </motion.div>

            {results.map((result) => {
              const Icon = iconMap[result.type] || FileText;
              const colorClass = typeColorMap[result.type] || typeColorMap.wiki;
              const typeLabel = typeDisplayMap[result.type] || result.type;

              const handleNavigate = () => {
                if (result.url) {
                  router.push(result.url);
                  return;
                }
                const typeRoutes: Record<string, string> = {
                  wiki: '/fluence/wiki/',
                  blog: '/fluence/blogs/',
                  template: '/fluence/templates/',
                };
                const basePath = typeRoutes[result.type];
                if (basePath) router.push(`${basePath}${result.id}`);
              };

              return (
                <motion.div
                  key={result.id}
                  variants={dsMotion.staggerItem.variants}
                  {...dsMotion.cardHover}
                >
                  <Card
                    className={`${dsCard.interactive} cursor-pointer group`}
                    role="button"
                    tabIndex={0}
                    onClick={handleNavigate}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigate();
                      }
                    }}
                  >
                    <CardContent className="py-4 px-4 flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={iconSize.cardInline}/>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className={`${typography.cardTitle} line-clamp-1 flex-1`}>
                            {result.title}
                          </h3>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap flex-shrink-0 ${colorClass}`}>
                            {typeLabel}
                          </span>
                        </div>

                        {/* Highlighted content takes priority over excerpt */}
                        {(result.highlightedContent || result.excerpt) && (
                          <p
                            className={`${typography.bodySecondary} line-clamp-2 mb-2`}
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(result.highlightedContent || result.excerpt || ''),
                            }}
                          />
                        )}

                        <div className="flex items-center gap-4 text-caption">
                          {result.author && <span>By {result.author}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className={iconSize.meta}/>
                            {new Date(result.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      <ArrowRight
                        className={`${iconSize.cardInline} text-[var(--text-muted)] flex-shrink-0 group-hover:text-[var(--accent-700)] transition-colors duration-150`}/>
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
