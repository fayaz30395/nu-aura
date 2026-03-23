'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout';
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
import { useCourseDetail, useMyEnrollments, useUpdateCourseProgress } from '@/lib/hooks/queries/useLearning';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [contentStatus, setContentStatus] = useState<ContentState>({});
  const [showCompletion, setShowCompletion] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoProgressRef = useRef<number>(0);

  // Queries
  const { data: course, isLoading } = useCourseDetail(id);
  const { data: allEnrollments } = useMyEnrollments();
  const updateProgressMutation = useUpdateCourseProgress();

  // Find current enrollment
  const enrollment = allEnrollments?.find(e => e.courseId === id) ?? null;

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

  // Set first content as active when course loads
  if (course && activeContentId === null) {
    const firstContent = course.modules?.[0]?.contents?.[0];
    if (firstContent) {
      setActiveContentId(firstContent.id);
      setContentStatus(prev => ({
        ...prev,
        [firstContent.id]: 'in_progress',
      }));
    }
  }

  const markComplete = useCallback(async (contentId: string) => {
    setContentStatus(prev => ({ ...prev, [contentId]: 'completed' }));

    // Update enrollment progress via API
    if (enrollment) {
      const newCompleted = Object.values({ ...contentStatus, [contentId]: 'completed' }).filter(s => s === 'completed').length;
      const pct = totalContents > 0 ? Math.round((newCompleted / totalContents) * 100) : 0;
      try {
        await updateProgressMutation.mutateAsync({ enrollmentId: enrollment.id, progressPercent: pct });
        if (pct === 100) setShowCompletion(true);
      } catch {
        // Progress save failed silently — local state still updated
      }
    }
  }, [enrollment, contentStatus, totalContents, updateProgressMutation]);

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
        <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
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
                <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
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
            <div className="prose max-w-none skeuo-card p-6">
              {sanitizedTextContent ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizedTextContent }} />
              ) : (
                <p className="text-[var(--text-muted)] italic">No content available</p>
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
              <div className="skeuo-card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)] bg-[var(--bg-surface)]">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{activeContent.title}</span>
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
              <div className="flex flex-col items-center justify-center h-48 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-main)] text-[var(--text-muted)]">
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
            <div className="flex flex-col items-center justify-center h-48 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-main)] gap-4">
              <ExternalLink className="h-12 w-12 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)]">External resource</p>
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
          <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
            Content type not supported yet
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-secondary)]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && !error && !course) {
    notFound();
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-secondary)]">
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
    <AppLayout>
      <div className="flex flex-col h-screen bg-[var(--bg-surface)] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-[var(--border-main)] shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/learning" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <X className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-gray-800 truncate max-w-xs">{course.title}</p>
            {activeContent && (
              <p className="text-xs text-[var(--text-muted)]">{activeContent.title}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {updateProgressMutation.isPending && (
            <span className="text-xs text-[var(--text-muted)] animate-pulse">Saving...</span>
          )}
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-xs text-[var(--text-muted)] font-medium">{overallProgress}%</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              disabled={activeContentIdx <= 0}
              className="p-1.5 rounded hover:bg-[var(--bg-surface)] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goNext}
              disabled={activeContentIdx >= allContents.length - 1}
              className="p-1.5 rounded hover:bg-[var(--bg-surface)] disabled:opacity-30 disabled:cursor-not-allowed"
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
          <aside className="w-72 bg-white border-r border-[var(--border-main)] flex flex-col overflow-y-auto shrink-0">
            <div className="p-4 border-b border-[var(--border-subtle)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Course Content</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {completedCount} / {totalContents} completed
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {course.modules?.map((mod, modIdx) => (
                <div key={mod.id}>
                  <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">
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
                        className={`w-full flex items-start gap-4 px-4 py-3 text-left transition-colors border-b border-gray-50 ${
                          isActive
                            ? 'bg-blue-50 border-l-2 border-l-blue-600'
                            : 'hover:bg-[var(--bg-surface)]'
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
                          <p className={`text-xs font-medium truncate ${isActive ? 'text-blue-700' : 'text-[var(--text-primary)]'}`}>
                            {contentIdx + 1}. {content.title}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Icon className="h-3 w-3 text-[var(--text-muted)]" />
                            <span className="text-xs text-[var(--text-muted)]">
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
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">{activeContent.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const Icon = CONTENT_TYPE_ICON[activeContent.contentType] ?? FileText;
                    return <Icon className="h-4 w-4 text-[var(--text-muted)]" />;
                  })()}
                  <span className="text-sm text-[var(--text-muted)]">
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
              <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border-main)]">
                <button
                  onClick={goPrev}
                  disabled={activeContentIdx <= 0}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
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
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-4">
              <BookOpen className="h-16 w-16 opacity-20" />
              <p>Select content to begin learning</p>
            </div>
          )}
        </main>
      </div>

      {/* Completion overlay */}
      {showCompletion && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50">
          <div className="skeuo-card p-8 max-w-sm w-full mx-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-100 rounded-full">
                <Award className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss mb-2">Course Complete!</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              You&apos;ve completed <span className="font-semibold text-[var(--text-primary)]">{course.title}</span>.
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
                className="block w-full px-4 py-2 border border-[var(--border-main)] text-[var(--text-primary)] rounded-md font-medium hover:bg-[var(--bg-surface)] text-center"
              >
                Back to Learning
              </Link>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  );
}
