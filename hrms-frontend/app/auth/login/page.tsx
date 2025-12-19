'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGoogleLogin, CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveGoogleToken, GOOGLE_SSO_SCOPES } from '@/lib/utils/googleToken';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Building2,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ChevronDown,
  Info,
} from 'lucide-react';

const ALLOWED_DOMAIN = 'nulogic.io';

interface GoogleJwtPayload {
  email: string;
  hd?: string;
  name?: string;
  picture?: string;
}

// Validation schema with stronger rules
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Rate limiting configuration
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Check if demo mode is enabled (only show demo credentials in development)
const IS_DEMO_MODE = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Check if Google OAuth is configured
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Loading fallback for Suspense
function LoginPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-surface-50 to-teal-50 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/30">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-48 h-12 bg-surface-200 dark:bg-surface-700 rounded mb-8" />
        <div className="w-96 h-96 bg-surface-200 dark:bg-surface-700 rounded-xl" />
      </div>
    </div>
  );
}

// Wrap the main component with Suspense for useSearchParams
export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, googleLogin, user, isAuthenticated, hasHydrated } = useAuth();

  // Form state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Rate limiting state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingLockoutTime, setRemainingLockoutTime] = useState(0);

  // Google sign-in state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Initialize rate limiting from localStorage
  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      const storedAttempts = localStorage.getItem('loginAttempts');
      const storedLockout = localStorage.getItem('lockoutUntil');

      if (storedAttempts) {
        setLoginAttempts(parseInt(storedAttempts, 10));
      }
      if (storedLockout) {
        const lockoutTime = parseInt(storedLockout, 10);
        if (lockoutTime > Date.now()) {
          setLockoutUntil(lockoutTime);
        } else {
          // Clear expired lockout
          localStorage.removeItem('loginAttempts');
          localStorage.removeItem('lockoutUntil');
        }
      }
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (hasHydrated && isAuthenticated && user) {
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        // Role-based redirect - get primary role from roles array
        const primaryRole = user.roles?.[0]?.code || '';
        redirectBasedOnRole(primaryRole);
      }
    }
  }, [hasHydrated, isAuthenticated, user, router, searchParams]);

  // Lockout timer countdown
  useEffect(() => {
    if (lockoutUntil) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, lockoutUntil - Date.now());
        setRemainingLockoutTime(remaining);

        if (remaining === 0) {
          setLockoutUntil(null);
          setLoginAttempts(0);
          localStorage.removeItem('loginAttempts');
          localStorage.removeItem('lockoutUntil');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  const redirectBasedOnRole = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        router.push('/dashboard');
        break;
      case 'HR_MANAGER':
      case 'HR':
        router.push('/dashboard');
        break;
      case 'MANAGER':
        router.push('/dashboard');
        break;
      case 'EMPLOYEE':
      default:
        router.push('/dashboard');
        break;
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const isLockedOut = Boolean(lockoutUntil && lockoutUntil > Date.now());

  const formatLockoutTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const incrementLoginAttempts = () => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    localStorage.setItem('loginAttempts', newAttempts.toString());

    if (newAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      const lockout = Date.now() + RATE_LIMIT_WINDOW_MS;
      setLockoutUntil(lockout);
      localStorage.setItem('lockoutUntil', lockout.toString());
    }
  };

  const resetLoginAttempts = () => {
    setLoginAttempts(0);
    setLockoutUntil(null);
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('lockoutUntil');
  };

  const onSubmit = async (data: LoginFormData) => {
    if (isLockedOut) {
      setError(`Too many login attempts. Please try again in ${formatLockoutTime(remainingLockoutTime)}`);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await login({
        email: data.email,
        password: data.password,
      });

      // Reset rate limiting on successful login
      resetLoginAttempts();

      // Handle remember me (store preference)
      if (data.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      // Role-based redirect
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        // Login sets user in store, just redirect to dashboard
        // Role-based routing can be handled by middleware or dashboard component
        router.push('/dashboard');
      }
    } catch (err: any) {
      incrementLoginAttempts();

      const attemptsRemaining = RATE_LIMIT_MAX_ATTEMPTS - (loginAttempts + 1);
      let errorMessage = err.response?.data?.message || 'Invalid email or password. Please try again.';

      if (attemptsRemaining > 0 && attemptsRemaining < 3) {
        errorMessage += ` (${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining)`;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'password', { shouldValidate: true });
    setShowDemoCredentials(false);
  };

  // Google Sign-In with SSO - uses implicit flow with access token
  // The access token is saved for Drive/Mail and sent to backend for validation
  const handleGoogleSSO = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      setError(null);

      try {
        // Get user info to validate domain
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to get user info');
        }

        const userInfo = await userInfoResponse.json();

        // Check if the email domain is allowed
        if (!userInfo.hd || userInfo.hd !== ALLOWED_DOMAIN) {
          setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
          setIsGoogleLoading(false);
          return;
        }

        // Verify email domain as additional check
        if (!userInfo.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
          setIsGoogleLoading(false);
          return;
        }

        // Save the Google access token for Drive and Mail SSO
        saveGoogleToken(tokenResponse.access_token, tokenResponse.expires_in || 3600);

        // Send access token to backend - backend will validate via Google's tokeninfo endpoint
        await googleLogin({ credential: tokenResponse.access_token, accessToken: true });

        // Redirect to dashboard on success
        const returnUrl = searchParams.get('returnUrl');
        router.push(returnUrl || '/dashboard');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('Google login error:', errorResponse);
      setError(
        'Google sign-in failed. Please ensure popups are allowed and third-party cookies are enabled. If the issue persists, please use email/password login.'
      );
    },
    scope: GOOGLE_SSO_SCOPES + ' openid email profile',
    flow: 'implicit',
    prompt: 'select_account', // Always show account picker
  });

  // Legacy Google Sign-In handlers (credential-based, without Drive/Mail scopes)
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed. No credential received.');
      return;
    }

    setIsGoogleLoading(true);
    setError(null);

    try {
      // Decode the JWT to check the domain
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);

      // Check if the email domain is allowed
      if (!decoded.hd || decoded.hd !== ALLOWED_DOMAIN) {
        setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
        setIsGoogleLoading(false);
        return;
      }

      // Verify email domain as additional check
      if (!decoded.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
        setIsGoogleLoading(false);
        return;
      }

      // Send credential to backend for verification
      await googleLogin({ credential: credentialResponse.credential });

      // Redirect to dashboard on success
      const returnUrl = searchParams.get('returnUrl');
      router.push(returnUrl || '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    // Common reasons for Google sign-in failure:
    // 1. Popup blocked - user needs to allow popups
    // 2. Third-party cookies blocked - required for Google Sign-In
    // 3. OAuth client misconfigured - authorized origins not set
    // 4. Network issues
    setError(
      'Google sign-in failed. Please ensure popups are allowed and third-party cookies are enabled. If the issue persists, please use email/password login.'
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-surface-50 to-teal-50 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/30 py-12 px-4 sm:px-6 lg:px-8 pattern-dots">
      <div
        className={`max-w-md w-full transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        {/* Logo and Title */}
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
          <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
            Welcome back! Please sign in to continue
          </p>
        </div>

        {/* Login Card */}
        <Card className="backdrop-blur-xl bg-white/95 dark:bg-surface-900/95 border-surface-200/80 dark:border-surface-700/80 shadow-soft-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Lockout Warning */}
              {isLockedOut && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                      Account Temporarily Locked
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      Too many failed attempts. Try again in {formatLockoutTime(remainingLockoutTime)}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && !isLockedOut && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">
                      Authentication Failed
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-surface-400" />
                  </div>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    disabled={isLoading || isLockedOut}
                    placeholder="Enter your email"
                    className={`block w-full pl-10 pr-4 py-3 bg-white dark:bg-surface-800 border rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                      errors.email
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-surface-200 dark:border-surface-700'
                    } ${(isLoading || isLockedOut) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-surface-400" />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isLoading || isLockedOut}
                    placeholder="Enter your password"
                    className={`block w-full pl-10 pr-12 py-3 bg-white dark:bg-surface-800 border rounded-xl text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                      errors.password
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-surface-200 dark:border-surface-700'
                    } ${(isLoading || isLockedOut) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isLockedOut}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    {...register('rememberMe')}
                    type="checkbox"
                    disabled={isLoading || isLockedOut}
                    className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 dark:bg-surface-800"
                  />
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Demo Credentials (Development Only) */}
              {IS_DEMO_MODE && (
                <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 dark:bg-surface-800/50 text-left hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300">
                      <Info className="h-4 w-4 text-primary-500" />
                      Demo Credentials
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-surface-400 transition-transform ${
                        showDemoCredentials ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {showDemoCredentials && (
                    <div className="p-4 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700">
                      <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
                        Click to auto-fill (password: <code className="font-mono bg-surface-100 dark:bg-surface-800 px-1 rounded">password</code>)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Admin', email: 'admin@demo.com' },
                          { label: 'HR Manager', email: 'michael.chen@company.com' },
                          { label: 'Manager', email: 'sarah.johnson@company.com' },
                          { label: 'Employee', email: 'john.smith@company.com' },
                        ].map((cred) => (
                          <button
                            key={cred.email}
                            type="button"
                            onClick={() => fillDemoCredentials(cred.email)}
                            className="px-3 py-2 text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors text-left truncate"
                          >
                            {cred.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3"
                isLoading={isLoading}
                disabled={isLoading || isLockedOut || (!isDirty && !isValid)}
              >
                {isLoading ? (
                  'Signing in...'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </span>
                )}
              </Button>

              {/* Google Sign-In Section (only shown when configured) */}
              {GOOGLE_CLIENT_ID && (
                <>
                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-surface-200 dark:border-surface-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-surface-900 px-2 text-surface-500 dark:text-surface-400">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* Google Sign-In Button with SSO */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-3 flex items-center justify-center gap-3"
                    onClick={() => handleGoogleSSO()}
                    disabled={isGoogleLoading || isLockedOut}
                  >
                    {isGoogleLoading ? (
                      <div className="w-5 h-5 border-2 border-surface-300 border-t-primary-500 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
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
                    )}
                    <span>Sign in with Google</span>
                  </Button>

                  {/* Google Domain Notice */}
                  <p className="text-xs text-center text-surface-500 dark:text-surface-400">
                    Google sign-in is restricted to @{ALLOWED_DOMAIN} accounts only.
                    <br />
                    <span className="text-primary-500">Includes access to NU-Drive and NU-Mail.</span>
                  </p>
                </>
              )}

              {/* Rate Limit Warning */}
              {loginAttempts > 0 && loginAttempts < RATE_LIMIT_MAX_ATTEMPTS && !isLockedOut && (
                <p className="text-xs text-center text-surface-500 dark:text-surface-400">
                  {RATE_LIMIT_MAX_ATTEMPTS - loginAttempts} attempt{RATE_LIMIT_MAX_ATTEMPTS - loginAttempts === 1 ? '' : 's'} remaining before temporary lockout
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-surface-500 dark:text-surface-400">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
              Privacy Policy
            </Link>
          </p>
          <p className="text-xs text-surface-400 dark:text-surface-500">
            NuLogic HRMS v1.0 &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
