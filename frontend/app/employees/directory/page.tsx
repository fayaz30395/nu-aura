'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Users} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {ListPagination} from '../_components/ListPagination';
import {useDirectorySearch} from './_hooks/useDirectorySearch';
import {DirectoryFilters} from './_components/DirectoryFilters';
import {DirectoryGrid} from './_components/DirectoryGrid';
import {DirectoryTable} from './_components/DirectoryTable';
import {EmployeeQuickViewModal} from './_components/EmployeeQuickViewModal';
import type {DirectoryEmployee} from './_components/directory-options';

const BREADCRUMBS = [{label: 'Employees', href: '/employees'}, {label: 'Directory'}];

export default function TeamDirectory() {
  const router = useRouter();
  useAuth();
  const {hasAnyPermission, isPermissionReady: permReady} = usePermissions();
  // A3: Permission gate — directory requires VIEW_ALL or VIEW_TEAM. Kept even though the
  // route config also guards this path: the route allows VIEW_DEPARTMENT, this page does not.
  useEffect(() => {
    if (!permReady) return;
    if (!hasAnyPermission(Permissions.EMPLOYEE_VIEW_ALL, Permissions.EMPLOYEE_VIEW_TEAM)) {
      router.replace('/me/dashboard?denied=1');
    }
  }, [permReady, hasAnyPermission, router]);

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEmployee, setSelectedEmployee] = useState<DirectoryEmployee | null>(null);
  const {filters, setFilter, resetPage, clearFilters, hasActiveFilters, departments, searchQuery} = useDirectorySearch();

  const isFiltered = hasActiveFilters || filters.searchTerm.trim().length > 0;

  return (
    <AppLayout activeMenuItem="team-directory">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Team Directory"
          description="Search and connect with colleagues across the organization"
          breadcrumbs={BREADCRUMBS}
        />

        <DirectoryFilters
          filters={filters}
          departments={departments}
          showFilters={showFilters}
          hasActiveFilters={hasActiveFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onToggleFilters={() => setShowFilters((open) => !open)}
          onFilterChange={setFilter}
          onSearch={resetPage}
          onClearFilters={clearFilters}
        />

        <QueryState
          query={searchQuery}
          skeleton={<ListPageSkeleton rows={6} columns={4} showHeader={false} showFilters={false}/>}
          errorTitle="Couldn't load the directory"
          isEmpty={(data) => data.content.length === 0}
          empty={{
            icon: <Users className="h-6 w-6"/>,
            title: 'No employees found',
            description: 'Try adjusting your search or filters.',
            ...(isFiltered
              ? {
                  actionLabel: 'Clear filters',
                  onAction: () => {
                    clearFilters();
                    setFilter('searchTerm', '');
                  },
                }
              : {}),
          }}
        >
          {(data) => (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-text-2" aria-live="polite">
                Found <strong className="text-text-1">{data.totalElements}</strong> employee
                {data.totalElements !== 1 ? 's' : ''}
              </p>
              {viewMode === 'grid' ? (
                <DirectoryGrid employees={data.content} onSelect={setSelectedEmployee}/>
              ) : (
                <DirectoryTable employees={data.content} onSelect={setSelectedEmployee}/>
              )}
              <ListPagination
                label="Directory pagination"
                page={filters.page}
                pageSize={filters.size}
                totalElements={data.totalElements}
                totalPages={data.totalPages}
                onPageChange={(page) => setFilter('page', page)}
              />
            </div>
          )}
        </QueryState>
      </div>

      <EmployeeQuickViewModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)}/>
    </AppLayout>
  );
}
