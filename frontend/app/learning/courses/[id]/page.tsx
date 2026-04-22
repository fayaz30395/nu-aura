'use client';

import {useState} from 'react';
import Image from 'next/image';
import {notFound, useParams, useRouter} from 'next/navigation';
import Link from 'next/link';
import {AppLayout} from '@/components/layout';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  HelpCircle,
  Play,
  Star,
  Users,
} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {apiClient} from '@/lib/api/client';
import {useToast} from '@/components/notifications/ToastProvider';
import {useCourseDetail, useEnrollCourse, useMyEnrollments} from '@/lib/hooks/queries/useLearning';

const DIFFICULTY_COLOR = {
  BEGINNER: 'bg-success-100 text-success-700',
  INTERMEDIATE: 'bg-warning-100 text-warning-700',
  ADVANCED: 'bg-danger-100 text-danger-700',
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
  const toast = useToast();
  const {id} = useParams<{ id: string }>();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const {data: course, isLoading: courseLoading} = useCourseDetail(id);
  const {data: allEnrollments, isLoading: enrollmentsLoading} = useMyEnrollments();
  const enrollMutation = useEnrollCourse();

  // Expand first module when course loads
  if (course?.modules?.[0] && expandedModules.size === 0) {
    setExpandedModules(new Set([course.modules[0].id]));
  }

  // Load quizzes
  const loadQuizzes = async () => {
    try {
      const response = await apiClient.get<Quiz[]>(`/lms/courses/${id}/quizzes`);
      setQuizzes(response.data || []);
    } catch {
      setQuizzes([]);
    }
  };

  // Load quizzes once course is loaded
  if (course && quizzes.length === 0) {
    loadQuizzes();
  }

  // Find current enrollment
  const enrollment = allEnrollments?.find(e => e.courseId === id) ?? null;

  async function handleEnroll() {
    try {
      await enrollMutation.mutateAsync(id);
      router.push(`/learning/courses/${id}/play`);
    } catch (err: unknown) {
      const apiError = err as unknown as { response?: { data?: { message?: string } } };
      setError(apiError?.response?.data?.message || 'Failed to enroll');
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
    } catch (_err) {
      toast.error('Failed to download certificate');
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
  const isLoading = courseLoading || enrollmentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className='animate-spin h-8 w-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full'/>
      </div>
    );
  }

  if (!isLoading && !error && !course) {
    notFound();
  }

  if (error || !course) {
    return (
      <div className="p-6 text-center">
        <p className='text-status-danger-text mb-4'>{error || 'Course not found'}</p>
        <Link href="/learning" className='text-accent hover:underline'>← Back to Learning</Link>
      </div>
    );
  }

  const isEnrolled = !!enrollment;
  const progress = enrollment ? Math.round(Number(enrollment.progressPercentage)) : 0;
  const completionPercentage = progress;

  return (
    <AppLayout>
      <div className="min-h-screen bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]">
        {/* Hero */}
        <div className='bg-gradient-to-r from-accent-700 to-accent-900 text-inverse'>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <Link href="/learning"
                  className='flex items-center gap-1 text-accent hover:text-inverse text-sm mb-4 w-fit'>
              <ArrowLeft className="h-4 w-4"/> Back to Learning
            </Link>
            {course.isMandatory && (
              <span
                className='inline-block mb-4 px-2 py-0.5 bg-status-warning-bg text-inverse text-xs font-semibold rounded-full'>
              Mandatory
            </span>
            )}
            <h1 className="text-xl font-bold skeuo-emboss mb-2">{course.title}</h1>
            {course.shortDescription && (
              <p className='text-accent text-base mb-4'>{course.shortDescription}</p>
            )}
            <div className='flex flex-wrap items-center gap-4 text-sm text-accent'>
              {course.difficultyLevel && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLOR[course.difficultyLevel as keyof typeof DIFFICULTY_COLOR] ?? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'}`}>
                {course.difficultyLevel}
              </span>
              )}
              {course.durationHours && (
                <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5"/> {course.durationHours}h
              </span>
              )}
              <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5"/> {totalContents} lessons
            </span>
              {course.totalEnrollments > 0 && (
                <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5"/> {course.totalEnrollments.toLocaleString()} enrolled
              </span>
              )}
              {course.avgRating && (
                <span className="flex items-center gap-1">
                <Star className='h-3.5 w-3.5 fill-warning-300 text-status-warning-text'/>
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
              <div
                className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] p-6">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">About this course</h2>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{course.description}</p>
              </div>
            )}

            {/* Progress (if enrolled) */}
            {isEnrolled && (
              <div
                className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] p-6">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Your Progress</h2>

                {/* Completion percentage */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 h-3 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-600 to-accent-400 rounded-full transition-all duration-500"
                        style={{width: `${completionPercentage}%`}}/>
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">{completionPercentage}%</span>
                  </div>
                  <p className="text-caption">
                    Status: <span
                    className="font-medium capitalize text-[var(--text-primary)]">{enrollment?.status ? enrollment.status.toLowerCase().replace('_', ' ') : '-'}</span>
                    {enrollment?.completedAt && ` · Completed ${new Date(enrollment.completedAt).toLocaleDateString()}`}
                  </p>
                </div>

                {/* Progress segments by module */}
                {course.modules && course.modules.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Modules Progress</p>
                    <div className="space-y-1">
                      {course.modules.map((mod, idx) => (
                        <div key={mod.id} className="row-between text-xs">
                          <span className="text-[var(--text-secondary)] flex-1 truncate">{idx + 1}. {mod.title}</span>
                          <span className="text-[var(--text-primary)] font-medium ml-2">
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
              <div
                className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] overflow-hidden">
                <div className="p-6 border-b border-[var(--border-main)]">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <HelpCircle className="h-5 w-5"/>
                    Quizzes & Assessments
                  </h2>
                  <p className="text-body-muted mt-1">
                    {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} · Test your knowledge
                  </p>
                </div>

                <div className="divide-y divide-[var(--border-main)]">
                  {quizzes.map((quiz, idx) => {
                    const isAvailable = quiz.status === 'AVAILABLE';
                    const isPassed = quiz.status === 'PASSED';
                    const isFailed = quiz.status === 'FAILED';

                    return (
                      <div key={quiz.id}
                           className="p-4 hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--text-muted)] w-6">{idx + 1}</span>
                              <h4 className="font-semibold text-[var(--text-primary)]">{quiz.title}</h4>
                              {isPassed && (
                                <span
                                  className='flex items-center gap-1 px-2 py-0.5 bg-status-success-bg text-status-success-text text-xs font-medium rounded'>
                                <CheckCircle2 className="h-3 w-3"/> Passed
                              </span>
                              )}
                              {isFailed && (
                                <span
                                  className='flex items-center gap-1 px-2 py-0.5 bg-status-danger-bg text-status-danger-text text-xs font-medium rounded'>
                                <AlertCircle className="h-3 w-3"/> Failed
                              </span>
                              )}
                            </div>
                            {quiz.description && (
                              <p className="text-caption mt-1 line-clamp-1">{quiz.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                              <span>{quiz.totalQuestions} questions</span>
                              {quiz.timeLimit && <span>{quiz.timeLimit} min time limit</span>}
                              <span className='text-accent font-medium'>{quiz.passingScore}% to pass</span>
                            </div>
                          </div>

                          <button
                            onClick={() => router.push(`/learning/courses/${id}/quiz/${quiz.id}`)}
                            disabled={!isAvailable && !isPassed && !isFailed}
                            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                              isAvailable || isPassed || isFailed
                                ? 'bg-accent-600 text-white hover:bg-accent-700'
                                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-not-allowed'
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
              <div
                className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] overflow-hidden">
                <div className="p-6 border-b border-[var(--border-main)]">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Course Curriculum</h2>
                  <p className="text-body-muted mt-0.5">
                    {course.modules.length} modules · {totalContents} lessons
                  </p>
                </div>
                <div>
                  {course.modules.map((mod, idx) => {
                    const expanded = expandedModules.has(mod.id);
                    return (
                      <div key={mod.id} className="border-b border-[var(--border-main)] last:border-0">
                        <button
                          onClick={() => toggleModule(mod.id)}
                          className="w-full row-between px-6 py-4 text-left hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-[var(--text-muted)] w-5">{idx + 1}</span>
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{mod.title}</p>
                              <p className="text-caption mt-0.5">
                                {mod.contents?.length ?? 0} lessons
                                {mod.durationMinutes ? ` · ${mod.durationMinutes}m` : ''}
                              </p>
                            </div>
                          </div>
                          {expanded ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]"/> :
                            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]"/>}
                        </button>
                        {expanded && mod.contents && (
                          <div
                            className="bg-[var(--bg-surface)] dark:bg-[var(--bg-secondary)]/30 border-t border-[var(--border-main)]">
                            {mod.contents.map((content, cIdx) => (
                              <div key={content.id}
                                   className="flex items-center gap-4 px-6 py-2.5 border-b border-[var(--border-main)] last:border-0">
                                <span className="text-caption w-4">{cIdx + 1}</span>
                                <BookOpen className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0"/>
                                <p className="text-sm text-[var(--text-primary)] flex-1">{content.title}</p>
                                {content.durationMinutes && (
                                  <span className="text-caption">{content.durationMinutes}m</span>
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
            <div
              className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] p-6 shadow-[var(--shadow-card)] sticky top-6">
              {course.thumbnailUrl && (
                <div className="relative w-full h-36 mb-4">
                  <Image
                    src={course.thumbnailUrl}
                    alt={course.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 400px"
                    className="object-cover rounded-md"
                  />
                </div>
              )}

              {isEnrolled ? (
                <>
                  <div className="mb-4">
                    <div className="row-between text-sm mb-2">
                      <span className="text-[var(--text-secondary)]">Progress</span>
                      <span className="font-semibold text-[var(--text-primary)]">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div className='h-full bg-accent rounded-full' style={{width: `${progress}%`}}/>
                    </div>
                  </div>

                  {enrollment?.status === 'COMPLETED' && !enrollment?.certificateId && (
                    <div
                      className='mb-4 p-4 bg-status-warning-bg rounded-lg border border-status-warning-border'>
                      <p className='text-xs text-status-warning-text'>
                        Processing your certificate... This should appear within a few minutes.
                      </p>
                    </div>
                  )}

                  <Link
                    href={`/learning/courses/${id}/play`}
                    className='btn-primary flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-accent text-inverse rounded-md font-medium hover:bg-accent transition-colors mb-2'
                  >
                    <Play className="h-4 w-4"/>
                    {progress > 0 ? 'Continue Learning' : 'Start Course'}
                  </Link>

                  {enrollment?.certificateId && (
                    <button
                      onClick={handleDownloadCertificate}
                      disabled={downloadingCert}
                      className='flex items-center justify-center gap-2 w-full px-4 py-2 border border-status-success-border text-status-success-text rounded-md text-sm font-medium hover:bg-status-success-bg mb-2 disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                    >
                      {downloadingCert ? (
                        <>
                          <div
                            className='animate-spin h-4 w-4 border-2 border-status-success-border border-t-transparent rounded-full'/>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4"/> Download Certificate
                        </>
                      )}
                    </button>
                  )}

                  {enrollment?.status === 'COMPLETED' && enrollment?.certificateId && (
                    <Link
                      href="/learning/certificates"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-[var(--border-main)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-[var(--bg-surface)]"
                    >
                      <Award className='h-4 w-4 text-status-success-text'/> View All Certificates
                    </Link>
                  )}
                </>
              ) : (
                <PermissionGate permission={Permissions.LMS_ENROLL}>
                  <button
                    onClick={handleEnroll}
                    disabled={enrollMutation.isPending}
                    className='btn-primary w-full px-4 py-2.5 bg-accent text-inverse rounded-md font-medium hover:bg-accent transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                  >
                    {enrollMutation.isPending ? (
                      <>
                        <div
                          className='animate-spin h-4 w-4 border-2 border-[var(--bg-card)] border-t-transparent rounded-full'/>
                        Enrolling...</>
                    ) : (
                      <><Play className="h-4 w-4"/> Enroll &amp; Start</>
                    )}
                  </button>
                </PermissionGate>
              )}

              {error && <p className='mt-2 text-xs text-status-danger-text'>{error}</p>}

              <div className="mt-4 space-y-2 text-body-secondary">
                {course.instructorName && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Instructor</span>
                    <span className="font-medium text-[var(--text-primary)]">{course.instructorName}</span>
                  </div>
                )}
                {course.durationHours && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Duration</span>
                    <span className="font-medium text-[var(--text-primary)]">{course.durationHours}h</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Level</span>
                  <span
                    className="font-medium text-[var(--text-primary)] capitalize">{course.difficultyLevel?.toLowerCase()}</span>
                </div>
                {course.passingScore && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Passing score</span>
                    <span className="font-medium text-[var(--text-primary)]">{course.passingScore}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Certificate</span>
                  <span className='flex items-center gap-1 text-status-success-text font-medium'>
                  <CheckCircle2 className="h-3.5 w-3.5"/> Awarded
                </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
