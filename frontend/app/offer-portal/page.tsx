'use client';

import {Suspense, useEffect, useState} from 'react';
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

const acceptOfferSchema = z.object({
  confirmedJoiningDate: z.string().min(1, 'Please confirm your joining date'),
});

type AcceptOfferFormData = z.infer<typeof acceptOfferSchema>;

function OfferPortalLoading() {
  return (
    <div
      className='min-h-screen bg-gradient-to-br from-accent-50 to-surface-100 flex items-center justify-center'>
      <div className="animate-pulse text-center">
        <Loader2 className='h-12 w-12 text-accent animate-spin mx-auto mb-4'/>
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
      const _response = await acceptMutation.mutateAsync({
        token,
        data: {
          email: offer.email,
          confirmedJoiningDate: formData.confirmedJoiningDate || undefined,
        },
      });
      setOffer({
        ...offer,
        status: 'OFFER_ACCEPTED',
        offerAcceptedDate: new Date().toISOString().split('T')[0],
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
        offerDeclinedDate: new Date().toISOString().split('T')[0],
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
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <OfferPortalLoading/>;
  }

  if (error && !offer) {
    return (
      <div
        className='min-h-screen bg-gradient-to-br from-accent-50 to-surface-100 flex items-center justify-center p-4'>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div
              className='w-16 h-16 bg-status-danger-bg rounded-full flex items-center justify-center mx-auto mb-4'>
              <AlertCircle className='h-8 w-8 text-status-danger-text'/>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss mb-2">
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
      className='min-h-screen bg-gradient-to-br from-accent-50 to-surface-100 py-8 px-4'>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className='w-20 h-20 bg-accent-subtle rounded-lg flex items-center justify-center mx-auto mb-4'>
            <FileText className='h-10 w-10 text-accent'/>
          </div>
          <h1 className="text-xl font-bold skeuo-emboss mb-2">
            Your Offer Letter
          </h1>
          <p className="text-[var(--text-secondary)]">
            {offer?.companyName ? `from ${offer.companyName}` : 'Review your offer details and respond below'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className='border-status-danger-border bg-status-danger-bg'>
            <CardContent className="p-4">
              <div className='flex items-center gap-2 text-status-danger-text'>
                <AlertCircle className="h-5 w-5"/>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Banner */}
        {isOfferAccepted && (
          <Card className='border-status-success-border bg-status-success-bg'>
            <CardContent className="p-6 text-center">
              <CheckCircle className='h-12 w-12 text-status-success-text mx-auto mb-4'/>
              <h2 className='text-xl font-bold text-status-success-text mb-2'>
                Offer Accepted!
              </h2>
              <p className='text-status-success-text'>
                Thank you for accepting our offer. We look forward to having you on our team!
              </p>
              {offer?.offerAcceptedDate && (
                <p className='text-sm text-status-success-text mt-2'>
                  Accepted on {formatDate(offer.offerAcceptedDate)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isOfferDeclined && (
          <Card className='border-status-danger-border bg-status-danger-bg'>
            <CardContent className="p-6 text-center">
              <XCircle className='h-12 w-12 text-status-danger-text mx-auto mb-4'/>
              <h2 className='text-xl font-bold text-status-danger-text mb-2'>
                Offer Declined
              </h2>
              <p className='text-status-danger-text'>
                This offer has been declined. Thank you for considering us.
              </p>
              {offer?.offerDeclinedDate && (
                <p className='text-sm text-status-danger-text mt-2'>
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
                className='w-16 h-16 bg-accent-subtle rounded-xl flex items-center justify-center'>
                <span className='text-xl font-bold text-accent'>
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
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                <Building className="h-5 w-5 text-[var(--text-muted)]"/>
                <div>
                  <p className="text-caption">Position</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {offer?.offeredDesignation || offer?.jobTitle || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                <DollarSign className="h-5 w-5 text-[var(--text-muted)]"/>
                <div>
                  <p className="text-caption">Annual CTC</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {formatCurrency(offer?.offeredCtc)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                <Calendar className="h-5 w-5 text-[var(--text-muted)]"/>
                <div>
                  <p className="text-caption">Proposed Joining Date</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {formatDate(offer?.proposedJoiningDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl">
                <Clock className="h-5 w-5 text-[var(--text-muted)]"/>
                <div>
                  <p className="text-caption">Offer Extended On</p>
                  <p className="font-semibold text-[var(--text-primary)]">
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
                <FileText className='h-5 w-5 text-accent'/>
                Offer Letter Document
              </h3>
              <div className="row-between p-4 bg-[var(--bg-secondary)] rounded-xl">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    Offer Letter
                  </p>
                  {offer.offerLetterReferenceNumber && (
                    <p className="text-body-muted">
                      Reference: {offer.offerLetterReferenceNumber}
                    </p>
                  )}
                </div>
                {offer.offerLetterUrl && (
                  <a
                    href={offer.offerLetterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className='flex items-center gap-2 px-4 py-2 bg-accent text-inverse rounded-lg hover:bg-accent transition-colors'
                  >
                    <Download className="h-4 w-4"/>
                    Download PDF
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
                  className='btn-primary flex-1 bg-status-success-bg hover:bg-status-success-bg'
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                >
                  <CheckCircle className="h-5 w-5 mr-2"/>
                  Accept Offer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeclineModal(true)}
                  className='flex-1 border-status-danger-border text-status-danger-text hover:bg-status-danger-bg'
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
              <a href="mailto:hr@company.com" className='text-accent hover:underline'>
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
                  className='w-16 h-16 bg-status-success-bg rounded-full flex items-center justify-center mx-auto mb-4'>
                  <CheckCircle className='h-8 w-8 text-status-success-text'/>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss mb-2">
                  Accept Offer
                </h2>
                <p className="text-[var(--text-secondary)]">
                  Confirm your acceptance of this offer
                </p>
              </div>

              <form onSubmit={handleAcceptSubmit(handleAcceptOffer)}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Confirmed Joining Date
                  </label>
                  <input
                    type="date"
                    {...registerAccept('confirmedJoiningDate')}
                    className='w-full px-4 py-4 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-[var(--accent-primary)]'
                  />
                  {acceptErrors.confirmedJoiningDate ? (
                    <p className='text-xs text-status-danger-text mt-1'>{acceptErrors.confirmedJoiningDate.message}</p>
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
                    className='flex-1 bg-status-success-bg hover:bg-status-success-bg'
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
                  className='w-16 h-16 bg-status-danger-bg rounded-full flex items-center justify-center mx-auto mb-4'>
                  <XCircle className='h-8 w-8 text-status-danger-text'/>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss mb-2">
                  Decline Offer
                </h2>
                <p className="text-[var(--text-secondary)]">
                  We&apos;re sorry to hear that. Please let us know why.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Reason for Declining (Optional)
                </label>
                <textarea
                  rows={4}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please share your reason..."
                  className='w-full px-4 py-4 border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-[var(--accent-primary)]'
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
