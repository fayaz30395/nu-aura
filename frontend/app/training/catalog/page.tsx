'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  Filter,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Star,
  Users,
} from 'lucide-react';
import {Badge, Button, Card, CardContent, Input,} from '@/components/ui';
import type {BadgeVariant} from '@/components/ui/types';
import {useAuth} from '@/lib/hooks/useAuth';
import {CourseSummaryDto, lmsService} from '@/lib/services/grow/lms.service';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('CatalogPage');

// ─── helpers ────────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: 'success',
  INTERMEDIATE: 'warning',
  ADVANCED: 'danger',
  EXPERT: 'secondary',
};

function DifficultyBadge({level}: { level: string }) {
  const variant = (DIFFICULTY_COLORS[level] ?? 'secondary') as BadgeVariant;
  return (
    <Badge variant={variant} className="text-xs">
      {DIFFICULTY_LABELS[level] ?? level}
    </Badge>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export default function CourseCatalogPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();

  const [courses, setCourses] = useState<CourseSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMandatory, setFilterMandatory] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;

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

  const loadCatalog = useCallback(async (pageNum: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      const response = await lmsService.getCatalog(pageNum, PAGE_SIZE);
      const incoming = response.courses ?? [];

      if (pageNum === 0) {
        setCourses(incoming);
      } else {
        setCourses((prev) => [...prev, ...incoming]);
      }
      setHasMore(incoming.length >= PAGE_SIZE);
      setPage(pageNum);
    } catch (err) {
      log.error('Failed to load catalog:', err);
      setError('Failed to load the course catalog. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    loadCatalog(0);
  }, [isAuthenticated, hasHydrated, router, loadCatalog]);

  const handleEnroll = async (course: CourseSummaryDto) => {
    if (enrolledIds.has(course.id)) return;

    setEnrollingId(course.id);
    try {
      await lmsService.enrollSelf(course.id);
      setEnrolledIds((prev) => new Set([...prev, course.id]));
      showNotification(`Successfully enrolled in "${course.title}"`, 'success');
    } catch (err: unknown) {
      log.error('Failed to enroll:', err);
      const errStatus = (err as { response?: { status?: number } })?.response?.status;
      const msg = errStatus === 409
        ? `You are already enrolled in "${course.title}"`
        : `Failed to enroll in "${course.title}". Please try again.`;
      showNotification(msg, 'error');
    } finally {
      setEnrollingId(null);
    }
  };

  // Client-side filter
  const visibleCourses = courses.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.shortDescription ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMandatory = !filterMandatory || c.isMandatory;
    return matchesSearch && matchesMandatory;
  });

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="row-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">Course Catalog</h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm">
              Browse and enroll in available courses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/training/my-learning')}
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4"/>
              My Learning
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadCatalog(0)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4"/>
              Refresh
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger-700 rounded-lg border border-danger-200">
            <AlertCircle className="h-5 w-5 shrink-0"/>
            <span className="text-sm">{error}</span>
          </div>
        )}
        {successMsg && (
          <div
            className="flex items-center gap-2 p-4 bg-success-50 text-success-700 rounded-lg border border-success-200">
            <CheckCircle className="h-5 w-5 shrink-0"/>
            <span className="text-sm">{successMsg}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
            <Input
              placeholder="Search courses…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={filterMandatory ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMandatory((v) => !v)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4"/>
            Mandatory only
          </Button>
          {visibleCourses.length > 0 && (
            <span className="text-body-muted">
              {visibleCourses.length} course{visibleCourses.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Course grid */}
        {loading && courses.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
            <Loader2 className="h-8 w-8 animate-spin mr-4"/>
            <span>Loading catalog…</span>
          </div>
        ) : visibleCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] space-y-4">
            <GraduationCap className="h-12 w-12 text-[var(--text-muted)]"/>
            <p className="text-lg font-medium text-[var(--text-muted)]">No courses found</p>
            {searchQuery && (
              <p className="text-sm">
                Try clearing the search or{' '}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterMandatory(false);
                  }}
                  className="text-accent-600 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
                >
                  reset filters
                </button>
                .
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCourses.map((course) => {
              const isEnrolled = enrolledIds.has(course.id);
              const isEnrolling = enrollingId === course.id;

              return (
                <Card
                  key={course.id}
                  className="border border-[var(--border-main)] hover:shadow-[var(--shadow-elevated)] transition-shadow flex flex-col"
                >
                  {/* Thumbnail placeholder */}
                  <div
                    className="h-36 bg-gradient-to-br from-accent-50 to-accent-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover rounded-t-lg"
                      />
                    ) : (
                      <GraduationCap className="h-12 w-12 text-accent-300"/>
                    )}
                    {course.isMandatory && (
                      <span
                        className="absolute top-2 right-2 bg-danger-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        Mandatory
                      </span>
                    )}
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col">
                    {/* Title & difficulty */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug line-clamp-2">
                        {course.title}
                      </h3>
                      <DifficultyBadge level={course.difficultyLevel}/>
                    </div>

                    {/* Description */}
                    {course.shortDescription && (
                      <p className="text-caption line-clamp-2 mb-4">
                        {course.shortDescription}
                      </p>
                    )}

                    {/* Skills */}
                    {course.skillsCovered && course.skillsCovered.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {course.skillsCovered.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="text-xs bg-accent-50 text-accent-700 px-1.5 py-0.5 rounded"
                          >
                            {skill.trim()}
                          </span>
                        ))}
                        {course.skillsCovered.length > 3 && (
                          <span className="text-caption">
                            +{course.skillsCovered.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-caption mb-4 mt-auto">
                      {course.durationHours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3"/>
                          {course.durationHours}h
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3"/>
                        {course.totalEnrollments ?? 0} enrolled
                      </span>
                      {course.avgRating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-warning-400 fill-warning-400"/>
                          {course.avgRating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push(`/training/catalog/${course.id}`)}
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5"/>
                          Details
                        </span>
                      </Button>
                      <PermissionGate permission={Permissions.TRAINING_ENROLL}>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEnroll(course)}
                          disabled={isEnrolled || isEnrolling}
                          variant={isEnrolled ? 'outline' : 'default'}
                        >
                          {isEnrolling ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin"/>
                              Enrolling…
                            </span>
                          ) : isEnrolled ? (
                            <span className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-success-500"/>
                              Enrolled
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Award className="h-4 w-4"/>
                              Enroll
                            </span>
                          )}
                        </Button>
                      </PermissionGate>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && visibleCourses.length > 0 && !searchQuery && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => loadCatalog(page + 1)}
              className="min-w-[160px]"
            >
              Load more courses
            </Button>
          </div>
        )}

        {loading && courses.length > 0 && (
          <div className="flex justify-center py-4 text-[var(--text-muted)]">
            <Loader2 className="h-6 w-6 animate-spin mr-2"/>
            <span className="text-sm">Loading more…</span>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
