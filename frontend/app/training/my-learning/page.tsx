'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  BookOpen,
  CheckCircle,
  Clock,
  PlayCircle,
  Award,
  Loader2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Badge,
  Button,
  StatCard,
} from '@/components/ui';
import type { BadgeVariant } from '@/components/ui/types';
import { useAuth } from '@/lib/hooks/useAuth';
import type { CourseEnrollment } from '@/lib/services/grow/lms.service';
import { useMyEnrollments, useUpdateCourseProgress } from '@/lib/hooks/queries/useLearning';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('MyLearningPage');

// ─── helpers ────────────────────────────────────────────────────────────────

function statusBadgeVariant(status: CourseEnrollment['status']): BadgeVariant {
  switch (status) {
    case 'COMPLETED':   return 'success';
    case 'IN_PROGRESS': return 'warning';
    case 'ENROLLED':    return 'primary';
    default:            return 'secondary';
  }
}

function statusLabel(status: CourseEnrollment['status']): string {
  switch (status) {
    case 'COMPLETED':   return 'Completed';
    case 'IN_PROGRESS': return 'In Progress';
    case 'ENROLLED':    return 'Enrolled';
    case 'DROPPED':     return 'Dropped';
    default:            return status;
  }
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped === 100 ? 'var(--chart-success)' :
    clamped >= 50   ? 'var(--chart-warning)' :
                      'var(--chart-primary)';
  return (
    <div className="w-full bg-[var(--border-main)] rounded-full h-2.5 overflow-hidden">
      <div
        className="h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export default function MyLearningPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
  }, []);

  // Queries
  const { data: enrollments = [], isLoading, refetch } = useMyEnrollments();
  const updateProgressMutation = useUpdateCourseProgress();

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(message);
      setError(null);
    } else {
      setError(message);
      setSuccessMsg(null);
    }
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => {
      setSuccessMsg(null);
      setError(null);
    }, 5000);
  };

  // Auth check
  if (hasHydrated && !isAuthenticated) {
    router.push('/auth/login');
  }

  const handleContinue = async (enrollment: CourseEnrollment) => {
    if (enrollment.status === 'COMPLETED') return;

    const currentProgress = enrollment.progressPercentage ?? 0;
    const newProgress = Math.min(100, currentProgress + 10);

    setUpdatingId(enrollment.id);
    try {
      await updateProgressMutation.mutateAsync({ enrollmentId: enrollment.id, progressPercent: newProgress });
      if (newProgress >= 100) {
        showNotification('Congratulations! Course completed.', 'success');
      } else {
        showNotification(`Progress updated to ${newProgress}%`, 'success');
      }
      // Refetch to get updated enrollments
      await refetch();
    } catch (err) {
      log.error('Failed to update progress:', err);
      showNotification('Failed to update progress. Please try again.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── summary stats ──────────────────────────────────────────────────────────

  const totalEnrolled  = enrollments.length;
  const inProgress     = enrollments.filter((e) => e.status === 'IN_PROGRESS').length;
  const completed      = enrollments.filter((e) => e.status === 'COMPLETED').length;
  const avgProgress    = totalEnrolled > 0
    ? Math.round(
        enrollments.reduce((sum, e) => sum + (e.progressPercentage ?? 0), 0) / totalEnrolled
      )
    : 0;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">My Learning</h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm">
              Track your enrolled courses and progress
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger-700 rounded-lg border border-danger-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 p-4 bg-success-50 text-success-700 rounded-lg border border-success-200">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm">{successMsg}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            title="Enrolled"
            value={String(totalEnrolled)}
            icon={<BookOpen className="h-5 w-5 text-accent-500" />}
          />
          <StatCard
            title="In Progress"
            value={String(inProgress)}
            icon={<PlayCircle className="h-5 w-5 text-warning-500" />}
          />
          <StatCard
            title="Completed"
            value={String(completed)}
            icon={<CheckCircle className="h-5 w-5 text-success-500" />}
          />
          <StatCard
            title="Avg Progress"
            value={`${avgProgress}%`}
            icon={<Clock className="h-5 w-5 text-accent-700" />}
          />
        </div>

        {/* Course list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Loading your courses…</span>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] space-y-4">
            <BookOpen className="h-12 w-12 text-[var(--text-muted)]" />
            <p className="text-lg font-medium text-[var(--text-muted)]">No courses yet</p>
            <p className="text-sm">
              Browse the{' '}
              <button
                onClick={() => router.push('/training/catalog')}
                className="text-accent-600 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
              >
                course catalog
              </button>{' '}
              to enroll in a course.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => {
              const progress = enrollment.progressPercentage ?? 0;
              const isCompleted = enrollment.status === 'COMPLETED';
              const isUpdating = updatingId === enrollment.id;

              return (
                <Card key={enrollment.id} className="border border-[var(--border-main)] hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-[var(--text-primary)] truncate">
                            Course ID: {enrollment.courseId}
                          </span>
                          <Badge variant={statusBadgeVariant(enrollment.status)}>
                            {statusLabel(enrollment.status)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3">
                          <span>
                            Enrolled{' '}
                            {enrollment.enrolledAt
                              ? new Date(enrollment.enrolledAt).toLocaleDateString()
                              : '—'}
                          </span>
                          {enrollment.completedAt && (
                            <span>
                              Completed{' '}
                              {new Date(enrollment.completedAt).toLocaleDateString()}
                            </span>
                          )}
                          {enrollment.certificateId && (
                            <span className="flex items-center gap-1 text-success-600">
                              <Award className="h-3 w-3" />
                              Certificate issued
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-[var(--text-muted)]">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <ProgressBar value={progress} />
                        </div>
                      </div>

                      {/* Right: action */}
                      <div className="shrink-0">
                        {isCompleted ? (
                          <Button variant="outline" size="sm" disabled className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-success-500" />
                            Done
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleContinue(enrollment)}
                            disabled={isUpdating || updateProgressMutation.isPending}
                            className="flex items-center gap-1"
                          >
                            {isUpdating || updateProgressMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            Continue
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
