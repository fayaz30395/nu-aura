'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {GoogleGLogo} from '@/components/ui/GoogleGLogo';
import {AlertCircle, ArrowLeft, Building2, CheckCircle, ExternalLink, Mail, ShieldCheck,} from 'lucide-react';
import {apiClient} from '@/lib/api/client';

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
    formState: {errors},
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
        {email: data.email}
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
      <div
        className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 rounded-lg mb-4">
              <Building2 className="w-8 h-8"/>
            </div>
            <h1 className="text-xl font-bold">
              NU-AURA
            </h1>
          </div>

          <Card className="card-elevated">
            <CardContent className="pt-8 pb-8 text-center">
              {isSsoUser ? (
                <>
                  {/* Google SSO user — redirect to Google account */}
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 bg-accent-100 dark:bg-accent-500/10 rounded-full mb-4">
                    <ShieldCheck className="w-8 h-8 text-accent-600 dark:text-accent-400"/>
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
                    className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 mb-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    <GoogleGLogo className="w-5 h-5"/>
                    Go to Google Account Security
                    <ExternalLink className="w-4 h-4 text-[var(--text-muted)]"/>
                  </a>
                  <Link href="/auth/login">
                    <Button variant="primary" className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2"/>
                      Back to Sign In
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  {/* Local user — check email */}
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400"/>
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
                      <ArrowLeft className="w-4 h-4 mr-2"/>
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
    <div
      className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 rounded-lg mb-4">
            <Building2 className="w-8 h-8"/>
          </div>
          <h1 className="text-xl font-bold">
            NU-AURA
          </h1>
          <p className="mt-2 text-body-secondary">
            Reset your password
          </p>
        </div>

        {/* Forgot Password Card */}
        <Card className="card-elevated">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <div
                  className="flex items-start gap-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5"/>
                  <div className="flex-1">
                    <p className="text-sm text-danger-700 dark:text-danger-400">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="forgot-password-email" className="block text-sm font-medium text-[var(--text-secondary)]">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[var(--text-muted)]"/>
                  </div>
                  <input
                    id="forgot-password-email"
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    disabled={isLoading}
                    placeholder="Enter your email"
                    className={`input-aura block w-full pl-10 ${
                      errors.email ? 'border-danger-500 dark:border-danger-500' : ''
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
                className="btn-primary w-full py-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
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
                  <ArrowLeft className="w-4 h-4"/>
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
