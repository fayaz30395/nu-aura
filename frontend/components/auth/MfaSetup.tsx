'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { logger } from '@/lib/utils/logger';
import { Copy, Check, AlertCircle, Loader2, Shield, Key } from 'lucide-react';
import { mfaApi } from '@/lib/api/mfa';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';

interface MfaSetupProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

type SetupStep = 'loading' | 'scan' | 'verify' | 'backup' | 'complete';

export const MfaSetup: React.FC<MfaSetupProps> = ({ isOpen, onSuccess, onCancel }) => {
  const [step, setStep] = useState<SetupStep>('loading');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Load setup data on mount
  useEffect(() => {
    if (!isOpen) return;

    const loadSetupData = async () => {
      try {
        setStep('loading');
        setError(null);
        const data = await mfaApi.getSetup();
        setQrCodeUrl(data.qrCodeUrl);
        setSecret(data.secret);
        setStep('scan');
      } catch (err: unknown) {
        logger.error('Failed to load MFA setup:', err);
        const message = typeof err === 'object' && err !== null && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : null;
        setError(message || 'Failed to load MFA setup. Please try again.');
        setStep('scan');
      }
    };

    loadSetupData();
  }, [isOpen]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Code must contain only numbers');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);
      const result = await mfaApi.verify(verificationCode);
      setBackupCodes(result.backupCodes);
      setStep('backup');
    } catch (err: unknown) {
      logger.error('Failed to verify MFA code:', err);
      const message = typeof err === 'object' && err !== null && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : null;
      setError(message || 'Invalid code. Please try again.');
      setVerificationCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    });
  };

  const handleComplete = () => {
    setStep('complete');
    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  const handleCancel = () => {
    setStep('loading');
    setQrCodeUrl('');
    setSecret('');
    setVerificationCode('');
    setBackupCodes([]);
    setError(null);
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="lg" closeOnEscape={false} closeOnBackdrop={false}>
      <ModalHeader onClose={step !== 'loading' && step !== 'verify' ? handleCancel : undefined} showCloseButton={step !== 'loading' && step !== 'verify'}>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary-600" />
          <span>Set Up Two-Factor Authentication</span>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* Loading State */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-4" />
            <p className="text-[var(--text-secondary)]">Loading setup information...</p>
          </div>
        )}

        {/* Scan QR Code Step */}
        {step === 'scan' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Scan the QR code with an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy.
            </p>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex justify-center p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-main)]">
                {/* unoptimized because qrCodeUrl is a data: URI — next/image optimization doesn't apply */}
                <Image src={qrCodeUrl} alt="QR Code for MFA" width={192} height={192} unoptimized />
              </div>
            )}

            {/* Manual Entry Code */}
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-muted)] font-medium uppercase">
                Or enter this code manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg font-mono text-sm text-[var(--text-primary)] break-all">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors"
                  title="Copy secret"
                >
                  {copiedSecret ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verify Code Step */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Enter the 6-digit code from your authenticator app to verify and enable two-factor authentication.
            </p>

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Code Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                }}
                disabled={isVerifying}
                className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                autoComplete="off"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isVerifying}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isVerifying}
                disabled={verificationCode.length !== 6}
                className="flex-1"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </form>
        )}

        {/* Backup Codes Step */}
        {step === 'backup' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Save your backup codes
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Store these codes in a safe place. You can use them to access your account if you lose access to your authenticator.
                </p>
              </div>
            </div>

            {/* Backup Codes Grid */}
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => copyBackupCode(code, index)}
                  className="p-4 text-left bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors group"
                  title="Click to copy"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-sm text-[var(--text-primary)] flex-1">
                      {code}
                    </code>
                    {copiedIndex === index ? (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Copy className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  We recommend downloading or printing these codes and storing them in a secure location separate from your authenticator.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              Two-Factor Authentication Enabled
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-2 text-center">
              Your account is now protected with two-factor authentication.
            </p>
          </div>
        )}
      </ModalBody>

      {/* Footer with Action Buttons */}
      {(step === 'scan' || step === 'backup') && (
        <ModalFooter>
          {step === 'scan' && (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep('verify')}
                className="flex-1"
              >
                I&apos;ve Scanned the Code
              </Button>
            </>
          )}
          {step === 'backup' && (
            <Button
              variant="primary"
              onClick={handleComplete}
              className="w-full"
            >
              I&apos;ve Saved My Backup Codes
            </Button>
          )}
        </ModalFooter>
      )}
    </Modal>
  );
};
