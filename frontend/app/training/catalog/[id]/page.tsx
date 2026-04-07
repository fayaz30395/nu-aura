'use client';

import {useEffect, useRef, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Lock,
  Play,
  Star,
  Users,
} from 'lucide-react';
import {Badge, Button, Card, CardContent} from '@/components/ui';
import type {BadgeVariant} from '@/components/ui/types';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  useCourseDetail,
  useCourseEnrollment,
  useEnrollCourse,
  useUpdateContentProgress,
} from '@/lib/hooks/queries/useLearning';
import type {CourseModule, ModuleContent} from '@/lib/services/grow/lms.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, BadgeVariant> = {
  BEGINNER: 'success',
  INTERMEDIATE: 'warning',
  ADVANCED: 'destructive',
  EXPERT: 'secondary',
};

const CONTENT_TYPE_ICON: Record<string, React.ReactNode> = {
  VIDEO: <Play className="h-4 w-4"/>,
  DOCUMENT: <FileText className="h-4 w-4"/>,
  TEXT: <BookOpen className="h-4 w-4"/>,
  QUIZ: <GraduationCap className="h-4 w-4"/>,
  ASSIGNMENT: <FileText className="h-4 w-4"/>,
  SCORM: <BookOpen className="h-4 w-4"/>,
  EXTERNAL_LINK: <ExternalLink className="h-4 w-4"/>,
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({value}: { value: number }) {
  return (
    <div className="w-full bg-[var(--bg-muted)] rounded-full h-2">
      <div
        className="bg-accent-600 h-2 rounded-full transition-all duration-300"
        style={{width: `${Math.min(100, Math.max(0, value))}%`}}
      />
    </div>
  );
}

// ─── Video Player ─────────────────────────────────────────────────────────────

function VideoPlayer({
                       url,
                       title,
                       onComplete,
                     }: {
  url: string;
  title: string;
  onComplete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCompleted, setHasCompleted] = useState(false);

  const handleEnded = () => {
    if (!hasCompleted) {
      setHasCompleted(true);
      onComplete();
    }
  };

  // Mark complete at 90% watched
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || hasCompleted) return;
    if (video.duration && video.currentTime / video.duration >= 0.9) {
      setHasCompleted(true);
      onComplete();
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={url}
        controls
        className="w-full max-h-[480px] object-contain"
        title={title}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
      >
        <track kind="captions"/>
        Your browser does not support the video element.
      </video>
      {hasCompleted && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 bg-success-600 text-white text-xs font-medium px-2 py-1 rounded-full">
          <CheckCircle className="h-3.5 w-3.5"/>
          Completed
        </div>
      )}
    </div>
  );
}

// ─── SCORM Launcher ───────────────────────────────────────────────────────────

