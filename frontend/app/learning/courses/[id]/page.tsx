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
} from 'lucide-react';
import { lmsService, Course, CourseEnrollment } from '@/lib/services/lms.service';

const DIFFICULTY_COLOR = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [courseData, enrollments] = await Promise.all([
        lmsService.getCourse(id),
        lmsService.getMyEnrollments().catch(() => [] as CourseEnrollment[]),
      ]);
      setCourse(courseData);
      const enroll = enrollments.find(e => e.courseId === id) ?? null;
      setEnrollment(enroll);
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
      setEnrollment(enroll as any);
      router.push(`/learning/courses/${id}/play`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About this course</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{course.description}</p>
            </div>
          )}

          {/* Progress (if enrolled) */}
          {isEnrolled && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Progress</h2>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-semibold text-gray-700">{progress}%</span>
              </div>
              <p className="text-xs text-gray-500">
                Status: <span className="font-medium capitalize">{enrollment?.status?.toLowerCase().replace('_', ' ')}</span>
                {enrollment?.completedAt && ` · Completed ${new Date(enrollment.completedAt).toLocaleDateString()}`}
              </p>
            </div>
          )}

          {/* Curriculum */}
          {course.modules && course.modules.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Course Curriculum</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {course.modules.length} modules · {totalContents} lessons
                </p>
              </div>
              <div>
                {course.modules.map((mod, idx) => {
                  const expanded = expandedModules.has(mod.id);
                  return (
                    <div key={mod.id} className="border-b border-gray-100 last:border-0">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{mod.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {mod.contents?.length ?? 0} lessons
                              {mod.durationMinutes ? ` · ${mod.durationMinutes}m` : ''}
                            </p>
                          </div>
                        </div>
                        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </button>
                      {expanded && mod.contents && (
                        <div className="bg-gray-50 border-t border-gray-100">
                          {mod.contents.map((content, cIdx) => (
                            <div key={content.id} className="flex items-center gap-3 px-6 py-2.5 border-b border-gray-100 last:border-0">
                              <span className="text-xs text-gray-400 w-4">{cIdx + 1}</span>
                              <BookOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <p className="text-sm text-gray-700 flex-1">{content.title}</p>
                              {content.durationMinutes && (
                                <span className="text-xs text-gray-400">{content.durationMinutes}m</span>
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
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm sticky top-6">
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
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-semibold text-gray-800">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <Link
                  href={`/learning/courses/${id}/play`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  {progress > 0 ? 'Continue Learning' : 'Start Course'}
                </Link>
                {enrollment?.certificateId && (
                  <button className="flex items-center justify-center gap-2 w-full mt-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
                    <Award className="h-4 w-4 text-green-600" /> View Certificate
                  </button>
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

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              {course.instructorName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Instructor</span>
                  <span className="font-medium">{course.instructorName}</span>
                </div>
              )}
              {course.durationHours && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="font-medium">{course.durationHours}h</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Level</span>
                <span className="font-medium capitalize">{course.difficultyLevel?.toLowerCase()}</span>
              </div>
              {course.passingScore && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Passing score</span>
                  <span className="font-medium">{course.passingScore}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Certificate</span>
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Awarded on completion
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
