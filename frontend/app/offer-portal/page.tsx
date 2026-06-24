'use client';

import {Suspense, useEffect, useState} from 'react';
import {toLocalDateString} from '@/lib/utils/date';
import {useSearchParams} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {useAcceptPublicOffer, useDeclinePublicOffer, usePublicOffer,} from '@/lib/hooks/queries/usePublicOffer';
import {type PublicOfferResponse} from '@/lib/services/hire/public-offer.service';
import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  Loader2,
  Mail,
  XCircle,
} from 'lucide-react';
import {formatCurrency} from '@/lib/utils';
import {formatDate as formatCanonicalDate} from '@/lib/utils/format/date';
import {safeUrl} from '@/lib/utils/safeUrl';

const acceptOfferSchema = z.object({
  confirmedJoiningDate: z.string().min(1, 'Please confirm your joining date'),
});

type AcceptOfferFormData = z.infer<typeof acceptOfferSchema>;

function OfferPortalLoading() {
  return (
    <div
      className="page-shell-centered motion-rise bg-gradient-to-br from-accent-50 to-surface-100 dark:from-surface-900 dark:to-surface-800">
      <div className="animate-pulse text-center">
        <Loader2 className="h-12 w-12 text-accent-500 animate-spin mx-auto mb-4"/>
        <p className="text-[var(--text-secondary)]">Loading offer details...</p>
      </div>
    </div>
  );
}

export default function OfferPortalWrapper() {
  return (
    <Suspense fallback={<OfferPortalLoading/>}>
      <OfferPortalPage/>
    </Suspense>
  );
}

function OfferPortalPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const {data: initialOffer, isLoading, error: queryError} = usePublicOffer(token, !!token);
  const acceptMutation = useAcceptPublicOffer();
  const declineMutation = useDeclinePublicOffer();

  const [offer, setOffer] = useState<PublicOfferResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const {
    register: registerAccept,
    handleSubmit: handleAcceptSubmit,
    setValue: setAcceptValue,
    formState: {errors: acceptErrors},
  } = useForm<AcceptOfferFormData>({
    resolver: zodResolver(acceptOfferSchema),
    defaultValues: {confirmedJoiningDate: ''},
  });

  // Update local offer state when query data arrives
  useEffect(() => {
    if (initialOffer) {
      if (!initialOffer.tokenValid) {
        setError(initialOffer.errorMessage || 'Invalid or expired offer link');
        setOffer(null);
      } else {
        setOffer(initialOffer);
        if (initialOffer.proposedJoiningDate) {
          setAcceptValue('confirmedJoiningDate', initialOffer.proposedJoiningDate);
        }
      }
    }
  }, [initialOffer, setAcceptValue]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'Failed to load offer details. The link may be invalid or expired.');
    }
  }, [queryError]);

  const handleAcceptOffer = async (formData: AcceptOfferFormData) => {
    if (!offer || !offer.email || !token) return;
    try {
      await acceptMutation.mutateAsync({
        token,
        data: {
          email: offer.email,
          confirmedJoiningDate: formData.confirmedJoiningDate || undefined,
        },
      });
      setOffer({
        ...offer,
        status: 'OFFER_ACCEPTED',
        offerAcceptedDate: toLocalDateString(new Date()),
      });
      setShowAcceptModal(false);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to accept offer'
      );
    }
  };

  const handleDeclineOffer = async () => {
    if (!offer || !offer.email || !token) return;
    try {
      await declineMutation.mutateAsync({
        token,
        data: {
          email: offer.email,
          declineReason: declineReason || undefined,
        },
      });
      setOffer({
        ...offer,
        status: 'OFFER_DECLINED',
        offerDeclinedDate: toLocalDateString(new Date()),
      });
      setShowDeclineModal(false);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to decline offer'
      );
    }
  };


  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return formatCanonicalDate(date);
  };

  if (isLoading) {
    return <OfferPortalLoading/>;
  }

  if (error && !offer) {
    return (
      <div
        className="page-shell-centered motion-rise bg-gradient-to-br from-accent-50 to-surface-100 dark:from-surface-900 dark:to-surface-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div
              className="w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-danger-600 dark:text-danger-400"/>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Unable to Load Offer
            </h1>
            <p className="text-[var(--text-muted)]">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOfferPending = offer?.status === 'OFFER_EXTENDED';
  const isOfferAccepted = offer?.status === 'OFFER_ACCEPTED';
  const isOfferDeclined = offer?.status === 'OFFER_DECLINED';

  // Extract first and last name initials from candidateName
  const nameParts = offer?.candidateName?.split(' ') || [];
  const firstInitial = nameParts[0]?.charAt(0) || '';
  const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) : '';

  return (
    <div
      className="page-shell-centered motion-rise bg-gradient-to-br from-accent-50 to-surface-100 dark:from-surface-900 dark:to-surface-800 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <FileText className="h-10 w-10 text-accent-700 dark:text-accent-400"/>
          </div>
          <h1 className="text-xl font-bold mb-2">
            Your Offer Letter
          </h1>
          <p className="text-[var(--text-secondary)]">
            {offer?.companyName ? `from ${offer.companyName}` : 'Review your offer details and respond below'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
                <AlertCircle className="h-5 w-5"/>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Banner */}
        {isOfferAccepted && (
          <Card className="border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/20">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-success-600 dark:text-success-400 mx-auto mb-4"/>
              <h2 className="text-xl font-bold text-success-700 dark:text-success-300 mb-2">
                Offer Accepted!
              </h2>
              <p className="text-success-600 dark:text-success-400">
                Thank you for accepting our offer. We look forward to having you on our team!
              </p>
              {offer?.offerAcceptedDate && (
                <p className="text-sm text-success-500 mt-2">
                  Accepted on {formatDate(offer.offerAcceptedDate)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isOfferDeclined && (
          <Card className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20">
            <CardContent className="p-6 text-center">
              <XCircle className="h-12 w-12 text-danger-600 dark:text-danger-400 mx-auto mb-4"/>
              <h2 className="text-xl font-bold text-danger-700 dark:text-danger-300 mb-2">
                Offer Declined
              </h2>
              <p className="text-danger-600 dark:text-danger-400">
                This offer has been declined. Thank you for considering us.
              </p>
              {offer?.offerDeclinedDate && (
                <p className="text-sm text-danger-500 mt-2">
                  Declined on {formatDate(offer.offerDeclinedDate)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Candidate Info */}
        <Card className="skeuo-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-16 h-16 bg-accent-100 dark:bg-accent-900/30 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-accent-700 dark:text-accent-300">
                  {firstInitial}{lastInitial}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {offer?.candidateName}
                </h2>
                <p className="text-[var(--text-muted)]">{offer?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-[var(--surface-sunken)] rounded-lg border border-[var(--border-soft)] hover:border-[var(--border)] transition-colors">
                <Building className="h-5 w-5 shrink-0 text-[var(--text-3)]"/>
                <div className="min-w-0">
                  <p className="text-2xs font-bold uppercase text-[var(--text-3)] tracking-[0.08em]">Position</p>
                  <p className="font-semibold text-[var(--text-1)] truncate">
                    {offer?.offeredDesignation || offer?.jobTitle || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[var(--surface-sunken)] rounded-lg border border-[var(--border-soft)] hover:border-[var(--border)] transition-colors">
                <DollarSign className="h-5 w-5 shrink-0 text-[var(--text-3)]"/>
                <div className="min-w-0">
                  <p className="text-2xs font-bold uppercase text-[var(--text-3)] tracking-[0.08em]">Annual CTC</p>
                  <p className="font-mono font-bold text-[var(--text-1)] tabular-nums">
                    {formatCurrency(offer?.offeredCtc)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[var(--surface-sunken)] rounded-lg border border-[var(--border-soft)] hover:border-[var(--border)] transition-colors">
                <Calendar className="h-5 w-5 shrink-0 text-[var(--text-3)]"/>
                <div className="min-w-0">
                  <p className="text-2xs font-bold uppercase text-[var(--text-3)] tracking-[0.08em]">Proposed Joining Date</p>
                  <p className="font-mono font-bold text-[var(--text-1)] tabular-nums">
                    {formatDate(offer?.proposedJoiningDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[var(--surface-sunken)] rounded-lg border border-[var(--border-soft)] hover:border-[var(--border)] transition-colors">
                <Clock className="h-5 w-5 shrink-0 text-[var(--text-3)]"/>
                <div className="min-w-0">
                  <p className="text-2xs font-bold uppercase text-[var(--text-3)] tracking-[0.08em]">Offer Extended On</p>
                  <p className="font-mono font-bold text-[var(--text-1)] tabular-nums">
                    {formatDate(offer?.offerExtendedDate)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Offer Letter Document */}
        {offer?.offerLetterId && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent-500"/>
                Offer Letter Document
              </h3>
              <div className="flex items-center justify-between p-4 bg-[var(--surface-sunken)] rounded-lg border border-[var(--border-soft)]">
                <div>
                  <p className="font-semibold text-[var(--text-1)]">Offer Letter</p>
                  {offer.offerLetterReferenceNumber && (
                    <p className="text-sm text-[var(--text-3)] font-mono">Ref: {offer.offerLetterReferenceNumber}</p>
                  )}
                </div>
                {offer.offerLetterUrl && (
                  <a
                    href={safeUrl(offer.offerLetterUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:brightness-110 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                  >
                    <Download className="h-4 w-4"/>
                    <span>Download PDF</span>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {isOfferPending && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                Your Response
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Please review the offer details above and let us know your decision.
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => setShowAcceptModal(true)}
                  className="btn-primary flex-1 bg-success-600 hover:bg-success-700"
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                >
                  <CheckCircle className="h-5 w-5 mr-2"/>
                  Accept Offer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeclineModal(true)}
                  className="flex-1 border-danger-300 text-danger-600 hover:bg-danger-50 dark:border-danger-700 dark:text-danger-400 dark:hover:bg-danger-900/20"
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                >
                  <XCircle className="h-5 w-5 mr-2"/>
                  Decline Offer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        <Card>
          <CardContent className="p-6 text-center">
            <Mail className="h-6 w-6 text-[var(--text-muted)] mx-auto mb-2"/>
            <p className="text-[var(--text-secondary)]">
              Have questions? Contact HR at{' '}
              <a href="mailto:hr@company.com" className="text-accent-700 hover:underline">
                hr@company.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-success-600 dark:text-success-400"/>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  Accept Offer
                </h2>
                <p className="text-[var(--text-secondary)]">
                  Confirm your acceptance of this offer
                </p>
              </div>

              <form onSubmit={handleAcceptSubmit(handleAcceptOffer)}>
                <div className="mb-6">
                  <label htmlFor="offer-confirmed-joining-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Confirmed Joining Date
                  </label>
                  <input
                    id="offer-confirmed-joining-date"
                    type="date"
                    {...registerAccept('confirmedJoiningDate')}
                    className="w-full px-4 py-4 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                  />
                  {acceptErrors.confirmedJoiningDate ? (
                    <p className="text-xs text-danger-500 mt-1">{acceptErrors.confirmedJoiningDate.message}</p>
                  ) : (
                    <p className="text-caption mt-1">
                      Please confirm your expected joining date
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAcceptModal(false)}
                    className="flex-1"
                    disabled={acceptMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={acceptMutation.isPending}
                    className="flex-1 bg-success-600 hover:bg-success-700"
                  >
                    {acceptMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                        Processing...
                      </>
                    ) : (
                      'Confirm Acceptance'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-danger-600 dark:text-danger-400"/>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  Decline Offer
                </h2>
                <p className="text-[var(--text-secondary)]">
                  We&apos;re sorry to hear that. Please let us know why.
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="offer-decline-reason" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Reason for Declining (Optional)
                </label>
                <textarea
                  id="offer-decline-reason"
                  rows={4}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please share your reason..."
                  className="w-full px-4 py-4 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeclineModal(false)}
                  className="flex-1"
                  disabled={declineMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeclineOffer}
                  disabled={declineMutation.isPending}
                  className="flex-1"
                >
                  {declineMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                      Processing...
                    </>
                  ) : (
                    'Confirm Decline'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
