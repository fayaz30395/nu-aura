'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, buttonVariants} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Input} from '@/components/ui/Input';
import {GoogleGLogo} from '@/components/ui/GoogleGLogo';
import {ThemeToggle} from '@/components/ui/ThemeToggle';
import {BrandPanel} from '../_components/BrandPanel';
import '../_components/auth-form.css';
import {AlertCircle, ArrowLeft, CheckCircle, ExternalLink, Mail, ShieldCheck} from 'lucide-react';
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
      <div className="auth-shell relative overflow-hidden motion-rise">
        <div className="aura-auth-theme">
          <ThemeToggle compact/>
        </div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <BrandPanel
              headline={<>Secure reset<br/>flow.</>}
              lede="Confirm your account email and receive a one-time secure link. Use it to set a new password and return to work quickly."
            />

            <section className="w-full max-w-[460px] mx-auto">
              <Card className="auth-shell-card motion-rise">
                <CardContent className="pt-8 pb-8 text-center">
                {isSsoUser ? (
                    <>
                      {/* Google SSO user — redirect to Google account */}
                      <div
                        className="inline-flex items-center justify-center w-12 h-12 bg-accent-100 dark:bg-accent-500/10 rounded-full mb-4">
                        <ShieldCheck className="w-6 h-6 text-accent-600 dark:text-accent-400"/>
                      </div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        Google Sign-In Account
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] mb-2">
                        The account for{' '}
                        <span className="font-medium text-[var(--text-primary)]">
                          {getValues('email')}
                        </span>{' '}
                        uses Google Sign-In.
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mb-6">
                        Please manage your password through your Google account settings.
                      </p>
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 mb-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        <GoogleGLogo className="w-5 h-5"/>
                        Go to Google Account Security
                        <ExternalLink className="w-4 h-4 text-[var(--text-muted)]"/>
                      </a>
                      <Link href="/auth/login" className={buttonVariants({variant: 'primary', className: 'w-full'})}>
                        <ArrowLeft className="w-4 h-4 mr-2"/>
                        Back to Sign In
                      </Link>
                    </>
                  ) : (
                    <>
                      {/* Local user — check email */}
                      <div
                        className="inline-flex items-center justify-center w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-full mb-4">
                        <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400"/>
                      </div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        Check Your Email
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] mb-6">
                        We&apos;ve sent a password reset link to{' '}
                        <span className="font-medium text-[var(--text-primary)]">
                          {getValues('email')}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mb-6">
                        Didn&apos;t receive the email? Check your spam folder or{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setIsSubmitted(false);
                            setIsSsoUser(false);
                          }}
                          className="text-accent-700 dark:text-accent-400 hover:underline font-medium"
                        >
                          try again
                        </button>
                      </p>
                      <Link href="/auth/login" className={buttonVariants({variant: 'primary', className: 'w-full'})}>
                        <ArrowLeft className="w-4 h-4 mr-2"/>
                        Back to Sign In
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell relative overflow-hidden motion-rise">
      <div className="aura-auth-theme">
        <ThemeToggle compact/>
      </div>
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <BrandPanel
            headline={<>Get your<br/>account back.</>}
            lede="Submit your email and we'll send a secure reset link. The link expires quickly to protect your workspace."
          />

          {/* Forgot Password Card */}
          <section className="w-full max-w-[460px] mx-auto">
            <Card className="auth-shell-card motion-rise">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Forgot Password</CardTitle>
                <CardDescription>
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Error Alert */}
                  {error && (
                    <div
                      className="auth-error-banner flex items-start gap-2 p-4">
                      <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5"/>
                      <div className="flex-1">
                        <p className="text-sm text-danger-700 dark:text-danger-400">
                          {error}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Email Input */}
                  <Input
                    label="Email Address"
                    icon={<Mail className="h-5 w-5"/>}
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    disabled={isLoading}
                    placeholder="Enter your email"
                    error={errors.email?.message}
                    className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
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
            <div className="text-center mt-8 space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                By continuing, you agree to our{' '}
                <Link href="/terms"
                      className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy"
                      className="text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors font-medium">
                  Privacy Policy
                </Link>
              </p>
              <p className="text-caption">
                NULogic &copy; {new Date().getFullYear()} &middot; NU-AURA Platform
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
