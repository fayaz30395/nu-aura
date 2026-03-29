'use client';

import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useCandidate } from '@/lib/hooks/queries/useRecruitment';
import { getStatusColor, getStageColor } from '../utils';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  MapPin,
  Briefcase,
  Calendar,
  Edit2,
  ExternalLink,
  User,
} from 'lucide-react';

export default function CandidateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params.id as string;

  const { data: candidate, isLoading, error: queryError } = useCandidate(candidateId);

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="recruitment">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700" />
            <p className="mt-4 text-[var(--text-secondary)]">Loading candidate details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isLoading && !queryError && !candidate) {
    notFound();
  }

  if (queryError || !candidate) {
    return (
      <AppLayout activeMenuItem="recruitment">
        <div className="p-6">
          <button
            onClick={() => router.push('/recruitment/candidates')}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </button>
          <Card className="bg-[var(--bg-card)]">
            <CardContent className="p-12 text-center">
              <p className="text-[var(--text-muted)]">Failed to load candidate details.</p>
              <Button onClick={() => router.push('/recruitment/candidates')} className="mt-4">
                Return to Candidates
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="recruitment">
      <div className="p-6 space-y-6">
        {/* Back navigation + actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/recruitment/candidates')}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/recruitment/interviews?candidateId=${candidate.id}`)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Schedule Interview
            </Button>
            <PermissionGate permission={Permissions.CANDIDATE_VIEW}>
              <Button
                onClick={() => router.push(`/recruitment/candidates?edit=${candidate.id}`)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit Candidate
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Header card */}
        <Card className="bg-[var(--bg-card)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 h-20 w-20 bg-accent-100 dark:bg-accent-900/30 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-accent-700 dark:text-accent-300">
                  {candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                  {candidate.fullName}
                </h1>
                <p className="text-[var(--text-muted)] font-mono text-sm mt-1">{candidate.candidateCode}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                    {candidate.status.replace(/_/g, ' ')}
                  </span>
                  {candidate.currentStage && (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(candidate.currentStage)}`}>
                      {candidate.currentStage.replace(/_/g, ' ')}
                    </span>
                  )}
                  {candidate.source && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full badge-status status-neutral">
                      {candidate.source.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact info */}
          <Card className="bg-[var(--bg-card)]">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Contact Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Mail className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">Email</p>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{candidate.email}</p>
                  </div>
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-4">
                    <Phone className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Phone</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.phone}</p>
                    </div>
                  </div>
                )}
                {candidate.currentLocation && (
                  <div className="flex items-center gap-4">
                    <MapPin className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Location</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.currentLocation}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional info */}
          <Card className="bg-[var(--bg-card)]">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Professional Details
              </h2>
              <div className="space-y-4">
                {candidate.currentCompany && (
                  <div className="flex items-center gap-4">
                    <Building className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Current Company</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.currentCompany}</p>
                    </div>
                  </div>
                )}
                {candidate.currentDesignation && (
                  <div className="flex items-center gap-4">
                    <Briefcase className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Designation</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.currentDesignation}</p>
                    </div>
                  </div>
                )}
                {candidate.jobTitle && (
                  <div className="flex items-center gap-4">
                    <Briefcase className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Applied For</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.jobTitle}</p>
                    </div>
                  </div>
                )}
                {candidate.assignedRecruiterName && (
                  <div className="flex items-center gap-4">
                    <User className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Assigned Recruiter</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.assignedRecruiterName}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key metrics */}
          <Card className="bg-[var(--bg-card)]">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Key Metrics
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                  <p className="text-xs text-[var(--text-muted)]">Experience</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {candidate.totalExperience ? `${candidate.totalExperience}y` : '-'}
                  </p>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                  <p className="text-xs text-[var(--text-muted)]">Notice Period</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {candidate.noticePeriodDays ? `${candidate.noticePeriodDays}d` : '-'}
                  </p>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                  <p className="text-xs text-[var(--text-muted)]">Current CTC</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {candidate.currentCtc?.toLocaleString() || '-'}
                  </p>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] rounded-xl text-center">
                  <p className="text-xs text-[var(--text-muted)]">Expected CTC</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {candidate.expectedCtc?.toLocaleString() || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offer details (when applicable) */}
        {(candidate.offeredCtc || candidate.offeredDesignation || candidate.proposedJoiningDate) && (
          <Card className="bg-[var(--bg-card)]">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Offer Details
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {candidate.offeredCtc && (
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)]">Offered CTC</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {candidate.offeredCtc.toLocaleString()}
                    </p>
                  </div>
                )}
                {candidate.offeredDesignation && (
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)]">Offered Designation</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {candidate.offeredDesignation}
                    </p>
                  </div>
                )}
                {candidate.proposedJoiningDate && (
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)]">Proposed Joining</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatDate(candidate.proposedJoiningDate)}
                    </p>
                  </div>
                )}
                {candidate.offerExtendedDate && (
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)]">Offer Extended</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatDate(candidate.offerExtendedDate)}
                    </p>
                  </div>
                )}
                {candidate.offerAcceptedDate && (
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)]">Offer Accepted</p>
                    <p className="text-sm font-semibold text-success-700 dark:text-success-400">
                      {formatDate(candidate.offerAcceptedDate)}
                    </p>
                  </div>
                )}
                {candidate.offerDeclinedDate && (
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <p className="text-xs text-[var(--text-muted)]">Offer Declined</p>
                    <p className="text-sm font-semibold text-danger-700 dark:text-danger-400">
                      {formatDate(candidate.offerDeclinedDate)}
                    </p>
                  </div>
                )}
              </div>
              {candidate.offerDeclineReason && (
                <div className="mt-4 p-4 bg-danger-50 dark:bg-danger-900/10 rounded-xl border border-danger-200 dark:border-danger-800">
                  <p className="text-xs text-[var(--text-muted)]">Decline Reason</p>
                  <p className="text-sm text-[var(--text-primary)]">{candidate.offerDeclineReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline & additional info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dates */}
          <Card className="bg-[var(--bg-card)]">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Timeline
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-muted)]">Applied</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {formatDate(candidate.appliedDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-muted)]">Created</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {formatDate(candidate.createdAt)}
                  </span>
                </div>
                {candidate.updatedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-muted)]">Last Updated</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {formatDate(candidate.updatedAt)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes & resume */}
          <Card className="bg-[var(--bg-card)]">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Additional Info
              </h2>
              <div className="space-y-4">
                {candidate.resumeUrl && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Resume</p>
                    <a
                      href={candidate.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-accent-700 dark:text-accent-400 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Resume
                    </a>
                  </div>
                )}
                {candidate.notes ? (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Notes</p>
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{candidate.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">No additional notes.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
