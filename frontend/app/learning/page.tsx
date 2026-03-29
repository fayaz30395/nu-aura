'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AppLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  useLearningDashboard,
  usePublishedCourses,
  useMyEnrollments,
  useMyCertificates,
  useEnrollCourse,
} from '@/lib/hooks/queries/useLearning';
import type { Course, CourseEnrollment, Certificate } from '@/lib/services/lms.service';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-courses' | 'certificates'>('catalog');

  // React Query hooks
  const { data: dashboard, isLoading: dashboardLoading } = useLearningDashboard();
  const { data: coursesData, isLoading: coursesLoading } = usePublishedCourses(
    0,
    20,
    activeTab === 'catalog'
  );
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useMyEnrollments(
    0,
    20,
    activeTab === 'my-courses'
  );
  const { data: certificatesData, isLoading: certificatesLoading } = useMyCertificates(
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
      case 'BEGINNER': return 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300';
      case 'INTERMEDIATE': return 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300';
      case 'ADVANCED': return 'bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const getStatusColor = (status: string | undefined): string => {
    switch (status) {
      case 'ENROLLED': return 'bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-400';
      case 'IN_PROGRESS': return 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300';
      case 'COMPLETED': return 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300';
      case 'DROPPED': return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
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
        <h1 className="text-3xl font-bold mb-8 text-[var(--text-primary)] skeuo-emboss">Learning Management</h1>

        {/* Dashboard Cards */}
        {dashboardLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-lg shadow p-6">
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : dashboard ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-accent-700 dark:text-accent-400">{dashboard.totalEnrollments}</div>
              <div className="text-[var(--text-secondary)]">Total Enrollments</div>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-warning-600 dark:text-warning-400">{dashboard.inProgress}</div>
              <div className="text-[var(--text-secondary)]">In Progress</div>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-success-600 dark:text-success-400">{dashboard.completed}</div>
              <div className="text-[var(--text-secondary)]">Completed</div>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-accent-800 dark:text-accent-600">{dashboard.averageProgress?.toFixed(0) || 0}%</div>
              <div className="text-[var(--text-secondary)]">Avg Progress</div>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-accent-700 dark:text-accent-400">{dashboard.certificatesEarned}</div>
              <div className="text-[var(--text-secondary)]">Certificates</div>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'catalog' ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('catalog')}
          >
            Course Catalog
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'my-courses' ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('my-courses')}
          >
            My Courses
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'certificates' ? 'border-b-2 border-accent-500 text-accent-700 dark:text-accent-400' : 'text-[var(--text-secondary)]'}`}
            onClick={() => setActiveTab('certificates')}
          >
            Certificates
          </button>
        </div>

        {loading || coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded-lg shadow-md overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-4 space-y-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
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
                    <div key={course.id} className="bg-[var(--bg-secondary)] rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      {course.thumbnailUrl ? (
                        <div className="relative w-full h-40">
                          <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-r from-accent-500 to-accent-800 dark:from-accent-600 dark:to-accent-900 flex items-center justify-center">
                          <span className="text-4xl text-white">📚</span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg text-[var(--text-primary)]">{course.title}</h3>
                          {course.isMandatory && (
                            <span className="px-2 py-1 bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300 text-xs rounded-full">Mandatory</span>
                          )}
                        </div>
                        {course.shortDescription && (
                          <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-2">{course.shortDescription}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(course.difficultyLevel)}`} aria-label={`Difficulty: ${course.difficultyLevel}`}>
                            {course.difficultyLevel}
                          </span>
                          {course.durationHours && (
                            <span className="px-2 py-1 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs rounded-full">
                              {course.durationHours}h
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-sm text-[var(--text-secondary)] mb-4">
                          <span>{course.totalEnrollments} enrolled</span>
                          {course.avgRating && (
                            <span className="flex items-center" aria-label={`Rating: ${course.avgRating.toFixed(1)} out of 5`}>
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
                  <div className="col-span-3 bg-[var(--bg-secondary)] rounded-lg shadow-md p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-muted)] text-lg font-medium">No courses available at the moment.</p>
                  </div>
                )}
              </div>
            )}

            {/* My Courses Tab */}
            {activeTab === 'my-courses' && (
              <div className="space-y-4">
                {myEnrollments.length > 0 ? (
                  myEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Course #{enrollment.courseId.slice(0, 8)}</h3>
                          <div className="flex gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`} aria-label={`Status: ${enrollment.status}`}>
                              {enrollment.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-accent-700 dark:text-accent-400">{enrollment.progressPercentage?.toFixed(0) || 0}%</div>
                          <div className="text-sm text-[var(--text-secondary)]">Progress</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2 mb-4" role="progressbar" aria-valuenow={enrollment.progressPercentage || 0} aria-valuemin={0} aria-valuemax={100}>
                        <div
                          className={`h-2 rounded-full ${getProgressColor(enrollment.progressPercentage || 0)}`}
                          style={{ width: `${enrollment.progressPercentage || 0}%` }}
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-[var(--text-secondary)]">
                        <div>
                          <div>Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}</div>
                          {enrollment.lastAccessedAt && (
                            <div>
                              Last accessed: {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
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
                  <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-muted)] text-lg font-medium mb-2">You haven&apos;t enrolled in any courses yet.</p>
                    <p className="text-[var(--text-secondary)]">Browse the catalog to get started!</p>
                  </div>
                )}
              </div>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.length > 0 ? (
                  certificates.map((cert) => (
                    <div key={cert.id} className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-6 border-l-4 border-warning-500 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-2xl mb-2" aria-label="Certificate">🏆</div>
                          <h3 className="font-semibold text-lg text-[var(--text-primary)]">{cert.courseTitle}</h3>
                          <div className="text-sm text-[var(--text-secondary)] mt-1">
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
                          <div className="font-medium text-[var(--text-primary)]">{new Date(cert.issuedAt).toLocaleDateString()}</div>
                        </div>
                        {cert.expiryDate && (
                          <div>
                            <div className="text-[var(--text-secondary)]">Expires</div>
                            <div className="font-medium text-[var(--text-primary)]">{new Date(cert.expiryDate).toLocaleDateString()}</div>
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
                  <div className="col-span-2 bg-[var(--bg-secondary)] rounded-lg shadow-md p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-muted)] text-lg font-medium mb-2">No certificates earned yet.</p>
                    <p className="text-[var(--text-secondary)]">Complete courses to earn certificates!</p>
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
