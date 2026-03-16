'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useGoogleLogin } from '@react-oauth/google';
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

/**
 * Validates a returnUrl to prevent open redirect attacks (SEC-F03).
 * Only allows relative paths starting with '/'. Rejects:
 * - Absolute URLs (https://evil.com)
 * - Protocol-relative URLs (//evil.com)
 * - javascript: URLs
 * - Data URLs
 * - Any URL containing backslashes (bypass via \evil.com)
 */
function sanitizeReturnUrl(url: string | null): string {
  const fallback = '/me/dashboard';
  if (!url) return fallback;
  const trimmed = url.trim();
  // Must start with exactly one forward slash (not //)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  // Reject protocol schemes and backslash tricks
  if (/[:\\]/.test(trimmed.split('/')[1] || '')) return fallback;
  // Only allow path characters (letters, numbers, hyphens, slashes, dots, underscores, query, hash)
  if (!/^\/[\w\-./~?#&=%@]*$/.test(trimmed)) return fallback;
  return trimmed;
}

// Configurable via env — falls back to 'nulogic.io' for local dev.
// Set NEXT_PUBLIC_SSO_ALLOWED_DOMAIN in .env.production for each tenant deployment.
const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_SSO_ALLOWED_DOMAIN || 'nulogic.io';

// ─── CSS-only Ambient Background (theme-aware) ─────────────────────
function AnimatedBackground() {
  return (
    <div className="fixed inset-0" style={{ zIndex: 0 }}>
      {/* Base */}
      <div className="absolute inset-0 bg-[var(--bg-main)]" />
      {/* Light-mode: subtle purple gradient orbs (Keka-inspired) */}
      <div className="absolute inset-0 dark:opacity-0 opacity-100 transition-opacity duration-500">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-primary-200/25 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary-300/20 blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full bg-primary-100/15 blur-[80px]" />
      </div>
      {/* Dark-mode: deep navy mesh with subtle grid */}
      <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-[#0a0e1a]" />
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-primary-800/20 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-info-800/15 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(var(--border-main) 1px, transparent 1px), linear-gradient(90deg, var(--border-main) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>
    </div>
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
    <div className="flex flex-wrap gap-4 justify-center mt-8">
      {features.map(({ icon: Icon, label, delay }) => (
        <div
          key={label}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs font-medium"
          style={{
            animation: `fadeSlideUp 0.6s ease-out ${delay} both`,
          }}
        >
          <Icon className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          {label}
        </div>
      ))}
    </div>
  );
}

// ─── Loading Fallback ────────────────────────────────────────────────
function LoginPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-primary-300/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] text-sm">Loading NU-AURA...</p>
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
  const { googleLogin, user, isAuthenticated, hasHydrated, setUser } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  // setLoginAttempts is called by the lockout timer and resetLoginAttempts;
  // the read value is intentionally unused (lockout state is persisted to localStorage).
  const [, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [didFreshLogin, setDidFreshLogin] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Restore rate-limit state from localStorage on mount
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

  // Clear stale auth on mount
  useEffect(() => {
    if (!hasHydrated) return;
    if (isAuthenticated && user && !didFreshLogin) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('auth-storage');
        sessionStorage.removeItem('user');
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
      router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
    }
  }, [hasHydrated, isAuthenticated, user, didFreshLogin, router, searchParams, mfaRequired]);

  // Lockout timer — clears expired lockout once the window expires
  useEffect(() => {
    if (lockoutUntil) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, lockoutUntil - Date.now());
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

  const resetLoginAttempts = () => {
    setLoginAttempts(0);
    setLockoutUntil(null);
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('lockoutUntil');
  };

  const handleMfaSuccess = (_token: string) => {
    resetLoginAttempts();
    setDidFreshLogin(true);
    router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
  };

  const handleMfaCancel = () => {
    setMfaRequired(false);
    setMfaUserId(null);
    setError(null);
  };

  // Google SSO (primary auth path)
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
        router.push(sanitizeReturnUrl(searchParams.get('returnUrl')));
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

  // MFA screen
  if (mfaRequired && mfaUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] py-12 px-4">
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100/60 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/40 mb-8">
              <div className="w-2 h-2 rounded-full bg-success-600 dark:bg-success-400 animate-pulse" />
              <span className="text-primary-700 dark:text-primary-300 text-xs font-medium tracking-wider uppercase">
                NU-AURA Platform v1.0
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-extrabold text-[var(--text-primary)] leading-tight mb-6 tracking-tight">
              Your People.
              <br />
              <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 dark:from-primary-400 dark:via-primary-300 dark:to-primary-500 bg-clip-text text-transparent">
                Amplified.
              </span>
            </h1>

            <p className="text-lg text-[var(--text-primary)] opacity-80 leading-relaxed mb-8">
              One platform for HR, Recruitment, Performance, and Knowledge
              Management. Built for teams that move fast.
            </p>

            {/* App icons row */}
            <div className="flex gap-4 mb-8">
              {[
                { name: 'HRMS', color: 'from-blue-400 to-blue-500', icon: '👥' },
                { name: 'Hire', color: 'from-primary-500 to-primary-700', icon: '🎯' },
                { name: 'Grow', color: 'from-amber-400 to-amber-500', icon: '📈' },
                { name: 'Fluence', color: 'from-yellow-400 to-amber-500', icon: '💡' },
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
                  <span className="text-[var(--text-secondary)] text-xs font-medium">
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
                  className="absolute -inset-4 rounded-full bg-primary-500/10 blur-xl"
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
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                Welcome to <span className="text-primary-600 dark:text-primary-400 font-extrabold">NU-AURA</span>
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                Your unified people platform
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] p-8 shadow-elevated">
              <div className="text-center mb-7">
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  Sign In
                </h3>
                <p className="text-[var(--text-secondary)] text-sm">
                  Access your workspace with Google SSO
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  className="flex items-start gap-4 p-4 mb-6 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800"
                  style={{ animation: 'fadeSlideUp 0.3s ease-out' }}
                >
                  <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-danger-700 dark:text-danger-300">
                      Authentication Failed
                    </p>
                    <p className="text-sm text-danger-600 dark:text-danger-400 mt-0.5">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Google SSO Button */}
              <button
                type="button"
                className="w-full relative group flex items-center justify-center gap-4 px-6 py-3.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-main)] font-semibold text-sm transition-all duration-300 hover:shadow-card-hover active:scale-[0.98]"
                onClick={() => { handleGoogleSSO(); }}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-[var(--border-main)] border-t-primary-600 rounded-full animate-spin" />
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
              <p className="text-center text-[var(--text-secondary)] text-xs mt-4 leading-relaxed">
                Restricted to <span className="text-primary-600 dark:text-primary-400 font-semibold">@{ALLOWED_DOMAIN}</span> accounts.
                <br />
                <span className="text-[var(--text-muted)]">Includes NU-Drive and NU-Mail access.</span>
              </p>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-subtle)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[var(--bg-card)] text-[var(--text-secondary)] font-medium uppercase tracking-wide">
                    secure enterprise SSO
                  </span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 text-[var(--text-secondary)] text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  <span>SOC 2</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-[var(--border-main)]" />
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Encrypted</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-[var(--border-main)]" />
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  <span>GDPR</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium">
                  Privacy Policy
                </Link>
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                NuLogic &copy; {new Date().getFullYear()} &middot; NU-AURA Platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
