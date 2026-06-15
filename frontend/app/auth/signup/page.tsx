'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {apiClient} from '@/lib/api/client';
import {Button, buttonVariants} from '@/components/ui/Button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Input} from '@/components/ui/Input';
import {ThemeToggle} from '@/components/ui/ThemeToggle';
import {BrandPanel} from '../_components/BrandPanel';
import '../_components/auth-form.css';
import {AlertCircle, Building2, CheckCircle2, Hash, Lock, Mail, User} from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);


  const {
    register,
    handleSubmit,
    setValue,
    formState: {errors},
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
    setValue('companyCode', slug, {shouldValidate: true});
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
      <div className="auth-shell relative overflow-hidden motion-rise">
        <div className="aura-auth-theme">
          <ThemeToggle compact/>
        </div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <BrandPanel
              headline={<>Set up your workspace<br/>in minutes.</>}
              lede="Build your organisation, invite your first administrator, and launch your people platform from one clean setup flow."
            />
            <section className="w-full max-w-[480px] mx-auto">
              <Card className="auth-shell-card motion-rise">
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div
                      className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-6 h-6 text-success-600 dark:text-success-400"/>
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Account Created Successfully
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Your organisation has been set up. Sign in with your admin credentials to get started.
                  </p>
                  <Link
                    href="/auth/login"
                    className={buttonVariants({variant: 'primary', className: 'w-full mt-4'})}
                  >
                    Sign In to Your Account
                  </Link>
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
            headline={<>Build your<br/>organisation.</>}
            lede="Set up teams, roles, and admin access so your people operations can start on day one."
          />

          <section className="w-full max-w-[520px] mx-auto">
            <Card className="auth-shell-card motion-rise">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Create your account</CardTitle>
                <CardDescription>Start your free trial. No credit card required.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Error */}
                  {error && (
                    <div className="auth-error-banner flex items-start gap-2 p-4">
                      <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5"/>
                      <p className="text-sm text-danger-700 dark:text-danger-400">{error}</p>
                    </div>
                  )}

                  {/* Company Section */}
                  <div className="space-y-4">
                    <h3
                      className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4"/>
                      Company Details
                    </h3>
                    <Input
                      label="Company Name"
                      {...register('companyName', {
                        onChange: (e) => handleCompanyNameChange(e.target.value),
                      })}
                      type="text"
                      placeholder="Acme Corporation"
                      error={errors.companyName?.message}
                    />
                    <Input
                      label="Company Code"
                      helper="(used in URLs, lowercase)"
                      icon={<Hash className="h-4 w-4"/>}
                      {...register('companyCode')}
                      type="text"
                      placeholder="acme-corp"
                      error={errors.companyCode?.message}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Admin Account Section */}
                  <div className="space-y-4 pt-2">
                    <h3
                      className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2"
                    >
                      <User className="w-4 h-4"/>
                      Admin Account
                    </h3>

                    {/* Name Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        icon={<User className="h-5 w-5"/>}
                        {...register('adminFirstName')}
                        type="text"
                        autoComplete="given-name"
                        placeholder="John"
                        error={errors.adminFirstName?.message}
                      />
                      <Input
                        label="Last Name"
                        icon={<User className="h-5 w-5"/>}
                        {...register('adminLastName')}
                        type="text"
                        autoComplete="family-name"
                        placeholder="Doe"
                        error={errors.adminLastName?.message}
                      />
                    </div>

                    <Input
                      label="Work Email"
                      icon={<Mail className="h-5 w-5"/>}
                      {...register('adminEmail')}
                      type="email"
                      autoComplete="email"
                      placeholder="john@acmecorp.com"
                      error={errors.adminEmail?.message}
                    />

                    <Input
                      label="Password"
                      helper="(min. 8 characters)"
                      icon={<Lock className="h-5 w-5"/>}
                      {...register('password')}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      error={errors.password?.message}
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full mt-2"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating your account...' : 'Create Account'}
                  </Button>

                  <p className="text-xs text-center text-[var(--text-muted)]">
                    By creating an account, you agree to our{' '}
                    <Link href="/terms" className="text-accent-700 dark:text-accent-400 underline underline-offset-2">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-accent-700 dark:text-accent-400 underline underline-offset-2">
                      Privacy Policy
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>

            <p className="mt-5 text-center text-xs text-[var(--text-muted)]">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-accent-700 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
