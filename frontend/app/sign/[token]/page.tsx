'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useParams} from 'next/navigation';
import {AlertCircle, CheckCircle, ExternalLink, FileText, Loader2, PenLine, Type, XCircle,} from 'lucide-react';
import {useDeclineDocument, useSignatureInfo, useSignDocument,} from '@/lib/hooks/queries/useEsignPublic';

type Step = 'verify' | 'sign' | 'success' | 'declined' | 'already_processed';
type SignatureMethod = 'DRAWN' | 'TYPED';

export default function SignPage() {
  const {token} = useParams<{ token: string }>();

  // React Query hooks
  const {data: docInfo, isLoading} = useSignatureInfo(
    token,
    !!token
  );
  const signDocumentMutation = useSignDocument();
  const declineDocumentMutation = useDeclineDocument();

  // Flow state
  const [step, setStep] = useState<Step>('verify');
  const [error, setError] = useState<string | null>(null);

  // Email verification
  const [signerEmail, setSignerEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Signature
  const [signatureMethod, setSignatureMethod] = useState<SignatureMethod>('DRAWN');
  const [typedName, setTypedName] = useState('');
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);

  // Submission
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Decline
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineError, setDeclineError] = useState<string | null>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawing = useRef(false);

  // Initialize step based on document info
  useEffect(() => {
    if (!isLoading && docInfo) {
      if (!docInfo.tokenValid) {
        setError(docInfo.errorMessage || 'This signing link is invalid or has expired.');
      } else if (docInfo.status !== 'PENDING') {
        setStep('already_processed');
      }
    }
  }, [isLoading, docInfo]);

  // Init canvas context when entering sign step
  useEffect(() => {
    if (step === 'sign' && signatureMethod === 'DRAWN' && canvasRef.current) {
      const c = canvasRef.current.getContext('2d')!;
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = 2.5;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      ctx.current = c;
    }
  }, [step, signatureMethod]);

  // Canvas mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !ctx.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    isDrawing.current = true;
    ctx.current.beginPath();
    ctx.current.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !canvasRef.current || !ctx.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.current.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.current.stroke();
    setIsCanvasEmpty(false);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDrawing.current = false;
  }, []);

  // Canvas touch events
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current || !ctx.current) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    isDrawing.current = true;
    ctx.current.beginPath();
    ctx.current.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing.current || !canvasRef.current || !ctx.current) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.current.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.current.stroke();
    setIsCanvasEmpty(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const clearCanvas = () => {
    if (!canvasRef.current || !ctx.current) return;
    ctx.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setIsCanvasEmpty(true);
  };

  const handleEmailVerify = () => {
    setEmailError(null);
    if (!signerEmail.trim()) {
      setEmailError('Please enter your email address.');
      return;
    }
    if (
      signerEmail.trim().toLowerCase() !== docInfo?.signerEmail?.toLowerCase()
    ) {
      setEmailError(
        'Email does not match the expected signer email. Please check and try again.'
      );
      return;
    }
    setStep('sign');
  };

  const handleSign = async () => {
    let signatureData = '';
    if (signatureMethod === 'DRAWN') {
      if (isCanvasEmpty) {
        setSubmitError('Please draw your signature before submitting.');
        return;
      }
      signatureData = canvasRef.current!.toDataURL('image/png');
    } else {
      if (!typedName.trim()) {
        setSubmitError('Please type your name before submitting.');
        return;
      }
      signatureData = typedName.trim();
    }

    setSubmitError(null);
    try {
      if (!token) throw new Error('Token is missing');
      await signDocumentMutation.mutateAsync({
        token,
        signerEmail: signerEmail.trim().toLowerCase(),
        signatureMethod,
        signatureData,
      });
      setStep('success');
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
          ? String((err.response as { data: { message: unknown } }).data.message)
          : 'Failed to submit signature. Please try again.';
      setSubmitError(message);
    }
  };

  const handleDecline = async () => {
    setDeclineError(null);
    try {
      if (!token) throw new Error('Token is missing');
      await declineDocumentMutation.mutateAsync({
        token,
        signerEmail: signerEmail.trim().toLowerCase() || docInfo?.signerEmail || '',
        reason: declineReason.trim(),
      });
      setShowDeclineModal(false);
      setStep('declined');
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
          ? String((err.response as { data: { message: unknown } }).data.message)
          : 'Failed to decline. Please try again.';
      setDeclineError(message);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // --- Render states ---

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-[var(--bg-main)] to-[var(--bg-surface)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className='h-10 w-10 text-accent animate-spin mx-auto mb-4'/>
          <p className="text-[var(--text-secondary)] text-sm">Loading document information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-[var(--bg-main)] to-[var(--bg-surface)] flex items-center justify-center px-4">
        <div className="max-w-md w-full skeuo-card p-8 text-center">
          <XCircle className='h-14 w-14 text-status-danger-text mx-auto mb-4'/>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] skeuo-emboss mb-2">Link Invalid or
            Expired</h1>
          <p className="text-[var(--text-muted)] text-sm mb-2">{error}</p>
          {docInfo?.tokenExpiresAt && (
            <p className="text-[var(--text-muted)] text-xs mt-4">
              This link expired on {formatDate(docInfo.tokenExpiresAt)}.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (step === 'already_processed') {
    const isSignedStatus = docInfo?.status === 'SIGNED';
    const isDeclinedStatus = docInfo?.status === 'DECLINED';
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-[var(--bg-main)] to-[var(--bg-surface)] flex items-center justify-center px-4">
        <div className="max-w-md w-full skeuo-card p-8 text-center">
          {isSignedStatus ? (
            <CheckCircle className='h-14 w-14 text-status-success-text mx-auto mb-4'/>
          ) : isDeclinedStatus ? (
            <XCircle className='h-14 w-14 text-status-danger-text mx-auto mb-4'/>
          ) : (
            <AlertCircle className='h-14 w-14 text-status-warning-text mx-auto mb-4'/>
          )}
          <h1 className="text-xl font-semibold text-[var(--text-primary)] skeuo-emboss mb-2">
            {isSignedStatus
              ? 'Document Already Signed'
              : isDeclinedStatus
                ? 'Document Declined'
                : 'Signing Link Expired'}
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            {isSignedStatus
              ? 'This document has already been signed. No further action is required.'
              : isDeclinedStatus
                ? 'This document signing request has been declined.'
                : 'This signing link is no longer active.'}
          </p>
          {docInfo?.documentTitle && (
            <p className="text-[var(--text-muted)] text-xs mt-4">
              Document: <span className="font-medium">{docInfo.documentTitle}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-[var(--bg-main)] to-[var(--bg-surface)] flex items-center justify-center px-4">
        <div className="max-w-md w-full skeuo-card p-8 text-center">
          <CheckCircle className='h-16 w-16 text-status-success-text mx-auto mb-4'/>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Document Signed Successfully
          </h1>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            Your signature has been recorded. A confirmation will be sent to your email.
          </p>
          <div className="bg-[var(--bg-surface)] rounded-lg p-4 text-left text-sm space-y-2">
            {docInfo?.documentTitle && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Document</span>
                <span className="font-medium text-[var(--text-secondary)]">{docInfo.documentTitle}</span>
              </div>
            )}
            {docInfo?.companyName && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Company</span>
                <span className="font-medium text-[var(--text-secondary)]">{docInfo.companyName}</span>
              </div>
            )}
            {docInfo?.signerEmail && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Signer</span>
                <span className="font-medium text-[var(--text-secondary)]">{docInfo.signerEmail}</span>
              </div>
            )}
            {docInfo?.approvalId && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Reference</span>
                <span className="font-medium text-[var(--text-secondary)] text-xs break-all">
                  {docInfo.approvalId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'declined') {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-[var(--bg-main)] to-[var(--bg-surface)] flex items-center justify-center px-4">
        <div className="max-w-md w-full skeuo-card p-8 text-center">
          <XCircle className='h-16 w-16 text-status-danger-text mx-auto mb-4'/>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Signing Request Declined
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            You have declined to sign this document. The requester will be notified.
          </p>
          {docInfo?.documentTitle && (
            <p className="text-[var(--text-muted)] text-xs mt-4">
              Document: <span className="font-medium">{docInfo.documentTitle}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main flow: verify and sign steps
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-main)] to-[var(--bg-surface)]">
      {/* Header */}
      <div className="bg-[var(--bg-card)] divider-b shadow-[var(--shadow-card)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className='h-8 w-8 rounded-lg bg-accent flex items-center justify-center'>
            <FileText className='h-4 w-4 text-inverse'/>
          </div>
          <div>
            <p className="text-caption uppercase tracking-wider font-medium">
              NU-AURA HRMS
            </p>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Electronic Signature</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Document Info Card */}
        <div className="skeuo-card p-6">
          <div className="flex items-start gap-4">
            <div className='h-12 w-12 rounded-lg bg-accent-subtle flex items-center justify-center flex-shrink-0'>
              <FileText className='h-6 w-6 text-accent'/>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                {docInfo?.documentTitle || 'Document for Signature'}
              </h1>
              {docInfo?.documentDescription && (
                <p className="text-body-muted mt-1">{docInfo.documentDescription}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-body-secondary">
                {docInfo?.candidateName && (
                  <span>
                    <span className="text-[var(--text-muted)]">Candidate: </span>
                    <span className="font-medium">{docInfo.candidateName}</span>
                  </span>
                )}
                {docInfo?.companyName && (
                  <span>
                    <span className="text-[var(--text-muted)]">Company: </span>
                    <span className="font-medium">{docInfo.companyName}</span>
                  </span>
                )}
                {docInfo?.documentType && (
                  <span>
                    <span className="text-[var(--text-muted)]">Type: </span>
                    <span className="font-medium">
                      {docInfo.documentType.replace(/_/g, ' ')}
                    </span>
                  </span>
                )}
              </div>
              {docInfo?.tokenExpiresAt && (
                <p className='text-xs text-status-warning-text mt-2'>
                  Signing link expires: {formatDate(docInfo.tokenExpiresAt)}
                </p>
              )}
            </div>
          </div>
          {docInfo?.documentUrl && (
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <a
                href={docInfo.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className='inline-flex items-center gap-2 text-sm text-accent hover:text-accent font-medium'
              >
                <ExternalLink className="h-4 w-4"/>
                View Document ({docInfo.documentName || 'Open PDF'})
              </a>
            </div>
          )}
        </div>

        {/* Step: Email Verification */}
        {step === 'verify' && (
          <div className="skeuo-card p-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              Verify Your Identity
            </h2>
            <p className="text-body-muted mb-6">
              Enter the email address where this signing request was sent to confirm your
              identity.
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="signer-email"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
                >
                  Email Address
                </label>
                <input
                  id="signer-email"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => {
                    setSignerEmail(e.target.value);
                    setEmailError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailVerify()}
                  placeholder="Enter your email address"
                  className={`w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors ${
                    emailError
                      ? 'border-danger-400 bg-danger-50'
                      : 'border-[var(--border-main)] bg-[var(--bg-card)]'
                  }`}
                />
                {emailError && (
                  <p className='mt-1.5 text-xs text-status-danger-text flex items-center gap-1'>
                    <AlertCircle className="h-3 w-3 flex-shrink-0"/>
                    {emailError}
                  </p>
                )}
              </div>
              <button
                onClick={handleEmailVerify}
                disabled={signDocumentMutation.isPending || declineDocumentMutation.isPending}
                className='w-full py-2.5 px-4 bg-accent hover:bg-accent text-inverse text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                Continue to Sign
              </button>
            </div>
          </div>
        )}

        {/* Step: Signing */}
        {step === 'sign' && (
          <div className="skeuo-card p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                Sign Document
              </h2>
              <p className="text-body-muted">
                Choose your preferred signature method below.
              </p>
            </div>

            {/* Method Tabs */}
            <div className="flex gap-2 border border-[var(--border-subtle)] rounded-lg p-1 bg-[var(--bg-surface)]">
              <button
                onClick={() => {
                  setSignatureMethod('DRAWN');
                  setSubmitError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  signatureMethod === 'DRAWN'
                    ? 'bg-[var(--bg-card)] text-accent-600 shadow-[var(--shadow-card)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <PenLine className="h-4 w-4"/>
                Draw Signature
              </button>
              <button
                onClick={() => {
                  setSignatureMethod('TYPED');
                  setSubmitError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  signatureMethod === 'TYPED'
                    ? 'bg-[var(--bg-card)] text-accent-600 shadow-[var(--shadow-card)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Type className="h-4 w-4"/>
                Type Name
              </button>
            </div>

            {/* Drawn Signature */}
            {signatureMethod === 'DRAWN' && (
              <div>
                <div className="row-between mb-2">
                  <p className="text-caption">Draw your signature in the box below</p>
                  <button
                    onClick={clearCanvas}
                    className="text-caption hover:text-[var(--text-secondary)] underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Clear
                  </button>
                </div>
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={200}
                    className="w-full rounded-lg border-2 border-dashed border-[var(--border-main)] bg-[var(--bg-card)] cursor-crosshair touch-none"
                    style={{height: '200px'}}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                  {isCanvasEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-[var(--text-muted)] text-sm select-none">
                        Sign here using your mouse or finger
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Typed Signature */}
            {signatureMethod === 'TYPED' && (
              <div>
                <label className="block text-caption mb-2">
                  Type your full name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => {
                    setTypedName(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder="Your full name"
                  className="input-aura"
                />
                {typedName && (
                  <div className="mt-4 border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--bg-surface)]">
                    <p className="text-caption mb-2">Signature preview</p>
                    <p
                      style={{
                        fontFamily: 'cursive',
                        fontSize: '2rem',
                        color: '#1a1a1a',
                        lineHeight: 1.2,
                      }}
                    >
                      {typedName}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Error */}
            {submitError && (
              <div
                className='flex items-start gap-2 text-sm text-status-danger-text bg-status-danger-bg border border-status-danger-border rounded-lg px-4 py-2.5'>
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5"/>
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={signDocumentMutation.isPending || declineDocumentMutation.isPending}
                className="flex-1 py-2.5 px-4 border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-main)] focus:ring-offset-2 disabled:opacity-50"
              >
                I Decline
              </button>
              <button
                onClick={handleSign}
                disabled={signDocumentMutation.isPending || declineDocumentMutation.isPending}
                className='flex-1 py-2.5 px-4 bg-accent hover:bg-accent text-inverse text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                {signDocumentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    Submitting...
                  </>
                ) : (
                  'Sign Document'
                )}
              </button>
            </div>

            {/* Legal notice */}
            <p className="text-caption text-center leading-relaxed">
              By clicking &quot;Sign Document&quot; you agree that your electronic signature is
              legally equivalent to your handwritten signature.
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-caption pb-4">
          Powered by NU-AURA HRMS &mdash; Electronic Signature Service
        </p>
      </div>
      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 px-4">
          <div className="skeuo-card max-w-md w-full p-6">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              Decline to Sign
            </h3>
            <p className="text-body-muted mb-4">
              Please provide a reason for declining (optional). The requester will be
              notified.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining (optional)..."
              rows={3}
              className="input-aura resize-none"
            />
            {declineError && (
              <p className='mt-2 text-xs text-status-danger-text flex items-center gap-1'>
                <AlertCircle className="h-3 w-3 flex-shrink-0"/>
                {declineError}
              </p>
            )}
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason('');
                  setDeclineError(null);
                }}
                disabled={declineDocumentMutation.isPending}
                className="flex-1 py-2.5 px-4 border border-[var(--border-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={declineDocumentMutation.isPending}
                className='flex-1 py-2.5 px-4 bg-status-danger-bg hover:bg-status-danger-bg text-inverse text-sm font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                {declineDocumentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    Declining...
                  </>
                ) : (
                  'Confirm Decline'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
