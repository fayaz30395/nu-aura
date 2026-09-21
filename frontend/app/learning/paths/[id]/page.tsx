'use client';

import {useEffect} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useQuery} from '@tanstack/react-query';
import {ArrowLeft, BookOpen, CheckCircle2, Clock, Play} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {apiClient} from '@/lib/api/client';
import {Skeleton} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';

interface LearningPath {
  id: string;
  title: string;
  description?: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationHours?: number;
  courseCount: number;
  totalEnrollments: number;
  thumbnailUrl?: string;
  isEnrolled?: boolean;
  progressPercentage?: number;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export default function LearningPathDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pathId = params.id as string;
  const {hasAnyPermission, isReady} = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.TRAINING_VIEW,
    Permissions.LMS_COURSE_VIEW,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard?denied=1');
    }
  }, [isReady, hasAccess, router]);

  // No dedicated backend endpoint for a single path yet — reuse the list
  // query and find the matching entry by id.
  const {data: paths, isLoading} = useQuery({
    queryKey: ['learning-paths'],
    queryFn: async () => {
      const response = await apiClient.get<{ content: LearningPath[] }>('/lms/learning-paths');
      return response.data.content || [];
    },
  });

  const path = paths?.find((p) => p.id === pathId);

  if (!isReady || !hasAccess) return null;

  return (
    <AppLayout
      activeMenuItem="learning"
      breadcrumbs={[
        {label: 'Learning', href: '/learning'},
        {label: 'Learning Paths', href: '/learning/paths'},
        {label: path?.title || 'Path'},
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <button
          onClick={() => router.push('/learning/paths')}
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4"/> Back to Paths
        </button>

        {isLoading ? (
          <Skeleton className="h-64 w-full"/>
        ) : !path ? (
          <EmptyState
            icon={<BookOpen className="h-8 w-8"/>}
            title="Path Not Found"
            description="This learning path could not be found."
          />
        ) : (
          <div className="card-aura p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{path.title}</h1>
              {path.description && (
                <p className="text-body-secondary mt-2">{path.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4"/> {path.courseCount} courses
              </div>
              {path.durationHours !== undefined && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4"/> {path.durationHours}h
                </div>
              )}
            </div>

            {path.isEnrolled && typeof path.progressPercentage === 'number' && (
              <div>
                <div className="row-between mb-2">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Progress</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{path.progressPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-600 transition-all duration-300"
                    style={{width: `${path.progressPercentage}%`}}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/learning/courses')}
              className="btn-primary px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 font-medium text-sm flex items-center justify-center gap-2"
            >
              {path.status === 'COMPLETED' ? (
                <>
                  <CheckCircle2 className="h-4 w-4"/> Review Courses
                </>
              ) : (
                <>
                  <Play className="h-4 w-4"/> Browse Courses
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
