'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Building2,
  Lock,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { publicApiClient } from '@/lib/api/public-client';

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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // No token in URL -- invalid link
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 via-surface-50 to-surface-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg mb-4 shadow-lg shadow-accent-500/25">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold skeuo-emboss">NU-AURA</h1>
          </div>
          <Card className="bg-[var(--bg-card)] border-[var(--border-main)] shadow-xl">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-danger-600 dark:text-danger-400" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Invalid Reset Link
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                This password reset link is invalid or missing a token. Please request a new reset link.
              </p>
              <Link href="/auth/forgot-password">
                <Button variant="primary" className="w-full mb-3">
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 via-surface-50 to-surface-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg mb-4 shadow-lg shadow-accent-500/25">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold skeuo-emboss">NU-AURA</h1>
          </div>
          <Card className="bg-[var(--bg-card)] border-[var(--border-main)] shadow-xl">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Password Reset Successfully
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/auth/login')}
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
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
      const errorObj = err as Error & { status?: number };
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 via-surface-50 to-surface-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg mb-4 shadow-lg shadow-accent-500/25">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold skeuo-emboss">NU-AURA</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Create your new password
          </p>
        </div>

        {/* Reset Password Card */}
        <Card className="skeuo-card bg-[var(--bg-card)] border-[var(--border-main)] shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl skeuo-emboss">Reset Password</CardTitle>
            <CardDescription>
              Enter your new password below. It must be at least 12 characters with uppercase, lowercase, digit, and special character.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-danger-700 dark:text-danger-400">{error}</p>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    {...register('newPassword')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isLoading}
                    placeholder="Enter new password"
                    className={`input-aura block w-full pl-10 pr-12 py-3 bg-[var(--bg-input)] border rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all ${
                      errors.newPassword
                        ? 'border-danger-500 dark:border-danger-500'
                        : 'border-[var(--border-main)]'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-[var(--text-muted)]" />
                    ) : (
                      <Eye className="h-5 w-5 text-[var(--text-muted)]" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-danger-600 dark:text-danger-400 mt-1">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isLoading}
                    placeholder="Confirm new password"
                    className={`input-aura block w-full pl-10 pr-12 py-3 bg-[var(--bg-input)] border rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all ${
                      errors.confirmPassword
                        ? 'border-danger-500 dark:border-danger-500'
                        : 'border-[var(--border-main)]'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-[var(--text-muted)]" />
                    ) : (
                      <Eye className="h-5 w-5 text-[var(--text-muted)]" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-danger-600 dark:text-danger-400 mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="text-xs text-[var(--text-muted)] space-y-1 bg-[var(--bg-secondary)] p-3 rounded-lg">
                <p className="font-medium text-[var(--text-secondary)]">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>At least 12 characters</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One digit</li>
                  <li>One special character</li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="btn-primary w-full py-3"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>

              {/* Back to Login */}
              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-accent-700 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          NU-AURA v1.0 &copy; {new Date().getFullYear()}
        </p>
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 via-surface-50 to-surface-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950">
          <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
