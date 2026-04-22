'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {AlertCircle, Plus} from 'lucide-react';
import {motion} from 'framer-motion';
import {AppLayout} from '@/components/layout/AppLayout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {SkeletonDashboard} from '@/components/ui/Skeleton';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  useActiveLeaveTypes,
  useEmployeeBalancesForYear,
  useEmployeeLeaveRequests,
} from '@/lib/hooks/queries/useLeaves';
import {useAuth} from '@/lib/hooks/useAuth';
import {LeaveBalanceCards} from './_components/LeaveBalanceCards';
import {LeaveRequestsTable} from './_components/LeaveRequestsTable';
import {LeaveQuickActions} from './_components/LeaveQuickActions';

export default function LeavePage() {
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();

  // BUG-034-02: Redirect /leave to /leave/my-leaves so the layout route
  // always shows meaningful content instead of duplicating my-leaves
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    router.replace('/leave/my-leaves');
  }, [isAuthenticated, hasHydrated, router]);

  const year = new Date().getFullYear();
  const employeeId = user?.employeeId ?? '';

  const {
    data: balancesData = [],
    isLoading: isBalancesLoading,
    error: balancesError,
    fetchStatus: balancesFetchStatus,
  } = useEmployeeBalancesForYear(employeeId, year, !!employeeId);
  const {
    data: leaveTypesData = [],
    isLoading: isTypesLoading,
    error: typesError,
    fetchStatus: typesFetchStatus,
  } = useActiveLeaveTypes(!!employeeId);
  const {
    data: requestsData,
    isLoading: isRequestsLoading,
    error: requestsError,
    fetchStatus: requestsFetchStatus,
  } = useEmployeeLeaveRequests(employeeId, 0, 5, !!employeeId);

  const balances = balancesData;
  const leaveTypes = leaveTypesData;
  const recentRequests = requestsData?.content || [];

  const error =
    balancesError instanceof Error
      ? balancesError.message
      : requestsError instanceof Error
        ? requestsError.message
        : typesError instanceof Error
          ? typesError.message
          : !employeeId
            ? 'Employee ID not found'
            : null;

  const isAnyFetching = balancesFetchStatus === 'fetching' || typesFetchStatus === 'fetching' || requestsFetchStatus === 'fetching';
  const loading = !error && (isBalancesLoading || isTypesLoading || isRequestsLoading) && isAnyFetching;

  if (loading) {
    return (
      <AppLayout activeMenuItem="leave">
        <SkeletonDashboard/>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout activeMenuItem="leave">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div
              className='w-16 h-16 rounded-full bg-status-danger-bg flex items-center justify-center'>
              <AlertCircle className='h-8 w-8 text-status-danger-text'/>
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Unable to load leave data
            </h2>
            <p className="text-body-muted">
              {error.includes('500')
                ? 'The server encountered an error. Please try again in a moment.'
                : error}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className='px-4 py-2 bg-accent text-inverse rounded-xl hover:bg-accent transition-colors text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                Retry
              </button>
              <button
                onClick={() => router.push('/me/dashboard')}
                className="px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors text-sm font-medium border border-[var(--border-main)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="leave">
      <motion.div
        className="space-y-6"
        initial={{opacity: 0, y: 8}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Leave Management
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
              Track your leave balance and requests
            </p>
          </div>
          <PermissionGate anyOf={[Permissions.LEAVE_REQUEST, Permissions.LEAVE_MANAGE]}>
            <button
              onClick={() => router.push('/leave/apply')}
              className='flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-700 hover:from-accent-700 hover:to-accent-700 text-inverse rounded-xl font-medium shadow-[var(--shadow-dropdown)] shadow-accent-500/25 transition-all duration-200 hover:shadow-[var(--shadow-dropdown)] hover:shadow-accent-500/30 skeuo-button cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            >
              <Plus
                className="h-5 w-5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
              Apply for Leave
            </button>
          </PermissionGate>
        </div>

        <LeaveBalanceCards balances={balances} leaveTypes={leaveTypes}/>

        <LeaveRequestsTable
          requests={recentRequests}
          leaveTypes={leaveTypes}
          onViewAll={() => router.push('/leave/my-leaves')}
        />

        <LeaveQuickActions
          onApply={() => router.push('/leave/apply')}
          onMyLeaves={() => router.push('/leave/my-leaves')}
          onCalendar={() => router.push('/leave/calendar')}
        />
      </motion.div>
    </AppLayout>
  );
}
