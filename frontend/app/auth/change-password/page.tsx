'use client';

import {useState} from 'react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AlertCircle, CheckCircle, Lock, ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {authApi} from '@/lib/api/auth';
import {useAuth} from '@/lib/hooks/useAuth';
import '../_components/auth-form.css';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
        'Must contain uppercase, lowercase, digit, and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const {user, setUser} = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<FormData>({resolver: zodResolver(schema)});

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      // Clear the mustChangePassword flag so AuthGuard stops intercepting
      if (user) {
        setUser({...user, mustChangePassword: false});
      }

      setIsSuccess(true);
      setTimeout(() => router.replace('/me/dashboard'), 1500);
    } catch (err: unknown) {
      const msg =
        (err as {response?: {data?: {message?: string}}})?.response?.data?.message ??
        'Failed to change password. Please check your current password and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Brand panel */}
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
            <p className="auth-chip">Security</p>
            <h2 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
              Set your password
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-7 max-w-sm">
              Your account was created with a temporary password. Please set a strong, unique
              password before continuing.
            </p>
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="auth-form-panel">
        <div className="auth-form-container">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
              <ShieldCheck className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">Change password</h1>
              <p className="text-xs text-[var(--text-muted)]">Required before you can continue</p>
            </div>
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle className="h-12 w-12 text-success-500" />
              <p className="font-medium text-[var(--text-primary)]">Password changed successfully!</p>
              <p className="text-sm text-[var(--text-muted)]">Redirecting to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-danger-300/40 bg-danger-50 dark:bg-danger-900/20 px-4 py-3 text-sm text-danger-700 dark:text-danger-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Current password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    className="pl-9"
                    {...register('currentPassword')}
                  />
                </div>
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                >
                  New password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    {...register('newPassword')}
                  />
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    {errors.newPassword.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  12+ characters · uppercase · lowercase · digit · special character
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Changing password…' : 'Set new password'}
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
