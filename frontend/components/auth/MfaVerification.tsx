'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Shield, HelpCircle } from 'lucide-react';
import { mfaApi } from '@/lib/api/mfa';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { logger } from '@/lib/utils/logger';

interface MfaVerificationProps {
  userId: string;
  onSuccess: (token: string) => void;
  onCancel: () => void;
}

export const MfaVerification: React.FC<MfaVerificationProps> = ({ userId, onSuccess, onCancel }) => {
  const [code, setCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [useBackupCode]);

  // Handle paste events for convenience
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digits = pastedText.replace(/\D/g, '');
    const trimmed = digits.slice(0, useBackupCode ? 12 : 6);
    setCode(trimmed);
    
    // Auto-submit if we have the right length
    if ((useBackupCode && trimmed.length === 12) || (!useBackupCode && trimmed.length === 6)) {
      handleVerify(trimmed);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const verificationCode = codeToVerify || code;

    if (!verificationCode) {
      setError(`Please enter a ${useBackupCode ? '12-digit' : '6-digit'} code`);
      return;
    }

    const expectedLength = useBackupCode ? 12 : 6;
    if (verificationCode.length !== expectedLength) {
      setError(`Code must be ${expectedLength} digits`);
      return;
    }

    if (!/^\d+$/.test(verificationCode)) {
      setError('Code must contain only numbers');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);
      const result = await mfaApi.mfaLogin(userId, verificationCode);
      onSuccess(result.accessToken);
    } catch (err: unknown) {
      logger.error('Failed to verify MFA code:', err);
      const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : null) || 'Invalid code. Please try again.';
      setError(message);
      setCode('');
      inputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <Card className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-main)] shadow-soft-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          {useBackupCode
            ? 'Enter one of your backup codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-danger-800 dark:text-danger-400">
                  Verification Failed
                </p>
                <p className="text-sm text-danger-700 dark:text-danger-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Code Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
              {useBackupCode ? 'Backup Code' : 'Authenticator Code'}
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={useBackupCode ? 12 : 6}
              placeholder={useBackupCode ? '000000000000' : '000000'}
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, useBackupCode ? 12 : 6);
                setCode(value);
              }}
              onPaste={handlePaste}
              disabled={isVerifying}
              className={`w-full px-4 py-3 text-center font-mono text-2xl tracking-widest border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all disabled:opacity-50 ${
                error
                  ? 'border-danger-500 dark:border-danger-500 bg-[var(--bg-input)] text-surface-900 dark:text-surface-100'
                  : 'border-surface-200 dark:border-surface-700 bg-[var(--bg-input)] text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500'
              }`}
              autoComplete="off"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full py-3"
            isLoading={isVerifying}
            disabled={isVerifying || code.length < (useBackupCode ? 12 : 6)}
          >
            {isVerifying ? 'Verifying...' : 'Verify'}
          </Button>

          {/* Backup Code Toggle */}
          {!useBackupCode && (
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(true);
                setCode('');
                setError(null);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors group"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Use a backup code instead</span>
            </button>
          )}

          {/* Cancel/Back Buttons */}
          {useBackupCode && (
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(false);
                setCode('');
                setError(null);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Back to authenticator code
            </button>
          )}

          {/* Cancel Button */}
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isVerifying}
            className="w-full"
          >
            Cancel
          </Button>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-accent-50 dark:bg-accent-950/20 border border-accent-200 dark:border-accent-800 rounded-lg">
          <p className="text-xs text-accent-900 dark:text-accent-100 leading-relaxed">
            Enter the code from your authenticator app. If you can&apos;t access your app, use one of your backup codes instead.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
