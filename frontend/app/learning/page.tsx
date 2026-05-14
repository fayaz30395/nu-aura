'use client';

import {useState} from 'react';
import Image from 'next/image';
import {AppLayout} from '@/components/layout';
import {Skeleton} from '@/components/ui/Skeleton';
import {Stat} from '@/components/ui/Stat';
import {Award, BookOpen, GraduationCap} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {
  useEnrollCourse,
  useLearningDashboard,
  useMyCertificates,
  useMyEnrollments,
  usePublishedCourses,
} from '@/lib/hooks/queries/useLearning';
import type {Certificate, Course, CourseEnrollment} from '@/lib/services/grow/lms.service';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {LEARNING_STATUS} from '@/lib/status/vocabulary';
import {formatDate} from '@/lib/utils/format/date';

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-courses' | 'certificates'>('catalog');

  // React Query hooks
  const {data: dashboard, isLoading: dashboardLoading, isError: dashboardError} = useLearningDashboard();
  const {data: coursesData, isLoading: coursesLoading} = usePublishedCourses(
    0,
    20,
    activeTab === 'catalog'
  );
  const {data: enrollmentsData, isLoading: enrollmentsLoading} = useMyEnrollments(
    0,
    20,
    activeTab === 'my-courses'
  );
  const {data: certificatesData, isLoading: certificatesLoading} = useMyCertificates(
    0,
    20,
    activeTab === 'certificates'
  );
  const enrollMutation = useEnrollCourse();

  const courses: Course[] = coursesData?.content ?? [];
  const myEnrollments: CourseEnrollment[] = Array.isArray(enrollmentsData) ? enrollmentsData : [];
  const certificates: Certificate[] = Array.isArray(certificatesData) ? certificatesData : [];
  const loading = dashboardLoading || coursesLoading || enrollmentsLoading || certificatesLoading;

  const handleEnroll = async (courseId: string) => {
    enrollMutation.mutate(courseId);
  };

  const getDifficultyColor = (level: string | undefined): string => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300';
      case 'INTERMEDIATE':
        return 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300';
      case 'ADVANCED':
        return 'bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300';
      default:
        return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'bg-success-500';
    if (progress >= 40) return 'bg-warning-500';
    return 'bg-accent-500';
  };

  return (
    <AppLayout activeMenuItem="learning">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-bold">Learning Management</h1>

        {/* Dashboard Cards */}
        {dashboardLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {Array.from({length: 5}).map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-card)] p-6">
                <Skeleton className="h-8 w-12 mb-2"/>
                <Skeleton className="h-4 w-20"/>
              </div>
            ))}
          </div>
        ) : dashboardError ? (
          <div
            className="mb-6 p-4 rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20">
            <p className="text-sm text-danger-600 dark:text-danger-400">Failed to load learning dashboard. Please try
              refreshing the page.</p>
          </div>
        ) : dashboard ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-card)] p-6">
              <Stat label="Total Enrollments" value={dashboard.totalEnrollments} tone="accent" />
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-card)] p-6">
              <Stat label="In Progress" value={dashboard.inProgress} tone="warning" />
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-card)] p-6">
              <Stat label="Completed" value={dashboard.completed} tone="success" />
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-card)] p-6">
              <Stat label="Avg Progress" value={`${dashboard.averageProgress?.toFixed(0) || 0}%`} tone="accent" />
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-card)] p-6">
              <Stat label="Certificates" value={dashboard.certificatesEarned} tone="accent" />
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-6 py-4 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${activeTab === 'catalog' ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('catalog')}
            aria-current={activeTab === 'catalog' ? 'page' : undefined}
          >
            Course Catalog
          </button>
          <button
            className={`px-6 py-4 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${activeTab === 'my-courses' ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('my-courses')}
            aria-current={activeTab === 'my-courses' ? 'page' : undefined}
          >
            My Courses
          </button>
          <button
            className={`px-6 py-4 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${activeTab === 'certificates' ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('certificates')}
            aria-current={activeTab === 'certificates' ? 'page' : undefined}
          >
            Certificates
          </button>
        </div>

        {loading || coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({length: 6}).map((_, i) => (
              <div key={i}
                   className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-elevated)] overflow-hidden">
                <Skeleton className="h-40 w-full"/>
                <div className="p-4 space-y-4">
                  <Skeleton className="h-5 w-3/4"/>
                  <Skeleton className="h-4 w-full"/>
                  <Skeleton className="h-4 w-1/2"/>
                  <Skeleton className="h-10 w-full"/>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Course Catalog Tab */}
            {activeTab === 'catalog' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <div key={course.id}
                         className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-elevated)] overflow-hidden hover:shadow-[var(--shadow-dropdown)] transition-shadow">
                      {course.thumbnailUrl ? (
                        <div className="relative w-full h-40">
                          <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover"
                                 sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"/>
                        </div>
                      ) : (
                        <div
                          className="w-full h-40 bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                          <span className="text-4xl text-accent-700 dark:text-accent-400">📚</span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h2 className="font-semibold text-lg text-[var(--text-primary)]">{course.title}</h2>
                          {course.isMandatory && (
                            <span
                              className="px-2 py-1 bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300 text-xs rounded-full">Mandatory</span>
                          )}
                        </div>
                        {course.shortDescription && (
                          <p
                            className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">{course.shortDescription}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(course.difficultyLevel)}`}
                            aria-label={`Difficulty: ${course.difficultyLevel}`}>
                            {course.difficultyLevel}
                          </span>
                          {course.durationHours && (
                            <span
                              className="px-2 py-1 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs rounded-full">
                              {course.durationHours}h
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-body-secondary mb-4">
                          <span>{course.totalEnrollments} enrolled</span>
                          {course.avgRating && (
                            <span className="flex items-center"
                                  aria-label={`Rating: ${course.avgRating.toFixed(1)} out of 5`}>
                              ⭐ {course.avgRating.toFixed(1)} ({course.totalRatings})
                            </span>
                          )}
                        </div>
                        <PermissionGate permission={Permissions.LMS_ENROLL}>
                          <Button
                            onClick={() => handleEnroll(course.id)}
                            disabled={enrollMutation.isPending}
                            variant="primary"
                            size="md"
                            className="w-full"
                            aria-label={`Enroll in ${course.title}`}
                          >
                            {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="col-span-full bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-elevated)]">
                    <EmptyState
                      icon={<BookOpen className="w-full h-full"/>}
                      title="No courses available"
                      description="Check back soon. New courses are published regularly."
                    />
                  </div>
                )}
              </div>
            )}

            {/* My Courses Tab */}
            {activeTab === 'my-courses' && (
              <div className="space-y-4">
                {myEnrollments.length > 0 ? (
                  myEnrollments.map((enrollment) => (
                    <div key={enrollment.id}
                         className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-elevated)] p-6 hover:shadow-[var(--shadow-dropdown)] transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Course
                            #{enrollment.courseId.slice(0, 8)}</h2>
                          <div className="flex gap-2 mt-2">
                            <StatusBadge status={enrollment.status} domain={LEARNING_STATUS}/>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-xl font-bold text-accent-700 dark:text-accent-400">{enrollment.progressPercentage?.toFixed(0) || 0}%
                          </div>
                          <div className="text-body-secondary">Progress</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div
                        className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2 mb-4"
                        role="progressbar" aria-valuenow={enrollment.progressPercentage || 0} aria-valuemin={0}
                        aria-valuemax={100}>
                        <div
                          className={`h-2 rounded-full ${getProgressColor(enrollment.progressPercentage || 0)}`}
                          style={{width: `${enrollment.progressPercentage || 0}%`}}
                        />
                      </div>

                      <div
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-body-secondary">
                        <div>
                          <div>Enrolled: {formatDate(enrollment.enrolledAt)}</div>
                          {enrollment.lastAccessedAt && (
                            <div>
                              Last accessed: {formatDate(enrollment.lastAccessedAt)}
                            </div>
                          )}
                        </div>
                        <Button
                          asChild
                          variant="primary"
                          size="md"
                          className="whitespace-nowrap"
                        >
                          <a href={`/learning/course/${enrollment.courseId}`}>
                            {enrollment.status === 'COMPLETED' ? 'Review' : 'Continue'}
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-elevated)]">
                    <EmptyState
                      icon={<GraduationCap className="w-full h-full"/>}
                      title="No enrollments yet"
                      description="Browse the catalog to enroll in your first course."
                      actionLabel="Browse catalog"
                      onAction={() => setActiveTab('catalog')}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.length > 0 ? (
                  certificates.map((cert) => (
                    <div key={cert.id}
                         className="bg-warning-50/40 dark:bg-warning-950/20 rounded-lg shadow-[var(--shadow-card)] p-6 border border-warning-200 dark:border-warning-800 hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-2xl mb-2" aria-label="Certificate">🏆</div>
                          <h2 className="font-semibold text-lg text-[var(--text-primary)]">{cert.courseTitle}</h2>
                          <div className="text-body-secondary mt-1">
                            Certificate: {cert.certificateNumber}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          cert.isActive ? 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                        }`} aria-label={`Certificate status: ${cert.isActive ? 'Active' : 'Expired'}`}>
                          {cert.isActive ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-[var(--border-main)] grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-[var(--text-secondary)]">Issued</div>
                          <div
                            className="font-medium text-[var(--text-primary)]">{formatDate(cert.issuedAt)}</div>
                        </div>
                        {cert.expiryDate && (
                          <div>
                            <div className="text-[var(--text-secondary)]">Expires</div>
                            <div
                              className="font-medium text-[var(--text-primary)]">{formatDate(cert.expiryDate)}</div>
                          </div>
                        )}
                        {cert.scoreAchieved && (
                          <div>
                            <div className="text-[var(--text-secondary)]">Score</div>
                            <div className="font-medium text-[var(--text-primary)]">{cert.scoreAchieved}%</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="primary" size="sm">
                          Download
                        </Button>
                        <Button variant="secondary" size="sm">
                          Share
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="col-span-full bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-elevated)]">
                    <EmptyState
                      icon={<Award className="w-full h-full"/>}
                      title="No certificates yet"
                      description="Complete a course to earn your first certificate."
                      actionLabel="Browse catalog"
                      onAction={() => setActiveTab('catalog')}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
