'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  BarChart2,
  BookOpen,
  Users,
  Star,
  Play,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Download,
  AlertCircle,
} from 'lucide-react';
import { lmsService, Course, CourseEnrollment } from '@/lib/services/lms.service';
import { apiClient } from '@/lib/api/client';

const DIFFICULTY_COLOR = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
};

interface Quiz {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  timeLimit?: number;
  passingScore: number;
  status: 'AVAILABLE' | 'COMPLETED' | 'PASSED' | 'FAILED';
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [downloadingCert, setDownloadingCert] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [courseData, enrollments, quizzesData] = await Promise.all([
        lmsService.getCourse(id),
        lmsService.getMyEnrollments().catch(() => [] as CourseEnrollment[]),
        apiClient.get<Quiz[]>(`/lms/courses/${id}/quizzes`).catch(() => ({ data: [] as Quiz[] })),
      ]);
      setCourse(courseData);
      const enroll = enrollments.find(e => e.courseId === id) ?? null;
      setEnrollment(enroll);
      setQuizzes(quizzesData.data || []);
      
      // Expand first module by default
      if (courseData.modules?.[0]) {
        setExpandedModules(new Set([courseData.modules[0].id]));
      }
    } catch {
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll() {
    setEnrolling(true);
    try {
      const enroll = await lmsService.enrollSelf(id);
      setEnrollment(enroll as CourseEnrollment);
      router.push(`/learning/courses/${id}/play`);
    } catch (err: unknown) {
      const error = err as any;
      setError(error?.response?.data?.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleDownloadCertificate() {
    if (!enrollment?.certificateId) return;

    try {
      setDownloadingCert(true);
      const response = await apiClient.get<Blob>(`/lms/certificates/${enrollment.certificateId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${enrollment.certificateId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download certificate');
    } finally {
      setDownloadingCert(false);
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const totalContents = course?.modules?.reduce((acc, m) => acc + (m.contents?.length ?? 0), 0) ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error || 'Course not found'}</p>
        <Link href="/learning" className="text-blue-600 hover:underline">← Back to Learning</Link>
      </div>
    );
  }

  const isEnrolled = !!enrollment;
  const progress = enrollment ? Math.round(Number(enrollment.progressPercentage)) : 0;
  const completionPercentage = progress;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link href="/learning" className="flex items-center gap-1 text-blue-200 hover:text-white text-sm mb-4 w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Learning
          </Link>
          {course.isMandatory && (
            <span className="inline-block mb-3 px-2 py-0.5 bg-orange-400 text-white text-xs font-semibold rounded-full">
              Mandatory
            </span>
          )}
          <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
          {course.shortDescription && (
            <p className="text-blue-100 text-base mb-4">{course.shortDescription}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-blue-200">
            {course.difficultyLevel && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLOR[course.difficultyLevel as keyof typeof DIFFICULTY_COLOR] ?? 'bg-gray-100 text-gray-700'}`}>
                {course.difficultyLevel}
              </span>
            )}
            {course.durationHours && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {course.durationHours}h
              </span>
            )}
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> {totalContents} lessons
            </span>
            {course.totalEnrollments > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {course.totalEnrollments.toLocaleString()} enrolled
              </span>
            )}
            {course.avgRating && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
                {course.avgRating.toFixed(1)} ({course.totalRatings})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: course info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {course.description && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About this course</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{course.description}</p>
            </div>
          )}

          {/* Progress (if enrolled) */}
          {isEnrolled && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Progress</h2>
              
              {/* Completion percentage */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{completionPercentage}%</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Status: <span className="font-medium capitalize text-gray-900 dark:text-white">{enrollment?.status?.toLowerCase().replace('_', ' ')}</span>
                  {enrollment?.completedAt && ` · Completed ${new Date(enrollment.completedAt).toLocaleDateString()}`}
                </p>
              </div>

              {/* Progress segments by module */}
              {course.modules && course.modules.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Modules Progress</p>
                  <div className="space-y-1">
                    {course.modules.map((mod, idx) => (
                      <div key={mod.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400 flex-1 truncate">{idx + 1}. {mod.title}</span>
                        <span className="text-gray-900 dark:text-white font-medium ml-2">
                          {Math.round(completionPercentage / course.modules!.length)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quizzes Section */}
          {isEnrolled && quizzes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Quizzes & Assessments
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} · Test your knowledge
                </p>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {quizzes.map((quiz, idx) => {
                  const isAvailable = quiz.status === 'AVAILABLE';
                  const isPassed = quiz.status === 'PASSED';
                  const isFailed = quiz.status === 'FAILED';

                  return (
                    <div key={quiz.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-6">{idx + 1}</span>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{quiz.title}</h4>
                            {isPassed && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium rounded">
                                <CheckCircle2 className="h-3 w-3" /> Passed
                              </span>
                            )}
                            {isFailed && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-medium rounded">
                                <AlertCircle className="h-3 w-3" /> Failed
                              </span>
                            )}
                          </div>
                          {quiz.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{quiz.description}</p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>{quiz.totalQuestions} questions</span>
                            {quiz.timeLimit && <span>{quiz.timeLimit} min time limit</span>}
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{quiz.passingScore}% to pass</span>
                          </div>
                        </div>

                        <button
                          onClick={() => router.push(`/learning/courses/${id}/quiz/${quiz.id}`)}
                          disabled={!isAvailable && !isPassed && !isFailed}
                          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                            isAvailable || isPassed || isFailed
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isPassed ? 'Review' : isFailed ? 'Retry' : 'Take Quiz'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Curriculum */}
          {course.modules && course.modules.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course Curriculum</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {course.modules.length} modules · {totalContents} lessons
                </p>
              </div>
              <div>
                {course.modules.map((mod, idx) => {
                  const expanded = expandedModules.has(mod.id);
                  return (
                    <div key={mod.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">{idx + 1}</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{mod.title}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {mod.contents?.length ?? 0} lessons
                              {mod.durationMinutes ? ` · ${mod.durationMinutes}m` : ''}
                            </p>
                          </div>
                        </div>
                        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
                      </button>
                      {expanded && mod.contents && (
                        <div className="bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
                          {mod.contents.map((content, cIdx) => (
                            <div key={content.id} className="flex items-center gap-3 px-6 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                              <span className="text-xs text-gray-400 dark:text-gray-500 w-4">{cIdx + 1}</span>
                              <BookOpen className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                              <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{content.title}</p>
                              {content.durationMinutes && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">{content.durationMinutes}m</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: CTA card */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm sticky top-6">
            {course.thumbnailUrl && (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-36 object-cover rounded-md mb-4"
              />
            )}

            {isEnrolled ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {enrollment?.status === 'COMPLETED' && !enrollment?.certificateId && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      Processing your certificate... This should appear within a few minutes.
                    </p>
                  </div>
                )}

                <Link
                  href={`/learning/courses/${id}/play`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors mb-2"
                >
                  <Play className="h-4 w-4" />
                  {progress > 0 ? 'Continue Learning' : 'Start Course'}
                </Link>

                {enrollment?.certificateId && (
                  <button
                    onClick={handleDownloadCertificate}
                    disabled={downloadingCert}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-green-600 text-green-600 dark:text-green-400 rounded-md text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 mb-2 disabled:opacity-60"
                  >
                    {downloadingCert ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" /> Download Certificate
                      </>
                    )}
                  </button>
                )}

                {enrollment?.status === 'COMPLETED' && enrollment?.certificateId && (
                  <Link
                    href="/learning/certificates"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Award className="h-4 w-4 text-green-600 dark:text-green-400" /> View All Certificates
                  </Link>
                )}
              </>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {enrolling ? (
                  <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Enrolling...</>
                ) : (
                  <><Play className="h-4 w-4" /> Enroll &amp; Start</>
                )}
              </button>
            )}

            {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {course.instructorName && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-500">Instructor</span>
                  <span className="font-medium text-gray-900 dark:text-white">{course.instructorName}</span>
                </div>
              )}
              {course.durationHours && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-500">Duration</span>
                  <span className="font-medium text-gray-900 dark:text-white">{course.durationHours}h</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-500">Level</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">{course.difficultyLevel?.toLowerCase()}</span>
              </div>
              {course.passingScore && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-500">Passing score</span>
                  <span className="font-medium text-gray-900 dark:text-white">{course.passingScore}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-500">Certificate</span>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Awarded
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
