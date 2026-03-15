'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/utils/logger';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGoogleLogin, CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveGoogleToken, GOOGLE_SSO_SCOPES } from '@/lib/utils/googleToken';
import { MfaVerification } from '@/components/auth/MfaVerification';
import {
  AlertCircle,
  Shield,
  Zap,
  Globe,
  ArrowRight,
} from 'lucide-react';

// Configurable via env — falls back to 'nulogic.io' for local dev.
// Set NEXT_PUBLIC_SSO_ALLOWED_DOMAIN in .env.production for each tenant deployment.
const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_SSO_ALLOWED_DOMAIN || 'nulogic.io';

interface GoogleJwtPayload {
  email: string;
  hd?: string;
  name?: string;
  picture?: string;
}

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

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const IS_DEMO_MODE = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// ─── Animated Mesh Background ────────────────────────────────────────
function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Floating orbs
    const orbs = Array.from({ length: 5 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 150 + Math.random() * 250,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      hue: 220 + Math.random() * 40, // Blue-purple spectrum
    }));

    const animate = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark base
      ctx.fillStyle = '#0a0e27';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw orbs with gradient glow
      orbs.forEach((orb) => {
        orb.x += orb.speedX + Math.sin(time + orb.hue) * 0.2;
        orb.y += orb.speedY + Math.cos(time + orb.hue) * 0.2;

        // Wrap around
        if (orb.x < -orb.radius) orb.x = canvas.width + orb.radius;
        if (orb.x > canvas.width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = canvas.height + orb.radius;
        if (orb.y > canvas.height + orb.radius) orb.y = -orb.radius;

        const gradient = ctx.createRadialGradient(
          orb.x, orb.y, 0,
          orb.x, orb.y, orb.radius
        );
        gradient.addColorStop(0, `hsla(${orb.hue}, 80%, 60%, 0.15)`);
        gradient.addColorStop(0.5, `hsla(${orb.hue}, 70%, 40%, 0.06)`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      animFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── Floating Feature Pills ────────────────────────────────────────
function FeaturePills() {
  const features = [
    { icon: Shield, label: 'Enterprise Security', delay: '0s' },
    { icon: Zap, label: 'Smart Workflows', delay: '0.2s' },
    { icon: Globe, label: 'Multi-Tenant SaaS', delay: '0.4s' },
  ];

  return (
    <div className="flex flex-wrap gap-3 justify-center mt-8">
      {features.map(({ icon: Icon, label, delay }) => (
        <div
          key={label}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white/70 text-xs font-medium"
          style={{
            animation: `fadeSlideUp 0.6s ease-out ${delay} both`,
          }}
        >
          <Icon className="w-3.5 h-3.5 text-indigo-400" />
          {label}
        </div>
      ))}
    </div>
  );
}

// ─── Loading Fallback ────────────────────────────────────────────────
function LoginPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0e27]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Loading NU-AURA...</p>
      </div>
    </div>
  );
}

// ─── Page Wrapper ────────────────────────────────────────────────────
export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPage />
    </Suspense>
  );
}

