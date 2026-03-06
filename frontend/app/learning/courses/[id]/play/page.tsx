'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Play,
  FileText,
  BookOpen,
  HelpCircle,
  ExternalLink,
  Award,
  X,
  Menu,
} from 'lucide-react';
import { lmsService, Course, CourseEnrollment, ModuleContent } from '@/lib/services/lms.service';

type ContentStatus = 'not_started' | 'in_progress' | 'completed';

interface ContentState {
  [contentId: string]: ContentStatus;
}

const CONTENT_TYPE_ICON = {
  VIDEO: Play,
  DOCUMENT: FileText,
  TEXT: BookOpen,
  QUIZ: HelpCircle,
  ASSIGNMENT: FileText,
  SCORM: ExternalLink,
  EXTERNAL_LINK: ExternalLink,
};

const CONTENT_TYPE_LABEL = {
  VIDEO: 'Video',
  DOCUMENT: 'Document',
  TEXT: 'Article',
  QUIZ: 'Quiz',
  ASSIGNMENT: 'Assignment',
  SCORM: 'Interactive',
  EXTERNAL_LINK: 'External Link',
};

export default function CoursePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [contentStatus, setContentStatus] = useState<ContentState>({});
  const [savingProgress, setSavingProgress] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoProgressRef = useRef<number>(0);

  // Flatten all contents across modules
  const allContents = course?.modules?.flatMap(m => m.contents ?? []) ?? [];
  const activeContent = allContents.find(c => c.id === activeContentId) ?? null;
  const activeContentIdx = allContents.findIndex(c => c.id === activeContentId);
  // Sanitize HTML content to prevent XSS (admin-authored but defense-in-depth)
  const sanitizedTextContent = useMemo(
    () => (activeContent?.textContent ? DOMPurify.sanitize(activeContent.textContent) : ''),
    [activeContent?.textContent]
  );

  // Compute overall progress
  const totalContents = allContents.length;
  const completedCount = Object.values(contentStatus).filter(s => s === 'completed').length;
  const overallProgress = totalContents > 0 ? Math.round((completedCount / totalContents) * 100) : 0;

  useEffect(() => {
    loadCourse();
  }, [id]);

  async function loadCourse() {
    try {
      setLoading(true);
      const [courseData, enrollments] = await Promise.all([
        lmsService.getCourse(id),
        lmsService.getMyEnrollments().catch(() => [] as CourseEnrollment[]),
      ]);
      setCourse(courseData);

      const enroll = enrollments.find(e => e.courseId === id) ?? null;
      setEnrollment(enroll);

      // If not enrolled, enroll now
      if (!enroll) {
        let newEnroll: CourseEnrollment | null = null;
        try {
          newEnroll = await lmsService.enrollSelf(id);
        } catch {
          newEnroll = null;
        }
        setEnrollment(newEnroll);
      }

      // Set first content as active
      const firstContent = courseData.modules?.[0]?.contents?.[0];
      if (firstContent) {
        setActiveContentId(firstContent.id);
        setContentStatus(prev => ({
          ...prev,
          [firstContent.id]: 'in_progress',
        }));
      }
    } catch (err) {
      setError('Failed to load course. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const markComplete = useCallback(async (contentId: string) => {
    setContentStatus(prev => ({ ...prev, [contentId]: 'completed' }));

    // Update enrollment progress via API
    if (enrollment) {
      setSavingProgress(true);
      const newCompleted = Object.values({ ...contentStatus, [contentId]: 'completed' }).filter(s => s === 'completed').length;
      const pct = totalContents > 0 ? Math.round((newCompleted / totalContents) * 100) : 0;
      try {
        const updated = await lmsService.updateEnrollmentProgress(enrollment.id, pct);
        setEnrollment(updated as any);
        if (pct === 100) setShowCompletion(true);
      } catch {
        // Progress save failed silently — local state still updated
      } finally {
        setSavingProgress(false);
      }
    }
  }, [enrollment, contentStatus, totalContents]);

  const navigateTo = (contentId: string) => {
    setActiveContentId(contentId);
    if (contentStatus[contentId] !== 'completed') {
      setContentStatus(prev => ({ ...prev, [contentId]: 'in_progress' }));
    }
    // Scroll to top on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    if (activeContentIdx < allContents.length - 1) {
      const next = allContents[activeContentIdx + 1];
      if (activeContent && contentStatus[activeContent.id] !== 'completed') {
        markComplete(activeContent.id);
      }
      navigateTo(next.id);
    }
  };

  const goPrev = () => {
    if (activeContentIdx > 0) {
      navigateTo(allContents[activeContentIdx - 1].id);
    }
  };

  // ─── Video progress tracking ──────────────────────────────────────────────
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !activeContentId) return;
    const pct = video.currentTime / video.duration;
    videoProgressRef.current = pct;
    if (pct >= 0.9 && contentStatus[activeContentId] !== 'completed') {
      markComplete(activeContentId);
    }
  };

  // ─── Render content area ──────────────────────────────────────────────────
  const renderContent = () => {
    if (!activeContent) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <BookOpen className="h-16 w-16 mb-4" />
          <p className="text-lg">Select content from the sidebar to begin</p>
        </div>
      );
    }

    switch (activeContent.contentType) {
      case 'VIDEO':
        return (
          <div className="flex flex-col gap-4">
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              {activeContent.videoUrl ? (
                <video
                  ref={videoRef}
                  key={activeContent.id}
                  src={activeContent.videoUrl}
                  controls
                  className="w-full h-full"
                  onTimeUpdate={handleVideoTimeUpdate}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Play className="h-16 w-16 opacity-30" />
                  <span className="ml-3">Video not available</span>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => markComplete(activeContent.id)}
                disabled={contentStatus[activeContent.id] === 'completed'}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  contentStatus[activeContent.id] === 'completed'
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {contentStatus[activeContent.id] === 'completed' ? '✓ Completed' : 'Mark as Complete'}
              </button>
            </div>
          </div>
        );

      case 'TEXT':
        return (
          <div className="flex flex-col gap-4">
            <div className="prose max-w-none bg-white rounded-lg border border-gray-200 p-6">
              {sanitizedTextContent ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizedTextContent }} />
              ) : (
                <p className="text-gray-400 italic">No content available</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => markComplete(activeContent.id)}
                disabled={contentStatus[activeContent.id] === 'completed'}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  contentStatus[activeContent.id] === 'completed'
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {contentStatus[activeContent.id] === 'completed' ? '✓ Completed' : 'Mark as Complete'}
              </button>
            </div>
          </div>
        );

      case 'DOCUMENT':
        return (
          <div className="flex flex-col gap-4">
            {activeContent.documentUrl ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">{activeContent.title}</span>
                  <a
                    href={activeContent.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in new tab
                  </a>
                </div>
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(activeContent.documentUrl)}&embedded=true`}
                  className="w-full h-[600px]"
                  title={activeContent.title}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-lg border border-gray-200 text-gray-400">
                <FileText className="h-12 w-12 mb-2 opacity-30" />
                <span>Document not available</span>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => markComplete(activeContent.id)}
                disabled={contentStatus[activeContent.id] === 'completed'}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  contentStatus[activeContent.id] === 'completed'
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {contentStatus[activeContent.id] === 'completed' ? '✓ Completed' : 'Mark as Complete'}
              </button>
            </div>
          </div>
        );

      case 'QUIZ':
        return (
          <div className="flex flex-col items-center justify-center h-64 bg-purple-50 rounded-lg border border-purple-200 gap-4">
            <HelpCircle className="h-12 w-12 text-purple-400" />
            <div className="text-center">
              <p className="font-semibold text-purple-800">Quiz: {activeContent.title}</p>
              <p className="text-sm text-purple-600 mt-1">
                Quiz engine coming soon. Mark as complete to proceed.
              </p>
            </div>
            <button
              onClick={() => markComplete(activeContent.id)}
              disabled={contentStatus[activeContent.id] === 'completed'}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                contentStatus[activeContent.id] === 'completed'
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {contentStatus[activeContent.id] === 'completed' ? '✓ Completed' : 'Take Quiz'}
            </button>
          </div>
        );

      case 'EXTERNAL_LINK':
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-lg border border-gray-200 gap-4">
              <ExternalLink className="h-12 w-12 text-gray-400" />
              <p className="text-gray-600">External resource</p>
              <a
                href={activeContent.videoUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Open Link
              </a>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => markComplete(activeContent.id)}
                disabled={contentStatus[activeContent.id] === 'completed'}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  contentStatus[activeContent.id] === 'completed'
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {contentStatus[activeContent.id] === 'completed' ? '✓ Completed' : 'Mark as Complete'}
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-48 text-gray-400">
            Content type not supported yet
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Course not found'}</p>
          <Link href="/learning" className="text-blue-600 hover:underline text-sm">
            ← Back to Learning
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/learning" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-gray-800 truncate max-w-xs">{course.title}</p>
            {activeContent && (
              <p className="text-xs text-gray-400">{activeContent.title}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {savingProgress && (
            <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
          )}
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium">{overallProgress}%</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              disabled={activeContentIdx <= 0}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goNext}
              disabled={activeContentIdx >= allContents.length - 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Course Content</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {completedCount} / {totalContents} completed
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {course.modules?.map((mod, modIdx) => (
                <div key={mod.id}>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-600">
                      {modIdx + 1}. {mod.title}
                    </p>
                  </div>
                  {mod.contents?.map((content, contentIdx) => {
                    const status = contentStatus[content.id] ?? 'not_started';
                    const isActive = content.id === activeContentId;
                    const Icon = CONTENT_TYPE_ICON[content.contentType] ?? FileText;
                    return (
                      <button
                        key={content.id}
                        onClick={() => navigateTo(content.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 ${
                          isActive
                            ? 'bg-blue-50 border-l-2 border-l-blue-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : status === 'in_progress' ? (
                            <div className="h-4 w-4 rounded-full border-2 border-blue-500 bg-blue-100" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                            {contentIdx + 1}. {content.title}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Icon className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {CONTENT_TYPE_LABEL[content.contentType]}
                              {content.durationMinutes ? ` · ${content.durationMinutes}m` : ''}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeContent ? (
            <div className="max-w-4xl mx-auto">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{activeContent.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const Icon = CONTENT_TYPE_ICON[activeContent.contentType] ?? FileText;
                    return <Icon className="h-4 w-4 text-gray-400" />;
                  })()}
                  <span className="text-sm text-gray-500">
                    {CONTENT_TYPE_LABEL[activeContent.contentType]}
                    {activeContent.durationMinutes ? ` · ${activeContent.durationMinutes} min` : ''}
                  </span>
                  {contentStatus[activeContent.id] === 'completed' && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium ml-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    </span>
                  )}
                </div>
              </div>

              {renderContent()}

              {/* Navigation buttons */}
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={goPrev}
                  disabled={activeContentIdx <= 0}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={goNext}
                  disabled={activeContentIdx >= allContents.length - 1}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <BookOpen className="h-16 w-16 opacity-20" />
              <p>Select content to begin learning</p>
            </div>
          )}
        </main>
      </div>

      {/* Completion overlay */}
      {showCompletion && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-100 rounded-full">
                <Award className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Complete!</h2>
            <p className="text-gray-500 text-sm mb-6">
              You've completed <span className="font-semibold text-gray-900">{course.title}</span>.
              {enrollment?.certificateId && ' Your certificate has been issued.'}
            </p>
            <div className="flex flex-col gap-2">
              {enrollment?.certificateId && (
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700">
                  Download Certificate
                </button>
              )}
              <Link
                href="/learning"
                className="block w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-50 text-center"
              >
                Back to Learning
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
