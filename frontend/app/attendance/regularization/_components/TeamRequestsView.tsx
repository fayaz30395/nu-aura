'use client';

import {useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {ClipboardCheck, Eye, ThumbsDown, ThumbsUp} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';
import {useToast} from '@/components/ui/Toast';
import {useApproveRegularization, usePendingRegularizations} from '@/lib/hooks/queries/useAttendance';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {logger} from '@/lib/utils/logger';
import {RegularizationRequest} from './types';
import {RequestTimeline} from './RequestTimeline';
import {formatRelativeTime} from './utils';

interface TeamRequestsViewProps {
  onReject: (id: string) => void;
}

export function TeamRequestsView({onReject}: TeamRequestsViewProps) {
  const approveMutation = useApproveRegularization();
  const {success, error} = useToast();
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const {data: pendingTeamRequests, isLoading} = usePendingRegularizations(0, 50);

  // Convert to RegularizationRequest format
  const teamRequests: RegularizationRequest[] = (pendingTeamRequests?.content || [])
    .filter((record: AttendanceRecord) => record.regularizationRequested && !record.regularizationApproved)
    .map((record: AttendanceRecord) => ({
      id: record.id,
      employeeId: record.employeeId,
      attendanceDate: record.attendanceDate,
      originalCheckIn: record.checkInTime,
      originalCheckOut: record.checkOutTime,
      reason: record.regularizationReason || '',
      status: 'PENDING' as const,
      requestedOn: record.updatedAt,
      approvedBy: record.approvedBy,
      approvedOn: record.approvedAt,
      remarks: record.remarks,
    })) as RegularizationRequest[];

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      success('Regularization request approved successfully!');
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const displayMsg = errorMsg || 'Failed to approve regularization request. Please try again.';
      error(displayMsg);
      logger.error('Failed to approve request:', err);
    }
  };

  return (
    <Card className="card-aura">
      <CardHeader>
        <CardTitle className="text-section-title">Pending Regularization Requests from Team</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <SkeletonTable rows={5} columns={6}/>
        ) : teamRequests.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6"/>}
            iconColor="bg-accent-50 dark:bg-accent-950/30 text-accent-600 dark:text-accent-400"
            title="No pending requests"
            description="All regularization requests from your team have been processed"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-secondary)]/50">
              <tr>
                <th
                  className="px-4 md:px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Employee
                </th>
                <th
                  className="px-4 md:px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Date
                </th>
                <th
                  className="hidden md:table-cell px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Reason
                </th>
                <th
                  className="hidden md:table-cell px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Requested On
                </th>
                <th
                  className="px-4 md:px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Action
                </th>
              </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
              <AnimatePresence>
                {teamRequests.map((request: RegularizationRequest) => (
                  <motion.tr
                    key={request.id}
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -8}}
                    transition={{duration: 0.25, ease: 'easeOut'}}
                    className="hover:bg-[var(--bg-secondary)]/50 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                      {request.employeeId}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                      {new Date(request.attendanceDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 text-body-secondary">
                      <div className="max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 text-body-secondary">
                      {formatRelativeTime(request.requestedOn)}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          onClick={() => handleApprove(request.id)}
                          disabled={approveMutation.isPending}
                          aria-label="Approve request"
                          className="p-2 rounded-lg hover:bg-[var(--status-success-bg)]/20 transition-colors text-[var(--status-success-text)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          whileHover={{scale: 1.05}}
                          whileTap={{scale: 0.95}}
                          title="Approve"
                        >
                          <ThumbsUp className="h-4 w-4"/>
                        </motion.button>
                        <motion.button
                          onClick={() => onReject(request.id)}
                          aria-label="Reject request"
                          className="p-2 rounded-lg hover:bg-[var(--status-danger-bg)]/20 transition-colors text-[var(--status-danger-text)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          whileHover={{scale: 1.05}}
                          whileTap={{scale: 0.95}}
                          title="Reject"
                        >
                          <ThumbsDown className="h-4 w-4"/>
                        </motion.button>
                        <motion.button
                          onClick={() =>
                            setExpandedRequestId(expandedRequestId === request.id ? null : request.id)
                          }
                          aria-label={expandedRequestId === request.id ? 'Collapse request details' : 'View request details'}
                          className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          whileHover={{scale: 1.05}}
                          whileTap={{scale: 0.95}}
                        >
                          <Eye className="h-4 w-4"/>
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {/* Expanded Detail Row */}
              <AnimatePresence>
                {teamRequests.map((request: RegularizationRequest) =>
                  expandedRequestId === request.id ? (
                    <motion.tr
                      key={`${request.id}-detail`}
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: 'auto'}}
                      exit={{opacity: 0, height: 0}}
                      transition={{duration: 0.25, ease: 'easeOut'}}
                    >
                      <td
                        colSpan={5}
                        className="px-4 md:px-6 py-6 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-main)]"
                      >
                        <RequestTimeline request={request}/>
                      </td>
                    </motion.tr>
                  ) : null
                )}
              </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
