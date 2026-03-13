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
import { MfaVerification } from '@/components/auth/MfaVerification';
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
  const { login, googleLogin, user, isAuthenticated, hasHydrated, setUser } = useAuth();

  // Form state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);

  // Rate limiting state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingLockoutTime, setRemainingLockoutTime] = useState(0);

  // Google sign-in state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Initialize rate limiting from localStorage
  useEffect(() => {
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

  // Track whether the user performed a fresh login on THIS page visit.
  // This distinguishes "stale localStorage auth on page load" from "user just logged in".
  const [didFreshLogin, setDidFreshLogin] = useState(false);

  // On mount: if Zustand says authenticated but we landed on the login page,
  // it means the httpOnly cookie is gone (middleware/API client sent us here).
  // Clear the stale auth state immediately to prevent redirect loops.
  useEffect(() => {
    if (!hasHydrated) return;

    if (isAuthenticated && user && !didFreshLogin) {
      // Stale auth: cookie expired but localStorage still has user data.
      // Clear it to break the loop.
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantId');
      }
      setUser(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  // Redirect after a FRESH login (not stale localStorage)
  useEffect(() => {
    if (!hasHydrated || !didFreshLogin) return;

    if (isAuthenticated && user && !mfaRequired) {
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        const primaryRole = user.roles?.[0]?.code || '';
        redirectBasedOnRole(primaryRole);
      }
    }
  }, [hasHydrated, isAuthenticated, user, didFreshLogin, router, searchParams, mfaRequired]);

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
    // Default landing page for all users is /home
    router.push('/home');
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

      // Check if MFA is required
      if ((response as any).mfaRequired && (response as any).userId) {
        setMfaRequired(true);
        setMfaUserId((response as any).userId);
        // Reset form but keep showing it
        setIsLoading(false);
        return;
      }

      // Reset rate limiting on successful login
      resetLoginAttempts();

      // Handle remember me (store preference)
      if (data.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      // Mark fresh login so the redirect useEffect knows this is real auth
      setDidFreshLogin(true);

      // Role-based redirect
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      console.error('[LoginPage] Login error:', err);
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

  const handleMfaSuccess = (token: string) => {
    resetLoginAttempts();
    setDidFreshLogin(true);
    const returnUrl = searchParams.get('returnUrl');
    router.push(returnUrl || '/home');
  };

  const handleMfaCancel = () => {
    setMfaRequired(false);
    setMfaUserId(null);
    setError(null);
  };

  // Google Sign-In with SSO - uses implicit flow with access token
  // The access token is saved for Drive/Mail and sent to backend for validation
  const handleGoogleSSO = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('[Google SSO] Success callback triggered', { hasToken: !!tokenResponse.access_token });
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
        // Note: hd (hosted domain) might be missing for some Google accounts or flows
        const domain = userInfo.hd || userInfo.email.split('@')[1];

        if (domain !== ALLOWED_DOMAIN) {
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

        setDidFreshLogin(true);
        const returnUrl = searchParams.get('returnUrl');
        router.push(returnUrl || '/home');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('[Google SSO] Error callback triggered:', errorResponse);
      setError(
        'Google sign-in failed. Please ensure popups are allowed and third-party cookies are enabled.'
      );
    },
    scope: GOOGLE_SSO_SCOPES + ' openid email profile',
    flow: 'implicit',
    prompt: 'select_account', // Always show account picker
  });

  // Log Google Client ID on component mount for debugging
  useEffect(() => {
    console.log('[Google SSO] Client ID configured:', GOOGLE_CLIENT_ID ? 'Yes' : 'No');
    console.log('[Google SSO] Client ID value:', GOOGLE_CLIENT_ID);
  }, []);

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

      setDidFreshLogin(true);
      const returnUrl = searchParams.get('returnUrl');
      router.push(returnUrl || '/home');
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

  // Show MFA verification screen if required
  if (mfaRequired && mfaUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-surface-50 to-teal-50 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/30 py-12 px-4 sm:px-6 lg:px-8 pattern-dots">
        <div className="max-w-md w-full">
          <MfaVerification
            userId={mfaUserId}
            onSuccess={handleMfaSuccess}
            onCancel={handleMfaCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-surface-50 to-teal-50 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/30 py-12 px-4 sm:px-6 lg:px-8 pattern-dots">
      <div className="max-w-md w-full">

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
              Sign in with your NuLogic Google account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Error Alert */}
              {error && (
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

              {/* Google Sign-In Button with SSO */}
              <Button
                type="button"
                variant="outline"
                className="w-full py-3 flex items-center justify-center gap-3 border-2"
                onClick={() => {
                  console.log('[Google SSO] Button clicked, initiating Google login');
                  handleGoogleSSO();
                }}
                disabled={isGoogleLoading}
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
                <span className="font-medium">Sign in with Google</span>
              </Button>

              {/* Google Domain Notice */}
              <p className="text-xs text-center text-surface-500 dark:text-surface-400">
                Google sign-in is restricted to @{ALLOWED_DOMAIN} accounts only.
                <br />
                <span className="text-primary-500">Includes access to NU-Drive and NU-Mail.</span>
              </p>
            </div>
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
