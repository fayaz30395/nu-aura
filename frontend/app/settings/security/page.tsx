'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Lock,
  AlertCircle,
  Check,
  Clock,
  Laptop,
  LogOut,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import { mfaApi } from '@/lib/api/mfa';
import { MfaSetup } from '@/components/auth/MfaSetup';

type MfaStatus = 'loading' | 'disabled' | 'enabled' | 'error';

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  
  // MFA state
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>('loading');
  const [mfaSetupAt, setMfaSetupAt] = useState<string | null>(null);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [mfaDisableCode, setMfaDisableCode] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!hasHydrated) return;

    // Tokens are stored in httpOnly cookies — Zustand `isAuthenticated` is the
    // sole source of truth. Do NOT check localStorage for access/refresh tokens.
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  // Load MFA status on mount
  useEffect(() => {
    if (!isAuthenticated || !hasHydrated) return;

    const loadMfaStatus = async () => {
      try {
        setMfaStatus('loading');
        const status = await mfaApi.getStatus();
        setMfaStatus(status.enabled ? 'enabled' : 'disabled');
        if (status.setupAt) {
          setMfaSetupAt(status.setupAt);
        }
      } catch (err: unknown) {
        console.error('Failed to load MFA status:', err);
        setMfaStatus('error');
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg || 'Failed to load security settings');
      }
    };

    loadMfaStatus();
  }, [isAuthenticated, hasHydrated]);

  const handleMfaSetupSuccess = () => {
    setShowMfaSetup(false);
    setMfaStatus('enabled');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mfaDisableCode || mfaDisableCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsDisablingMfa(true);
      setError(null);
      await mfaApi.disable(mfaDisableCode);
      setMfaStatus('disabled');
      setShowDisableForm(false);
      setMfaDisableCode('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Failed to disable MFA:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to disable MFA. Please try again.');
      setMfaDisableCode('');
    } finally {
      setIsDisablingMfa(false);
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Security Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your account security and authentication
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-green-800 dark:text-green-200 font-medium">
              Security settings updated successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Two-Factor Authentication */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Card */}
              {mfaStatus !== 'loading' && mfaStatus !== 'error' && (
                <div className={`p-4 rounded-lg border-2 ${
                  mfaStatus === 'enabled'
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      mfaStatus === 'enabled'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      {mfaStatus === 'enabled' ? (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        mfaStatus === 'enabled'
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-amber-900 dark:text-amber-100'
                      }`}>
                        {mfaStatus === 'enabled' ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication Disabled'}
                      </p>
                      {mfaStatus === 'enabled' && mfaSetupAt && (
                        <p className={`text-sm mt-1 ${
                          mfaStatus === 'enabled'
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-amber-700 dark:text-amber-300'
                        }`}>
                          Enabled on {formatDate(mfaSetupAt)}
                        </p>
                      )}
                      {mfaStatus === 'disabled' && (
                        <p className="text-sm mt-1 text-amber-700 dark:text-amber-300">
                          Your account is not protected by two-factor authentication. We recommend enabling it.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {mfaStatus === 'loading' && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin">
                    <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-primary-600 rounded-full" />
                  </div>
                </div>
              )}

              {/* Error State */}
              {mfaStatus === 'error' && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-red-600 dark:text-red-400">Failed to load MFA status</p>
                </div>
              )}

              {/* Actions */}
              {mfaStatus === 'disabled' && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    onClick={() => setShowMfaSetup(true)}
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    Enable Two-Factor Authentication
                  </Button>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                    You&apos;ll need an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to enable this feature.
                  </p>
                </div>
              )}

              {mfaStatus === 'enabled' && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  {!showDisableForm ? (
                    <Button
                      onClick={() => setShowDisableForm(true)}
                      variant="danger"
                      className="w-full sm:w-auto"
                    >
                      Disable Two-Factor Authentication
                    </Button>
                  ) : (
                    <form onSubmit={handleDisableMfa} className="space-y-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Enter your current 6-digit authenticator code to disable two-factor authentication:
                      </p>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={mfaDisableCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setMfaDisableCode(value);
                        }}
                        disabled={isDisablingMfa}
                        className="w-full px-4 py-2 text-center text-xl tracking-widest border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                        autoComplete="off"
                      />
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowDisableForm(false);
                            setMfaDisableCode('');
                            setError(null);
                          }}
                          disabled={isDisablingMfa}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="danger"
                          isLoading={isDisablingMfa}
                          disabled={mfaDisableCode.length !== 6 || isDisablingMfa}
                          className="flex-1"
                        >
                          {isDisablingMfa ? 'Disabling...' : 'Disable'}
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
                <Lock className="h-5 w-5" />
                Security Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                <p className="font-medium text-slate-900 dark:text-slate-50">Protect Your Account:</p>
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
              <Clock className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage your active sessions across devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                  <Laptop className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-50">This Device</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Current session - active now
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 pt-2">
                Session management features will be available soon. You can manually log out from other devices using the logout button.
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
