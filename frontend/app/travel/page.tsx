'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {AppLayout} from '@/components/layout/AppLayout';
import {TransportMode, TravelStatus, TravelType} from '@/lib/types/hrms/travel';
import {useAuth} from '@/lib/hooks/useAuth';
import {formatCurrency} from '@/lib/utils';
import {useTravelRequests} from '@/lib/hooks/queries/useTravel';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {EmptyState} from '@/components/ui/EmptyState';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {TRAVEL_STATUS} from '@/lib/status/vocabulary';
import {Card, CardContent} from '@/components/ui/Card';
import {formatDate as formatDateCanonical} from '@/lib/utils/format/date';
import {
  AlertCircle,
  Briefcase,
  Building,
  Calendar,
  Car,
  ChevronRight,
  DollarSign,
  Filter,
  GraduationCap,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plane,
  Plus,
  Search,
  ShieldAlert,
  Train,
  Users,
  ArrowRight,
} from 'lucide-react';

export default function TravelPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TravelStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<TravelType | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(0);

  // Call hook unconditionally at the top, before any conditional renders
  const filters = {
    ...(statusFilter !== 'ALL' && {status: statusFilter}),
    ...(typeFilter !== 'ALL' && {travelType: typeFilter}),
    ...(searchTerm && {search: searchTerm}),
  };

  const {data, isLoading, error, refetch} = useTravelRequests(currentPage, 10, filters);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  const authShell = (title: string, description: string) => (
    <div className="page-shell-centered fade-slide-up auth-delay-20">
      <Card className="card-aura fade-slide-up auth-delay-40 float-subtle">
        <CardContent className="py-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300">
              <ShieldAlert className="h-5 w-5"/>
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
              <p className="text-caption">{description}</p>
            </div>
          </div>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-800 transition-colors"
          >
            <Loader2 className="h-4 w-4 animate-spin"/>
            Sign in
            <ArrowRight className="h-4 w-4"/>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  if (!hasHydrated) {
    return (
      <AppLayout activeMenuItem="travel">
        {authShell('Session check', 'Restoring your session.')}
      </AppLayout>
    );
  }
  if (!isAuthenticated) {
    return (
      <AppLayout activeMenuItem="travel">
        {authShell('Travel module', 'Redirecting to sign in.')}
      </AppLayout>
    );
  }
  const travelRequests = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

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

  const formatDate = (dateString: string) => formatDateCanonical(dateString);


  if (isLoading && travelRequests.length === 0) {
    return (
      <AppLayout activeMenuItem="travel">
        <div className="flex items-center justify-center h-[calc(100dvh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent-500"/>
            <p className="text-[var(--text-secondary)]">Loading travel requests...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="travel">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Travel Management
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Manage travel requests and expenses
            </p>
          </div>
          <PermissionGate permission={Permissions.TRAVEL_CREATE} fallback={<div/>}>
            <button
              onClick={() => router.push('/travel/new')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-sm font-medium transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <Plus className="h-5 w-5"/>
              New Travel Request
            </button>
          </PermissionGate>
        </div>

        {/* Filters */}
        <div className="card-aura p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
              <input
                type="text"
                placeholder="Search by destination, purpose..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as TravelStatus | 'ALL');
                  setCurrentPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all appearance-none"
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
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"/>
              <select
                aria-label="Filter by type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TravelType | 'ALL');
                  setCurrentPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all appearance-none"
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
          <div className="mt-4 text-body-secondary">
            Showing {travelRequests.length} of {totalElements} travel requests
          </div>
        </div>

        {/* Travel Requests List */}
        {error ? (
          <div
            className="card-aura flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-danger-500 mb-4"/>
            <p
              className="text-[var(--text-secondary)] mb-4">{error instanceof Error ? error.message : String(error)}</p>
            <button
              onClick={() => void refetch()}
              className="px-4 py-2 bg-accent-500 text-white rounded-xl hover:bg-accent-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              Retry
            </button>
          </div>
        ) : travelRequests.length === 0 ? (
          <PermissionGate permission={Permissions.TRAVEL_CREATE}
                          fallback={<EmptyState icon={<Plane className="h-12 w-12"/>} title="No Travel Requests"
                                                description="No travel requests available"/>}>
            <EmptyState
              icon={<Plane className="h-12 w-12"/>}
              title="No Travel Requests"
              description="Submit a travel request"
              action={{label: 'New Request', onClick: () => router.push('/travel/new')}}
            />
          </PermissionGate>
        ) : (
          <div className="space-y-4">
            {travelRequests.map((request) => {
              const TypeIcon = getTravelTypeIcon(request.travelType);
              const TransportIcon = getTransportIcon(request.transportMode);

              return (
                <div
                  key={request.id}
                  onClick={() => router.push(`/travel/${request.id}`)}
                  className="group card-interactive p-6 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-4 rounded-xl bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400">
                            <TypeIcon className="h-5 w-5"/>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                                {request.requestNumber}
                              </h2>
                              <StatusBadge status={request.status} domain={TRAVEL_STATUS}/>
                            </div>
                            <p className="text-body-secondary mt-1">
                              {request.travelType?.replace(/_/g, ' ') ?? '-'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className="h-5 w-5 text-[var(--text-muted)] group-hover:text-accent-500 group-hover:translate-x-1 transition-all"/>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-start gap-4">
                          <MapPin className="h-5 w-5 text-[var(--text-muted)] mt-0.5"/>
                          <div>
                            <p className="text-caption">Route</p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {request.originCity} → {request.destinationCity}
                            </p>
                            {request.isInternational && (
                              <span
                                className="inline-block mt-1 text-xs px-2 py-0.5 bg-accent-300 dark:bg-accent-900/30 text-accent-900 dark:text-accent-600 rounded">
                                International
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <Calendar className="h-5 w-5 text-[var(--text-muted)] mt-0.5"/>
                          <div>
                            <p className="text-caption">Duration</p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {formatDate(request.departureDate)}
                            </p>
                            <p className="text-caption">
                              to {formatDate(request.returnDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <TransportIcon className="h-5 w-5 text-[var(--text-muted)] mt-0.5"/>
                          <div>
                            <p className="text-caption">Transport</p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {request.transportMode}
                            </p>
                            {request.transportClass && (
                              <p className="text-caption">
                                {request.transportClass}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <DollarSign className="h-5 w-5 text-[var(--text-muted)] mt-0.5"/>
                          <div>
                            <p className="text-caption">
                              Estimated Cost
                            </p>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {formatCurrency(request.estimatedCost)}
                            </p>
                            {request.advanceRequired > 0 && (
                              <p className="text-xs text-warning-600 dark:text-warning-400">
                                Advance: {formatCurrency(request.advanceRequired)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Purpose */}
                      <div className="pt-4 border-t border-[var(--border-main)]">
                        <p className="text-caption mb-1">Purpose</p>
                        <p className="text-body-secondary line-clamp-2">
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
              className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              Previous
            </button>
            <span className="text-body-secondary">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
