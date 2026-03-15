'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AppLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertCircle } from 'lucide-react';
import {
  useLearningDashboard,
  usePublishedCourses,
  useMyEnrollments,
  useMyCertificates,
  useEnrollCourse,
} from '@/lib/hooks/queries/useLearning';
import type { Course, CourseEnrollment, Certificate } from '@/lib/services/lms.service';

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
      case 'BEGINNER': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'ADVANCED': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  const getStatusColor = (status: string | undefined): string => {
    switch (status) {
      case 'ENROLLED': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'DROPPED': return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <AppLayout activeMenuItem="learning">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-surface-900 dark:text-surface-50">Learning Management</h1>

        {/* Dashboard Cards */}
        {dashboardLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : dashboard ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{dashboard.totalEnrollments}</div>
              <div className="text-surface-600 dark:text-surface-400">Total Enrollments</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{dashboard.inProgress}</div>
              <div className="text-surface-600 dark:text-surface-400">In Progress</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{dashboard.completed}</div>
              <div className="text-surface-600 dark:text-surface-400">Completed</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{dashboard.averageProgress?.toFixed(0) || 0}%</div>
              <div className="text-surface-600 dark:text-surface-400">Avg Progress</div>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{dashboard.certificatesEarned}</div>
              <div className="text-surface-600 dark:text-surface-400">Certificates</div>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'catalog' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('catalog')}
          >
            Course Catalog
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'my-courses' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('my-courses')}
          >
            My Courses
          </button>
          <button
            className={`px-6 py-3 font-medium ${activeTab === 'certificates' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400'}`}
            onClick={() => setActiveTab('certificates')}
          >
            Certificates
          </button>
        </div>

        {loading || coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-4 space-y-3">
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
                    <div key={course.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                      {course.thumbnailUrl ? (
                        <div className="relative w-full h-40">
                          <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center">
                          <span className="text-4xl text-white">📚</span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg text-surface-900 dark:text-white">{course.title}</h3>
                          {course.isMandatory && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-xs rounded-full">Mandatory</span>
                          )}
                        </div>
                        {course.shortDescription && (
                          <p className="text-surface-600 dark:text-surface-400 text-sm mb-3 line-clamp-2">{course.shortDescription}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(course.difficultyLevel)}`} aria-label={`Difficulty: ${course.difficultyLevel}`}>
                            {course.difficultyLevel}
                          </span>
                          {course.durationHours && (
                            <span className="px-2 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 text-xs rounded-full">
                              {course.durationHours}h
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-sm text-surface-600 dark:text-surface-400 mb-4">
                          <span>{course.totalEnrollments} enrolled</span>
                          {course.avgRating && (
                            <span className="flex items-center" aria-label={`Rating: ${course.avgRating.toFixed(1)} out of 5`}>
                              ⭐ {course.avgRating.toFixed(1)} ({course.totalRatings})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleEnroll(course.id)}
                          disabled={enrollMutation.isPending}
                          className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label={`Enroll in ${course.title}`}
                        >
                          {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-surface-400 mx-auto mb-4" />
                    <p className="text-surface-500 dark:text-surface-400 text-lg font-medium">No courses available at the moment.</p>
                  </div>
                )}
              </div>
            )}

            {/* My Courses Tab */}
            {activeTab === 'my-courses' && (
              <div className="space-y-4">
                {myEnrollments.length > 0 ? (
                  myEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Course #{enrollment.courseId.slice(0, 8)}</h3>
                          <div className="flex gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`} aria-label={`Status: ${enrollment.status}`}>
                              {enrollment.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{enrollment.progressPercentage?.toFixed(0) || 0}%</div>
                          <div className="text-sm text-surface-600 dark:text-surface-400">Progress</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2 mb-4" role="progressbar" aria-valuenow={enrollment.progressPercentage || 0} aria-valuemin={0} aria-valuemax={100}>
                        <div
                          className={`h-2 rounded-full ${getProgressColor(enrollment.progressPercentage || 0)}`}
                          style={{ width: `${enrollment.progressPercentage || 0}%` }}
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-surface-600 dark:text-surface-400">
                        <div>
                          <div>Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}</div>
                          {enrollment.lastAccessedAt && (
                            <div>
                              Last accessed: {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <a
                          href={`/learning/course/${enrollment.courseId}`}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 dark:hover:bg-primary-600 transition-colors whitespace-nowrap"
                        >
                          {enrollment.status === 'COMPLETED' ? 'Review' : 'Continue'}
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-surface-400 mx-auto mb-4" />
                    <p className="text-surface-500 dark:text-surface-400 text-lg font-medium mb-2">You haven&apos;t enrolled in any courses yet.</p>
                    <p className="text-surface-600 dark:text-surface-400">Browse the catalog to get started!</p>
                  </div>
                )}
              </div>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.length > 0 ? (
                  certificates.map((cert) => (
                    <div key={cert.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-2xl mb-2" aria-label="Certificate">🏆</div>
                          <h3 className="font-semibold text-lg text-surface-900 dark:text-white">{cert.courseTitle}</h3>
                          <div className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                            Certificate: {cert.certificateNumber}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          cert.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200'
                        }`} aria-label={`Certificate status: ${cert.isActive ? 'Active' : 'Expired'}`}>
                          {cert.isActive ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-surface-600 dark:text-surface-400">Issued</div>
                          <div className="font-medium text-surface-900 dark:text-white">{new Date(cert.issuedAt).toLocaleDateString()}</div>
                        </div>
                        {cert.expiryDate && (
                          <div>
                            <div className="text-surface-600 dark:text-surface-400">Expires</div>
                            <div className="font-medium text-surface-900 dark:text-white">{new Date(cert.expiryDate).toLocaleDateString()}</div>
                          </div>
                        )}
                        {cert.scoreAchieved && (
                          <div>
                            <div className="text-surface-600 dark:text-surface-400">Score</div>
                            <div className="font-medium text-surface-900 dark:text-white">{cert.scoreAchieved}%</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 dark:hover:bg-primary-600 text-sm transition-colors">
                          Download
                        </button>
                        <button className="px-4 py-2 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-600 text-sm transition-colors">
                          Share
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-surface-400 mx-auto mb-4" />
                    <p className="text-surface-500 dark:text-surface-400 text-lg font-medium mb-2">No certificates earned yet.</p>
                    <p className="text-surface-600 dark:text-surface-400">Complete courses to earn certificates!</p>
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