function ScormLauncher({
                         url,
                         title,
                         onLaunch,
                       }: {
  url: string;
  title: string;
  onLaunch: () => void;
}) {
  const [launched, setLaunched] = useState(false);

  const handleLaunch = () => {
    setLaunched(true);
    onLaunch();
  };

  return (
    <div className="space-y-4">
      {!launched ? (
        <div
          className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-[var(--border-main)] rounded-lg bg-[var(--bg-muted)] gap-4">
          <BookOpen className="h-10 w-10 text-[var(--text-muted)]"/>
          <p className="text-body-muted">SCORM package ready to launch</p>
          <Button onClick={handleLaunch} className="flex items-center gap-2">
            <Play className="h-4 w-4"/>
            Launch SCORM Content
          </Button>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border border-[var(--border-main)]">
          <div className="row-between px-4 py-2 bg-[var(--bg-muted)] border-b border-[var(--border-main)]">
            <span className="text-xs font-medium text-[var(--text-secondary)]">{title}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3"/>
              Open in new tab
            </a>
          </div>
          <iframe
            src={url}
            title={title}
            className="w-full h-[540px] border-0"
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}
    </div>
  );
}

// ─── Text Content Viewer ─────────────────────────────────────────────────────

function TextContent({content, onComplete}: { content: string; onComplete: () => void }) {
  const [read, setRead] = useState(false);
  return (
    <div className="space-y-4">
      <div
        className="prose prose-sm max-w-none p-4 bg-[var(--bg-muted)] rounded-lg text-[var(--text-primary)] border border-[var(--border-main)]"
        dangerouslySetInnerHTML={{__html: content}}
      />
      {!read && (
        <Button
          size="sm"
          onClick={() => {
            setRead(true);
            onComplete();
          }}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4"/>
          Mark as Read
        </Button>
      )}
      {read && (
        <div className="flex items-center gap-2 text-success-600 text-sm font-medium">
          <CheckCircle className="h-4 w-4"/>
          Marked as read
        </div>
      )}
    </div>
  );
}

// ─── Content Viewer ───────────────────────────────────────────────────────────

function ContentViewer({
                         content,
                         enrollmentId,
                         onProgress,
                       }: {
  content: ModuleContent;
  enrollmentId: string | null;
  onProgress: (contentId: string) => void;
}) {
  const handleComplete = () => {
    if (enrollmentId) onProgress(content.id);
  };

  switch (content.contentType) {
    case 'VIDEO':
      return content.videoUrl ? (
        <VideoPlayer url={content.videoUrl} title={content.title} onComplete={handleComplete}/>
      ) : (
        <p className="text-body-muted">No video URL available.</p>
      );

    case 'SCORM':
      return content.documentUrl ? (
        <ScormLauncher url={content.documentUrl} title={content.title} onLaunch={handleComplete}/>
      ) : (
        <p className="text-body-muted">No SCORM package URL available.</p>
      );

    case 'DOCUMENT':
      return content.documentUrl ? (
        <div className="space-y-4">
          <a
            href={content.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-accent-600 hover:underline text-sm"
          >
            <FileText className="h-4 w-4"/>
            Open Document
          </a>
          <Button size="sm" onClick={handleComplete} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4"/>
            Mark as Complete
          </Button>
        </div>
      ) : null;

    case 'TEXT':
      return content.textContent ? (
        <TextContent content={content.textContent} onComplete={handleComplete}/>
      ) : (
        <p className="text-body-muted">No text content available.</p>
      );

    case 'EXTERNAL_LINK':
      return content.documentUrl ? (
        <div className="space-y-4">
          <a
            href={content.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-accent-600 hover:underline text-sm"
          >
            <ExternalLink className="h-4 w-4"/>
            Open External Link
          </a>
          <Button size="sm" onClick={handleComplete} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4"/>
            Mark as Complete
          </Button>
        </div>
      ) : null;

    default:
      return (
        <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)] gap-4">
          <GraduationCap className="h-8 w-8"/>
          <p className="text-sm">Content type &quot;{content.contentType}&quot; will be available soon.</p>
          <Button size="sm" onClick={handleComplete} variant="outline">
            Mark as Complete
          </Button>
        </div>
      );
  }
}

// ─── Module Accordion Item ────────────────────────────────────────────────────

function ModuleItem({
                      module,
                      enrollmentId,
                      completedContentIds,
                      onContentComplete,
                    }: {
  module: CourseModule;
  enrollmentId: string | null;
  completedContentIds: Set<string>;
  onContentComplete: (contentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);

  const contents = module.contents ?? [];
  const completedCount = contents.filter((c) => completedContentIds.has(c.id)).length;
  const totalCount = contents.length;
  const moduleProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const _activeContent = contents.find((c) => c.id === activeContentId) ?? null;

  return (
    <div className="border border-[var(--border-main)] rounded-lg overflow-hidden">
      {/* Module header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full row-between px-4 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)] transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]"/>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]"/>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-[var(--text-primary)] truncate">{module.title}</p>
            {module.description && (
              <p className="text-caption mt-0.5 truncate">{module.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          {module.durationMinutes && (
            <span className="text-caption flex items-center gap-1">
              <Clock className="h-3 w-3"/>
              {module.durationMinutes}m
            </span>
          )}
          <span className="text-caption">
            {completedCount}/{totalCount}
          </span>
          {moduleProgress === 100 && (
            <CheckCircle className="h-4 w-4 text-success-500"/>
          )}
        </div>
      </button>

      {/* Module body */}
      {expanded && (
        <div className="border-t border-[var(--border-main)]">
          {contents.length === 0 ? (
            <p className="text-body-muted px-4 py-2">No content in this module yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border-main)]">
              {contents.map((content) => {
                const isCompleted = completedContentIds.has(content.id);
                const isActive = activeContentId === content.id;

                return (
                  <div key={content.id} className="flex flex-col">
                    {/* Content row */}
                    <button
                      onClick={() => setActiveContentId(isActive ? null : content.id)}
                      className={`w-full flex items-center gap-4 px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-accent-50'
                          : 'hover:bg-[var(--bg-muted)]'
                      }`}
                    >
                      <span className={`shrink-0 ${isCompleted ? 'text-success-500' : 'text-[var(--text-muted)]'}`}>
                        {isCompleted ? <CheckCircle className="h-4 w-4"/> : CONTENT_TYPE_ICON[content.contentType]}
                      </span>
                      <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{content.title}</span>
                      {content.isMandatory && (
                        <span
                          className="text-xs text-danger-600 bg-danger-50 px-1.5 py-0.5 rounded shrink-0">Required</span>
                      )}
                      {content.durationMinutes && (
                        <span className="text-caption shrink-0">{content.durationMinutes}m</span>
                      )}
                      {!enrollmentId && <Lock className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0"/>}
                    </button>

                    {/* Inline player */}
                    {isActive && (
                      <div className="px-4 py-4 bg-[var(--bg-muted)] border-t border-[var(--border-main)]">
                        {enrollmentId ? (
                          <ContentViewer
                            content={content}
                            enrollmentId={enrollmentId}
                            onProgress={onContentComplete}
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-body-muted py-4 justify-center">
                            <Lock className="h-4 w-4"/>
                            Enroll in this course to access content.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Module progress bar */}
          {totalCount > 0 && (
            <div className="px-4 py-2 bg-[var(--bg-surface)] border-t border-[var(--border-main)]">
              <ProgressBar value={moduleProgress}/>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const router = useRouter();

  const {data: course, isLoading: courseLoading, isError: courseError} = useCourseDetail(courseId);
  const {data: enrollment, isLoading: enrollmentLoading} = useCourseEnrollment(courseId);
  const enrollMutation = useEnrollCourse();
  const progressMutation = useUpdateContentProgress();

  // Local state for completed content (optimistic)
  const [completedContentIds, setCompletedContentIds] = useState<Set<string>>(new Set());

  // Track enrollment id
  const enrollmentId = enrollment?.id ?? null;

  // Calculate progress
  const allContents: ModuleContent[] = (course?.modules ?? []).flatMap(
    (m) => m.contents ?? []
  );
  const totalContents = allContents.length;
  const completedCount = completedContentIds.size;
  const overallProgress =
    totalContents > 0
      ? Math.round((completedCount / totalContents) * 100)
      : enrollment?.progressPercentage ?? 0;

  // Use server progress on initial load
  useEffect(() => {
    if (enrollment?.progressPercentage && enrollment.progressPercentage > 0 && completedContentIds.size === 0) {
      // Server gives a % but not individual IDs — nothing to pre-fill in local set
    }
  }, [enrollment, completedContentIds.size]);

  const handleContentComplete = (contentId: string) => {
    if (!enrollmentId || completedContentIds.has(contentId)) return;

    setCompletedContentIds((prev) => new Set([...prev, contentId]));
    progressMutation.mutate({
      enrollmentId,
      contentId,
      status: 'COMPLETED',
    });
  };

  const handleEnroll = () => {
    enrollMutation.mutate(courseId);
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (courseLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96 text-[var(--text-muted)]">
          <Loader2 className="h-8 w-8 animate-spin mr-4"/>
          <span>Loading course…</span>
        </div>
      </AppLayout>
    );
  }

  if (courseError || !course) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-96 text-[var(--text-muted)] space-y-4">
          <AlertCircle className="h-10 w-10"/>
          <p className="text-lg font-medium">Course not found</p>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const difficultyVariant = DIFFICULTY_COLORS[course.difficultyLevel] ?? 'secondary';
  const modules = course.modules ?? [];
  const isEnrolled = !!enrollment && enrollment.status !== 'DROPPED';

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-body-muted hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4"/>
          Back to catalog
        </button>

        {/* Course header */}
        <Card className="border border-[var(--border-main)]">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Thumbnail */}
              <div
                className="h-40 w-full md:w-56 shrink-0 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg flex items-center justify-center overflow-hidden">
                {course.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <GraduationCap className="h-16 w-16 text-accent-300"/>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant={difficultyVariant} className="text-xs">
                    {course.difficultyLevel}
                  </Badge>
                  {course.isMandatory && (
                    <Badge variant="danger" className="text-xs">Mandatory</Badge>
                  )}
                  {course.isSelfPaced && (
                    <Badge variant="secondary" className="text-xs">Self-Paced</Badge>
                  )}
                  {course.status === 'PUBLISHED' && (
                    <Badge variant="success" className="text-xs">Published</Badge>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                  {course.title}
                </h1>

                {course.description && (
                  <p className="text-body-muted leading-relaxed">
                    {course.description}
                  </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-body-muted">
                  {course.durationHours && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4"/>
                      {course.durationHours}h
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4"/>
                    {course.totalEnrollments ?? 0} enrolled
                  </span>
                  {course.avgRating && (
                    <span className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-warning-400 fill-warning-400"/>
                      {course.avgRating.toFixed(1)} ({course.totalRatings} ratings)
                    </span>
                  )}
                  {course.instructorName && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4"/>
                      {course.instructorName}
                    </span>
                  )}
                </div>

                {/* Enrollment CTA */}
                <div className="flex items-center gap-4 pt-1">
                  {enrollmentLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]"/>
                  ) : isEnrolled ? (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2 text-success-600 text-sm font-medium">
                        <CheckCircle className="h-5 w-5"/>
                        Enrolled
                      </div>
                      <div className="flex-1 max-w-xs space-y-1">
                        <div className="flex justify-between text-caption">
                          <span>Progress</span>
                          <span>{overallProgress}%</span>
                        </div>
                        <ProgressBar value={overallProgress}/>
                      </div>
                      {enrollment?.status === 'COMPLETED' && (
                        <div className="flex items-center gap-1.5 text-success-600 text-sm font-medium">
                          <Award className="h-5 w-5"/>
                          Completed!
                        </div>
                      )}
                    </div>
                  ) : (
                    <PermissionGate permission={Permissions.TRAINING_ENROLL}>
                      <Button
                        onClick={handleEnroll}
                        disabled={enrollMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        {enrollMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin"/>
                        ) : (
                          <Award className="h-4 w-4"/>
                        )}
                        Enroll Now
                      </Button>
                    </PermissionGate>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two-column layout: modules + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Modules list */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Course Content</h2>
            {modules.length === 0 ? (
              <Card className="border border-[var(--border-main)]">
                <CardContent className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] gap-4">
                  <BookOpen className="h-10 w-10"/>
                  <p className="text-sm">No modules available yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {modules
                  .slice()
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((module) => (
                    <ModuleItem
                      key={module.id}
                      module={module}
                      enrollmentId={enrollmentId}
                      completedContentIds={completedContentIds}
                      onContentComplete={handleContentComplete}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Overall progress card */}
            {isEnrolled && (
              <Card className="border border-[var(--border-main)]">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Your Progress</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-caption">
                      <span>{completedCount} of {totalContents} completed</span>
                      <span>{overallProgress}%</span>
                    </div>
                    <ProgressBar value={overallProgress}/>
                  </div>
                  {enrollment?.status === 'COMPLETED' && (
                    <div className="flex items-center gap-2 text-success-600 text-sm font-medium">
                      <Award className="h-5 w-5"/>
                      Course Complete!
                    </div>
                  )}
                  {enrollment?.lastAccessedAt && (
                    <p className="text-caption">
                      Last accessed: {new Date(enrollment.lastAccessedAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Course info card */}
            <Card className="border border-[var(--border-main)]">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Course Info</h3>
                <dl className="space-y-2 text-sm">
                  {course.code && (
                    <div className="flex justify-between">
                      <dt className="text-[var(--text-muted)]">Code</dt>
                      <dd className="font-medium text-[var(--text-primary)]">{course.code}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Difficulty</dt>
                    <dd><Badge variant={difficultyVariant} className="text-xs">{course.difficultyLevel}</Badge></dd>
                  </div>
                  {course.durationHours && (
                    <div className="flex justify-between">
                      <dt className="text-[var(--text-muted)]">Duration</dt>
                      <dd className="font-medium text-[var(--text-primary)]">{course.durationHours}h</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Modules</dt>
                    <dd className="font-medium text-[var(--text-primary)]">{modules.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Lessons</dt>
                    <dd className="font-medium text-[var(--text-primary)]">{totalContents}</dd>
                  </div>
                  {course.passingScore > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-[var(--text-muted)]">Passing Score</dt>
                      <dd className="font-medium text-[var(--text-primary)]">{course.passingScore}%</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Self-Paced</dt>
                    <dd className="font-medium text-[var(--text-primary)]">{course.isSelfPaced ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
