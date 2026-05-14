'use client';

// Full-page offer-letter creation route. Migrated out of the
// recruitment/pipeline kanban modal in Phase 5 polish.
//
// URL contract: /recruitment/candidates/[candidateId]/offer?applicantId=…
//   - candidateId  → from path param (used by letterService.generateOfferLetter)
//   - applicantId  → from query string (used by applicantService.updateStatus to
//                    flip the kanban row to OFFERED after the letter is issued)
// Returning to pipeline after success is done via router.back().

import {useEffect, useRef, useState} from 'react';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import {AlertCircle, ArrowLeft, CheckCircle, FileText, Loader2} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Input} from '@/components/ui/Input';
import {Select} from '@/components/ui/Select';
import {Textarea} from '@/components/ui/Textarea';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useApplicant} from '@/lib/hooks/queries/useApplicants';
import {useActiveLetterTemplates} from '@/lib/hooks/queries/useLetter';
import {LetterCategory} from '@/lib/types/hrms/letter';
import {letterService} from '@/lib/services/hrms/letter.service';
import {applicantService} from '@/lib/services/hire/applicant.service';
import {ApplicationStatus} from '@/lib/types/hire/applicant';
import {getErrorMessage} from '@/lib/utils/error-handler';

export default function CreateOfferPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const candidateId = params.id as string;
  const applicantId = searchParams.get('applicantId') ?? '';

  const {data: applicant, isLoading: applicantLoading} = useApplicant(applicantId, !!applicantId);
  const {data: letterTemplates = [], isLoading: templatesLoading} = useActiveLetterTemplates();
  const offerTemplates = letterTemplates.filter((t) => t.category === LetterCategory.OFFER);

  const [form, setForm] = useState({
    templateId: '',
    offeredCtc: '',
    offeredDesignation: '',
    proposedJoiningDate: '',
    additionalNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefill defaults once applicant + templates resolve.
  useEffect(() => {
    if (!applicant || !offerTemplates.length) return;
    setForm((prev) => ({
      templateId: prev.templateId || (offerTemplates.length === 1 ? offerTemplates[0].id : ''),
      offeredCtc: prev.offeredCtc || (applicant.expectedSalary?.toString() ?? ''),
      offeredDesignation: prev.offeredDesignation || (applicant.jobTitle ?? ''),
      proposedJoiningDate: prev.proposedJoiningDate,
      additionalNotes: prev.additionalNotes,
    }));
  }, [applicant, offerTemplates]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (!applicantId) {
      setError('Missing applicantId in the URL. Open this page from the pipeline kanban.');
      return;
    }
    if (!form.templateId) {
      setError('Please select a letter template');
      return;
    }
    if (!form.offeredCtc || isNaN(Number(form.offeredCtc))) {
      setError('Please enter a valid CTC amount');
      return;
    }
    if (!form.offeredDesignation.trim()) {
      setError('Please enter the offered designation');
      return;
    }
    if (!form.proposedJoiningDate) {
      setError('Please select a proposed joining date');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const letter = await letterService.generateOfferLetter(
        {
          templateId: form.templateId,
          candidateId,
          offeredCtc: Number(form.offeredCtc),
          offeredDesignation: form.offeredDesignation.trim(),
          proposedJoiningDate: form.proposedJoiningDate,
          additionalNotes: form.additionalNotes || undefined,
          sendForESign: true,
        },
        '',
      );

      await letterService.generatePdf(letter.id);
      await letterService.issueOfferLetterWithESign(letter.id, '');

      await applicantService.updateStatus(applicantId, {
        status: ApplicationStatus.OFFERED,
        notes: `Offer letter sent (Ref: ${letter.referenceNumber})`,
      });

      setSuccess(`Offer letter sent successfully! Reference: ${letter.referenceNumber}`);
      successTimeoutRef.current = setTimeout(() => {
        router.back();
      }, 2000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create and send offer letter'));
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = applicantLoading || templatesLoading;
  const candidateName = applicant?.candidateName || 'Candidate';

  return (
    <AppLayout
      activeMenuItem="recruitment"
      breadcrumbs={[
        {label: 'Recruitment', href: '/recruitment'},
        {label: 'Pipeline', href: '/recruitment/pipeline'},
        {label: 'Create Offer'},
      ]}
    >
      <PermissionGate
        anyOf={[Permissions.RECRUITMENT_VIEW, Permissions.RECRUITMENT_VIEW_ALL]}
        fallback={
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-[var(--text-muted)]">
              You do not have permission to create offer letters.
            </p>
          </div>
        }
      >
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.back()}
            >
              Back to Pipeline
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent-500" />
                <CardTitle>Create Offer Letter for {candidateName}</CardTitle>
              </div>
              <CardDescription>
                Generate a templated offer, render it to PDF, send for e-signature, and
                advance the applicant to the Offered stage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && (
                  <div className="bg-danger-50 border border-danger-200 dark:bg-danger-950/20 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm rounded-lg px-4 py-4 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-success-50 border border-success-200 dark:bg-success-950/20 dark:border-success-800 text-success-700 dark:text-success-300 text-sm rounded-lg px-4 py-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                {!applicantId && (
                  <div className="bg-warning-50 border border-warning-200 dark:bg-warning-950/20 dark:border-warning-800 text-warning-700 dark:text-warning-300 text-sm rounded-lg px-4 py-4">
                    Missing <code className="font-mono">applicantId</code> in the URL. Return to the
                    pipeline and click the &quot;Create Offer Letter&quot; menu item to come back with
                    the right context.
                  </div>
                )}

                {/* Template selector */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Offer Letter Template *
                  </label>
                  {isLoading ? (
                    <div className="flex items-center gap-2 h-10 px-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-secondary)] text-body-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading templates…
                    </div>
                  ) : (
                    <Select
                      value={form.templateId}
                      onChange={(e) => setForm((prev) => ({...prev, templateId: e.target.value}))}
                      disabled={submitting}
                    >
                      <option value="">Select a template</option>
                      {offerTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                      {offerTemplates.length === 0 && (
                        <option value="" disabled>
                          No offer templates found. Create one in Letters settings.
                        </option>
                      )}
                    </Select>
                  )}
                </div>

                <Input
                  label="Offered CTC (Annual, INR) *"
                  type="number"
                  placeholder="e.g. 1200000"
                  value={form.offeredCtc}
                  onChange={(e) => setForm((prev) => ({...prev, offeredCtc: e.target.value}))}
                  disabled={submitting}
                />

                <Input
                  label="Offered Designation *"
                  placeholder="e.g. Senior Software Engineer"
                  value={form.offeredDesignation}
                  onChange={(e) =>
                    setForm((prev) => ({...prev, offeredDesignation: e.target.value}))
                  }
                  disabled={submitting}
                />

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Proposed Joining Date *
                  </label>
                  <input
                    type="date"
                    value={form.proposedJoiningDate}
                    onChange={(e) =>
                      setForm((prev) => ({...prev, proposedJoiningDate: e.target.value}))
                    }
                    min={new Date().toISOString().split('T')[0]}
                    disabled={submitting}
                    className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-input)] focus:border-accent-500 disabled:bg-[var(--bg-secondary)] disabled:text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Additional Notes
                  </label>
                  <Textarea
                    placeholder="Any additional terms or notes to include…"
                    value={form.additionalNotes}
                    onChange={(e) =>
                      setForm((prev) => ({...prev, additionalNotes: e.target.value}))
                    }
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                <div className="bg-accent-50 border border-accent-200 dark:bg-accent-950/20 dark:border-accent-800 rounded-lg p-4 text-xs text-accent-700 dark:text-accent-300">
                  The offer letter will be generated, a PDF created, and a signing link sent to the
                  candidate&apos;s email. The applicant will be moved to <strong>Offered</strong> stage
                  automatically.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    isLoading={submitting}
                    loadingText="Sending Offer…"
                    disabled={!!success || !applicantId}
                  >
                    Generate &amp; Send Offer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
