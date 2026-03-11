'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { lmsService, Course, CourseEnrollment, Certificate, LmsDashboard } from '@/lib/services/lms.service';

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-courses' | 'certificates'>('catalog');
  const [courses, setCourses] = useState<Course[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<CourseEnrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [dashboard, setDashboard] = useState<LmsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const dashboardData = await lmsService.getMyDashboard();
      setDashboard(dashboardData);

      if (activeTab === 'catalog') {
        const result = await lmsService.getPublishedCourses();
        setCourses(result.content);
      } else if (activeTab === 'my-courses') {
        const enrollments = await lmsService.getMyEnrollments();
        setMyEnrollments(enrollments);
      } else if (activeTab === 'certificates') {
        const certs = await lmsService.getMyCertificates();
        setCertificates(certs);
      }
    } catch (error) {
      console.error('Error loading learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrollingId(courseId);
      await lmsService.enrollSelf(courseId);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to enroll in course');
    } finally {
      setEnrollingId(null);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'ADVANCED': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  const getStatusColor = (status: string) => {
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
        {dashboard && (
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
        )}

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

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            {/* Course Catalog Tab */}
            {activeTab === 'catalog' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <div key={course.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md overflow-hidden">
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-40 object-cover" />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-4xl text-white">📚</span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{course.title}</h3>
                          {course.isMandatory && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-xs rounded-full">Mandatory</span>
                          )}
                        </div>
                        {course.shortDescription && (
                          <p className="text-surface-600 dark:text-surface-400 text-sm mb-3 line-clamp-2">{course.shortDescription}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(course.difficultyLevel)}`}>
                            {course.difficultyLevel}
                          </span>
                          {course.durationHours && (
                            <span className="px-2 py-1 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-xs rounded-full">
                              {course.durationHours}h
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-sm text-surface-600 dark:text-surface-400 mb-4">
                          <span>{course.totalEnrollments} enrolled</span>
                          {course.avgRating && (
                            <span className="flex items-center">
                              ⭐ {course.avgRating.toFixed(1)} ({course.totalRatings})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleEnroll(course.id)}
                          disabled={enrollingId === course.id}
                          className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                          {enrollingId === course.id ? 'Enrolling...' : 'Enroll Now'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center text-surface-500 dark:text-surface-400">
                    No courses available at the moment.
                  </div>
                )}
              </div>
            )}

            {/* My Courses Tab */}
            {activeTab === 'my-courses' && (
              <div className="space-y-4">
                {myEnrollments.length > 0 ? (
                  myEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">Course #{enrollment.courseId.slice(0, 8)}</h3>
                          <div className="flex gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(enrollment.status)}`}>
                              {enrollment.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{enrollment.progressPercentage?.toFixed(0) || 0}%</div>
                          <div className="text-sm text-surface-600 dark:text-surface-400">Progress</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2 mb-4">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(enrollment.progressPercentage || 0)}`}
                          style={{ width: `${enrollment.progressPercentage || 0}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-sm text-surface-600 dark:text-surface-400">
                        <div>
                          Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          {enrollment.lastAccessedAt && (
                            <span className="ml-4">
                              Last accessed: {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <a
                          href={`/learning/course/${enrollment.courseId}`}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                        >
                          {enrollment.status === 'COMPLETED' ? 'Review' : 'Continue'}
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center text-surface-500 dark:text-surface-400">
                    You haven&apos;t enrolled in any courses yet. Browse the catalog to get started!
                  </div>
                )}
              </div>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.length > 0 ? (
                  certificates.map((cert) => (
                    <div key={cert.id} className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-2xl mb-2">🏆</div>
                          <h3 className="font-semibold text-lg">{cert.courseTitle}</h3>
                          <div className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                            Certificate: {cert.certificateNumber}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          cert.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200'
                        }`}>
                          {cert.isActive ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-surface-600 dark:text-surface-400">Issued</div>
                          <div className="font-medium">{new Date(cert.issuedAt).toLocaleDateString()}</div>
                        </div>
                        {cert.expiryDate && (
                          <div>
                            <div className="text-surface-600 dark:text-surface-400">Expires</div>
                            <div className="font-medium">{new Date(cert.expiryDate).toLocaleDateString()}</div>
                          </div>
                        )}
                        {cert.scoreAchieved && (
                          <div>
                            <div className="text-surface-600 dark:text-surface-400">Score</div>
                            <div className="font-medium">{cert.scoreAchieved}%</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm">
                          Download
                        </button>
                        <button className="px-4 py-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 text-sm">
                          Share
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-surface-50 dark:bg-surface-800 rounded-lg shadow-md p-8 text-center text-surface-500 dark:text-surface-400">
                    No certificates earned yet. Complete courses to earn certificates!
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
