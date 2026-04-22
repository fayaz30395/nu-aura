'use client';

import React, {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {logger} from '@/lib/utils/logger';
import {AlertCircle, Check, Clock, Laptop, Lock, Shield,} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {useAuth} from '@/lib/hooks/useAuth';
import {useDisableMfa, useMfaStatus} from '@/lib/hooks/queries/useMfa';
import {MfaSetup} from '@/components/auth/MfaSetup';

// Zod schema for disable MFA form
const disableMfaFormSchema = z.object({
  code: z.string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Only numbers allowed'),
});

type DisableMfaFormData = z.infer<typeof disableMfaFormSchema>;

export default function SecuritySettingsPage() {
  const {isAuthenticated, hasHydrated} = useAuth();

  // React Query hooks
  const {data: mfaStatusData, isLoading: isMfaLoading, isError: isMfaError} = useMfaStatus(
    isAuthenticated && hasHydrated
  );
  const disableMfaMutation = useDisableMfa();

  // Local UI state
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: {errors},
  } = useForm<DisableMfaFormData>({
    resolver: zodResolver(disableMfaFormSchema),
    defaultValues: {
      code: '',
    },
  });

  const handleMfaSetupSuccess = () => {
    setShowMfaSetup(false);
    setSuccess(true);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
  };

  const handleDisableMfa = async (data: DisableMfaFormData) => {
    try {
      setError(null);
      await disableMfaMutation.mutateAsync(data.code);
      setShowDisableForm(false);
      resetForm();
      setSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      logger.error('Failed to disable MFA:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to disable MFA. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <AppLayout activeMenuItem="settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">Security Settings</h1>
          <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
            Manage your account security and authentication
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div
            className='flex items-center gap-2 p-4 bg-status-success-bg border border-status-success-border rounded-lg animate-in fade-in slide-in-from-top-2 duration-300'>
            <Check className='h-5 w-5 text-status-success-text'/>
            <p className='text-status-success-text font-medium'>
              Security settings updated successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className='flex items-center gap-2 p-4 bg-status-danger-bg border border-status-danger-border rounded-lg animate-in fade-in slide-in-from-top-2 duration-300'>
            <AlertCircle className='h-5 w-5 text-status-danger-text'/>
            <p className='text-status-danger-text font-medium'>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Two-Factor Authentication */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5"/>
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Card */}
              {!isMfaLoading && !isMfaError && mfaStatusData && (
                <div className={`p-4 rounded-lg border-2 ${
                  mfaStatusData.enabled
                    ? 'bg-success-50 dark:bg-success-950/20 border-success-200 dark:border-success-800'
                    : 'bg-warning-50 dark:bg-warning-950/20 border-warning-200 dark:border-warning-800'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${
                      mfaStatusData.enabled
                        ? 'bg-success-100 dark:bg-success-900/30'
                        : 'bg-warning-100 dark:bg-warning-900/30'
                    }`}>
                      {mfaStatusData.enabled ? (
                        <Check className='h-5 w-5 text-status-success-text'/>
                      ) : (
                        <AlertCircle className='h-5 w-5 text-status-warning-text'/>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        mfaStatusData.enabled
                          ? 'text-success-900 dark:text-success-100'
                          : 'text-warning-900 dark:text-warning-100'
                      }`}>
                        {mfaStatusData.enabled ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication Disabled'}
                      </p>
                      {mfaStatusData.enabled && mfaStatusData.setupAt && (
                        <p className={`text-sm mt-1 ${
                          mfaStatusData.enabled
                            ? 'text-success-700 dark:text-success-300'
                            : 'text-warning-700 dark:text-warning-300'
                        }`}>
                          Enabled on {formatDate(mfaStatusData.setupAt)}
                        </p>
                      )}
                      {!mfaStatusData.enabled && (
                        <p className='text-sm mt-1 text-status-warning-text'>
                          Your account is not protected by two-factor authentication. We recommend enabling it.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isMfaLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin">
                    <div className="w-8 h-8 border-4 border-[var(--border-main)] border-t-accent-700 rounded-full"/>
                  </div>
                </div>
              )}

              {/* Error State */}
              {isMfaError && (
                <div className="flex items-center justify-center py-8">
                  <p className='text-status-danger-text'>Failed to load MFA status</p>
                </div>
              )}

              {/* Actions */}
              {!isMfaLoading && !isMfaError && mfaStatusData && !mfaStatusData.enabled && (
                <div className="pt-4 border-t border-[var(--border-main)]">
                  <Button
                    onClick={() => setShowMfaSetup(true)}
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    Enable Two-Factor Authentication
                  </Button>
                  <p className="text-caption mt-4">
                    You&apos;ll need an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy
                    to enable this feature.
                  </p>
                </div>
              )}

              {!isMfaLoading && !isMfaError && mfaStatusData && mfaStatusData.enabled && (
                <div className="pt-4 border-t border-[var(--border-main)] space-y-4">
                  {!showDisableForm ? (
                    <Button
                      onClick={() => setShowDisableForm(true)}
                      variant="danger"
                      className="w-full sm:w-auto"
                    >
                      Disable Two-Factor Authentication
                    </Button>
                  ) : (
                    <form onSubmit={handleSubmit(handleDisableMfa)} className="space-y-4">
                      <p className="text-body-secondary">
                        Enter your current 6-digit authenticator code to disable two-factor authentication:
                      </p>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        disabled={disableMfaMutation.isPending}
                        className="w-full px-4 py-2 text-center text-xl tracking-widest border border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
                        autoComplete="off"
                        {...register('code', {
                          onChange: (e) => {
                            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          },
                        })}
                      />
                      {errors.code && <p className='text-status-danger-text text-sm mt-1'>{errors.code.message}</p>}
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowDisableForm(false);
                            resetForm();
                            setError(null);
                          }}
                          disabled={disableMfaMutation.isPending}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="danger"
                          isLoading={disableMfaMutation.isPending}
                          disabled={disableMfaMutation.isPending}
                          className="flex-1"
                        >
                          {disableMfaMutation.isPending ? 'Disabling...' : 'Disable'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Tips Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-5 w-5"/>
                Security Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-2 text-[var(--text-secondary)]">
                <p className="font-medium text-[var(--text-primary)]">Protect Your Account:</p>
                <ul className="space-y-2 ml-4">
                  <li className="list-disc">Use a strong, unique password</li>
                  <li className="list-disc">Enable two-factor authentication</li>
                  <li className="list-disc">Never share your credentials</li>
                  <li className="list-disc">Log out when using shared devices</li>
                  <li className="list-disc">Regularly review active sessions</li>
                  <li className="list-disc">Keep your authenticator app secure</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Login History & Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5"/>
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage your active sessions across devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className="flex items-start gap-4 p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-main)]">
                <div className='p-2 bg-accent-subtle rounded-lg flex-shrink-0'>
                  <Laptop className='h-5 w-5 text-accent'/>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)]">This Device</p>
                  <p className="text-body-muted mt-1">
                    Current session - active now
                  </p>
                </div>
              </div>
              <p className="text-body-muted pt-2">
                Session management features will be available soon. You can manually log out from other devices using
                the logout button.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* MFA Setup Modal */}
      <MfaSetup
        isOpen={showMfaSetup}
        onSuccess={handleMfaSetupSuccess}
        onCancel={() => setShowMfaSetup(false)}
      />
    </AppLayout>
  );
}
