'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import {
  Search,
  Command,
  Users,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Settings,
  Building2,
  BarChart3,
  Target,
  MessageSquare,
  BookOpen,
  Briefcase,
  Shield,
  MapPin,
  FolderKanban,
  HelpCircle,
  X,
  ArrowRight,
  User,
  CalendarDays,
  ClipboardCheck,
  UserCheck,
  Loader2,
  Newspaper,
  HardDrive,
  FileStack,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  searchService,
  SearchResult,
  UnifiedSearchResponse,
  FluenceUnifiedSearchResponse,
} from '@/lib/services/search.service';
import { getAppForRoute } from '@/lib/config/apps';

interface NavigationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  category: string;
  keywords: string[];
}

// ─── Default navigation items (HRMS / general) ─────────────────────────────

const defaultNavigationItems: NavigationItem[] = [
  // Dashboard
  { id: 'dashboard', title: 'Dashboard', description: 'Overview and analytics', href: '/dashboard', icon: BarChart3, category: 'Pages', keywords: ['home', 'overview', 'analytics', 'stats'] },

  // Employee Management
  { id: 'employees', title: 'Employees', description: 'View and manage employees', href: '/employees', icon: Users, category: 'Pages', keywords: ['staff', 'team', 'people', 'directory'] },
  { id: 'employee-directory', title: 'Employee Directory', description: 'Browse employee directory', href: '/employees/directory', icon: Users, category: 'Pages', keywords: ['directory', 'list', 'staff'] },
  { id: 'departments', title: 'Departments', description: 'Manage departments', href: '/departments', icon: Building2, category: 'Pages', keywords: ['teams', 'groups', 'units'] },
  { id: 'org-chart', title: 'Organization Chart', description: 'View org structure', href: '/org-chart', icon: Building2, category: 'Pages', keywords: ['hierarchy', 'structure', 'reporting'] },

  // Self Service
  { id: 'my-profile', title: 'My Profile', description: 'View your profile', href: '/me/profile', icon: User, category: 'Self Service', keywords: ['profile', 'personal', 'info', 'account'] },
  { id: 'my-attendance', title: 'My Attendance', description: 'View your attendance', href: '/me/attendance', icon: Clock, category: 'Self Service', keywords: ['attendance', 'checkin', 'checkout', 'time'] },
  { id: 'my-leaves', title: 'My Leaves', description: 'View your leave balance', href: '/me/leaves', icon: Calendar, category: 'Self Service', keywords: ['leave', 'vacation', 'pto', 'time off'] },
  { id: 'my-payslips', title: 'My Payslips', description: 'View your payslips', href: '/me/payslips', icon: FileText, category: 'Self Service', keywords: ['payslip', 'salary', 'paycheck', 'earnings'] },

  // Attendance
  { id: 'attendance', title: 'Attendance Management', description: 'Manage attendance', href: '/attendance', icon: Clock, category: 'Pages', keywords: ['attendance', 'time', 'tracking'] },
  { id: 'team-attendance', title: 'Team Attendance', description: 'View team attendance', href: '/attendance/team', icon: UserCheck, category: 'Pages', keywords: ['team', 'attendance', 'members'] },
  { id: 'regularization', title: 'Attendance Regularization', description: 'Regularize attendance', href: '/attendance/regularization', icon: ClipboardCheck, category: 'Pages', keywords: ['regularize', 'correction', 'adjust'] },

  // Leave
  { id: 'leave', title: 'Leave Management', description: 'Manage leaves', href: '/leave', icon: Calendar, category: 'Pages', keywords: ['leave', 'vacation', 'time off'] },
  { id: 'apply-leave', title: 'Apply for Leave', description: 'Submit leave request', href: '/leave/apply', icon: Calendar, category: 'Pages', keywords: ['apply', 'request', 'leave', 'vacation'] },
  { id: 'leave-approvals', title: 'Leave Approvals', description: 'Approve pending leaves', href: '/leave/approvals', icon: ClipboardCheck, category: 'Pages', keywords: ['approve', 'pending', 'requests'] },
  { id: 'leave-calendar', title: 'Leave Calendar', description: 'View leave calendar', href: '/leave/calendar', icon: CalendarDays, category: 'Pages', keywords: ['calendar', 'schedule', 'planner'] },

  // Payroll
  { id: 'payroll', title: 'Payroll Management', description: 'Manage payroll', href: '/payroll', icon: CreditCard, category: 'Pages', keywords: ['payroll', 'salary', 'compensation'] },

  // Performance
  { id: 'performance-goals', title: 'Goals', description: 'Set and track goals', href: '/performance/goals', icon: Target, category: 'Pages', keywords: ['goals', 'objectives', 'targets', 'kpi'] },
  { id: 'performance-reviews', title: 'Performance Reviews', description: 'View performance reviews', href: '/performance/reviews', icon: ClipboardCheck, category: 'Pages', keywords: ['review', 'appraisal', 'evaluation'] },
  { id: 'performance-feedback', title: 'Feedback', description: 'Give and receive feedback', href: '/performance/feedback', icon: MessageSquare, category: 'Pages', keywords: ['feedback', 'comments', 'notes'] },
  { id: 'performance-cycles', title: 'Review Cycles', description: 'Manage review cycles', href: '/performance/cycles', icon: Calendar, category: 'Pages', keywords: ['cycles', 'periods', 'timeline'] },
  { id: 'okr', title: 'OKRs', description: 'Objectives and Key Results', href: '/okr', icon: Target, category: 'Pages', keywords: ['okr', 'objectives', 'key results'] },
  { id: 'feedback360', title: '360° Feedback', description: 'Multi-rater feedback', href: '/feedback360', icon: MessageSquare, category: 'Pages', keywords: ['360', 'feedback', 'peer', 'review'] },

  // Other Modules
  { id: 'expenses', title: 'Expenses', description: 'Manage expenses', href: '/expenses', icon: CreditCard, category: 'Pages', keywords: ['expenses', 'reimbursement', 'claims'] },
  { id: 'projects', title: 'Projects', description: 'View projects', href: '/projects', icon: FolderKanban, category: 'Pages', keywords: ['projects', 'tasks', 'work'] },
  { id: 'learning', title: 'Learning', description: 'Training and courses', href: '/learning', icon: BookOpen, category: 'Pages', keywords: ['learning', 'training', 'courses', 'education'] },
  { id: 'reports', title: 'Reports', description: 'View reports and analytics', href: '/reports', icon: BarChart3, category: 'Pages', keywords: ['reports', 'analytics', 'data', 'insights'] },

  // Admin
  { id: 'admin-roles', title: 'Roles & Permissions', description: 'Manage user roles', href: '/admin/roles', icon: Shield, category: 'Admin', keywords: ['roles', 'permissions', 'access', 'security'] },
  { id: 'admin-holidays', title: 'Holidays', description: 'Manage holiday calendar', href: '/admin/holidays', icon: Calendar, category: 'Admin', keywords: ['holidays', 'calendar', 'days off'] },
  { id: 'admin-leave-types', title: 'Leave Types', description: 'Configure leave types', href: '/admin/leave-types', icon: Calendar, category: 'Admin', keywords: ['leave types', 'policies', 'categories'] },
  { id: 'admin-shifts', title: 'Shifts', description: 'Manage work shifts', href: '/admin/shifts', icon: Clock, category: 'Admin', keywords: ['shifts', 'schedule', 'timing'] },
  { id: 'admin-locations', title: 'Office Locations', description: 'Manage office locations', href: '/admin/office-locations', icon: MapPin, category: 'Admin', keywords: ['locations', 'offices', 'branches'] },
  { id: 'admin-custom-fields', title: 'Custom Fields', description: 'Configure custom fields', href: '/admin/custom-fields', icon: Settings, category: 'Admin', keywords: ['custom', 'fields', 'attributes'] },
  { id: 'settings', title: 'Settings', description: 'System settings', href: '/settings', icon: Settings, category: 'Admin', keywords: ['settings', 'configuration', 'preferences'] },
];

