'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEmployees, useEmployeeSearch } from '@/lib/hooks/queries/useEmployees';
import { useActiveDepartments } from '@/lib/hooks/queries/useDepartments';
import type { Employee } from '@/lib/types/employee';
import {
  Search,
  Users,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Grid3x3,
  List,
} from 'lucide-react';

const PAGE_SIZE = 20;

interface ViewMode {
  key: 'grid' | 'list';
  label: string;
  icon: React.ReactNode;
}

const VIEW_MODES: ViewMode[] = [
  { key: 'grid', label: 'Grid', icon: <Grid3x3 className="h-4 w-4" /> },
  { key: 'list', label: 'List', icon: <List className="h-4 w-4" /> },
];

function EmployeeCard({ employee, viewMode, onClick }: {
  employee: Employee;
  viewMode: 'grid' | 'list';
  onClick: (id: string) => void;
}) {
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className="border border-[var(--border-main)] hover:border-primary-400 hover:shadow-md transition-all cursor-pointer"
          onClick={() => onClick(employee.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                  {employee.firstName?.[0]}{employee.lastName?.[0]}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[var(--text-primary)] truncate">
                  {employee.firstName} {employee.lastName}
                </h3>
                <p className="text-sm text-[var(--text-muted)] truncate">
                  {employee.designation || 'Employee'}
                </p>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 hidden md:grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)] truncate">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{employee.departmentName || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)] truncate">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <a href={`mailto:${employee.workEmail}`} className="text-primary-600 dark:text-primary-400 hover:underline truncate" onClick={e => e.stopPropagation()}>
                    {employee.workEmail}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="border border-[var(--border-main)] hover:border-primary-400 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col"
        onClick={() => onClick(employee.id)}
      >
        <CardContent className="p-4 flex flex-col h-full">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-semibold">
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </div>
          </div>

          {/* Name & Designation */}
          <div className="text-center mb-3 flex-1">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">
              {employee.firstName} {employee.lastName}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
              {employee.designation || 'Employee'}
            </p>
          </div>

          {/* Department & Level Badge */}
          {employee.departmentName && (
            <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-[var(--bg-secondary)] rounded-lg text-xs mb-3 text-[var(--text-secondary)] truncate">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{employee.departmentName}</span>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-2 text-xs border-t border-[var(--border-main)] pt-3">
            {employee.workEmail && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)] truncate">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <a
                  href={`mailto:${employee.workEmail}`}
                  className="text-primary-600 dark:text-primary-400 hover:underline truncate"
                  onClick={e => e.stopPropagation()}
                >
                  {employee.workEmail}
                </a>
              </div>
            )}
            {employee.phoneNumber && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)] truncate">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <a
                  href={`tel:${employee.phoneNumber}`}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  {employee.phoneNumber}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function TeamDirectoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(0);

  // Fetch departments
  const { data: departments = [], isLoading: departmentsLoading } = useActiveDepartments();

  // Fetch employees or search
  const isSearching = search.trim().length > 0;
  const { data: allEmployeesResponse, isLoading: allLoading } = useEmployees(
    page,
    PAGE_SIZE,
    'firstName',
    'ASC'
  );
  const { data: searchResponse, isLoading: searchLoading } = useEmployeeSearch(
    search,
    page,
    PAGE_SIZE,
    isSearching
  );

  const isLoading = isSearching ? searchLoading : allLoading;
  const response = isSearching ? searchResponse : allEmployeesResponse;
  const employees = response?.content ?? [];
  const totalElements = response?.totalElements ?? 0;
  const totalPages = response?.totalPages ?? 0;

  // Filter by department if selected
  const filtered = useMemo(() => {
    if (selectedDepartment === 'all') return employees;
    return employees.filter(e => e.departmentId === selectedDepartment);
  }, [employees, selectedDepartment]);

  const handleViewEmployee = useCallback((id: string) => {
    router.push(`/employees/${id}`);
  }, [router]);

  // Calculate department counts
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { all: totalElements };
    employees.forEach(emp => {
      if (emp.departmentId) {
        counts[emp.departmentId] = (counts[emp.departmentId] || 0) + 1;
      }
    });
    return counts;
  }, [employees, totalElements]);

  return (
    <AppLayout activeMenuItem="team-directory">
      <motion.div
        className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Team Directory</h1>
            <p className="text-[var(--text-muted)] mt-1">Browse and connect with team members</p>
          </div>
          <div className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-main)] p-1">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === mode.key
                    ? 'bg-primary-600 text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode.icon}
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-1">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
              Department
            </label>
            {departmentsLoading ? (
              <Skeleton className="h-10 rounded-lg" />
            ) : (
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                <option value="all">
                  All Departments ({deptCounts.all || 0})
                </option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({deptCounts[dept.id] || 0})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-3'}`}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className={`rounded-lg ${viewMode === 'grid' ? 'h-64' : 'h-24'}`} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={search ? 'No Results Found' : 'No Team Members'}
            description={search
              ? `No team members match "${search}". Try a different search term.`
              : 'No team members in this department.'
            }
          />
        )}

        {/* Employees Grid/List */}
        {!isLoading && filtered.length > 0 && (
          <>
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-3'}`}>
              {filtered.map(employee => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  viewMode={viewMode}
                  onClick={handleViewEmployee}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-[var(--border-main)]">
                <p className="text-sm text-[var(--text-muted)]">
                  Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="h-8 px-3 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="h-8 px-3 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}