// ─── Main Login Page ─────────────────────────────────────────────────
function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, googleLogin, user, isAuthenticated, hasHydrated, setUser } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingLockoutTime, setRemainingLockoutTime] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rate limiting from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAttempts = localStorage.getItem('loginAttempts');
      const storedLockout = localStorage.getItem('lockoutUntil');
      if (storedAttempts) setLoginAttempts(parseInt(storedAttempts, 10));
      if (storedLockout) {
        const lockoutTime = parseInt(storedLockout, 10);
        if (lockoutTime > Date.now()) {
          setLockoutUntil(lockoutTime);
        } else {
          localStorage.removeItem('loginAttempts');
          localStorage.removeItem('lockoutUntil');
        }
      }
    }
  }, []);

  const [didFreshLogin, setDidFreshLogin] = useState(false);

  // Clear stale auth on mount
  useEffect(() => {
    if (!hasHydrated) return;
    if (isAuthenticated && user && !didFreshLogin) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantId');
      }
      setUser(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  // Redirect after fresh login
  useEffect(() => {
    if (!hasHydrated || !didFreshLogin) return;
    if (isAuthenticated && user && !mfaRequired) {
      const returnUrl = searchParams.get('returnUrl');
      router.push(returnUrl || '/me/dashboard');
    }
  }, [hasHydrated, isAuthenticated, user, didFreshLogin, router, searchParams, mfaRequired]);

  // Lockout timer
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

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '', rememberMe: false },
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
      const response = await login({ email: data.email, password: data.password });
      const responseWithMfa = response as unknown as { mfaRequired?: boolean; userId?: string };
      if (responseWithMfa.mfaRequired && responseWithMfa.userId) {
        setMfaRequired(true);
        setMfaUserId(responseWithMfa.userId);
        setIsLoading(false);
        return;
      }
      resetLoginAttempts();
      if (data.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      setDidFreshLogin(true);
      const returnUrl = searchParams.get('returnUrl');
      router.push(returnUrl || '/me/dashboard');
    } catch (err: unknown) {
      logger.error('[LoginPage] Login error:', err);
      incrementLoginAttempts();
      const attemptsRemaining = RATE_LIMIT_MAX_ATTEMPTS - (loginAttempts + 1);
      let errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid email or password. Please try again.';
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
    router.push(returnUrl || '/me/dashboard');
  };

  const handleMfaCancel = () => {
    setMfaRequired(false);
    setMfaUserId(null);
    setError(null);
  };

  // Google SSO
  const handleGoogleSSO = useGoogleLogin({
    onSuccess: async (tokenResponse) => {

      setIsGoogleLoading(true);
      setError(null);
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!userInfoResponse.ok) throw new Error('Failed to get user info');
        const userInfo = await userInfoResponse.json();
        const domain = userInfo.hd || userInfo.email.split('@')[1];
        if (domain !== ALLOWED_DOMAIN) {
          setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
          setIsGoogleLoading(false);
          return;
        }
        if (!userInfo.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
          setIsGoogleLoading(false);
          return;
        }
        saveGoogleToken(tokenResponse.access_token, tokenResponse.expires_in || 3600);
        await googleLogin({ credential: tokenResponse.access_token, accessToken: true });
        setDidFreshLogin(true);
        const returnUrl = searchParams.get('returnUrl');
        router.push(returnUrl || '/me/dashboard');
      } catch (err: unknown) {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('[Google SSO] Error callback triggered:', errorResponse);
      setError('Google sign-in failed. Please ensure popups are allowed and third-party cookies are enabled.');
    },
    scope: GOOGLE_SSO_SCOPES + ' openid email profile',
    flow: 'implicit',
    prompt: 'select_account',
  });

  useEffect(() => {


  }, []);

  // Legacy Google handlers
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed. No credential received.');
      return;
    }
    setIsGoogleLoading(true);
    setError(null);
    try {
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
      if (!decoded.hd || decoded.hd !== ALLOWED_DOMAIN) {
        setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
        setIsGoogleLoading(false);
        return;
      }
      if (!decoded.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        setError(`Only @${ALLOWED_DOMAIN} accounts are allowed to sign in.`);
        setIsGoogleLoading(false);
        return;
      }
      await googleLogin({ credential: credentialResponse.credential });
      setDidFreshLogin(true);
      const returnUrl = searchParams.get('returnUrl');
      router.push(returnUrl || '/me/dashboard');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please ensure popups are allowed and third-party cookies are enabled.');
  };

  // MFA screen
  if (mfaRequired && mfaUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0e27] py-12 px-4">
        <AnimatedBackground />
        <div className="relative z-10 max-w-md w-full">
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
    <>
      {/* Global keyframe animations */}
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 0.3; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }
        .animate-slide-up {
          animation: fadeSlideUp 0.6s ease-out;
        }
        .btn-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen flex relative overflow-hidden">
        <AnimatedBackground />

        {/* ─── Left Panel: Branding ─────────────────────────── */}
        <div className="hidden lg:flex lg:w-[55%] relative z-10 flex-col justify-center items-center px-16">
          <div
            className="max-w-lg"
            style={{ animation: 'fadeSlideUp 0.8s ease-out 0.1s both' }}
          >
            {/* Platform badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-indigo-300 text-xs font-medium tracking-wider uppercase">
                NU-AURA Platform v1.0
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              Your People.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Amplified.
              </span>
            </h1>

            <p className="text-lg text-gray-600 dark:text-white/50 leading-relaxed mb-8">
              One platform for HR, Recruitment, Performance, and Knowledge
              Management. Built for teams that move fast.
            </p>

            {/* App icons row */}
            <div className="flex gap-4 mb-8">
              {[
                { name: 'HRMS', color: 'from-indigo-500 to-blue-600', icon: '👥' },
                { name: 'Hire', color: 'from-emerald-500 to-teal-600', icon: '🎯' },
                { name: 'Grow', color: 'from-amber-500 to-orange-600', icon: '📈' },
                { name: 'Fluence', color: 'from-violet-500 to-purple-600', icon: '💡' },
              ].map((app, i) => (
                <div
                  key={app.name}
                  className="group flex flex-col items-center gap-2"
                  style={{ animation: `fadeSlideUp 0.5s ease-out ${0.3 + i * 0.1}s both` }}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    style={{ animation: `float ${3 + i * 0.5}s ease-in-out infinite` }}
                  >
                    {app.icon}
                  </div>
                  <span className="text-gray-500 dark:text-white/40 text-xs font-medium">
                    NU-{app.name}
                  </span>
                </div>
              ))}
            </div>

            <FeaturePills />
          </div>
        </div>

        {/* ─── Right Panel: Login Card ───────────────────────── */}
        <div className="w-full lg:w-[45%] relative z-10 flex items-center justify-center px-6 py-12">
          <div
            className="w-full max-w-[420px]"
            style={{ animation: mounted ? 'fadeSlideUp 0.6s ease-out 0.2s both' : 'none' }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-10 lg:mb-8">
              <div className="relative">
                <div
                  className="absolute -inset-4 rounded-full bg-indigo-500/10 blur-xl"
                  style={{ animation: 'pulse-ring 4s ease-in-out infinite' }}
                />
                <Image
                  src="/images/logo.png"
                  alt="NuLogic"
                  width={180}
                  height={54}
                  className="h-14 w-auto object-contain relative dark:brightness-0 dark:invert"
                  priority
                />
              </div>
            </div>

            {/* Mobile-only tagline */}
            <div className="lg:hidden text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to <span className="text-indigo-400">NU-AURA</span>
              </h2>
              <p className="text-gray-500 dark:text-white/40 text-sm">
                Your unified people platform
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-2xl p-8 shadow-2xl">
              <div className="text-center mb-7">
                <h3 className="text-xl font-semibold text-white mb-1">
                  Sign In
                </h3>
                <p className="text-gray-500 dark:text-white/40 text-sm">
                  Access your workspace with Google SSO
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20"
                  style={{ animation: 'fadeSlideUp 0.3s ease-out' }}
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-300">
                      Authentication Failed
                    </p>
                    <p className="text-sm text-red-300/70 mt-0.5">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Google SSO Button */}
              <button
                type="button"
                className="w-full relative group flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-medium text-sm transition-all duration-300 hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
                onClick={() => {

                  handleGoogleSSO();
                }}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
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
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </button>

              {/* Domain notice */}
              <p className="text-center text-white/30 text-xs mt-4 leading-relaxed">
                Restricted to <span className="text-indigo-400/80">@{ALLOWED_DOMAIN}</span> accounts.
                <br />
                <span className="text-white/20">Includes NU-Drive and NU-Mail access.</span>
              </p>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[#0f1330] text-white/20">
                    secure enterprise SSO
                  </span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 text-white/20 text-xs">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>SOC 2</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Encrypted</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>GDPR</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 space-y-2">
              <p className="text-xs text-white/20">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="text-indigo-400/60 hover:text-indigo-400 transition-colors">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-indigo-400/60 hover:text-indigo-400 transition-colors">
                  Privacy Policy
                </Link>
              </p>
              <p className="text-xs text-white/10">
                NuLogic &copy; {new Date().getFullYear()} &middot; NU-AURA Platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