// ─── Fluence navigation items ───────────────────────────────────────────────

const fluenceNavigationItems: NavigationItem[] = [
  { id: 'fluence-wiki', title: 'Wiki', description: 'Browse wiki pages and spaces', href: '/fluence/wiki', icon: BookOpen, category: 'NU-Fluence', keywords: ['wiki', 'pages', 'spaces', 'knowledge', 'docs'] },
  { id: 'fluence-blogs', title: 'Articles', description: 'Read and write blog posts', href: '/fluence/blogs', icon: Newspaper, category: 'NU-Fluence', keywords: ['articles', 'blogs', 'posts', 'writing'] },
  { id: 'fluence-my-content', title: 'My Content', description: 'View your created content', href: '/fluence/my-content', icon: User, category: 'NU-Fluence', keywords: ['my content', 'authored', 'drafts', 'published'] },
  { id: 'fluence-templates', title: 'Templates', description: 'Browse document templates', href: '/fluence/templates', icon: FileStack, category: 'NU-Fluence', keywords: ['templates', 'blueprints', 'formats'] },
  { id: 'fluence-drive', title: 'Drive', description: 'File storage and management', href: '/fluence/drive', icon: HardDrive, category: 'NU-Fluence', keywords: ['drive', 'files', 'storage', 'uploads'] },
  { id: 'fluence-search', title: 'Advanced Search', description: 'Full search with filters', href: '/fluence/search', icon: Search, category: 'NU-Fluence', keywords: ['search', 'find', 'filter', 'advanced'] },
];

