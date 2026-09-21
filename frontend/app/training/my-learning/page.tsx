'use client';

import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {
  Award,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';
import {Badge, Button, Card, CardContent, StatCard,} from '@/components/ui';
import {EmptyState} from '@/components/ui/EmptyState';
import type {BadgeVariant} from '@/components/ui/types';
import {useAuth} from '@/lib/hooks/useAuth';
import type {CourseEnrollment} from '@/lib/services/grow/lms.service';
import {useMyEnrollments} from '@/lib/hooks/queries/useLearning';
import {formatDate} from '@/lib/utils/format/date';

// ─── helpers ────────────────────────────────────────────────────────────────

function statusBadgeVariant(status: CourseEnrollment['status']): BadgeVariant {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'ENROLLED':
      return 'primary';
    default:
      return 'secondary';
  }
}

function statusLabel(status: CourseEnrollment['status']): string {
  switch (status) {
    case 'COMPLETED':
      return 'Completed';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'ENROLLED':
      return 'Enrolled';
    case 'DROPPED':
      return 'Dropped';
    default:
      return status;
  }
}

function ProgressBar({value}: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped === 100 ? 'var(--chart-success)' :
      clamped >= 50 ? 'var(--chart-warning)' :
        'var(--chart-primary)';
  return (
    <div className="w-full bg-[var(--border-main)] rounded-full h-2.5 overflow-hidden">
      <div
        className="h-2.5 rounded-full transition-all duration-300"
        style={{width: `${clamped}%`, backgroundColor: color}}
      />
    </div>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export default function MyLearningPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();

  // Queries
  const {data: enrollments = [], isLoading, refetch} = useMyEnrollments();

  // Auth check
  if (hasHydrated && !isAuthenticated) {
    router.replace('/auth/login');
  }

  const handleContinue = (enrollment: CourseEnrollment) => {
    if (enrollment.status === 'COMPLETED') return;
    router.push(`/learning/courses/${enrollment.courseId}/play`);
  };

  // ── summary stats ──────────────────────────────────────────────────────────

  const totalEnrolled = enrollments.length;
  const inProgress = enrollments.filter((e) => e.status === 'IN_PROGRESS').length;
  const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
  const avgProgress = totalEnrolled > 0
    ? Math.round(
      enrollments.reduce((sum, e) => sum + (e.progressPercentage ?? 0), 0) / totalEnrolled
    )
    : 0;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="row-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">My Learning</h1>
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
            <RefreshCw className="h-4 w-4"/>
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            title="Enrolled"
            value={String(totalEnrolled)}
            icon={<BookOpen className="h-5 w-5 text-accent-500"/>}
          />
          <StatCard
            title="In Progress"
            value={String(inProgress)}
            icon={<PlayCircle className="h-5 w-5 text-warning-500"/>}
          />
          <StatCard
            title="Completed"
            value={String(completed)}
            icon={<CheckCircle className="h-5 w-5 text-success-500"/>}
          />
          <StatCard
            title="Avg Progress"
            value={`${avgProgress}%`}
            icon={<Clock className="h-5 w-5 text-accent-700"/>}
          />
        </div>

        {/* Course list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
            <Loader2 className="h-8 w-8 animate-spin mr-4"/>
            <span>Loading your courses…</span>
          </div>
        ) : enrollments.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-8 w-8"/>}
            title="No courses yet"
            description="Browse the course catalog to enroll in a course."
            actionLabel="Browse Catalog"
            onAction={() => router.push('/training/catalog')}
          />
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => {
              const progress = enrollment.progressPercentage ?? 0;
              const isCompleted = enrollment.status === 'COMPLETED';

              return (
                <Card key={enrollment.id}
                      className="border border-[var(--border-main)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
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

                        <div className="flex items-center gap-4 text-caption mb-4">
                          <span>
                            Enrolled{' '}
                            {enrollment.enrolledAt
                              ? formatDate(enrollment.enrolledAt)
                              : '—'}
                          </span>
                          {enrollment.completedAt && (
                            <span>
                              Completed{' '}
                              {formatDate(enrollment.completedAt)}
                            </span>
                          )}
                          {enrollment.certificateId && (
                            <span className="flex items-center gap-1 text-success-600">
                              <Award className="h-3 w-3"/>
                              Certificate issued
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-caption">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <ProgressBar value={progress}/>
                        </div>
                      </div>

                      {/* Right: action */}
                      <div className="shrink-0">
                        {isCompleted ? (
                          <Button variant="outline" size="sm" disabled className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-success-500"/>
                            Done
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleContinue(enrollment)}
                            className="flex items-center gap-1"
                          >
                            <ChevronRight className="h-4 w-4"/>
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
