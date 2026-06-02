'use client';

import {Suspense, useState} from 'react';
import Image from 'next/image';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, buttonVariants} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Input} from '@/components/ui/Input';
import {AlertCircle, ArrowLeft, CheckCircle, Lock} from 'lucide-react';
import {publicApiClient} from '@/lib/api/public-client';

/**
 * Password reset form schema.
 * Matches backend ResetPasswordRequest DTO: token, newPassword, confirmPassword.
 */
const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
        'Password must contain uppercase, lowercase, digit, and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordSidePanel({eyebrow, headline, description}: {
  eyebrow: string;
  headline: string;
  description: string;
}) {
  return (
    <section className="hidden lg:flex">
      <div className="auth-side-panel p-10 w-full flex items-center motion-rise">
        <div className="auth-side-panel-content space-y-6">
          <Image
            src="/images/nulogic-logo.svg"
            alt="NULogic"
            width={188}
            height={56}
            className="h-12 w-auto object-contain dark:hidden"
            priority
          />
          <Image
            src="/images/nulogic-logo-white.svg"
            alt="NULogic"
            width={188}
            height={56}
            className="h-12 w-auto object-contain hidden dark:block"
            priority
          />
          <p className="auth-chip">{eyebrow}</p>
          <h2 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">{headline}</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-7 max-w-sm">{description}</p>
        </div>
      </div>
    </section>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <div className="auth-shell motion-rise">
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
            <ResetPasswordSidePanel
              eyebrow="Password recovery"
              headline="Secure password reset"
              description="Use a valid, time-limited reset link only once. If it expires, request a fresh one and proceed immediately."
            />

            <section className="w-full">
              <Card className="auth-shell-card motion-rise">
                <CardContent className="pt-8 pb-8 text-center">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full mb-4"
                  >
                    <AlertCircle className="w-8 h-8 text-danger-600 dark:text-danger-400"/>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    Invalid Reset Link
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mb-6">
                    This password reset link is invalid or missing a token. Please request a new reset link.
                  </p>
                  <Link
                    href="/auth/forgot-password"
                    className={buttonVariants({variant: 'primary', className: 'w-full'})}
                  >
                    Request New Reset Link
                  </Link>
                  <Link
                    href="/auth/login"
                    className={buttonVariants({variant: 'outline', className: 'w-full mt-3'})}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2"/>
                    Back to Sign In
                  </Link>
                  <div className="mt-6 text-center space-y-2">
                    <p className="text-xs text-[var(--text-secondary)]">
                      By resetting, you agree to our{' '}
                      <Link href="/terms" className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                        Terms
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                        Privacy Policy
                      </Link>
                    </p>
                    <p className="text-caption">
                      NULogic &copy; {new Date().getFullYear()} &middot; NU-AURA Platform
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="auth-shell motion-rise">
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
            <ResetPasswordSidePanel
              eyebrow="Password reset"
              headline="Password reset complete"
              description="Your account credentials have been updated. Sign in with your new password to continue."
            />

            <section className="w-full">
              <Card className="auth-shell-card motion-rise">
                <CardContent className="pt-8 pb-8 text-center">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full mb-4"
                  >
                    <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400"/>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    Password Reset Successfully
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mb-6">
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                  <Link href="/auth/login" className={buttonVariants({variant: 'primary', className: 'w-full'})}>
                    Sign In
                  </Link>
                  <div className="mt-6 text-center space-y-2">
                    <p className="text-xs text-[var(--text-secondary)]">
                      By resetting, you agree to our{' '}
                      <Link href="/terms" className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                        Terms
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                        Privacy Policy
                      </Link>
                    </p>
                    <p className="text-caption">
                      NULogic &copy; {new Date().getFullYear()} &middot; NU-AURA Platform
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      await publicApiClient.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      const errorObj = err as Error & {status?: number};
      if (errorObj.status === 400) {
        setError(errorObj.message || 'Invalid or expired reset token. Please request a new one.');
      } else {
        setError(errorObj.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell motion-rise">
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-start">
          <ResetPasswordSidePanel
            eyebrow="Password reset"
            headline="Create a stronger password"
            description="Choose a unique password with upper/lower case, numbers and symbols. Your new credential is saved only after verification."
          />

          <section className="w-full">
            <Card className="auth-shell-card motion-rise">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Reset Password</CardTitle>
                <CardDescription>
                  Enter your new password below. It must be at least 12 characters with uppercase, lowercase, digit, and
                  special character.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {error && (
                    <div className="auth-error-banner flex items-start gap-2 p-4">
                      <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5"/>
                      <div className="flex-1">
                        <p className="text-sm text-danger-700 dark:text-danger-400">{error}</p>
                      </div>
                    </div>
                  )}

                  <Input
                    label="New Password"
                    icon={<Lock className="h-5 w-5"/>}
                    {...register('newPassword')}
                    type="password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    placeholder="Enter new password"
                    error={errors.newPassword?.message}
                    className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  />

                  <Input
                    label="Confirm Password"
                    icon={<Lock className="h-5 w-5"/>}
                    {...register('confirmPassword')}
                    type="password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    placeholder="Confirm new password"
                    error={errors.confirmPassword?.message}
                    className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  />

                  <div className="text-caption space-y-1 bg-[var(--bg-surface)] p-4 rounded-lg">
                    <p className="font-medium text-[var(--text-secondary)]">Password requirements:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>At least 12 characters</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One digit</li>
                      <li>One special character</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4"/>
                      Back to Sign In
                    </Link>
                  </div>
                </form>
              </CardContent>

              <div className="text-center mt-8 space-y-2">
                <p className="text-xs text-[var(--text-secondary)]">
                  By resetting your password, you agree to our{' '}
                  <Link href="/terms" className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                    Privacy Policy
                  </Link>
                </p>
                <p className="text-caption">
                  NULogic &copy; {new Date().getFullYear()} &middot; NU-AURA Platform
                </p>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Reset Password Page
 *
 * Handles the password reset flow when users click the link in their email.
 * The backend sends emails with /reset-password?token=... URLs.
 *
 * Uses publicApiClient (no auth cookie required) to POST to /auth/reset-password.
 * Wrapped in Suspense because useSearchParams() requires it in Next.js App Router.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-shell motion-rise">
          <div className="auth-shell-grid auth-shell-narrow">
            <div className="auth-loading-card w-full max-w-md motion-rise">
              <div className="skeleton-aura h-10 w-48 rounded mx-auto"/>
              <div className="skeleton-aura h-4 w-64 rounded mx-auto"/>
              <div className="space-y-4">
                <div className="skeleton-aura h-10 w-full rounded"/>
                <div className="skeleton-aura h-10 w-full rounded"/>
                <div className="skeleton-aura h-10 w-full rounded-lg"/>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordForm/>
    </Suspense>
  );
}