// Icon mapping for search result types
const typeIcons: Record<string, React.ElementType> = {
  employee: User,
  project: Briefcase,
  department: Building2,
  wiki: BookOpen,
  blog: Newspaper,
  template: FileStack,
};

interface GlobalSearchProps {
  className?: string;
  onSelect?: () => void;
  autoFocus?: boolean;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ className, onSelect, autoFocus }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(autoFocus || false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [apiResults, setApiResults] = useState<UnifiedSearchResponse | null>(null);
  const [fluenceResults, setFluenceResults] = useState<FluenceUnifiedSearchResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect if we're in the Fluence app
  const isFluence = useMemo(() => getAppForRoute(pathname) === 'FLUENCE', [pathname]);

  // Pick the right navigation items based on active app
  const navigationItems = isFluence ? fluenceNavigationItems : defaultNavigationItems;
  const placeholderText = isFluence
    ? 'Search wiki, articles, templates...'
    : 'Search employees, projects...';

  // Filter navigation items based on query
  const filteredNavItems = query === ''
    ? navigationItems.slice(0, 6)
    : navigationItems.filter((item) => {
        const searchLower = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          item.keywords.some((kw) => kw.includes(searchLower))
        );
      }).slice(0, 5);

  // Debounced API search — switches backend based on active app
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          if (isFluence) {
            const results = await searchService.searchFluenceContent(query, 5);
            setFluenceResults(results);
            setApiResults(null);
          } else {
            const results = await searchService.unifiedSearch(query, 5);
            setApiResults(results);
            setFluenceResults(null);
          }
        } catch (error) {
          logger.error('Search error:', error);
          setApiResults(null);
          setFluenceResults(null);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setApiResults(null);
      setFluenceResults(null);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, isFluence]);

  // Build combined results for keyboard navigation (memoized to prevent useCallback deps churn)
  const allSelectableItems = useMemo<{ type: 'nav' | 'api'; item: NavigationItem | SearchResult; category: string }[]>(() => {
    const items: { type: 'nav' | 'api'; item: NavigationItem | SearchResult; category: string }[] = [];

    // Add navigation items first
    filteredNavItems.forEach((item) => {
      items.push({ type: 'nav', item, category: item.category });
    });

    // Add API results — Fluence or default
    if (isFluence && fluenceResults) {
      fluenceResults.wikiPages.forEach((item) => {
        items.push({ type: 'api', item, category: 'Wiki Pages' });
      });
      fluenceResults.blogPosts.forEach((item) => {
        items.push({ type: 'api', item, category: 'Blog Posts' });
      });
      fluenceResults.templates.forEach((item) => {
        items.push({ type: 'api', item, category: 'Templates' });
      });
    } else if (!isFluence && apiResults) {
      apiResults.employees.forEach((item) => {
        items.push({ type: 'api', item, category: 'People' });
      });
      apiResults.projects.forEach((item) => {
        items.push({ type: 'api', item, category: 'Projects' });
      });
      apiResults.departments.forEach((item) => {
        items.push({ type: 'api', item, category: 'Departments' });
      });
    }

    return items;
  }, [filteredNavItems, isFluence, fluenceResults, apiResults]);

  const handleSelectHref = useCallback((href: string) => {
    setIsOpen(false);
    setQuery('');
    setApiResults(null);
    setFluenceResults(null);
    router.push(href);
    onSelect?.();
  }, [router, onSelect]);

  // Auto-focus for mobile search
  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allSelectableItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allSelectableItems[selectedIndex]) {
      e.preventDefault();
      const selected = allSelectableItems[selectedIndex];
      const href = selected.type === 'nav'
        ? (selected.item as NavigationItem).href
        : (selected.item as SearchResult).href;
      handleSelectHref(href);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      setApiResults(null);
      setFluenceResults(null);
    }
  }, [allSelectableItems, selectedIndex, handleSelectHref]);

  // Keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Clear results when switching apps
  useEffect(() => {
    setQuery('');
    setApiResults(null);
    setFluenceResults(null);
  }, [isFluence]);

  const renderNavItem = (item: NavigationItem, globalIndex: number) => {
    const Icon = item.icon;
    return (
      <button
        key={`nav-${item.id}`}
        onClick={() => handleSelectHref(item.href)}
        onMouseEnter={() => setSelectedIndex(globalIndex)}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors',
          globalIndex === selectedIndex
            ? 'bg-accent-50 dark:bg-accent-950/30'
            : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
        )}
      >
        <div className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg',
          globalIndex === selectedIndex
            ? 'bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-400'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            globalIndex === selectedIndex
              ? 'text-accent-700 dark:text-accent-300'
              : 'text-surface-900 dark:text-surface-100'
          )}>
            {item.title}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
            {item.description}
          </p>
        </div>
        {globalIndex === selectedIndex && (
          <ArrowRight className="h-4 w-4 text-accent-500 dark:text-accent-400" />
        )}
      </button>
    );
  };

  const renderApiResult = (result: SearchResult, globalIndex: number) => {
    const Icon = typeIcons[result.type] || User;
    return (
      <button
        key={`api-${result.type}-${result.id}`}
        onClick={() => handleSelectHref(result.href)}
        onMouseEnter={() => setSelectedIndex(globalIndex)}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors',
          globalIndex === selectedIndex
            ? 'bg-accent-50 dark:bg-accent-950/30'
            : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
        )}
      >
        <div className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg',
          globalIndex === selectedIndex
            ? 'bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-400'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            globalIndex === selectedIndex
              ? 'text-accent-700 dark:text-accent-300'
              : 'text-surface-900 dark:text-surface-100'
          )}>
            {result.title}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
            {result.subtitle}
            {result.metadata?.email && ` • ${result.metadata.email}`}
            {result.metadata?.department && ` • ${result.metadata.department}`}
            {result.metadata?.author && ` • ${result.metadata.author}`}
          </p>
        </div>
        {globalIndex === selectedIndex && (
          <ArrowRight className="h-4 w-4 text-accent-500 dark:text-accent-400" />
        )}
      </button>
    );
  };

  // Group navigation items by category
  const groupedNavItems = filteredNavItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  // Build grouped API results for rendering
  const groupedApiResults = useMemo(() => {
    const groups: { label: string; items: SearchResult[] }[] = [];

    if (isFluence && fluenceResults) {
      if (fluenceResults.wikiPages.length > 0) groups.push({ label: 'Wiki Pages', items: fluenceResults.wikiPages });
      if (fluenceResults.blogPosts.length > 0) groups.push({ label: 'Blog Posts', items: fluenceResults.blogPosts });
      if (fluenceResults.templates.length > 0) groups.push({ label: 'Templates', items: fluenceResults.templates });
    } else if (!isFluence && apiResults) {
      if (apiResults.employees.length > 0) groups.push({ label: 'People', items: apiResults.employees });
      if (apiResults.projects.length > 0) groups.push({ label: 'Projects', items: apiResults.projects });
      if (apiResults.departments.length > 0) groups.push({ label: 'Departments', items: apiResults.departments });
    }

    return groups;
  }, [isFluence, fluenceResults, apiResults]);

  // Calculate global indices for navigation items
  let navItemGlobalIndex = 0;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Trigger */}
      <div
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          'relative flex items-center rounded-xl border transition-all duration-200 cursor-pointer',
          isOpen
            ? 'w-full sm:w-80 lg:w-96 border-[var(--border-focus)] bg-[var(--bg-elevated)] shadow-lg shadow-accent-500/10 dark:shadow-accent-500/5'
            : 'w-full sm:w-64 lg:w-72 border-[var(--border-main)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)]'
        )}
      >
        <Search className={cn(
          'absolute left-3 h-4 w-4 transition-colors',
          isOpen ? 'text-accent-500 dark:text-accent-400' : 'text-[var(--text-muted)]'
        )} />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholderText}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent pl-10 pr-20 py-2.5 text-sm outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)]"
        />
        <div className="absolute right-3 flex items-center gap-1 text-[var(--text-muted)]">
          {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-500" />}
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded border border-[var(--border-main)] text-[var(--text-secondary)]">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </kbd>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full sm:w-96 lg:w-[28rem] max-w-[calc(100vw-2rem)] max-h-[60vh] sm:max-h-[70vh] overflow-y-auto bg-[var(--bg-card)] rounded-xl border border-surface-200 dark:border-surface-700 shadow-2xl shadow-surface-900/10 dark:shadow-surface-950/50 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-surface-100 dark:border-surface-800">
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">
              {query
                ? `Results for "${query}"`
                : isFluence
                  ? 'NU-Fluence Navigation'
                  : 'Quick Navigation'}
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                setQuery('');
                setApiResults(null);
                setFluenceResults(null);
              }}
              className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="py-2">
            {allSelectableItems.length === 0 && !isSearching ? (
              <div className="px-4 py-8 text-center">
                <HelpCircle className="h-10 w-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                <p className="text-sm text-surface-500">No results found for &quot;{query}&quot;</p>
                <p className="text-xs text-surface-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              <>
                {/* Navigation Items grouped by category */}
                {Object.entries(groupedNavItems).map(([category, items]) => {
                  const categoryItems = items.map((item) => {
                    const currentIndex = navItemGlobalIndex;
                    navItemGlobalIndex++;
                    return renderNavItem(item, currentIndex);
                  });

                  return (
                    <div key={category} className="mb-2">
                      <div className="px-4 py-1.5">
                        <span className="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                          {category}
                        </span>
                      </div>
                      {categoryItems}
                    </div>
                  );
                })}

                {/* API Results — rendered generically from grouped data */}
                {groupedApiResults.map((group) => {
                  // Calculate the starting global index for this group
                  let groupStartIndex = filteredNavItems.length;
                  for (const g of groupedApiResults) {
                    if (g === group) break;
                    groupStartIndex += g.items.length;
                  }

                  return (
                    <div key={group.label} className="mb-2">
                      <div className="px-4 py-1.5">
                        <span className="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                          {group.label}
                        </span>
                      </div>
                      {group.items.map((result, idx) =>
                        renderApiResult(result, groupStartIndex + idx)
                      )}
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isSearching && (
                  <div className="px-4 py-4 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-accent-500 mx-auto" />
                    <p className="text-xs text-surface-400 mt-1">Searching...</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 rounded-b-xl">
            <div className="flex items-center gap-4 text-xs text-surface-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-700 rounded text-surface-500">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-700 rounded text-surface-500">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-700 rounded text-surface-500">esc</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
