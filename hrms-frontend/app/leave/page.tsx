'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { leaveService } from '@/lib/services/leave.service';
import { LeaveBalance, LeaveRequest, LeaveType } from '@/lib/types/leave';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  CalendarDays,
  ChevronRight,
  Umbrella,
  Heart,
  Baby,
  Briefcase,
  HelpCircle,
  Loader2,
} from 'lucide-react';

export default function LeavePage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [recentRequests, setRecentRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, hasHydrated, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const year = new Date().getFullYear();

      if (!user?.employeeId) {
        setError('Employee ID not found');
        return;
      }

      const [balancesData, typesData, requestsData] = await Promise.all([
        leaveService.getEmployeeBalancesForYear(user.employeeId, year),
        leaveService.getActiveLeaveTypes(),
        leaveService.getLeaveRequestsByEmployee(user.employeeId, 0, 5),
      ]);

      setBalances(balancesData);
      setLeaveTypes(typesData);
      setRecentRequests(requestsData.content);
    } catch (error) {
      console.error('Error loading leave data:', error);
      setError('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          icon: CheckCircle,
        };
      case 'PENDING':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-700 dark:text-amber-400',
          icon: Clock,
        };
      case 'REJECTED':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-400',
          icon: XCircle,
        };
      case 'CANCELLED':
        return {
          bg: 'bg-surface-100 dark:bg-surface-800',
          text: 'text-surface-600 dark:text-surface-400',
          icon: AlertCircle,
        };
      default:
        return {
          bg: 'bg-primary-100 dark:bg-primary-900/30',
          text: 'text-primary-700 dark:text-primary-400',
          icon: HelpCircle,
        };
    }
  };

  const getLeaveTypeIcon = (leaveTypeName: string) => {
    const name = leaveTypeName?.toLowerCase() || '';
    if (name.includes('sick') || name.includes('medical')) return Heart;
    if (name.includes('casual') || name.includes('vacation')) return Umbrella;
    if (name.includes('maternity') || name.includes('paternity') || name.includes('parental')) return Baby;
    if (name.includes('earned') || name.includes('privilege')) return Briefcase;
    return Calendar;
  };

  const getLeaveTypeGradient = (colorCode: string | undefined, index: number) => {
    const gradients = [
      'from-primary-500 to-primary-600',
      'from-emerald-500 to-emerald-600',
      'from-amber-500 to-amber-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-cyan-500 to-cyan-600',
    ];
    return gradients[index % gradients.length];
  };

  if (loading) {
    return (
      <AppLayout activeMenuItem="leave">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-surface-600 dark:text-surface-400">Loading leave data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout activeMenuItem="leave">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-surface-600 dark:text-surface-400">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="leave">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Leave Management
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Track your leave balance and requests
            </p>
          </div>
          <button
            onClick={() => router.push('/leave/apply')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/30"
          >
            <Plus className="h-5 w-5" />
            Apply for Leave
          </button>
        </div>

        {/* Leave Balance Cards */}
        <div>
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
            Leave Balance ({new Date().getFullYear()})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((balance, index) => {
              const leaveType = leaveTypes.find(t => t.id === balance.leaveTypeId);
              const Icon = getLeaveTypeIcon(leaveType?.leaveName || '');
              const gradient = getLeaveTypeGradient(leaveType?.colorCode, index);
              const total = balance.openingBalance + balance.accrued;
              const usedPercentage = total > 0 ? (balance.used / total) * 100 : 0;

              return (
                <div
                  key={balance.id}
                  className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded-lg">
                      {leaveType?.leaveCode || 'N/A'}
                    </span>
                  </div>

                  <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
                    {leaveType?.leaveName || 'Leave'}
                  </h3>

                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                      {balance.available.toFixed(1)}
                    </span>
                    <span className="text-sm text-surface-500 dark:text-surface-400">
                      / {total.toFixed(1)} days
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-300`}
                      style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-surface-500 dark:text-surface-400">
                    <span>Used: {balance.used.toFixed(1)}</span>
                    <span>Pending: {balance.pending.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}

            {balances.length === 0 && (
              <div className="col-span-full text-center py-8 text-surface-500 dark:text-surface-400">
                No leave balances found
              </div>
            )}
          </div>
        </div>

        {/* Recent Leave Requests */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-800">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              Recent Leave Requests
            </h2>
            <button
              onClick={() => router.push('/leave/my-leaves')}
              className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium transition-colors"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-surface-300 dark:text-surface-600 mb-4" />
              <p className="text-surface-500 dark:text-surface-400">No leave requests found</p>
              <button
                onClick={() => router.push('/leave/apply')}
                className="mt-4 text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm font-medium"
              >
                Apply for your first leave
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-800/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Request #
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Leave Type
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Applied On
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {recentRequests.map((request) => {
                    const leaveType = leaveTypes.find(t => t.id === request.leaveTypeId);
                    const statusConfig = getStatusConfig(request.status);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr
                        key={request.id}
                        className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                            {request.requestNumber}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-surface-700 dark:text-surface-300">
                            {leaveType?.leaveName || 'N/A'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {new Date(request.startDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}{' '}
                            -{' '}
                            {new Date(request.endDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-surface-700 dark:text-surface-300">
                            {request.totalDays}
                            {request.isHalfDay && (
                              <span className="ml-1 text-xs text-surface-500">(Half Day)</span>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {request.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {new Date(request.appliedOn).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/leave/apply')}
            className="group bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-surface-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">
              Apply for Leave
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Submit a new leave request
            </p>
          </button>

          <button
            onClick={() => router.push('/leave/my-leaves')}
            className="group bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-surface-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">
              My Leaves
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              View all your leave history
            </p>
          </button>

          <button
            onClick={() => router.push('/leave/calendar')}
            className="group bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 group-hover:scale-110 transition-transform">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-surface-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-1">
              Leave Calendar
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              View team leave calendar
            </p>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
