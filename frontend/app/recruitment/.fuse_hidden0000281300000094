'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonStatCard, SkeletonCard } from '@/components/ui/Skeleton';
import { PageErrorFallback } from '@/components/errors/PageErrorFallback';
import {
  useJobOpenings,
  useCandidates,
  useAllInterviews,
  useJobOpeningsByStatus,
} from '@/lib/hooks/queries/useRecruitment';
import {
  Briefcase,
  Users,
  Calendar,
  FileText,
  Plus,
  User,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { JobOpening, Candidate, Interview, CandidateStatus } from '@/lib/types/recruitment';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

function getCandidateStatusColor(status: CandidateStatus): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const statusColorMap: Record<CandidateStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    NEW: 'info',
    SCREENING: 'warning',
    INTERVIEW: 'warning',
    SELECTED: 'success',
    OFFER_EXTENDED: 'success',
    OFFER_ACCEPTED: 'success',
    OFFER_DECLINED: 'danger',
    REJECTED: 'danger',
    WITHDRAWN: 'danger',
  };
  return statusColorMap[status] || 'default';
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function isToday(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isThisWeek(dateString?: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();

  // Get the start of this week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Get the end of this week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
}

export default function RecruitmentDashboard() {
  const router = useRouter();

  // Fetch data using React Query hooks
  const jobOpeningsQuery = useJobOpenings(0, 100);
  const candidatesQuery = useCandidates(0, 100);
  const openJobsQuery = useJobOpeningsByStatus('OPEN');
  const interviewsQuery = useAllInterviews(0, 100);

  // Derived statistics
  const stats = useMemo(() => {
    const candidates = candidatesQuery.data?.content || [];
    const openJobs = openJobsQuery.data || [];
    const interviews = interviewsQuery.data?.content || [];

    const activeJobs = openJobs.length;
    const totalCandidates = candidates.length;

    // Calculate interviews this week using actual interview schedule data
    const interviewsThisWeek = interviews.filter(
      (interview) =>
        isThisWeek(interview.scheduledAt) &&
        (interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED')
    ).length;

    // Calculate pending offers
    const pendingOffers = candidates.filter((c) => c.status === 'OFFER_EXTENDED').length;

    return {
      activeJobs,
      totalCandidates,
      interviewsThisWeek,
      pendingOffers,
    };
  }, [candidatesQuery.data, openJobsQuery.data, interviewsQuery.data]);

  // Get recent openings
  const recentOpenings: JobOpening[] = useMemo(() => {
    const jobs = jobOpeningsQuery.data?.content || [];
    return jobs
      .filter((job) => job.status === 'OPEN')
      .sort(
        (a, b) =>
          new Date(b.postedDate || b.createdAt).getTime() -
          new Date(a.postedDate || a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [jobOpeningsQuery.data]);

  // Get recent applications (all sorted, no slice — lazy-rendered in UI)
  const recentApplications: Candidate[] = useMemo(() => {
    const candidates = candidatesQuery.data?.content || [];
    return candidates.sort(
      (a, b) =>
        new Date(b.appliedDate || b.createdAt).getTime() -
        new Date(a.appliedDate || a.createdAt).getTime()
    );
  }, [candidatesQuery.data]);

  // Lazy-load: show 10 initially, load 10 more when scrolled to bottom
  const BATCH_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const visibleApplications = useMemo(
    () => recentApplications.slice(0, visibleCount),
    [recentApplications, visibleCount]
  );

  const hasMore = visibleCount < recentApplications.length;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, recentApplications.length));
        }
      },
      { root: container, rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, recentApplications.length]);

  // Get today's interviews from actual interview data
  const todaysInterviews: Interview[] = useMemo(() => {
    const interviews = interviewsQuery.data?.content || [];
    return interviews.filter(
      (interview) =>
        isToday(interview.scheduledAt) &&
        (interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED')
    );
  }, [interviewsQuery.data]);

  const isLoading =
    jobOpeningsQuery.isLoading || candidatesQuery.isLoading || openJobsQuery.isLoading || interviewsQuery.isLoading;

  const hasError =
    jobOpeningsQuery.isError || candidatesQuery.isError || openJobsQuery.isError || interviewsQuery.isError;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-32 bg-[var(--bg-secondary)] rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (hasError) {
    return (
      <AppLayout>
        <PageErrorFallback
          title="Failed to Load Recruitment Data"
          error={new Error('There was an error loading the recruitment dashboard. Please try refreshing the page.')}
          onReset={() => window.location.reload()}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[var(--text-primary)]">
              Recruitment Dashboard
            </h1>
            <p className="text-[var(--text-muted)] mt-2">
              Track job openings, candidates, and interviews
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/recruitment/jobs')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Post New Job
            </Button>
            <Button
              onClick={() => router.push('/recruitment/candidates')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Add Candidate
            </Button>
          </div>
        </motion.div>

        {/* Summary Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            title="Active Job Openings"
            value={stats.activeJobs}
            variant="primary"
            size="compact"
            onAction={() => router.push('/recruitment/jobs')}
            actionLabel="View Jobs"
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            title="Total Candidates"
            value={stats.totalCandidates}
            variant="success"
            size="compact"
            onAction={() => router.push('/recruitment/candidates')}
            actionLabel="View All"
          />
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            title="Interviews This Week"
            value={stats.interviewsThisWeek}
            variant="blue"
            size="compact"
            onAction={() => router.push('/recruitment/interviews')}
            actionLabel="Schedule"
          />
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            title="Pending Offers"
            value={stats.pendingOffers}
            variant="orange"
            size="compact"
            onAction={() => router.push('/recruitment/candidates')}
            actionLabel="Review"
          />
        </motion.div>

        {/* Interviews Today Card */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Interviews Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaysInterviews.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-12 w-12" />}
                  title="No Interviews Today"
                  description="Schedule interviews or check back later"
                  action={{
                    label: 'Schedule Interview',
                    onClick: () => router.push('/recruitment/interviews'),
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {todaysInterviews.map((interview, index) => (
                    <motion.div
                      key={interview.id}
                      className="p-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-secondary)]/50"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-[var(--text-primary)]">
                            {interview.candidateName || 'Candidate'}
                          </h4>
                          <p className="text-sm text-[var(--text-muted)]">
                            {interview.jobTitle || 'Position'}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(interview.scheduledAt)}
                            {interview.interviewRound && (
                              <Badge variant="info" size="sm">
                                {interview.interviewRound.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Openings Card */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                Active Job Openings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOpenings.length === 0 ? (
                <EmptyState
                  icon={<Briefcase className="h-12 w-12" />}
                  title="No Active Openings"
                  description="Start by posting a new job opening"
                  action={{
                    label: 'Post Job',
                    onClick: () => router.push('/recruitment/jobs'),
                  }}
                />
              ) : (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {recentOpenings.map((job, index) => (
                    <motion.div
                      key={job.id}
                      className="p-4 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/recruitment/jobs?id=${job.id}`)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[var(--text-primary)]">
                            {job.jobTitle}
                          </h3>
                          <div className="flex gap-4 mt-2 text-sm text-[var(--text-muted)]">
                            {job.departmentName && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {job.departmentName}
                              </span>
                            )}
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {job.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="success" size="sm">
                          {job.candidateCount || 0} Applications
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Applications Card */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-success-600 dark:text-success-400" />
                  Recent Applications
                </CardTitle>
                {recentApplications.length > 0 && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {visibleApplications.length} of {recentApplications.length}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentApplications.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="No Applications Yet"
                  description="Applications will appear here as they arrive"
                />
              ) : (
                <div
                  ref={scrollContainerRef}
                  className="space-y-4 max-h-[460px] overflow-y-auto pr-1"
                >
                  {visibleApplications.map((candidate, index) => (
                    <motion.div
                      key={candidate.id}
                      className="p-4 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/recruitment/candidates?id=${candidate.id}`)
                      }
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index, 5) * 0.05 }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold text-[var(--text-primary)] truncate"
                            title={candidate.fullName}
                          >
                            {candidate.fullName}
                          </h3>
                          <p className="text-sm text-[var(--text-muted)] truncate" title={candidate.jobTitle || 'Position not specified'}>
                            {candidate.jobTitle || 'Position not specified'}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            Applied {formatDate(candidate.appliedDate)}
                          </p>
                        </div>
                        <Badge variant={getCandidateStatusColor(candidate.status)} size="sm">
                          {candidate.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                  {/* Lazy-load sentinel with spinner */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="flex justify-center items-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary-600 dark:text-primary-400 mr-2" />
                      <span className="text-xs text-[var(--text-muted)]">
                        Loading more candidates...
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </AppLayout>
  );
}
