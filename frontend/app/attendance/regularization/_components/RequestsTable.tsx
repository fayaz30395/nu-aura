'use client';

import {useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {ClipboardCheck, Eye} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';
import {RegularizationRequest} from './types';
import {RequestTimeline} from './RequestTimeline';
import {formatRelativeTime, formatTime, getStatusBadgeClass} from './utils';

interface RequestsTableProps {
  requests: RegularizationRequest[];
  loading: boolean;
  statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
  onNewRequest: () => void;
}

export function RequestsTable({requests, loading, statusFilter, onNewRequest}: RequestsTableProps) {
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  return (
    <Card className="card-aura">
      <CardHeader>
        <CardTitle className="text-section-title">Your Regularization Requests</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <SkeletonTable rows={5} columns={6}/>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6"/>}
            iconColor="bg-accent-subtle text-accent"
            title={statusFilter === 'ALL' ? 'No requests yet' : `No ${statusFilter.toLowerCase()} requests`}
            description={
              statusFilter === 'ALL'
                ? 'Submit a regularization request to correct your attendance records'
                : `You don't have any ${statusFilter.toLowerCase()} regularization requests`
            }
            actionLabel="Submit Request"
            onAction={onNewRequest}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-secondary)]/50">
              <tr>
                <th
                  className="px-4 md:px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Date
                </th>
                <th
                  className="hidden md:table-cell px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Original Time
                </th>
                <th
                  className="px-4 md:px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Reason
                </th>
                <th
                  className="px-4 md:px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="hidden md:table-cell px-6 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Requested
                </th>
                <th
                  className="px-4 md:px-6 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Action
                </th>
              </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
              <AnimatePresence>
                {requests.map((request: RegularizationRequest) => (
                  <motion.tr
                    key={request.id}
                    initial={{opacity: 0, y: 8}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -8}}
                    transition={{duration: 0.25, ease: 'easeOut'}}
                    className="hover:bg-[var(--bg-secondary)]/50 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                      {new Date(request.attendanceDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 text-body-secondary">
                      <div className="text-xs">
                        In: {request.originalCheckIn ? formatTime(request.originalCheckIn) : 'Not marked'}
                      </div>
                      <div className="text-xs">
                        Out: {request.originalCheckOut ? formatTime(request.originalCheckOut) : 'Not marked'}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-body-secondary">
                      <div className="max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <span className={getStatusBadgeClass(request.status)}>{request.status}</span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 text-body-secondary">
                      {formatRelativeTime(request.requestedOn)}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
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
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {/* Expanded Detail Row */}
              <AnimatePresence>
                {requests.map((request: RegularizationRequest) =>
                  expandedRequestId === request.id ? (
                    <motion.tr
                      key={`${request.id}-detail`}
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: 'auto'}}
                      exit={{opacity: 0, height: 0}}
                      transition={{duration: 0.25, ease: 'easeOut'}}
                    >
                      <td
                        colSpan={6}
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
