'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ResourceAvailabilityCalendar } from '@/components/resource-management/ResourceAvailabilityCalendar';
import { useTeamAvailability } from '@/lib/hooks/queries/useResources';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from 'date-fns';

type ViewMode = 'month' | 'week';

export default function AvailabilityCalendarPage() {
  const router = useRouter();
  const { hasAnyPermission, isReady: permissionsReady } = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.RESOURCE_VIEW, Permissions.RESOURCE_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasAccess, router]);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [includeLeaves, setIncludeLeaves] = useState(true);
  const [includeHolidays, setIncludeHolidays] = useState(true);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      return {
        startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
      };
    } else {
      return {
        startDate: format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    }
  }, [currentDate, viewMode]);

  const { data: teamAvailability, isLoading } = useTeamAvailability({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    departmentIds: selectedDepartment ? [selectedDepartment] : undefined,
    includeLeaves,
    includeHolidays,
  });

  const navigatePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (_employeeId: string, _date: string) => {
    // Detail modal not yet implemented — placeholder for future sprint
  };

  const handleEmployeeClick = (employeeId: string) => {
    // Navigate to employee detail page
    router.push(`/employees/${employeeId}`);
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!teamAvailability) return null;

    const summary = {
      totalEmployees: teamAvailability.employees.length,
      onLeaveToday: 0,
      availableToday: 0,
      partialToday: 0,
    };

    const today = format(new Date(), 'yyyy-MM-dd');
    teamAvailability.employees.forEach((emp) => {
      const todayAvail = emp.availability.find((a) => a.date === today);
      if (todayAvail) {
        if (todayAvail.status === 'ON_LEAVE') summary.onLeaveToday++;
        else if (todayAvail.status === 'AVAILABLE') summary.availableToday++;
        else if (todayAvail.status === 'PARTIAL') summary.partialToday++;
      }
    });

    return summary;
  }, [teamAvailability]);

  if (!permissionsReady || !hasAccess) return null;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Team Availability
            </h1>
            <p className="mt-1 text-body-muted">
              View team availability, leaves, and project allocations
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" disabled={isLoading} aria-label="Refresh data">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              aria-label="Toggle filters"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]' : ''}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              {/* Department filter */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                  Department
                </label>
                <select
                  value={selectedDepartment || ''}
                  onChange={(e) => setSelectedDepartment(e.target.value || undefined)}
                  className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2 text-sm focus:border-accent-500 focus:outline-none dark:border-[var(--border-main)] dark:bg-[var(--bg-card)]"
                >
                  <option value="">All Departments</option>
                  {/* Department options would be loaded from API */}
                </select>
              </div>

              {/* Toggle switches */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeLeaves}
                    onChange={(e) => setIncludeLeaves(e.target.checked)}
                    className="rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                  />
                  Show Leaves
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeHolidays}
                    onChange={(e) => setIncludeHolidays(e.target.checked)}
                    className="rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                  />
                  Show Holidays
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        {summaryStats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard
              label="Total Employees"
              value={summaryStats.totalEmployees}
              icon={Users}
              color="text-accent-700"
            />
            <SummaryCard
              label="Available Today"
              value={summaryStats.availableToday}
              icon={Users}
              color="text-success-600"
            />
            <SummaryCard
              label="Partial Today"
              value={summaryStats.partialToday}
              icon={Users}
              color="text-warning-600"
            />
            <SummaryCard
              label="On Leave Today"
              value={summaryStats.onLeaveToday}
              icon={Calendar}
              color="text-accent-800"
            />
          </div>
        )}

        {/* Calendar Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="ml-2 text-xl font-semibold text-[var(--text-primary)]">
              {viewMode === 'month'
                ? format(currentDate, 'MMMM yyyy')
                : `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[var(--border-main)]">
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'week'
                    ? 'bg-accent-700 text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)]'
                } rounded-l-lg`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'month'
                    ? 'bg-accent-700 text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)]'
                } rounded-r-lg`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : teamAvailability && teamAvailability.employees.length > 0 ? (
              <ResourceAvailabilityCalendar
                employees={teamAvailability.employees}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onDayClick={handleDayClick}
                onEmployeeClick={handleEmployeeClick}
              />
            ) : (
              <EmptyState
                title="No employees found"
                description="Try adjusting your filters or date range"
                icon={<Users className="h-12 w-12" />}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg bg-[var(--bg-secondary)] p-2 dark:bg-[var(--bg-secondary)] ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{value}</p>
          <p className="text-caption">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
