'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Hash,
} from 'lucide-react';

const signupSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(200),
  companyCode: z
    .string()
    .min(2, 'Company code must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  adminFirstName: z.string().min(1, 'First name is required').max(100),
  adminLastName: z.string().min(1, 'Last name is required').max(100),
  adminEmail: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
  contactPhone: z.string().optional(),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      companyName: '',
      companyCode: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      password: '',
      contactPhone: '',
    },
  });

  // Auto-generate company code from company name
  const handleCompanyNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
    setValue('companyCode', slug, { shouldValidate: true });
  };

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setIsLoading(true);
    try {
      await apiClient.post('/v1/tenants/register', {
        companyName: data.companyName,
        companyCode: data.companyCode,
        adminFirstName: data.adminFirstName,
        adminLastName: data.adminLastName,
        adminEmail: data.adminEmail,
        password: data.password,
        contactPhone: data.contactPhone || undefined,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Registration failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-[var(--bg-surface)] to-primary-50 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/30 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Image
              src="/images/logo.png"
              alt="NuLogic"
              width={200}
              height={60}
              className="h-16 w-auto object-contain dark:brightness-110 mx-auto"
              priority
            />
          </div>
          <Card className="bg-[var(--bg-card)] border-[var(--border-main)]/80 dark:border-[var(--border-main)]/80 shadow-soft-lg">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Account Created Successfully
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Your organisation has been set up. Sign in with your admin credentials to get started.
              </p>
              <Button
                variant="primary"
                className="w-full py-3 mt-4"
                onClick={() => router.push('/auth/login')}
              >
                Sign In to Your Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-[var(--bg-surface)] to-primary-50 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/30 py-12 px-4 sm:px-6 lg:px-8 pattern-dots">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/images/logo.png"
              alt="NuLogic"
              width={200}
              height={60}
              className="h-16 w-auto object-contain dark:brightness-110"
              priority
            />
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Set up your organisation in minutes
          </p>
        </div>

        {/* Signup Card */}
        <Card className="skeuo-card bg-[var(--bg-card)] border-[var(--border-main)]/80 dark:border-[var(--border-main)]/80 shadow-soft-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl skeuo-emboss">Create your account</CardTitle>
            <CardDescription>Start your free trial — no credit card required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Company Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Company Details
                </h3>

                {/* Company Name */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Company Name
                  </label>
                  <input
                    {...register('companyName', {
                      onChange: (e) => handleCompanyNameChange(e.target.value),
                    })}
                    type="text"
                    placeholder="Acme Corporation"
                    className={`input-aura block w-full px-4 py-3 bg-[var(--bg-input)] border rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                      errors.companyName
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-[var(--border-main)]'
                    }`}
                  />
                  {errors.companyName && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.companyName.message}</p>
                  )}
                </div>

                {/* Company Code */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Company Code
                    <span className="ml-1 text-xs text-[var(--text-muted)]">(used in URLs, lowercase)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-4 w-4 text-[var(--text-muted)]" />
                    </div>
                    <input
                      {...register('companyCode')}
                      type="text"
                      placeholder="acme-corp"
                      className={`input-aura block w-full pl-9 pr-4 py-3 bg-[var(--bg-input)] border rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-mono text-sm ${
                        errors.companyCode
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-[var(--border-main)]'
                      }`}
                    />
                  </div>
                  {errors.companyCode && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.companyCode.message}</p>
                  )}
                </div>
              </div>

              {/* Admin Account Section */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Admin Account
                </h3>

                {/* Name Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      First Name
                    </label>
                    <input
                      {...register('adminFirstName')}
                      type="text"
                      placeholder="John"
                      className={`input-aura block w-full px-4 py-3 bg-[var(--bg-input)] border rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                        errors.adminFirstName
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-[var(--border-main)]'
                      }`}
                    />
                    {errors.adminFirstName && (
                      <p className="text-xs text-red-600 dark:text-red-400">{errors.adminFirstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                      Last Name
                    </label>
                    <input
                      {...register('adminLastName')}
                      type="text"
                      placeholder="Doe"
                      className={`input-aura block w-full px-4 py-3 bg-[var(--bg-input)] border rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                        errors.adminLastName
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-[var(--border-main)]'
                      }`}
                    />
                    {errors.adminLastName && (
                      <p className="text-xs text-red-600 dark:text-red-400">{errors.adminLastName.message}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Work Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                    <input
                      {...register('adminEmail')}
                      type="email"
                      autoComplete="email"
                      placeholder="john@acmecorp.com"
                      className={`input-aura block w-full pl-10 pr-4 py-3 bg-[var(--bg-input)] border rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                        errors.adminEmail
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-[var(--border-main)]'
                      }`}
                    />
                  </div>
                  {errors.adminEmail && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.adminEmail.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Password
                    <span className="ml-1 text-xs text-[var(--text-muted)]">(min. 8 characters)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      className={`input-aura block w-full pl-10 pr-12 py-3 bg-[var(--bg-input)] border rounded-xl text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                        errors.password
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-[var(--border-main)]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                className="btn-primary w-full py-3 mt-2"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creating your account...' : 'Create Account'}
              </Button>

              <p className="text-xs text-center text-[var(--text-muted)]">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
