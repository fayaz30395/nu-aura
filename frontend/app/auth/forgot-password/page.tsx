'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Building2,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSsoUser, setIsSsoUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setError(null);
    setIsLoading(true);
    setIsSsoUser(false);

    try {
      const response = await apiClient.post<{ message: string; authProvider: string }>(
        '/auth/forgot-password',
        { email: data.email }
      );

      if (response.data.authProvider === 'GOOGLE') {
        setIsSsoUser(true);
      }

      setIsSubmitted(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email. Please try again.';
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 via-surface-50 to-surface-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg mb-4 shadow-[var(--shadow-dropdown)] shadow-accent-500/25">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold skeuo-emboss">
              NU-AURA
            </h1>
          </div>

          <Card className="bg-[var(--bg-card)] border-[var(--border-main)] shadow-[var(--shadow-dropdown)]">
            <CardContent className="pt-8 pb-8 text-center">
              {isSsoUser ? (
                <>
                  {/* Google SSO user — redirect to Google account */}
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-100 dark:bg-accent-900/30 rounded-full mb-4">
                    <ShieldCheck className="w-8 h-8 text-accent-700 dark:text-accent-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    Google Sign-In Account
                  </h2>
                  <p className="text-[var(--text-secondary)] mb-2">
                    The account for{' '}
                    <span className="font-medium text-[var(--text-primary)]">
                      {getValues('email')}
                    </span>{' '}
                    uses Google Sign-In.
                  </p>
                  <p className="text-body-muted mb-6">
                    Please manage your password through your Google account settings.
                  </p>
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 mb-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Go to Google Account Security
                    <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
                  </a>
                  <Link href="/auth/login">
                    <Button variant="primary" className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  {/* Local user — check email */}
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    Check Your Email
                  </h2>
                  <p className="text-[var(--text-secondary)] mb-6">
                    We&apos;ve sent a password reset link to{' '}
                    <span className="font-medium text-[var(--text-primary)]">
                      {getValues('email')}
                    </span>
                  </p>
                  <p className="text-body-muted mb-6">
                    Didn&apos;t receive the email? Check your spam folder or{' '}
                    <button
                      onClick={() => {
                        setIsSubmitted(false);
                        setIsSsoUser(false);
                      }}
                      className="text-accent-700 dark:text-accent-400 hover:underline font-medium"
                    >
                      try again
                    </button>
                  </p>
                  <Link href="/auth/login">
                    <Button variant="primary" className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 via-surface-50 to-surface-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-lg mb-4 shadow-[var(--shadow-dropdown)] shadow-accent-500/25">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold skeuo-emboss">
            NU-AURA
          </h1>
          <p className="mt-2 text-body-secondary">
            Reset your password
          </p>
        </div>

        {/* Forgot Password Card */}
        <Card className="skeuo-card bg-[var(--bg-card)] border-[var(--border-main)] shadow-[var(--shadow-dropdown)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl skeuo-emboss">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-danger-700 dark:text-danger-400">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    disabled={isLoading}
                    placeholder="Enter your email"
                    className={`input-aura block w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] border rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all ${
                      errors.email
                        ? 'border-danger-500 dark:border-danger-500'
                        : 'border-[var(--border-main)]'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-danger-600 dark:text-danger-400 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="btn-primary w-full py-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
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
        <p className="mt-6 text-center text-caption">
          NU-AURA v1.0 &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
