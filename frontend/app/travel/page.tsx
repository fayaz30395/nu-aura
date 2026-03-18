'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { TravelStatus, TravelType, TransportMode } from '@/lib/types/travel';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { useTravelRequests } from '@/lib/hooks/queries/useTravel';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Plane,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Train,
  Car,
  Briefcase,
  GraduationCap,
  Users,
  Building,
  MoreHorizontal,
} from 'lucide-react';

export default function TravelPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TravelStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<TravelType | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  const filters = {
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(typeFilter !== 'ALL' && { travelType: typeFilter }),
    ...(searchTerm && { search: searchTerm }),
  };

  const { data, isLoading, error, refetch } = useTravelRequests(currentPage, 10, filters);
  const travelRequests = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  const getStatusConfig = (status: TravelStatus) => {
    const configs = {
      DRAFT: {
        bg: 'bg-[var(--bg-secondary)]',
        text: 'text-[var(--text-secondary)]',
        icon: Clock,
      },
      SUBMITTED: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        icon: Clock,
      },
      PENDING_APPROVAL: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        icon: Clock,
      },
      APPROVED: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        icon: CheckCircle,
      },
      REJECTED: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: XCircle,
      },
      BOOKED: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-400',
        icon: CheckCircle,
      },
      IN_PROGRESS: {
        bg: 'bg-cyan-100 dark:bg-cyan-900/30',
        text: 'text-cyan-700 dark:text-cyan-400',
        icon: Plane,
      },
      COMPLETED: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        icon: CheckCircle,
      },
      CANCELLED: {
        bg: 'bg-[var(--bg-secondary)]',
        text: 'text-[var(--text-secondary)]',
        icon: XCircle,
      },
    };
    return configs[status] || configs.DRAFT;
  };

  const getTravelTypeIcon = (type: TravelType) => {
    const icons = {
      BUSINESS: Briefcase,
      TRAINING: GraduationCap,
      CLIENT_VISIT: Users,
      CONFERENCE: Building,
      RELOCATION: MapPin,
      OTHER: MoreHorizontal,
    };
    return icons[type] || Briefcase;
  };

  const getTransportIcon = (mode: TransportMode | string) => {
    const icons: Record<string, typeof Plane> = {
      FLIGHT: Plane,
      TRAIN: Train,
      CAR: Car,
      BUS: Car,
      SELF_ARRANGED: Car,
    };
    return icons[mode] || Car;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };


  if (isLoading && travelRequests.length === 0) {
    return (
      <AppLayout activeMenuItem="travel">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-[var(--text-secondary)]">Loading travel requests...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="travel">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Travel Management
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Manage travel requests and expenses
            </p>
          </div>
          <PermissionGate permission={Permissions.TRAVEL_CREATE} fallback={<div />}>
            <button
              onClick={() => router.push('/travel/new')}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/30"
            >
              <Plus className="h-5 w-5" />
              New Travel Request
            </button>
          </PermissionGate>
        </div>

        {/* Filters */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search by destination, purpose..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as TravelStatus | 'ALL');
                  setCurrentPage(0);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="BOOKED">Booked</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TravelType | 'ALL');
                  setCurrentPage(0);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none"
              >
                <option value="ALL">All Types</option>
                <option value="BUSINESS">Business</option>
                <option value="TRAINING">Training</option>
                <option value="CLIENT_VISIT">Client Visit</option>
                <option value="CONFERENCE">Conference</option>
                <option value="RELOCATION">Relocation</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-[var(--text-secondary)]">
            Showing {travelRequests.length} of {totalElements} travel requests
          </div>
        </div>

        {/* Travel Requests List */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)]">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-[var(--text-secondary)] mb-4">{error instanceof Error ? error.message : String(error)}</p>
            <button
              onClick={() => void refetch()}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : travelRequests.length === 0 ? (
          <PermissionGate permission={Permissions.TRAVEL_CREATE} fallback={<EmptyState icon={<Plane className="h-12 w-12" />} title="No Travel Requests" description="No travel requests available" />}>
            <EmptyState
              icon={<Plane className="h-12 w-12" />}
              title="No Travel Requests"
              description="Submit a travel request"
              action={{ label: 'New Request', onClick: () => router.push('/travel/new') }}
            />
          </PermissionGate>
        ) : (
          <div className="space-y-4">
            {travelRequests.map((request) => {
              const statusConfig = getStatusConfig(request.status);
              const StatusIcon = statusConfig.icon;
              const TypeIcon = getTravelTypeIcon(request.travelType);
              const TransportIcon = getTransportIcon(request.transportMode);

              return (
                <div
                  key={request.id}
                  onClick={() => router.push(`/travel/${request.id}`)}
                  className="group bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-4 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600">
                            <TypeIcon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                {request.requestNumber}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {request.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                              {request.travelType.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-start gap-4">
                          <MapPin className="h-5 w-5 text-[var(--text-muted)] mt-0.5" />
                          <div>
                            <p className="text-xs text-[var(--text-muted)]">Route</p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {request.originCity} → {request.destinationCity}
                            </p>
                            {request.isInternational && (
                              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                                International
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <Calendar className="h-5 w-5 text-[var(--text-muted)] mt-0.5" />
                          <div>
                            <p className="text-xs text-[var(--text-muted)]">Duration</p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {formatDate(request.departureDate)}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              to {formatDate(request.returnDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <TransportIcon className="h-5 w-5 text-[var(--text-muted)] mt-0.5" />
                          <div>
                            <p className="text-xs text-[var(--text-muted)]">Transport</p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {request.transportMode}
                            </p>
                            {request.transportClass && (
                              <p className="text-xs text-[var(--text-muted)]">
                                {request.transportClass}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <DollarSign className="h-5 w-5 text-[var(--text-muted)] mt-0.5" />
                          <div>
                            <p className="text-xs text-[var(--text-muted)]">
                              Estimated Cost
                            </p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {formatCurrency(request.estimatedCost)}
                            </p>
                            {request.advanceRequired > 0 && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                Advance: {formatCurrency(request.advanceRequired)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Purpose */}
                      <div className="pt-4 border-t border-[var(--border-main)]">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Purpose</p>
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                          {request.purpose}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-[var(--text-secondary)]">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
